const { supabaseAdmin } = require('./database')

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Token required' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })

  const { data: fullUser } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('discord_id', user.user_metadata?.provider_id)
    .single()

  if (!fullUser) return res.status(404).json({ error: 'User not found' })
  
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