const { supabaseAdmin } = require('../config/database')

const gameModeHandlers = {
  ladder: {
    calculatePointChange: (result) => result === 'win' ? 1 : -1,
    
    async updatePlayerStats(sessionId, userId, result, pointChange) {
      await supabaseAdmin.rpc('update_ladder_stats', {
        p_session_id: sessionId,
        p_user_id: userId,
        p_result: result,
        p_point_change: pointChange
      })
    }
  },
  
  rated: {
    calculatePointChange: (userInputPoints) => parseInt(userInputPoints),
    
    async updatePlayerStats(sessionId, userId, result, pointChange) {
      await supabaseAdmin.rpc('update_rated_stats', {
        p_session_id: sessionId,
        p_user_id: userId,
        p_result: result,
        p_point_change: pointChange
      })
    }
  },
  
  duelist_cup: {
    calculatePointChange: (userInputPoints) => parseInt(userInputPoints),
    
    async updatePlayerStats(sessionId, userId, result, pointChange) {
      await supabaseAdmin.rpc('update_duelist_cup_stats', {
        p_session_id: sessionId,
        p_user_id: userId,
        p_result: result,
        p_point_change: pointChange
      })
    }
  }
}

const getGameModeHandler = (gameMode) => {
  const handler = gameModeHandlers[gameMode]
  if (!handler) throw new Error(`Unsupported game mode: ${gameMode}`)
  return handler
}

module.exports = { gameModeHandlers, getGameModeHandler }
