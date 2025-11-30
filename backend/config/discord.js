const { supabaseAdmin } = require('./database')
const axios = require('axios')

const GUILD_ID = process.env.DISCORD_GUILD_ID
const ADMIN_ROLE = process.env.DISCORD_ADMIN_ROLE_ID
const SUPPORTER_ROLE = process.env.DISCORD_SUPPORTER_ROLE_ID
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

async function getGuildMemberByBot(userId) {
  try {
    console.log('🤖 Fetching guild member using bot token for user:', userId)
    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    )
    console.log('🎉 Successfully fetched guild member data')
    return response.data
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('🚫 User not found in guild (not a member)')
      return null
    }
    console.error('❌ Failed to fetch guild member:', error.response?.data || error.message)
    return null
  }
}

async function syncUserFromDiscord(supabaseUser) {
  const discordId = supabaseUser.user_metadata?.provider_id
  
  console.log('🔍 Discord sync debug:')
  console.log('Discord ID:', discordId)
  console.log('Bot Token Available:', !!BOT_TOKEN)
  
  if (!discordId) {
    console.log('❌ No Discord ID found')
    return null
  }
  
  if (!BOT_TOKEN) {
    console.log('❌ No Discord bot token configured, creating user without roles')
    // Create user without roles if we can't get Discord data
    const userData = {
      discord_id: discordId,
      username: supabaseUser.user_metadata?.full_name,
      avatar: supabaseUser.user_metadata?.avatar_url,
      email: supabaseUser.email,
      guild_roles: [],
      is_admin: false,
      is_supporter: false,
      last_login: new Date().toISOString()
    }
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(userData, { onConflict: 'discord_id' })
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  console.log('🚀 Fetching Discord guild member data using bot...')
  const guildMember = await getGuildMemberByBot(discordId)
  const roles = guildMember?.roles || []
  
  console.log('🎭 Discord roles check:', {
    guildMember: !!guildMember,
    roles,
    adminRoleId: ADMIN_ROLE,
    supporterRoleId: SUPPORTER_ROLE,
    isAdmin: roles.includes(ADMIN_ROLE),
    isSupporter: roles.includes(SUPPORTER_ROLE) || roles.includes(ADMIN_ROLE)
  })
  
  const userData = {
    discord_id: discordId,
    username: supabaseUser.user_metadata?.full_name,
    avatar: supabaseUser.user_metadata?.avatar_url,
    email: supabaseUser.email,
    guild_roles: roles,
    is_admin: roles.includes(ADMIN_ROLE),
    is_supporter: roles.includes(SUPPORTER_ROLE) || roles.includes(ADMIN_ROLE),
    last_login: new Date().toISOString()
  }
  
  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert(userData, { onConflict: 'discord_id' })
    .select()
    .single()
  
  if (error) throw error
  return data
}

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No token' })
  
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })
  
  const { data: fullUser } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('discord_id', user.user_metadata?.provider_id)
    .single()
  
  req.user = fullUser
  next()
}

const requireAdmin = (req, res, next) => 
  req.user?.is_admin ? next() : res.status(403).json({ error: 'Admin required' })

const requireSupporter = (req, res, next) => 
  req.user?.is_supporter ? next() : res.status(403).json({ error: 'Supporter required' })

module.exports = {
  syncUserFromDiscord,
  getGuildMemberByBot,
  requireAuth,
  requireAdmin,
  requireSupporter
}
