-- ====================================================================
-- SUPABASE RPC FUNCTIONS
-- Run these in Supabase SQL Editor after creating the main schema
-- ====================================================================

-- 1. UPDATE LADDER STATS
CREATE OR REPLACE FUNCTION update_ladder_stats(
  p_session_id INTEGER,
  p_user_id VARCHAR(20),
  p_result VARCHAR(10),
  p_point_change INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE player_session_stats
  SET 
    total_games = total_games + 1,
    total_wins = total_wins + CASE WHEN p_result = 'win' THEN 1 ELSE 0 END,
    current_net_wins = current_net_wins + p_point_change,
    last_updated = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE session_id = p_session_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. UPDATE RATED STATS
CREATE OR REPLACE FUNCTION update_rated_stats(
  p_session_id INTEGER,
  p_user_id VARCHAR(20),
  p_result VARCHAR(10),
  p_point_change INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE player_session_stats
  SET 
    total_games = total_games + 1,
    total_wins = total_wins + CASE WHEN p_result = 'win' THEN 1 ELSE 0 END,
    current_points = current_points + p_point_change,
    last_updated = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE session_id = p_session_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. UPDATE DUELIST CUP STATS
CREATE OR REPLACE FUNCTION update_duelist_cup_stats(
  p_session_id INTEGER,
  p_user_id VARCHAR(20),
  p_result VARCHAR(10),
  p_point_change INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE player_session_stats
  SET 
    total_games = total_games + 1,
    total_wins = total_wins + CASE WHEN p_result = 'win' THEN 1 ELSE 0 END,
    current_points = GREATEST(0, current_points + p_point_change), -- Floor at 0
    last_updated = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE session_id = p_session_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CHECK TIER PROGRESSION
CREATE OR REPLACE FUNCTION check_tier_progression(
  p_session_id INTEGER,
  p_user_id VARCHAR(20)
)
RETURNS JSON AS $$
DECLARE
  player_data RECORD;
  next_tier RECORD;
  prev_tier RECORD;
  result JSON;
BEGIN
  -- Get current player stats and tier info
  SELECT 
    pss.current_net_wins,
    pss.current_tier_id,
    lt.tier_name,
    lt.wins_required,
    lt.can_demote_from,
    lt.sort_order
  INTO player_data
  FROM player_session_stats pss
  LEFT JOIN ladder_tiers lt ON pss.current_tier_id = lt.id
  WHERE pss.session_id = p_session_id AND pss.user_id = p_user_id;

  -- Check for promotion
  IF player_data.current_net_wins >= player_data.wins_required THEN
    -- Get next tier
    SELECT id, tier_name, wins_required, sort_order
    INTO next_tier
    FROM ladder_tiers
    WHERE sort_order = player_data.sort_order + 1;
    
    IF next_tier.id IS NOT NULL THEN
      -- Promote player
      UPDATE player_session_stats
      SET 
        current_tier_id = next_tier.id,
        current_net_wins = player_data.current_net_wins - player_data.wins_required,
        updated_at = CURRENT_TIMESTAMP
      WHERE session_id = p_session_id AND user_id = p_user_id;
      
      result := json_build_object(
        'type', 'promotion',
        'newTier', json_build_object(
          'id', next_tier.id,
          'tier_name', next_tier.tier_name
        ),
        'message', '🎉 Promoted to ' || next_tier.tier_name || '!'
      );
      RETURN result;
    END IF;
  END IF;

  -- Check for demotion
  IF player_data.current_net_wins < 0 AND player_data.can_demote_from THEN
    -- Get previous tier
    SELECT id, tier_name, wins_required, sort_order
    INTO prev_tier
    FROM ladder_tiers
    WHERE sort_order = player_data.sort_order - 1;
    
    IF prev_tier.id IS NOT NULL THEN
      -- Demote player
      UPDATE player_session_stats
      SET 
        current_tier_id = prev_tier.id,
        current_net_wins = prev_tier.wins_required + player_data.current_net_wins,
        updated_at = CURRENT_TIMESTAMP
      WHERE session_id = p_session_id AND user_id = p_user_id;
      
      result := json_build_object(
        'type', 'demotion',
        'newTier', json_build_object(
          'id', prev_tier.id,
          'tier_name', prev_tier.tier_name
        ),
        'message', '📉 Demoted to ' || prev_tier.tier_name
      );
      RETURN result;
    END IF;
  END IF;

  -- No tier change
  RETURN json_build_object('type', 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. INITIALIZE PLAYER STATS
CREATE OR REPLACE FUNCTION initialize_player_stats(
  p_session_id INTEGER,
  p_user_id VARCHAR(20),
  p_game_mode VARCHAR(50),
  p_starting_points INTEGER
)
RETURNS VOID AS $$
DECLARE
  starting_tier_id INTEGER;
BEGIN
  -- Get starting tier for ladder mode (lowest tier)
  IF p_game_mode = 'ladder' THEN
    SELECT id INTO starting_tier_id
    FROM ladder_tiers
    ORDER BY sort_order ASC
    LIMIT 1;
  END IF;

  -- Insert or update player stats
  INSERT INTO player_session_stats (
    session_id,
    user_id,
    current_points,
    current_tier_id,
    current_net_wins,
    total_games,
    total_wins,
    created_at,
    updated_at,
    last_updated
  ) VALUES (
    p_session_id,
    p_user_id,
    CASE 
      WHEN p_game_mode = 'duelist_cup' THEN 1000
      WHEN p_game_mode = 'rated' THEN COALESCE(p_starting_points, 1500)
      ELSE 0
    END,
    starting_tier_id,
    0,
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (session_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. GET DECK STATS (bonus function for deck routes)
CREATE OR REPLACE FUNCTION get_deck_stats(deck_id INTEGER)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'wins', COUNT(CASE WHEN result = 'win' THEN 1 END),
    'losses', COUNT(CASE WHEN result = 'loss' THEN 1 END),
    'total_games', COUNT(*),
    'win_rate', ROUND(
      COUNT(CASE WHEN result = 'win' THEN 1 END)::NUMERIC / 
      NULLIF(COUNT(*), 0) * 100, 
      2
    )
  ) INTO result
  FROM duels
  WHERE player_deck_id = deck_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;