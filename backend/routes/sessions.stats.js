const express = require('express')
const { supabaseAdmin } = require('../config/database')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

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

module.exports = router
