-- ====================================================================
-- DUELYTICS DATABASE SCHEMA
-- Run this entire script in Supabase SQL Editor
-- ====================================================================

-- 1. USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    avatar VARCHAR(255),
    email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    guild_roles TEXT[], -- Discord role IDs array
    is_admin BOOLEAN DEFAULT FALSE,
    is_supporter BOOLEAN DEFAULT FALSE,
    selected_background_id INTEGER, -- FK to backgrounds
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. SESSIONS TABLE
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    game_mode VARCHAR(50) CHECK (game_mode IN ('ladder', 'rated', 'duelist_cup')),
    admin_user_id VARCHAR(20) REFERENCES users(discord_id),
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    starting_rating INTEGER DEFAULT 1500,
    point_value INTEGER DEFAULT 7,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'ended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. LADDER TIERS TABLE
CREATE TABLE ladder_tiers (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL,
    wins_required INTEGER NOT NULL,
    can_demote_from BOOLEAN DEFAULT TRUE,
    sort_order INTEGER NOT NULL UNIQUE, -- 1=lowest
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. DECKS TABLE
CREATE TABLE decks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    image_url VARCHAR(500),
    image_filename VARCHAR(500),
    created_by VARCHAR(20) REFERENCES users(discord_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. BACKGROUNDS TABLE
CREATE TABLE backgrounds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    image_filename VARCHAR(500) NOT NULL,
    uploaded_by VARCHAR(20) REFERENCES users(discord_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. SESSION PARTICIPANTS TABLE
CREATE TABLE session_participants (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(20) REFERENCES users(discord_id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_banned BOOLEAN DEFAULT FALSE,
    initial_tier_id INTEGER REFERENCES ladder_tiers(id),
    initial_net_wins INTEGER DEFAULT 0,
    UNIQUE(session_id, user_id)
);

-- 7. PLAYER SESSION STATS TABLE
CREATE TABLE player_session_stats (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(20) REFERENCES users(discord_id),
    total_games INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    current_points DECIMAL(10,2) DEFAULT 0,
    current_tier_id INTEGER REFERENCES ladder_tiers(id),
    current_net_wins INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id)
);

-- 8. DUELS TABLE
CREATE TABLE duels (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(20) REFERENCES users(discord_id),
    player_deck_id INTEGER REFERENCES decks(id),
    opponent_deck_id INTEGER REFERENCES decks(id),
    coin_flip_won BOOLEAN DEFAULT FALSE,
    went_first BOOLEAN DEFAULT FALSE,
    result VARCHAR(10) CHECK (result IN ('win', 'loss')),
    points_change DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================

-- User lookups by Discord ID
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);

-- Session queries by status (active/archived/ended)
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Session queries by admin user
CREATE INDEX IF NOT EXISTS idx_sessions_admin_user ON sessions(admin_user_id);

-- Duel history queries (composite index)
CREATE INDEX IF NOT EXISTS idx_duels_session_user ON duels(session_id, user_id);

-- Duel queries by date/time
CREATE INDEX IF NOT EXISTS idx_duels_created_at ON duels(created_at);

-- Deck matchup analysis (composite index)
CREATE INDEX IF NOT EXISTS idx_duels_decks ON duels(player_deck_id, opponent_deck_id);

-- Player stats lookups (composite index)
CREATE INDEX IF NOT EXISTS idx_player_stats_session_user ON player_session_stats(session_id, user_id);

-- Background queries by uploader
CREATE INDEX IF NOT EXISTS idx_backgrounds_user ON backgrounds(uploaded_by);

-- User's selected background lookups
CREATE INDEX IF NOT EXISTS idx_backgrounds_user_selected ON users(selected_background_id);

-- Deck searches by name
CREATE INDEX IF NOT EXISTS idx_decks_name ON decks(name);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_session_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE backgrounds ENABLE ROW LEVEL SECURITY;

-- USERS RLS Policies
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (discord_id = (auth.jwt() ->> 'discord_id'));

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (discord_id = (auth.jwt() ->> 'discord_id'));

CREATE POLICY "Admins can manage all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.discord_id = (auth.jwt() ->> 'discord_id')
            AND u.is_admin = true
        )
    );

-- SESSIONS RLS Policies
CREATE POLICY "Anyone can view active sessions" ON sessions
    FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage sessions" ON sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.discord_id = (auth.jwt() ->> 'discord_id')
            AND u.is_admin = true
        )
    );

-- SESSION PARTICIPANTS RLS Policies
CREATE POLICY "Users can view session participants" ON session_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM session_participants sp
            WHERE sp.session_id = session_participants.session_id
            AND sp.user_id = (auth.jwt() ->> 'discord_id')
        )
    );

CREATE POLICY "Users can join sessions" ON session_participants
    FOR INSERT WITH CHECK (user_id = (auth.jwt() ->> 'discord_id'));

-- PLAYER SESSION STATS RLS Policies
CREATE POLICY "Users can view session stats" ON player_session_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM session_participants sp
            WHERE sp.session_id = player_session_stats.session_id
            AND sp.user_id = (auth.jwt() ->> 'discord_id')
        )
    );

-- DUELS RLS Policies
CREATE POLICY "Users can view session duels" ON duels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM session_participants sp
            WHERE sp.session_id = duels.session_id
            AND sp.user_id = (auth.jwt() ->> 'discord_id')
        )
    );

CREATE POLICY "Users can insert own duels" ON duels
    FOR INSERT WITH CHECK (user_id = (auth.jwt() ->> 'discord_id'));

-- BACKGROUNDS RLS Policies
CREATE POLICY "Anyone can view backgrounds" ON backgrounds FOR SELECT USING (true);

CREATE POLICY "Supporters can upload backgrounds" ON backgrounds
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.discord_id = (auth.jwt() ->> 'discord_id')
            AND (u.is_supporter = true OR u.is_admin = true)
        )
    );

-- ====================================================================
-- LADDER TIERS DATA (32 Total Tiers)
-- wins_required = net wins needed to advance FROM this tier
-- ====================================================================

INSERT INTO ladder_tiers (tier_name, wins_required, can_demote_from, sort_order) VALUES
-- Rookie Tier (2 ranks) - 1 net win each
('Rookie 2', 1, false, 1),  -- Need 1 win to leave Rookie 2
('Rookie 1', 1, true, 2),   -- Need 1 win to leave Rookie 1

-- Bronze Tier (5 ranks) - 2 net wins each
('Bronze 5', 2, false, 3),  -- Need 2 wins to leave Bronze 5 (entry tier - can't demote)
('Bronze 4', 2, true, 4),   -- Need 2 wins to leave Bronze 4
('Bronze 3', 2, true, 5),   -- Need 2 wins to leave Bronze 3
('Bronze 2', 2, true, 6),   -- Need 2 wins to leave Bronze 2
('Bronze 1', 2, true, 7),   -- Need 2 wins to leave Bronze 1

-- Silver Tier (5 ranks) - 2 wins for 5-4-3-2, 3 wins for 1
('Silver 5', 2, false, 8),  -- Need 2 wins to leave Silver 5 (entry tier - can't demote)
('Silver 4', 2, true, 9),   -- Need 2 wins to leave Silver 4
('Silver 3', 2, true, 10),  -- Need 2 wins to leave Silver 3
('Silver 2', 2, true, 11),  -- Need 2 wins to leave Silver 2
('Silver 1', 3, true, 12),  -- Need 3 wins to leave Silver 1

-- Gold Tier (5 ranks) - 3 wins for 5-4-3-2, 4 wins for 1
('Gold 5', 3, false, 13),   -- Need 3 wins to leave Gold 5 (entry tier - can't demote)
('Gold 4', 3, true, 14),    -- Need 3 wins to leave Gold 4
('Gold 3', 3, true, 15),    -- Need 3 wins to leave Gold 3
('Gold 2', 3, true, 16),    -- Need 3 wins to leave Gold 2
('Gold 1', 4, true, 17),    -- Need 4 wins to leave Gold 1

-- Platinum Tier (5 ranks) - 4 wins for 5-4-3-2, 5 wins for 1
('Platinum 5', 4, false, 18), -- Need 4 wins to leave Platinum 5 (entry tier - can't demote)
('Platinum 4', 4, true, 19), -- Need 4 wins to leave Platinum 4
('Platinum 3', 4, true, 20), -- Need 4 wins to leave Platinum 3
('Platinum 2', 4, true, 21), -- Need 4 wins to leave Platinum 2
('Platinum 1', 5, true, 22), -- Need 5 wins to leave Platinum 1

-- Diamond Tier (5 ranks) - 4 net wins each
('Diamond 5', 4, false, 23), -- Need 4 wins to leave Diamond 5 (entry tier - can't demote)
('Diamond 4', 4, true, 24),  -- Need 4 wins to leave Diamond 4
('Diamond 3', 4, true, 25),  -- Need 4 wins to leave Diamond 3
('Diamond 2', 4, true, 26),  -- Need 4 wins to leave Diamond 2
('Diamond 1', 4, true, 27),  -- Need 4 wins to leave Diamond 1

-- Master Tier (5 ranks) - 5 net wins each
('Master 5', 5, false, 28),  -- Need 5 wins to leave Master 5 (entry tier - can't demote)
('Master 4', 5, true, 29),   -- Need 5 wins to leave Master 4
('Master 3', 5, true, 30),   -- Need 5 wins to leave Master 3
('Master 2', 5, true, 31),   -- Need 5 wins to leave Master 2
('Master 1', 0, true, 32);   -- Master 1 is max rank (no advancement)

-- ====================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ====================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_session_stats_updated_at 
    BEFORE UPDATE ON player_session_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();