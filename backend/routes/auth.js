const express = require('express')
const { supabase, supabaseAdmin } = require('../config/database')
const { syncUserFromDiscord } = require('../config/discord')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

// Discord OAuth login - redirects to Supabase auth
router.get('/discord', (req, res) => {
  const authUrl = `${process.env.SUPABASE_URL}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}`
  res.redirect(authUrl)
})

// Handle OAuth callback from Supabase
router.get('/callback', async (req, res) => {
  const { access_token, refresh_token } = req.query
  
  if (!access_token) {
    return res.status(400).json({ error: 'No access token provided' })
  }

  try {
    // Get user from Supabase using the access token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(access_token)
    if (error || !user) throw error

    // Sync user data with our database
    await syncUserFromDiscord(user)

    // Check if user is in Discord guild
    const { getGuildMemberByBot } = require('../config/discord')
    const discordId = user.user_metadata?.provider_id
    const guildMember = await getGuildMemberByBot(discordId)
    const isGuildMember = !!guildMember

    // Return tokens for client storage
    res.json({
      access_token,
      refresh_token,
      user: {
        id: user.user_metadata?.provider_id,
        username: user.user_metadata?.full_name,
        avatar: user.user_metadata?.avatar_url,
        email: user.email
      },
      isGuildMember
    })
  } catch (error) {
    console.error('OAuth callback error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
})

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('discord_id, username, hide_from_leaderboard')
      .eq('discord_id', req.user.discord_id)
      .single()
    
    if (error) {
      return res.status(400).json({ error: error.message })
    }
    
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Check if user is in Discord guild
router.get('/check-guild', authenticate, async (req, res) => {
  try {
    const { getGuildMemberByBot } = require('../config/discord')
    const discordId = req.user.discord_id
    const guildMember = await getGuildMemberByBot(discordId)
    const isGuildMember = !!guildMember
    
    res.json({
      isGuildMember,
      user: {
        discord_id: req.user.discord_id,
        username: req.user.username
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Sync user roles from Discord
router.post('/sync', async (req, res) => {
  try {
    console.log('🔄 Auth sync request received')
    const authHeader = req.headers.authorization
    if (!authHeader) {
      console.log('❌ No authorization header')
      return res.status(401).json({ error: 'Authorization header required' })
    }
    
    const token = authHeader.replace('Bearer ', '')
    console.log('🎫 Token received (first 20 chars):', token.substring(0, 20) + '...')
    console.log('🔑 Using Supabase URL:', process.env.SUPABASE_URL)
    console.log('🔑 Has service key:', !!process.env.SUPABASE_SERVICE_KEY)
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    console.log('👤 Supabase getUser result:', { user: !!user, error })
    
    if (error || !user) {
      console.log('❌ Token validation failed:', error)
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Sync user data with Discord roles
    const syncedUser = await syncUserFromDiscord(user)
    if (!syncedUser) {
      return res.status(400).json({ error: 'Failed to sync user data' })
    }

    res.json({ user: syncedUser })
  } catch (error) {
    console.error('User sync error:', error)
    res.status(500).json({ error: 'Failed to sync user data' })
  }
})

// Refresh user roles
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.authorization?.replace('Bearer ', ''))
    if (!user) throw new Error('User not found')

    const updatedUser = await syncUserFromDiscord(user)
    res.json({ user: updatedUser })
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh user data' })
  }
})

// Logout
router.post('/logout', authenticate, async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  await supabaseAdmin.auth.admin.signOut(token)
  res.json({ success: true })
})

module.exports = router
