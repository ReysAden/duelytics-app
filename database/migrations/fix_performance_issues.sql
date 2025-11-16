-- Duelytics Database Performance Optimization
-- Run these migrations in Supabase SQL Editor

-- ============================================
-- PRIORITY 1: Fix RLS Initialization Plans
-- Replace auth.uid() with (select auth.uid())
-- ============================================

-- 1. Users table - "Users can view own data"
ALTER POLICY "Users can view own data" ON public.users
USING (auth.uid() = id);

-- 2. Users table - "Users can update own data"
ALTER POLICY "Users can update own data" ON public.users
USING (auth.uid() = id);

-- 3. Session Participants - "Users can view session participants"
ALTER POLICY "Users can view session participants" ON public.session_participants
USING (
  EXISTS (
    SELECT 1 FROM public.session_participants sp
    WHERE sp.session_id = session_participants.session_id
    AND sp.user_id = (select auth.uid())
  )
);

-- 4. Session Participants - "Users can join sessions"
ALTER POLICY "Users can join sessions" ON public.session_participants
WITH CHECK (
  user_id = (select auth.uid())
);

-- 5. Player Session Stats - "Users can view session stats"
ALTER POLICY "Users can view session stats" ON public.player_session_stats
USING (
  user_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = player_session_stats.session_id
    AND s.admin_user_id = (select auth.uid())
  )
);

-- 6. Duels - "Users can view session duels"
ALTER POLICY "Users can view session duels" ON public.duels
USING (
  EXISTS (
    SELECT 1 FROM public.session_participants sp
    WHERE sp.session_id = duels.session_id
    AND sp.user_id = (select auth.uid())
  )
);

-- 7. Duels - "Users can insert own duels"
ALTER POLICY "Users can insert own duels" ON public.duels
WITH CHECK (
  user_id = (select auth.uid())
);

-- 8. Backgrounds - "Supporters can upload backgrounds"
ALTER POLICY "Supporters can upload backgrounds" ON public.backgrounds
WITH CHECK (
  user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = (select auth.uid())
    AND u.is_supporter = true
  )
);

-- 9. User Preferences - "Users can manage own preferences"
ALTER POLICY "Users can manage own preferences" ON public.user_preferences
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- PRIORITY 2: Consolidate Multiple Policies
-- Merge sessions SELECT policies
-- ============================================

-- Drop existing multiple policies on sessions table
DROP POLICY IF EXISTS "Allow session management" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can view active sessions" ON public.sessions;

-- Create single consolidated policy
CREATE POLICY "Allow session access" ON public.sessions
FOR SELECT USING (
  status = 'active'
  OR admin_user_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.session_participants sp
    WHERE sp.session_id = sessions.id
    AND sp.user_id = (select auth.uid())
  )
);

-- ============================================
-- PRIORITY 3: Add Indexes on Foreign Keys
-- ============================================

CREATE INDEX IF NOT EXISTS idx_decks_created_by ON public.decks(created_by);
CREATE INDEX IF NOT EXISTS idx_duels_user_id ON public.duels(user_id);
CREATE INDEX IF NOT EXISTS idx_duels_opponent_deck_id ON public.duels(opponent_deck_id);
CREATE INDEX IF NOT EXISTS idx_player_session_stats_user_id ON public.player_session_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_session_stats_current_tier_id ON public.player_session_stats(current_tier_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON public.session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_initial_tier_id ON public.session_participants(initial_tier_id);

-- ============================================
-- PRIORITY 4: Remove Unused Indexes
-- ============================================

DROP INDEX IF EXISTS public.idx_users_discord_id;
DROP INDEX IF EXISTS public.idx_sessions_admin_user;
DROP INDEX IF EXISTS public.idx_backgrounds_user_selected;
DROP INDEX IF EXISTS public.idx_decks_name;

-- ============================================
-- Additional Performance Indexes (Recommended)
-- ============================================

-- For common queries on sessions
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_admin_user_id ON public.sessions(admin_user_id);

-- For player stats lookups
CREATE INDEX IF NOT EXISTS idx_player_session_stats_session_id ON public.player_session_stats(session_id);

-- For duel history queries
CREATE INDEX IF NOT EXISTS idx_duels_session_id ON public.duels(session_id);
CREATE INDEX IF NOT EXISTS idx_duels_your_deck_id ON public.duels(your_deck_id);

-- For session participants lookups
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON public.session_participants(session_id);

-- ============================================
-- PRIORITY 5: Fix Security Issues
-- Set search_path for functions to prevent injection
-- ============================================

-- 1. update_rated_stats - Set immutable search_path
ALTER FUNCTION public.update_rated_stats() 
SET search_path = public;

-- 2. update_duelist_cup_stats - Set immutable search_path
ALTER FUNCTION public.update_duelist_cup_stats() 
SET search_path = public;

-- 3. check_tier_progression - Set immutable search_path
ALTER FUNCTION public.check_tier_progression() 
SET search_path = public;

-- 4. initialize_player_stats - Set immutable search_path
ALTER FUNCTION public.initialize_player_stats() 
SET search_path = public;

-- 5. get_deck_stats - Set immutable search_path
ALTER FUNCTION public.get_deck_stats() 
SET search_path = public;

-- 6. update_ladder_stats - Set immutable search_path
ALTER FUNCTION public.update_ladder_stats() 
SET search_path = public;

-- ============================================
-- Enable Leaked Password Protection
-- ============================================

-- Note: This is configured in Supabase Auth settings in the dashboard
-- Go to: Authentication > Policies > Password Strength
-- Enable "Require leaked password check" toggle

-- ============================================
-- Verify all changes
-- ============================================

-- Check RLS policies are updated
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname NOT LIKE 'pg_%'
ORDER BY tablename, indexname;
