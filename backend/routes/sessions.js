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
      : session.game_mode === 'duelist_cup' ? 1000 : 0

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
      ladder_tiers (tier_name)
    `)
    .eq('session_id', req.params.sessionId)
    .eq('user_id', req.user.discord_id)
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ stats: data })
})

// Get session leaderboard
router.get('/:sessionId/leaderboard', authenticate, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('player_session_stats')
    .select(`
      *,
      users (username, avatar),
      ladder_tiers (tier_name)
    `)
    .eq('session_id', req.params.sessionId)
    .order('current_points', { ascending: false })
    .limit(50)

  if (error) return res.status(400).json({ error: error.message })
  res.json({ leaderboard: data })
})

module.exports = router