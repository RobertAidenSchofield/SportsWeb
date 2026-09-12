-- Sports Digest Database Schema (Supabase PostgreSQL)
-- Execute this SQL in your Supabase SQL Editor

-- 1. Profiles Table (Synced via Clerk Webhook)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY, -- Maps to Clerk's user_id
  email TEXT NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Teams Table (Global Master List)
CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY, -- External API team ID (e.g., 'espn:nfl:12' or 'api-sports:33')
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  league TEXT NOT NULL,
  logo_url TEXT
);

-- 3. User Subscriptions (Junction Table)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, team_id)
);

-- 4. Row Level Security (RLS) Helper for Clerk
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$ LANGUAGE SQL STABLE;

-- 5. Apply Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT USING (id = requesting_user_id());

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE USING (id = requesting_user_id());

-- Teams policies (Public read & upsert for global teams master table)
CREATE POLICY "Anyone can read teams"
ON public.teams
FOR SELECT USING (true);

CREATE POLICY "Anyone can insert teams"
ON public.teams
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update teams"
ON public.teams
FOR UPDATE USING (true);

-- User subscriptions policies
CREATE POLICY "Users can manage their own subscriptions" 
ON public.user_subscriptions
FOR ALL USING (user_id = requesting_user_id());

