const express = require('express')
const { supabaseAdmin } = require('../config/database')

const router = express.Router()

// Get all ladder tiers
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('ladder_tiers')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return res.status(400).json({ error: error.message })
  res.json({ tiers: data })
})

module.exports = router
