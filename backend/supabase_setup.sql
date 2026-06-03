-- =====================================================
-- DrivoAI Supabase Database Setup Script
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- =====================================================

-- 1. PROFILES TABLE (Users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. REFRESH TOKENS TABLE
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERSONAS TABLE
CREATE TABLE IF NOT EXISTS personas (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'custom' CHECK (type IN ('custom', 'template')),
    name TEXT,
    personality_summary TEXT,
    communication_style TEXT,
    tone_tags TEXT[],
    system_prompt TEXT,
    sample_dialogue JSONB,
    avatar_url TEXT,
    voice_id TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
    vehicle_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SESSION TURNS TABLE
CREATE TABLE IF NOT EXISTS session_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    speaker TEXT NOT NULL CHECK (speaker IN ('user', 'ai')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ANALYTICS TABLE
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    total_query INTEGER DEFAULT 0,
    llm_query INTEGER DEFAULT 0,
    stt_calls INTEGER DEFAULT 0,
    tts_calls INTEGER DEFAULT 0,
    response_time FLOAT DEFAULT 0,
    stt_latency FLOAT DEFAULT 0,
    tts_latency FLOAT DEFAULT 0,
    groundedness FLOAT DEFAULT 0,
    cost_idr FLOAT DEFAULT 0,
    cost_llm_idr FLOAT DEFAULT 0,
    cost_stt_idr FLOAT DEFAULT 0,
    cost_tts_idr FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for better query performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);
CREATE INDEX IF NOT EXISTS idx_personas_type ON personas(type);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_turns_session_id ON session_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Personas: Users can manage their own personas
CREATE POLICY "Users can view own personas" ON personas FOR SELECT USING (user_id = auth.uid() OR type = 'template');
CREATE POLICY "Users can insert own personas" ON personas FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own personas" ON personas FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own personas" ON personas FOR DELETE USING (user_id = auth.uid());

-- Sessions: Users can manage their own sessions
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own sessions" ON sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON sessions FOR UPDATE USING (user_id = auth.uid());

-- Session Turns: Users can view/insert turns for their sessions
CREATE POLICY "Users can view own session turns" ON session_turns FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert session turns" ON session_turns FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
);

-- Analytics: Users can only view their own analytics (or aggregated)
CREATE POLICY "Users can view own analytics" ON analytics FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
);

-- =====================================================
-- SAMPLE TEMPLATE PERSONAS (Optional - for demo)
-- =====================================================

INSERT INTO personas (id, type, name, personality_summary, communication_style, tone_tags, system_prompt, created_at, updated_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'template', 'Sage Guide', 
     'A wise and patient AI companion who speaks like a calm mentor. Provides thoughtful guidance with occasional wisdom from road experiences.',
     'calm', ARRAY['wise', 'patient', 'supportive'],
     'You are Sage Guide, a wise and patient AI driving companion. You speak calmly and provide thoughtful guidance. Keep responses brief and safety-focused.',
     NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000002', 'template', 'Nova Companion',
     'An energetic and friendly AI that keeps you engaged with lively conversation and motivating words during long drives.',
     'energetic', ARRAY['energetic', 'friendly', 'motivating'],
     'You are Nova Companion, an energetic and friendly AI driving buddy. Keep the conversation lively and engaging. Speak in a friendly, encouraging tone.',
     NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000003', 'template', 'Captain Assist',
     'A professional and reliable AI assistant that handles navigation queries and vehicle diagnostics with authority.',
     'formal', ARRAY['professional', 'reliable', 'authoritative'],
     'You are Captain Assist, a professional AI driving assistant. Provide clear, authoritative information. Speak formally but helpfully.',
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS (for service role)
-- =====================================================

GRANT ALL ON profiles TO service_role;
GRANT ALL ON refresh_tokens TO service_role;
GRANT ALL ON personas TO service_role;
GRANT ALL ON sessions TO service_role;
GRANT ALL ON session_turns TO service_role;
GRANT ALL ON analytics TO service_role;