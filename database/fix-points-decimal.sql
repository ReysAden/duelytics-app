-- Fix points_change and current_points columns to support decimal values for rated mode
-- Run this in Supabase SQL Editor

-- 1. Fix duels table
ALTER TABLE duels 
ALTER COLUMN points_change TYPE DECIMAL(10,2);

-- 2. Fix player_session_stats table
ALTER TABLE player_session_stats 
ALTER COLUMN current_points TYPE DECIMAL(10,2);

-- 3. Update RPC functions to accept decimal parameters
CREATE OR REPLACE FUNCTION update_rated_stats(
  p_session_id INTEGER,
  p_user_id VARCHAR(20),
  p_result VARCHAR(10),
  p_point_change DECIMAL(10,2)
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

CREATE OR REPLACE FUNCTION update_duelist_cup_stats(
  p_session_id INTEGER,
  p_user_id VARCHAR(20),
  p_result VARCHAR(10),
  p_point_change DECIMAL(10,2)
)
RETURNS VOID AS $$
BEGIN
  UPDATE player_session_stats
  SET 
    total_games = total_games + 1,
    total_wins = total_wins + CASE WHEN p_result = 'win' THEN 1 ELSE 0 END,
    current_points = GREATEST(0, current_points + p_point_change),
    last_updated = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE session_id = p_session_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
