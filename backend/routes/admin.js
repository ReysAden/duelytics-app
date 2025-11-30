const express = require('express')
const { supabaseAdmin } = require('../config/database')
const { authenticate, requireAdmin, requireSessionAdmin } = require('../middleware/auth')

const router = express.Router()

// Create session
router.post('/sessions', authenticate, requireAdmin, async (req, res) => {
  const { name, game_mode, starts_at, ends_at, starting_rating, point_value } = req.body
  
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert({
      name,
      game_mode,
      admin_user_id: req.user.discord_id,
      starts_at,
      ends_at,
      starting_rating: starting_rating || (game_mode === 'duelist_cup' ? 0 : 1500),
      point_value: point_value || (game_mode === 'duelist_cup' ? 1000 : 7)
    })
    .select()
    .single()
  
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json({ session: data })
})

// Archive session
router.patch('/sessions/:sessionId/archive', authenticate, requireSessionAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'archived' })
    .eq('id', req.params.sessionId)
    .select()
    .single()
  
  if (error) return res.status(400).json({ error: error.message })
  res.json({ session: data })
})

// Delete session
router.delete('/sessions/:sessionId', authenticate, requireSessionAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('id', req.params.sessionId)
  
  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
})

// Get session participants
router.get('/sessions/:sessionId/participants', authenticate, requireSessionAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('session_participants')
    .select(`
      *,
      users (username, avatar),
      player_session_stats (*),
      ladder_tiers (tier_name)
    `)
    .eq('session_id', req.params.sessionId)
  
  if (error) return res.status(400).json({ error: error.message })
  res.json({ participants: data })
})

module.exports = router
