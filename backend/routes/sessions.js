const express = require('express')
const { supabaseAdmin } = require('../database')
const { authenticate } = require('../auth')

const router = express.Router()

// Get sessions with status filter
router.get('/', async (req, res) => {
  const status = req.query.status || 'active'
  
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })
  res.json({ sessions: data })
})

// Get specific session
router.get('/:sessionId', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', req.params.sessionId)
    .single()

  if (error) return res.status(404).json({ error: 'Session not found' })
  res.json({ session: data })
})

// Check if user is participant
router.get('/:sessionId/participant-check', authenticate, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('session_participants')
    .select('id')
    .eq('session_id', req.params.sessionId)
    .eq('user_id', req.user.discord_id)
    .single()

  res.json({ isParticipant: !!data })
})

// Join session
router.post('/join', authenticate, async (req, res) => {
  const { sessionId, initialTierId, initialNetWins = 0 } = req.body

  if (!sessionId) return res.status(400).json({ error: 'Session ID required' })

  try {
    // Get session info
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'active')
      .single()

    if (!session) return res.status(404).json({ error: 'Session not found or inactive' })

    // Check if already joined
    const { data: existing } = await supabaseAdmin
      .from('session_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', req.user.discord_id)
      .single()

    if (existing) {
      return res.json({ 
        success: true, 
        message: `Welcome back to ${session.name}`,
        rejoined: true 
      })
    }

    // Validate ladder requirements
    if (session.game_mode === 'ladder' && (!initialTierId || initialNetWins === undefined)) {
      return res.status(400).json({ error: 'Initial tier and net wins required for ladder' })
    }

    // Add participant
    await supabaseAdmin
      .from('session_participants')
      .insert({
        session_id: sessionId,
        user_id: req.user.discord_id,
        initial_tier_id: initialTierId || null,
        initial_net_wins: initialNetWins
      })

    // Initialize stats
    const startingPoints = session.game_mode === 'rated' 
      ? (session.starting_rating || 1500)
      : session.game_mode === 'duelist_cup' ? 0 : 0

    await supabaseAdmin
      .from('player_session_stats')
      .insert({
        session_id: sessionId,
        user_id: req.user.discord_id,
        current_points: startingPoints,
        current_tier_id: initialTierId || null,
        current_net_wins: initialNetWins
      })

    res.json({
      success: true,
      message: `Successfully joined ${session.name}`,
      session: {
        id: session.id,
        name: session.name,
        game_mode: session.game_mode
      }
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get user's session stats
router.get('/:sessionId/stats', authenticate, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('player_session_stats')
    .select(`
      *,
      ladder_tiers (tier_name, wins_required)
    `)
    .eq('session_id', req.params.sessionId)
    .eq('user_id', req.user.discord_id)
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ stats: data })
})

// Get session leaderboard
router.get('/:sessionId/leaderboard', authenticate, async (req, res) => {
  try {
    const sessionId = req.params.sessionId

    // Get session info
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('game_mode')
      .eq('id', sessionId)
      .single()

    // Get all players
    const { data: players } = await supabaseAdmin
      .from('player_session_stats')
      .select(`
        user_id,
        current_points,
        total_games,
        users!player_session_stats_user_id_fkey (username),
        ladder_tiers (tier_name)
      `)
      .eq('session_id', sessionId)
      .order('current_points', { ascending: false })

    if (!players || players.length === 0) {
      return res.json({ leaderboard: [] })
    }

    // Get duels for each player to calculate stats
    const leaderboardData = await Promise.all(players.map(async (player) => {
      const { data: duels } = await supabaseAdmin
        .from('duels')
        .select(`
          result,
          went_first,
          player_deck_id,
          player_deck:decks!duels_player_deck_id_fkey(name, image_url)
        `)
        .eq('session_id', sessionId)
        .eq('user_id', player.user_id)

      if (!duels || duels.length === 0) {
        return {
          user_id: player.user_id,
          username: player.users.username,
          points: player.current_points,
          tier_name: player.ladder_tiers?.tier_name || null,
          total_games: 0,
          top_deck: null,
          top_deck_image: null,
          overall_winrate: 0,
          first_winrate: 0,
          second_winrate: 0
        }
      }

      // Overall win rate
      const wins = duels.filter(d => d.result === 'win').length
      const overall_winrate = (wins / duels.length) * 100

      // Turn order win rates
      const firstDuels = duels.filter(d => d.went_first)
      const secondDuels = duels.filter(d => !d.went_first)
      const firstWins = firstDuels.filter(d => d.result === 'win').length
      const secondWins = secondDuels.filter(d => d.result === 'win').length
      const first_winrate = firstDuels.length > 0 ? (firstWins / firstDuels.length) * 100 : 0
      const second_winrate = secondDuels.length > 0 ? (secondWins / secondDuels.length) * 100 : 0

      // Most played deck
      const deckCounts = {}
      duels.forEach(duel => {
        const deckId = duel.player_deck_id
        if (!deckCounts[deckId]) {
          deckCounts[deckId] = {
            count: 0,
            name: duel.player_deck.name,
            image: duel.player_deck.image_url
          }
        }
        deckCounts[deckId].count++
      })

      const mostPlayed = Object.values(deckCounts).sort((a, b) => b.count - a.count)[0]

      return {
        user_id: player.user_id,
        username: player.users.username,
        points: player.current_points,
        tier_name: player.ladder_tiers?.tier_name || null,
        total_games: duels.length,
        top_deck: mostPlayed?.name || null,
        top_deck_image: mostPlayed?.image || null,
        overall_winrate,
        first_winrate,
        second_winrate
      }
    }))

    // Sort by points (or tier for ladder mode)
    const sortedLeaderboard = session?.game_mode === 'ladder'
      ? leaderboardData.sort((a, b) => {
          // Sort by tier first, then by games if same tier
          if (a.tier_name === b.tier_name) return b.total_games - a.total_games
          return (b.tier_name || '').localeCompare(a.tier_name || '')
        })
      : leaderboardData.sort((a, b) => b.points - a.points)

    res.json({ leaderboard: sortedLeaderboard })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get overview stats
router.get('/:sessionId/overview', authenticate, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.discord_id // Support viewing other users
    const sessionId = req.params.sessionId
    const days = req.query.days

    // Get all user's duels
    let query = supabaseAdmin
      .from('duels')
      .select(`
        *,
        player_deck:decks!duels_player_deck_id_fkey(name),
        opponent_deck:decks!duels_opponent_deck_id_fkey(name)
      `)
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    if (days && days !== 'all') {
      // Filter by specific UTC date (YYYY-MM-DD)
      const startOfDay = `${days}T00:00:00.000Z`
      const endOfDay = `${days}T23:59:59.999Z`
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
    }

    const { data: duels } = await query

    if (!duels || duels.length === 0) {
      return res.json({
        overview: {
          totalGames: 0,
          winRate: 0,
          firstWinRate: 0,
          firstGames: 0,
          secondWinRate: 0,
          secondGames: 0,
          bestDeck: { name: '-', winRate: 0, games: 0 },
          worstDeck: { name: '-', winRate: 0, games: 0 },
          mostFaced: []
        }
      })
    }

    const totalGames = duels.length
    const wins = duels.filter(d => d.result === 'win').length
    const winRate = (wins / totalGames) * 100

    // Turn order stats
    const firstDuels = duels.filter(d => d.went_first)
    const secondDuels = duels.filter(d => !d.went_first)
    const firstWins = firstDuels.filter(d => d.result === 'win').length
    const secondWins = secondDuels.filter(d => d.result === 'win').length
    const firstWinRate = firstDuels.length > 0 ? (firstWins / firstDuels.length) * 100 : 0
    const secondWinRate = secondDuels.length > 0 ? (secondWins / secondDuels.length) * 100 : 0

    // Deck performance
    const deckStats = {}
    duels.forEach(duel => {
      const deckName = duel.player_deck.name
      if (!deckStats[deckName]) {
        deckStats[deckName] = { games: 0, wins: 0 }
      }
      deckStats[deckName].games++
      if (duel.result === 'win') deckStats[deckName].wins++
    })

    const deckPerformance = Object.entries(deckStats)
      .filter(([_, stats]) => stats.games >= 3) // Min 3 games
      .map(([name, stats]) => ({
        name,
        winRate: (stats.wins / stats.games) * 100,
        games: stats.games
      }))
      .sort((a, b) => b.winRate - a.winRate)

    const bestDeck = deckPerformance[0] || { name: '-', winRate: 0, games: 0 }
    const worstDeck = deckPerformance[deckPerformance.length - 1] || { name: '-', winRate: 0, games: 0 }

    // Most faced decks
    const oppDeckCount = {}
    duels.forEach(duel => {
      const deckName = duel.opponent_deck.name
      oppDeckCount[deckName] = (oppDeckCount[deckName] || 0) + 1
    })

    const mostFaced = Object.entries(oppDeckCount)
      .map(([name, games]) => ({ name, games }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 3)

    res.json({
      overview: {
        totalGames,
        winRate,
        firstWinRate,
        firstGames: firstDuels.length,
        secondWinRate,
        secondGames: secondDuels.length,
        bestDeck,
        worstDeck,
        mostFaced
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get deck analysis stats
router.get('/:sessionId/deck-analysis', authenticate, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.discord_id // Support viewing other users
    const sessionId = req.params.sessionId
    const days = req.query.days

    let query = supabaseAdmin
      .from('duels')
      .select(`
        *,
        player_deck:decks!duels_player_deck_id_fkey(id, name, image_url)
      `)
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    if (days && days !== 'all') {
      // Filter by specific UTC date (YYYY-MM-DD)
      const startOfDay = `${days}T00:00:00.000Z`
      const endOfDay = `${days}T23:59:59.999Z`
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
    }

    const { data: duels } = await query

    if (!duels || duels.length === 0) {
      return res.json({ decks: [] })
    }

    const deckStats = {}
    duels.forEach(duel => {
      const deck = duel.player_deck
      if (!deckStats[deck.id]) {
        deckStats[deck.id] = {
          id: deck.id,
          name: deck.name,
          image_url: deck.image_url,
          games: 0,
          wins: 0,
          losses: 0
        }
      }
      deckStats[deck.id].games++
      if (duel.result === 'win') {
        deckStats[deck.id].wins++
      } else {
        deckStats[deck.id].losses++
      }
    })

    const decks = Object.values(deckStats)
      .map(deck => ({
        ...deck,
        winRate: (deck.wins / deck.games) * 100
      }))
      .sort((a, b) => b.games - a.games)

    res.json({ decks })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get available dates for filtering
router.get('/:sessionId/dates', authenticate, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.discord_id // Support viewing other users
    const sessionId = req.params.sessionId

    const { data: duels } = await supabaseAdmin
      .from('duels')
      .select('created_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!duels || duels.length === 0) {
      return res.json({ dates: [] })
    }

    // Extract unique dates in UTC (YYYY-MM-DD format)
    const uniqueDates = [...new Set(
      duels.map(duel => {
        const date = new Date(duel.created_at)
        return date.toISOString().split('T')[0]
      })
    )]

    res.json({ dates: uniqueDates })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get coin flip stats
router.get('/:sessionId/coin-flip', authenticate, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.discord_id // Support viewing other users
    const sessionId = req.params.sessionId
    const days = req.query.days

    let query = supabaseAdmin
      .from('duels')
      .select('coin_flip_won, result, created_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (days && days !== 'all') {
      // Filter by specific UTC date (YYYY-MM-DD)
      const startOfDay = `${days}T00:00:00.000Z`
      const endOfDay = `${days}T23:59:59.999Z`
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
    }

    const { data: duels } = await query

    if (!duels || duels.length === 0) {
      return res.json({
        stats: {
          totalFlips: 0,
          flipsWon: 0,
          flipsLost: 0,
          wonCoinWinRate: 0,
          wonCoinGames: 0,
          wonCoinWins: 0,
          lostCoinWinRate: 0,
          lostCoinGames: 0,
          lostCoinWins: 0,
          expected: 0,
          actual: 0,
          deviation: 0,
          stdDev: 0,
          lastTenFlips: []
        }
      })
    }

    const totalFlips = duels.length
    const flipsWon = duels.filter(d => d.coin_flip_won).length
    const flipsLost = totalFlips - flipsWon

    // Win rate when won/lost coin
    const wonCoinDuels = duels.filter(d => d.coin_flip_won)
    const lostCoinDuels = duels.filter(d => !d.coin_flip_won)
    const wonCoinWins = wonCoinDuels.filter(d => d.result === 'win').length
    const lostCoinWins = lostCoinDuels.filter(d => d.result === 'win').length

    // Statistical analysis
    const expected = totalFlips * 0.5
    const actual = flipsWon
    const deviation = actual - expected
    const stdDev = Math.sqrt(totalFlips * 0.5 * 0.5)

    // Last 10 flips
    const lastTenFlips = duels.slice(0, 10).map(d => ({
      won: d.coin_flip_won,
      duelWon: d.result === 'win'
    }))

    res.json({
      stats: {
        totalFlips,
        flipsWon,
        flipsLost,
        wonCoinWinRate: wonCoinDuels.length > 0 ? (wonCoinWins / wonCoinDuels.length) * 100 : 0,
        wonCoinGames: wonCoinDuels.length,
        wonCoinWins,
        lostCoinWinRate: lostCoinDuels.length > 0 ? (lostCoinWins / lostCoinDuels.length) * 100 : 0,
        lostCoinGames: lostCoinDuels.length,
        lostCoinWins,
        expected,
        actual,
        deviation,
        stdDev,
        lastTenFlips
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get points tracker data
router.get('/:sessionId/points-tracker', authenticate, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.discord_id // Support viewing other users
    const sessionId = req.params.sessionId
    const days = req.query.days

    // Get session starting points
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('game_mode, starting_rating')
      .eq('id', sessionId)
      .single()

    if (!session) return res.status(404).json({ error: 'Session not found' })

    const startingPoints = session.game_mode === 'rated' 
      ? (session.starting_rating || 1500)
      : session.game_mode === 'duelist_cup' ? 0 : 0

    let query = supabaseAdmin
      .from('duels')
      .select(`
        points_change,
        result,
        went_first,
        coin_flip_won,
        created_at,
        player_deck:decks!duels_player_deck_id_fkey(name),
        opponent_deck:decks!duels_opponent_deck_id_fkey(name)
      `)
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (days && days !== 'all') {
      // Filter by specific UTC date (YYYY-MM-DD)
      const startOfDay = `${days}T00:00:00.000Z`
      const endOfDay = `${days}T23:59:59.999Z`
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
    }

    const { data: duels } = await query

    if (!duels || duels.length === 0) {
      return res.json({
        data: {
          progression: [],
          stats: {
            startingPoints,
            currentPoints: startingPoints,
            highestPoints: startingPoints,
            lowestPoints: startingPoints,
            netChange: 0
          }
        }
      })
    }

    // Calculate cumulative points progression
    const progression = []
    let currentPoints = startingPoints
    let highest = startingPoints
    let lowest = startingPoints

    duels.forEach(duel => {
      currentPoints += parseFloat(duel.points_change)
      progression.push({
        points: currentPoints,
        pointsChange: parseFloat(duel.points_change),
        result: duel.result,
        playerDeck: duel.player_deck.name,
        opponentDeck: duel.opponent_deck.name,
        wentFirst: duel.went_first,
        coinFlipWon: duel.coin_flip_won
      })
      if (currentPoints > highest) highest = currentPoints
      if (currentPoints < lowest) lowest = currentPoints
    })

    res.json({
      data: {
        progression,
        stats: {
          startingPoints,
          currentPoints,
          highestPoints: highest,
          lowestPoints: lowest,
          netChange: currentPoints - startingPoints
        }
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get all duels for a session with deck names
router.get('/:sessionId/duels', authenticate, async (req, res) => {
  try {
    const userId = req.user.discord_id
    const sessionId = req.params.sessionId

    const { data: duels, error } = await supabaseAdmin
      .from('duels')
      .select(`
        id,
        result,
        coin_flip_won,
        went_first,
        points_change,
        created_at,
        player_deck:decks!duels_player_deck_id_fkey(name),
        opponent_deck:decks!duels_opponent_deck_id_fkey(name)
      `)
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get session info for rating calculation
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('game_mode, starting_rating')
      .eq('id', sessionId)
      .single()

    // Calculate rating_after for each duel
    const startingRating = session.game_mode === 'rated' ? (session.starting_rating || 1500) : null
    let currentRating = startingRating

    const duelsWithRating = duels.reverse().map(duel => {
      if (currentRating !== null) {
        currentRating += parseFloat(duel.points_change || 0)
      }
      return {
        id: duel.id,
        result: duel.result,
        coin_flip_winner: duel.coin_flip_won ? 'player' : 'opponent',
        first_turn: duel.went_first ? 'player' : 'opponent',
        player_deck_name: duel.player_deck.name,
        opponent_deck_name: duel.opponent_deck.name,
        rating_after: currentRating,
        created_at: duel.created_at
      }
    })

    res.json(duelsWithRating.reverse())
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get matchup matrix data
router.get('/:sessionId/matchups', authenticate, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.discord_id // Support viewing other users
    const sessionId = req.params.sessionId
    const days = req.query.days

    let query = supabaseAdmin
      .from('duels')
      .select(`
        result,
        player_deck:decks!duels_player_deck_id_fkey(id, name, image_url),
        opponent_deck:decks!duels_opponent_deck_id_fkey(id, name, image_url),
        created_at
      `)
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    if (days && days !== 'all') {
      // Filter by specific UTC date (YYYY-MM-DD)
      const startOfDay = `${days}T00:00:00.000Z`
      const endOfDay = `${days}T23:59:59.999Z`
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
    }

    const { data: duels } = await query

    if (!duels || duels.length === 0) {
      return res.json({ matchups: [], decks: { player: [], opponent: [] } })
    }

    // Get unified deck list (all decks from both perspectives)
    const deckCountMap = new Map()
    duels.forEach(duel => {
      // Count player deck usage
      const playerDeck = duel.player_deck
      deckCountMap.set(playerDeck.id, {
        deck: playerDeck,
        count: (deckCountMap.get(playerDeck.id)?.count || 0) + 1
      })
      // Count opponent deck appearances
      const opponentDeck = duel.opponent_deck
      if (!deckCountMap.has(opponentDeck.id)) {
        deckCountMap.set(opponentDeck.id, { deck: opponentDeck, count: 0 })
      }
    })

    // Sort by usage count descending
    const unifiedDecks = Array.from(deckCountMap.values())
      .sort((a, b) => b.count - a.count)
      .map(entry => entry.deck)

    // Calculate matchups from player perspective only
    const matchupsMap = {}
    duels.forEach(duel => {
      const key = `${duel.player_deck.id}-${duel.opponent_deck.id}`
      if (!matchupsMap[key]) {
        matchupsMap[key] = {
          deckAId: duel.player_deck.id,
          deckBId: duel.opponent_deck.id,
          wins: 0,
          losses: 0
        }
      }
      if (duel.result === 'win') {
        matchupsMap[key].wins++
      } else {
        matchupsMap[key].losses++
      }
    })

    // Convert to array with win rates
    const matchups = Object.values(matchupsMap).map(m => ({
      ...m,
      winRate: Math.round((m.wins / (m.wins + m.losses)) * 100)
    }))

    res.json({
      matchups,
      decks: unifiedDecks
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get deck winrates for all users in session
router.get('/:sessionId/deck-winrates', authenticate, async (req, res) => {
  try {
    const sessionId = req.params.sessionId

    // Get all duels in the session with deck info
    const { data: duels } = await supabaseAdmin
      .from('duels')
      .select(`
        result,
        went_first,
        player_deck_id,
        player_deck:decks!duels_player_deck_id_fkey(id, name, image_url)
      `)
      .eq('session_id', sessionId)

    if (!duels || duels.length === 0) {
      return res.json({ decks: [] })
    }

    // Aggregate stats by deck
    const deckStatsMap = new Map()
    
    duels.forEach(duel => {
      const deckId = duel.player_deck_id
      if (!deckStatsMap.has(deckId)) {
        deckStatsMap.set(deckId, {
          id: duel.player_deck.id,
          name: duel.player_deck.name,
          image_url: duel.player_deck.image_url,
          totalGames: 0,
          totalWins: 0,
          firstGames: 0,
          firstWins: 0,
          secondGames: 0,
          secondWins: 0
        })
      }

      const stats = deckStatsMap.get(deckId)
      stats.totalGames++
      if (duel.result === 'win') stats.totalWins++
      
      if (duel.went_first) {
        stats.firstGames++
        if (duel.result === 'win') stats.firstWins++
      } else {
        stats.secondGames++
        if (duel.result === 'win') stats.secondWins++
      }
    })

    // Calculate win rates and sort by total games
    const decksWithWinrates = Array.from(deckStatsMap.values())
      .map(deck => ({
        id: deck.id,
        name: deck.name,
        image_url: deck.image_url,
        totalGames: deck.totalGames,
        overallWinRate: deck.totalGames > 0 ? (deck.totalWins / deck.totalGames) * 100 : 0,
        firstGames: deck.firstGames,
        firstWinRate: deck.firstGames > 0 ? (deck.firstWins / deck.firstGames) * 100 : 0,
        secondGames: deck.secondGames,
        secondWinRate: deck.secondGames > 0 ? (deck.secondWins / deck.secondGames) * 100 : 0
      }))
      .sort((a, b) => b.totalGames - a.totalGames)

    res.json({ decks: decksWithWinrates })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get session-wide matchup matrix (all users)
router.get('/:sessionId/session-matchups', authenticate, async (req, res) => {
  try {
    const sessionId = req.params.sessionId

    // Get all duels in the session
    const { data: duels } = await supabaseAdmin
      .from('duels')
      .select(`
        result,
        player_deck:decks!duels_player_deck_id_fkey(id, name, image_url),
        opponent_deck:decks!duels_opponent_deck_id_fkey(id, name, image_url)
      `)
      .eq('session_id', sessionId)

    if (!duels || duels.length === 0) {
      return res.json({ matchups: [], decks: [] })
    }

    // Get unified deck list
    const deckCountMap = new Map()
    duels.forEach(duel => {
      const playerDeck = duel.player_deck
      deckCountMap.set(playerDeck.id, {
        deck: playerDeck,
        count: (deckCountMap.get(playerDeck.id)?.count || 0) + 1
      })
      const opponentDeck = duel.opponent_deck
      if (!deckCountMap.has(opponentDeck.id)) {
        deckCountMap.set(opponentDeck.id, { deck: opponentDeck, count: 0 })
      }
    })

    const unifiedDecks = Array.from(deckCountMap.values())
      .sort((a, b) => b.count - a.count)
      .map(entry => entry.deck)

    // Calculate matchups
    const matchupsMap = {}
    duels.forEach(duel => {
      const key = `${duel.player_deck.id}-${duel.opponent_deck.id}`
      if (!matchupsMap[key]) {
        matchupsMap[key] = {
          deckAId: duel.player_deck.id,
          deckBId: duel.opponent_deck.id,
          wins: 0,
          losses: 0
        }
      }
      if (duel.result === 'win') {
        matchupsMap[key].wins++
      } else {
        matchupsMap[key].losses++
      }
    })

    const matchups = Object.values(matchupsMap).map(m => ({
      ...m,
      winRate: Math.round((m.wins / (m.wins + m.losses)) * 100)
    }))

    res.json({
      matchups,
      decks: unifiedDecks
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get session participants
router.get('/:sessionId/participants', authenticate, async (req, res) => {
  try {
    const sessionId = req.params.sessionId

    // Get all users who have duels in this session
    const { data: duels } = await supabaseAdmin
      .from('duels')
      .select('user_id')
      .eq('session_id', sessionId)

    if (!duels || duels.length === 0) {
      return res.json({ participants: [] })
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(duels.map(d => d.user_id))]

    // Fetch usernames for these user IDs
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('discord_id, username')
      .in('discord_id', uniqueUserIds)

    if (!users) {
      return res.json({ participants: [] })
    }

    // Format response
    const participants = users.map(user => ({
      user_id: user.discord_id,
      username: user.username
    }))
    .sort((a, b) => a.username.localeCompare(b.username))

    res.json({ participants })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
