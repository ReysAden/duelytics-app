const { supabaseAdmin } = require('../database')

// Calculate tier progression (only for ladder mode)
const calculateTierProgression = async (sessionId, userId, gameMode) => {
  if (gameMode !== 'ladder') return { type: 'none' }
  
  try {
    const { data, error } = await supabaseAdmin.rpc('check_tier_progression', {
      p_session_id: sessionId,
      p_user_id: userId
    })
    
    if (error) throw error
    return data || { type: 'none' }
  } catch (error) {
    console.error('Tier progression error:', error)
    return { type: 'error', message: 'Failed to calculate tier progression' }
  }
}

// Initialize player stats for new session participants
const initializePlayerStats = async (sessionId, userId, sessionData) => {
  try {
    await supabaseAdmin.rpc('initialize_player_stats', {
      p_session_id: sessionId,
      p_user_id: userId,
      p_game_mode: sessionData.game_mode,
      p_starting_points: sessionData.starting_rating || 0
    })
  } catch (error) {
    console.error('Error initializing player stats:', error)
    throw error
  }
}

module.exports = {
  calculateTierProgression,
  initializePlayerStats
}