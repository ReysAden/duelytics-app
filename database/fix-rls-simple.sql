-- ====================================================================
-- SIMPLE FIX - Just remove the problematic recursive policies
-- ====================================================================

-- Drop the policies causing infinite recursion
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Admins can manage sessions" ON sessions;

-- Allow user creation (needed for Discord OAuth)
CREATE POLICY "Allow user creation" ON users
    FOR INSERT WITH CHECK (true);

-- Allow session management (admin checks done in app code)
CREATE POLICY "Allow session management" ON sessions
    FOR ALL WITH CHECK (true);

-- Make decks and ladder_tiers publicly readable
ALTER TABLE decks DISABLE ROW LEVEL SECURITY;
ALTER TABLE ladder_tiers DISABLE ROW LEVEL SECURITY;