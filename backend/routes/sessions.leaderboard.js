const express = require('express')
const { supabaseAdmin } = require('../config/database')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

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
        users!player_session_stats_user_id_fkey (username, hide_from_leaderboard),
        ladder_tiers (tier_name)
      `)
      .eq('session_id', sessionId)
      .order('current_points', { ascending: false })

    const currentUserId = req.user.discord_id

    if (!players || players.length === 0) {
      return res.json({ leaderboard: [] })
    }

    // Get ALL duels for this session in one query (not per-player)
    const { data: allDuels } = await supabaseAdmin
      .from('duels')
      .select(`
        user_id,
        result,
        went_first,
        player_deck:decks!duels_player_deck_id_fkey(id, name, image_url)
      `)
      .eq('session_id', sessionId)

    // Group duels by user
    const duelsByUser = {}
    if (allDuels && allDuels.length > 0) {
      allDuels.forEach(duel => {
        if (!duelsByUser[duel.user_id]) {
          duelsByUser[duel.user_id] = []
        }
        duelsByUser[duel.user_id].push(duel)
      })
    }

    // Build leaderboard
    const leaderboardData = players.map((player) => {
      const duels = duelsByUser[player.user_id] || []
      const totalGames = duels.length
      const wins = duels.filter(d => d.result === 'win').length
      const overall_winrate = totalGames > 0 ? (wins / totalGames) * 100 : 0

      // Turn order stats
      const firstDuels = duels.filter(d => d.went_first)
      const secondDuels = duels.filter(d => !d.went_first)
      const firstWins = firstDuels.filter(d => d.result === 'win').length
      const secondWins = secondDuels.filter(d => d.result === 'win').length
      const first_winrate = firstDuels.length > 0 ? (firstWins / firstDuels.length) * 100 : 0
      const second_winrate = secondDuels.length > 0 ? (secondWins / secondDuels.length) * 100 : 0

      // Most played deck
      let topDeck = null
      let topDeckImage = null
      if (duels.length > 0) {
        const deckCounts = {}
        duels.forEach(duel => {
          const deckId = duel.player_deck.id
          if (!deckCounts[deckId]) {
            deckCounts[deckId] = { count: 0, name: duel.player_deck.name, image: duel.player_deck.image_url }
          }
          deckCounts[deckId].count++
        })
        const mostPlayed = Object.values(deckCounts).sort((a, b) => b.count - a.count)[0]
        topDeck = mostPlayed?.name || null
        topDeckImage = mostPlayed?.image || null
      }

      return {
        user_id: player.user_id,
        username: player.users.username,
        points: player.current_points,
        tier_name: player.ladder_tiers?.tier_name || null,
        total_games: totalGames,
        top_deck: topDeck,
        top_deck_image: topDeckImage,
        overall_winrate,
        first_winrate,
        second_winrate,
        hide_stats: player.users.hide_from_leaderboard && player.user_id !== currentUserId
      }
    })

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
        wins: deck.totalWins,
        losses: deck.totalGames - deck.totalWins,
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

module.exports = router
