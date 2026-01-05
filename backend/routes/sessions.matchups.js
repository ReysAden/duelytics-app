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

    // Fetch all duels in batches using paginated RPC to bypass 1000 row limit
    let allDuels = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data: batch, error } = await supabaseAdmin
        .rpc('get_session_duels_paginated', {
          p_session_id: sessionId,
          p_limit: batchSize,
          p_offset: offset
        })
      
      if (error) throw error
      
      if (!batch || batch.length === 0) {
        hasMore = false
      } else {
        allDuels = allDuels.concat(batch)
        hasMore = batch.length === batchSize
        offset += batchSize
      }
    }
    
    // Transform flat RPC response and filter by userId and optional date
    let duels = allDuels
      .filter(d => d.user_id === userId)
      .map(d => ({
        result: d.result,
        player_deck: {
          id: d.player_deck_id,
          name: d.player_deck_name,
          image_url: d.player_deck_image_url
        },
        opponent_deck: {
          id: d.opponent_deck_id,
          name: d.opponent_deck_name,
          image_url: d.opponent_deck_image_url
        },
        created_at: d.created_at
      }))
    
    // Apply date filter if specified
    if (days && days !== 'all') {
      const startOfDay = new Date(`${days}T00:00:00.000Z`)
      const endOfDay = new Date(`${days}T23:59:59.999Z`)
      duels = duels.filter(d => {
        const duelDate = new Date(d.created_at)
        return duelDate >= startOfDay && duelDate <= endOfDay
      })
    }

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

    // Fetch all duels in batches using paginated RPC to bypass 1000 row limit
    let allDuels = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data: batch, error } = await supabaseAdmin
        .rpc('get_session_duels_paginated', {
          p_session_id: sessionId,
          p_limit: batchSize,
          p_offset: offset
        })
      
      if (error) throw error
      
      if (!batch || batch.length === 0) {
        hasMore = false
      } else {
        allDuels = allDuels.concat(batch)
        hasMore = batch.length === batchSize
        offset += batchSize
      }
    }
    
    console.log('Session Matchups - Total duels fetched:', allDuels.length)
    
    // Transform flat RPC response to match original structure
    const duels = allDuels.map(d => ({
      result: d.result,
      player_deck: {
        id: d.player_deck_id,
        name: d.player_deck_name,
        image_url: d.player_deck_image_url
      },
      opponent_deck: {
        id: d.opponent_deck_id,
        name: d.opponent_deck_name,
        image_url: d.opponent_deck_image_url
      }
    }))

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
