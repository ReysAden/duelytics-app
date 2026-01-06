import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Custom storage adapter for Electron
const customStorageAdapter = {
  getItem: (key) => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key)
    }
    return null
  },
  setItem: (key, value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value)
    }
  },
  removeItem: (key) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key)
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: customStorageAdapter,
    storageKey: 'duelytics-auth'
  }
})

// Helper functions for database operations
export const db = {
  // Get user by discord ID
  async getUser(discordId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', discordId)
      .single()
    return { data, error }
  },

  // Get active sessions
  async getActiveSessions() {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Get session participants
  async getSessionParticipants(sessionId) {
    const { data, error } = await supabase
      .from('session_participants')
      .select(`
        *,
        users (username, avatar),
        player_session_stats (*)
      `)
      .eq('session_id', sessionId)
    return { data, error }
  },

  // Get all decks
  async getDecks() {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .order('name', { ascending: true })
    return { data, error }
  },

  // Get ladder tiers
  async getLadderTiers() {
    const { data, error } = await supabase
      .from('ladder_tiers')
      .select('*')
      .order('sort_order', { ascending: true })
    return { data, error }
  },

  // Submit a duel
  async submitDuel(duelData) {
    const { data, error } = await supabase
      .from('duels')
      .insert(duelData)
      .select()
      .single()
    return { data, error }
  },

  subscribeToDuels(sessionId, onDuelAdded, onDuelUpdated, onDuelDeleted) {
    const channel = supabase
      .channel(`duels:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'duels', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          onDuelAdded?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'duels', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          onDuelUpdated?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'duels', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          onDuelDeleted?.(payload.old);
        }
      )
      .subscribe();
    
    return channel;
  },

  subscribeToPlayerStats(sessionId, onStatsUpdated) {
    return supabase
      .channel(`stats:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'player_session_stats', filter: `session_id=eq.${sessionId}` },
        (payload) => onStatsUpdated?.(payload.new)
      )
      .subscribe()
  },

  subscribeToLeaderboard(sessionId, onUpdate) {
    return supabase
      .channel(`leaderboard:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_session_stats', filter: `session_id=eq.${sessionId}` },
        (payload) => onUpdate?.(payload)
      )
      .subscribe()
  },

  subscribeToDuelChanges(sessionId, onUpdate) {
    return supabase
      .channel(`duels_all:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duels', filter: `session_id=eq.${sessionId}` },
        (payload) => onUpdate?.(payload)
      )
      .subscribe()
  },

  subscribeToSessions(onUpdate) {
    return supabase
      .channel('sessions_all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        (payload) => onUpdate?.(payload.new || payload.old)
      )
      .subscribe()
  }
}
