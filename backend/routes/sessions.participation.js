const express = require('express')
const { supabaseAdmin } = require('../config/database')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

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

// Get session participants
router.get('/:sessionId/participants', authenticate, async (req, res) => {
  try {
    const sessionId = req.params.sessionId

    // Get all users who joined this session
    const { data: participants } = await supabaseAdmin
      .from('session_participants')
      .select(`
        user_id,
        users!session_participants_user_id_fkey (username)
      `)
      .eq('session_id', sessionId)

    if (!participants || participants.length === 0) {
      return res.json({ participants: [] })
    }

    // Format response
    const formattedParticipants = participants.map(p => ({
      user_id: p.user_id,
      username: p.users.username
    }))
    .sort((a, b) => a.username.localeCompare(b.username))

    res.json({ participants: formattedParticipants })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update user preferences (e.g., hide stats from leaderboard)
router.patch('/user/preferences', authenticate, async (req, res) => {
  try {
    const { hide_from_leaderboard } = req.body
    const userId = req.user.discord_id

    if (typeof hide_from_leaderboard !== 'boolean') {
      return res.status(400).json({ error: 'hide_from_leaderboard must be a boolean' })
    }

    // Update user preferences
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ hide_from_leaderboard })
      .eq('discord_id', userId)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      user: {
        hide_from_leaderboard: data.hide_from_leaderboard
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
