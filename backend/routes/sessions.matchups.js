const express = require('express')
const { supabaseAdmin } = require('../config/database')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

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

module.exports = router
