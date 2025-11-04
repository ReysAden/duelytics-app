const express = require('express')
const { supabaseAdmin } = require('../database')
const { authenticate } = require('../auth')

const router = express.Router()

// Submit duel
router.post('/', authenticate, async (req, res) => {
  const {
    sessionId,
    playerDeckId,
    opponentDeckId,
    result,
    coinFlipWon = false,
    wentFirst = false,
    pointsInput = 0
  } = req.body

  if (!sessionId || !playerDeckId || !opponentDeckId || !['win', 'loss'].includes(result)) {
    return res.status(400).json({ error: 'Invalid duel data' })
  }

  try {
    // Get session info
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('game_mode, point_value')
      .eq('id', sessionId)
      .single()

    if (!session) return res.status(404).json({ error: 'Session not found' })

    // Calculate points based on game mode
    let pointsChange = 0
    if (session.game_mode === 'ladder') {
      pointsChange = result === 'win' ? 1 : -1
    } else if (session.game_mode === 'duelist_cup') {
      const cupPoints = pointsInput || 1000
      pointsChange = result === 'win' ? cupPoints : -cupPoints
    } else if (session.game_mode === 'rated') {
      const ratingValue = pointsInput || 7.00
      pointsChange = result === 'win' ? Math.abs(ratingValue) : -Math.abs(ratingValue)
    }

    // Insert duel
    const { data: duel, error } = await supabaseAdmin
      .from('duels')
      .insert({
        session_id: sessionId,
        user_id: req.user.discord_id,
        player_deck_id: playerDeckId,
        opponent_deck_id: opponentDeckId,
        coin_flip_won: coinFlipWon,
        went_first: wentFirst,
        result,
        points_change: pointsChange
      })
      .select()
      .single()

    if (error) throw error

    // Update player stats using RPC based on game mode
    const rpcFunction = session.game_mode === 'ladder' 
      ? 'update_ladder_stats'
      : session.game_mode === 'rated'
      ? 'update_rated_stats'
      : 'update_duelist_cup_stats';
    
    console.log(`Calling RPC: ${rpcFunction} with params:`, {
      p_session_id: sessionId,
      p_user_id: req.user.discord_id,
      p_result: result,
      p_point_change: pointsChange
    });
    
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(rpcFunction, {
      p_session_id: sessionId,
      p_user_id: req.user.discord_id,
      p_result: result,
      p_point_change: pointsChange
    });
    
    if (rpcError) {
      console.error('RPC Error:', rpcError);
      throw new Error(`Failed to update stats: ${rpcError.message}`);
    }
    
    console.log('RPC success:', rpcData);

    // Check tier progression for ladder mode
    let tierProgression = null
    if (session.game_mode === 'ladder') {
      const { data } = await supabaseAdmin.rpc('check_tier_progression', {
        p_session_id: sessionId,
        p_user_id: req.user.discord_id
      })
      tierProgression = data
    }

    res.json({
      success: true,
      duel,
      pointsChange,
      tierProgression,
      message: `${result === 'win' ? 'Victory!' : 'Defeat'} ${pointsChange > 0 ? '+' : ''}${pointsChange} points`
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get session duels
router.get('/session/:sessionId', authenticate, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('duels')
    .select(`
      *,
      users (username, avatar),
      player_deck:decks!duels_player_deck_id_fkey (name),
      opponent_deck:decks!duels_opponent_deck_id_fkey (name)
    `)
    .eq('session_id', req.params.sessionId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(400).json({ error: error.message })
  res.json({ duels: data })
})

// Get user's duels in session
router.get('/session/:sessionId/user', authenticate, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('duels')
    .select(`
      *,
      player_deck:decks!duels_player_deck_id_fkey (name),
      opponent_deck:decks!duels_opponent_deck_id_fkey (name)
    `)
    .eq('session_id', req.params.sessionId)
    .eq('user_id', req.user.discord_id)
    .order('created_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })
  res.json({ duels: data })
})

// Delete duel
router.delete('/:duelId', authenticate, async (req, res) => {
  try {
    const { duelId } = req.params

    // Get duel info before deletion
    const { data: duel } = await supabaseAdmin
      .from('duels')
      .select('user_id, session_id, result, points_change')
      .eq('id', duelId)
      .single()

    if (!duel) return res.status(404).json({ error: 'Duel not found' })
    if (duel.user_id !== req.user.discord_id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Delete duel
    const { error: deleteError } = await supabaseAdmin
      .from('duels')
      .delete()
      .eq('id', duelId)

    if (deleteError) throw deleteError

    // Recalculate stats from all remaining duels
    const { data: remainingDuels } = await supabaseAdmin
      .from('duels')
      .select('result, points_change')
      .eq('session_id', duel.session_id)
      .eq('user_id', duel.user_id)
      .order('created_at', { ascending: true })

    // Get session info
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('game_mode, starting_rating')
      .eq('id', duel.session_id)
      .single()

    // Calculate totals
    const totalGames = remainingDuels?.length || 0
    const totalWins = remainingDuels?.filter(d => d.result === 'win').length || 0
    
    let currentPoints = 0
    if (session.game_mode === 'rated') {
      currentPoints = session.starting_rating || 1500
      remainingDuels?.forEach(d => {
        currentPoints += parseFloat(d.points_change || 0)
      })
    } else if (session.game_mode === 'duelist_cup') {
      remainingDuels?.forEach(d => {
        currentPoints += parseFloat(d.points_change || 0)
      })
    } else if (session.game_mode === 'ladder') {
      remainingDuels?.forEach(d => {
        currentPoints += parseFloat(d.points_change || 0)
      })
    }

    // Update player stats
    const { error: updateError } = await supabaseAdmin
      .from('player_session_stats')
      .update({
        total_games: totalGames,
        total_wins: totalWins,
        current_points: currentPoints,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', duel.session_id)
      .eq('user_id', duel.user_id)

    if (updateError) throw updateError

    res.json({ success: true, message: 'Duel deleted and stats recalculated' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
