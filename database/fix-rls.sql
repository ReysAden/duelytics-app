-- ====================================================================
-- FIX RLS POLICIES - Run this to fix infinite recursion
-- ====================================================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Admins can manage sessions" ON sessions;

-- Simplified RLS policies without recursion
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (discord_id = (auth.jwt() ->> 'discord_id'));

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (discord_id = (auth.jwt() ->> 'discord_id'));

-- Allow anyone to INSERT users (needed for Discord OAuth signup)
CREATE POLICY "Allow user creation" ON users
    FOR INSERT WITH CHECK (true);

-- Sessions - only allow reading active sessions
CREATE POLICY "Anyone can view active sessions" ON sessions
    FOR SELECT USING (status = 'active');

-- Allow admins to manage sessions (but check admin status in application, not RLS)
CREATE POLICY "Allow session management" ON sessions
    FOR ALL WITH CHECK (true);

-- Make decks and ladder_tiers publicly readable
ALTER TABLE decks DISABLE ROW LEVEL SECURITY;
ALTER TABLE ladder_tiers DISABLE ROW LEVEL SECURITY;