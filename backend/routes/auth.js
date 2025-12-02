const express = require('express')
const { supabase, supabaseAdmin } = require('../config/database')
const { syncUserFromDiscord } = require('../config/discord')
const { authenticate } = require('../middleware/auth')
const crypto = require('crypto')

const router = express.Router()

// Temporary storage for desktop app OAuth sessions (expires after 5 minutes)
const pendingDesktopAuth = new Map()

// Discord OAuth login - redirects to Supabase auth
router.get('/discord', (req, res) => {
  const authUrl = `${process.env.SUPABASE_URL}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}`
  res.redirect(authUrl)
})

// Handle OAuth callback from Supabase
router.get('/callback', async (req, res) => {
  const { code, state } = req.query
  
  if (!code) {
    return res.status(400).send('<h1>Authentication failed</h1><p>No authorization code received.</p>')
  }

  try {
    // Exchange code for session using Supabase
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.session) throw error

    const { session, user } = data

    // Sync user data with our database
    await syncUserFromDiscord(user)

    // Check if this is a desktop app auth (has state parameter)
    if (state) {
      // Store session temporarily for desktop app to poll
      pendingDesktopAuth.set(state, {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: {
          id: user.user_metadata?.provider_id,
          username: user.user_metadata?.full_name,
          avatar: user.user_metadata?.avatar_url,
          email: user.email
        }
      })

      // Auto-cleanup after 5 minutes
      setTimeout(() => pendingDesktopAuth.delete(state), 5 * 60 * 1000)

      // Return HTML page for desktop user
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Login Successful - Duelytics</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              background-image: url('https://onamlvzviwqkqlaejlra.supabase.co/storage/v1/object/public/backgrounds/Default_Background.jpg');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
            }
            .container {
              background: rgba(10, 10, 20, 0.85);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              padding: 48px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
              text-align: center;
              max-width: 400px;
            }
            h1 { 
              color: #ffffff;
              font-size: 28px;
              font-weight: 700;
              margin: 0 0 16px 0;
              letter-spacing: 0.02em;
            }
            p { 
              color: rgba(255, 255, 255, 0.8);
              margin: 0;
              line-height: 1.6;
              font-size: 15px;
            }
            .success { 
              color: #4ade80;
              font-size: 56px;
              margin-bottom: 20px;
              font-weight: bold;
            }
            .app-title {
              color: rgba(255, 255, 255, 0.6);
              font-size: 14px;
              margin-top: 24px;
              letter-spacing: 0.1em;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h1>Login Successful!</h1>
            <p>You can now close this window and return to the Duelytics app.</p>
            <div class="app-title">Duelytics</div>
          </div>
        </body>
        </html>
      `)
    }

    // Web app flow - redirect to app with session
    res.redirect(`/?access_token=${session.access_token}&refresh_token=${session.refresh_token}`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    res.status(500).send('<h1>Authentication failed</h1><p>Please try again.</p>')
  }
})

// Poll endpoint for desktop app to get session after OAuth
router.get('/desktop-session/:state', (req, res) => {
  const { state } = req.params
  const sessionData = pendingDesktopAuth.get(state)
  
  if (sessionData) {
    // Clear it after retrieval
    pendingDesktopAuth.delete(state)
    return res.json(sessionData)
  }
  
  res.status(404).json({ error: 'Session not found or expired' })
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
