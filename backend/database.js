const { createClient } = require('@supabase/supabase-js')

// Supabase configuration (server-side with service role key for admin operations)
const supabaseUrl = process.env.SUPABASE_URL || 'https://onamlvzviwqkqlaejlra.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY // Service role key for server operations
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY // Anon key for client operations

// Debug environment variables
console.log('🔍 Environment check:')
console.log('SUPABASE_URL:', supabaseUrl)
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING')
console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING')

// Create admin client (bypasses RLS, use carefully)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create regular client (follows RLS policies)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test database connection
const connectDatabase = async () => {
  try {
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows (ok for empty table)
      throw error
    }
    
    console.log('✅ Supabase connected successfully')
    console.log(`📅 Connection time: ${new Date().toISOString()}`)
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message)
    throw error
  }
}

// Database helper functions
const db = {
  // User operations
  async getUser(discordId) {
    const start = Date.now()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', discordId)
      .single()
    
    const duration = Date.now() - start
    if (duration > 1000) {
      console.warn(`⚠️ Slow query (${duration}ms): getUser`)
    }
    
    if (error) throw error
    return data
  },

  async createUser(userData) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateUser(discordId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('discord_id', discordId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Session operations
  async getSessions(status = 'active') {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async createSession(sessionData) {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert(sessionData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Duel operations
  async submitDuel(duelData) {
    const { data, error } = await supabase
      .from('duels')
      .insert(duelData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getSessionDuels(sessionId) {
    const { data, error } = await supabase
      .from('duels')
      .select(`
        *,
        users!duels_user_id_fkey (username, avatar),
        player_deck:decks!duels_player_deck_id_fkey (name),
        opponent_deck:decks!duels_opponent_deck_id_fkey (name)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Deck operations
  async getDecks() {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) throw error
    return data
  },

  async createDeck(deckData) {
    const { data, error } = await supabase
      .from('decks')
      .insert(deckData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Ladder operations
  async getLadderTiers() {
    const { data, error } = await supabase
      .from('ladder_tiers')
      .select('*')
      .order('sort_order', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Player stats operations
  async getPlayerStats(sessionId, userId) {
    const { data, error } = await supabase
      .from('player_session_stats')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  async updatePlayerStats(sessionId, userId, stats) {
    const { data, error } = await supabase
      .from('player_session_stats')
      .upsert({
        session_id: sessionId,
        user_id: userId,
        ...stats
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Raw SQL for complex operations (use admin client)
  async executeRawQuery(query, params = []) {
    console.warn('⚠️ Executing raw SQL query - use with caution')
    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      query_text: query,
      query_params: params
    })
    
    if (error) throw error
    return data
  }
}

// Graceful shutdown (Supabase handles connections automatically)
const closeDatabase = async () => {
  console.log('📦 Supabase connections managed automatically - no manual cleanup needed')
}

module.exports = {
  connectDatabase,
  closeDatabase,
  db,
  supabase,        // Regular client (follows RLS)
  supabaseAdmin    // Admin client (bypasses RLS)
}