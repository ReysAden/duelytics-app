const express = require('express')
const { supabaseAdmin } = require('../config/database')
const { authenticate } = require('../middleware/auth')

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

module.exports = router
