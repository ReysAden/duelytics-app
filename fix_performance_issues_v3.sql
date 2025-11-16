-- Duelytics: Database Performance & Security Optimization (v3)
-- Optimized for existing RLS policies using auth.jwt() and discord_id
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PRIORITY 1: Fix RLS Initialization Plans
-- ============================================================================
-- Replace auth.jwt() call in policy conditions with subquery to avoid
-- re-evaluation per row

ALTER POLICY "Users can view own data" ON public.users
USING (discord_id = (SELECT auth.jwt() ->> 'discord_id'));

ALTER POLICY "Users can update own data" ON public.users
USING (discord_id = (SELECT auth.jwt() ->> 'discord_id'));

ALTER POLICY "Users can manage own preferences" ON public.user_preferences
USING (user_id = (SELECT auth.jwt() ->> 'discord_id'));

ALTER POLICY "Users can insert own duels" ON public.duels
WITH CHECK (user_id = (SELECT auth.jwt() ->> 'discord_id'));

ALTER POLICY "Users can join sessions" ON public.session_participants
WITH CHECK (user_id = (SELECT auth.jwt() ->> 'discord_id'));

-- ============================================================================
-- PRIORITY 2: Optimize Session-based View Policies
-- ============================================================================
-- Cache the current user's discord_id to avoid repeated JWT parsing

-- Replace existing policies with optimized versions that reduce function calls
ALTER POLICY "Users can view session stats" ON public.player_session_stats
USING (
  EXISTS (
    SELECT 1 FROM session_participants sp
    WHERE sp.session_id = player_session_stats.session_id
    AND sp.user_id = (SELECT auth.jwt() ->> 'discord_id')
  )
);

ALTER POLICY "Users can view session duels" ON public.duels
USING (
  EXISTS (
    SELECT 1 FROM session_participants sp
    WHERE sp.session_id = duels.session_id
    AND sp.user_id = (SELECT auth.jwt() ->> 'discord_id')
  )
);

ALTER POLICY "Users can view session participants" ON public.session_participants
USING (
  EXISTS (
    SELECT 1 FROM session_participants sp
    WHERE sp.session_id = session_participants.session_id
    AND sp.user_id = (SELECT auth.jwt() ->> 'discord_id')
  )
);

-- ============================================================================
-- PRIORITY 3: Add Missing Indexes on Foreign Keys
-- ============================================================================
-- Foreign key lookups without indexes cause seq scans

CREATE INDEX IF NOT EXISTS idx_session_participants_session_id 
  ON public.session_participants(session_id);

CREATE INDEX IF NOT EXISTS idx_session_participants_user_id 
  ON public.session_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_player_session_stats_session_id 
  ON public.player_session_stats(session_id);

CREATE INDEX IF NOT EXISTS idx_player_session_stats_user_id 
  ON public.player_session_stats(user_id);

CREATE INDEX IF NOT EXISTS idx_duels_session_id 
  ON public.duels(session_id);

CREATE INDEX IF NOT EXISTS idx_duels_user_id 
  ON public.duels(user_id);

CREATE INDEX IF NOT EXISTS idx_duels_player_deck_id 
  ON public.duels(player_deck_id);

CREATE INDEX IF NOT EXISTS idx_duels_opponent_deck_id 
  ON public.duels(opponent_deck_id);

CREATE INDEX IF NOT EXISTS idx_decks_created_by 
  ON public.decks(created_by);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
  ON public.user_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_users_discord_id 
  ON public.users(discord_id);

CREATE INDEX IF NOT EXISTS idx_backgrounds_uploaded_by 
  ON public.backgrounds(uploaded_by);

-- ============================================================================
-- PRIORITY 4: Create Composite Indexes for Common Query Patterns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_player_session_stats_session_user 
  ON public.player_session_stats(session_id, user_id);

CREATE INDEX IF NOT EXISTS idx_duels_session_user 
  ON public.duels(session_id, user_id);

CREATE INDEX IF NOT EXISTS idx_session_participants_session_user 
  ON public.session_participants(session_id, user_id);

-- ============================================================================
-- PRIORITY 5: Optimize Session Status Lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sessions_status 
  ON public.sessions(status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_sessions_admin_user_id 
  ON public.sessions(admin_user_id);

-- ============================================================================
-- PRIORITY 6: Enable Row Level Security on All Public Tables
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_session_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ladder_tiers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Summary of Changes
-- ============================================================================
-- ✓ Optimized RLS policies to use subqueries instead of direct auth.jwt() calls
-- ✓ Added 12 foreign key indexes
-- ✓ Added 3 composite indexes for (session_id, user_id) lookups
-- ✓ Added partial index for active sessions lookup
-- ✓ Enabled RLS on all tables
-- Expected improvement: 10-100x faster queries on large tables
