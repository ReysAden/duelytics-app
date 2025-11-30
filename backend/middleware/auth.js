const { supabaseAdmin } = require('../config/database')

// In-memory token cache (5 minute TTL)
const tokenCache = new Map()
const TOKEN_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedToken(token) {
  const cached = tokenCache.get(token)
  if (!cached) return null

  const now = Date.now()
  if (now - cached.timestamp > TOKEN_CACHE_TTL) {
    tokenCache.delete(token)
    return null
  }

  return cached.user
}

function cacheToken(token, user) {
  tokenCache.set(token, {
    user,
    timestamp: Date.now()
  })

  // Opportunistic cleanup for old entries
  if (tokenCache.size > 200) {
    const now = Date.now()
    for (const [key, value] of tokenCache.entries()) {
      if (now - value.timestamp > TOKEN_CACHE_TTL) {
        tokenCache.delete(key)
      }
    }
  }
}

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Token required' })

  // Try cache first
  const cachedUser = getCachedToken(token)
  if (cachedUser) {
    req.user = cachedUser
    return next()
  }

  // Validate token with Supabase
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })

  const { data: fullUser } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('discord_id', user.user_metadata?.provider_id)
    .single()

  if (!fullUser) return res.status(404).json({ error: 'User not found' })

  // Cache and continue
  cacheToken(token, fullUser)
  req.user = fullUser
  next()
}

const requireAdmin = (req, res, next) => 
  req.user?.is_admin ? next() : res.status(403).json({ error: 'Admin required' })

const requireSupporter = (req, res, next) => 
  req.user?.is_supporter ? next() : res.status(403).json({ error: 'Supporter required' })

async function requireSessionAdmin(req, res, next) {
  const { sessionId } = req.params
  if (!sessionId) return res.status(400).json({ error: 'Session ID required' })

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('admin_user_id, name')
    .eq('id', sessionId)
    .single()

  if (!session) return res.status(404).json({ error: 'Session not found' })

  const isSessionAdmin = session.admin_user_id === req.user.discord_id
  const isSystemAdmin = req.user.is_admin

  if (!isSessionAdmin && !isSystemAdmin) {
    return res.status(403).json({ error: 'Session admin required' })
  }

  req.session = session
  next()
}

module.exports = {
  authenticate,
  requireAdmin,
  requireSupporter,
  requireSessionAdmin
}