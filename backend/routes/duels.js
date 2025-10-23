const express = require('express')
const { supabaseAdmin } = require('../database')
const { authenticate } = require('../auth')

const router = express.Router()

// Submit duel
router.post('/', authenticate, async (req, res) => {
  const {
    sessionId,
    playerDeckId,
    opponentDeckId,
    result,
    coinFlipWon = false,
    wentFirst = false,
    pointsInput = 0
  } = req.body

  if (!sessionId || !playerDeckId || !opponentDeckId || !['win', 'loss'].includes(result)) {
    return res.status(400).json({ error: 'Invalid duel data' })
  }

  try {
    // Get session info
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('game_mode, point_value')
      .eq('id', sessionId)
      .single()

    if (!session) return res.status(404).json({ error: 'Session not found' })

    // Calculate points based on game mode
    let pointsChange = 0
    if (session.game_mode === 'ladder') {
      pointsChange = result === 'win' ? 1 : -1
    } else if (session.game_mode === 'duelist_cup') {
      pointsChange = result === 'win' ? (pointsInput || 1000) : 0
    } else if (session.game_mode === 'rated') {
      pointsChange = result === 'win' ? Math.abs(pointsInput || 7) : -Math.abs(pointsInput || 7)
    }

    // Insert duel
    const { data: duel, error } = await supabaseAdmin
      .from('duels')
      .insert({
        session_id: sessionId,
        user_id: req.user.discord_id,
        player_deck_id: playerDeckId,
        opponent_deck_id: opponentDeckId,
        coin_flip_won: coinFlipWon,
        went_first: wentFirst,
        result,
        points_change: pointsChange
      })
      .select()
      .single()

    if (error) throw error

    // Update player stats using RPC
    await supabaseAdmin.rpc('update_player_stats', {
      p_session_id: sessionId,
      p_user_id: req.user.discord_id,
      p_result: result,
      p_points_change: pointsChange
    })

    // Check tier progression for ladder mode
    let tierProgression = null
    if (session.game_mode === 'ladder') {
      const { data } = await supabaseAdmin.rpc('check_tier_progression', {
        p_session_id: sessionId,
        p_user_id: req.user.discord_id
      })
      tierProgression = data
    }

    res.json({
      success: true,
      duel,
      pointsChange,
      tierProgression,
      message: `${result === 'win' ? 'Victory!' : 'Defeat'} ${pointsChange > 0 ? '+' : ''}${pointsChange} points`
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get session duels
router.get('/session/:sessionId', authenticate, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('duels')
    .select(`
      *,
      users (username, avatar),
      player_deck:decks!duels_player_deck_id_fkey (name),
      opponent_deck:decks!duels_opponent_deck_id_fkey (name)
    `)
    .eq('session_id', req.params.sessionId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(400).json({ error: error.message })
  res.json({ duels: data })
})

// Get user's duels in session
router.get('/session/:sessionId/user', authenticate, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('duels')
    .select(`
      *,
      player_deck:decks!duels_player_deck_id_fkey (name),
      opponent_deck:decks!duels_opponent_deck_id_fkey (name)
    `)
    .eq('session_id', req.params.sessionId)
    .eq('user_id', req.user.discord_id)
    .order('created_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })
  res.json({ duels: data })
})

module.exports = router