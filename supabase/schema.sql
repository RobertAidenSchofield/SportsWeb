-- Sports Digest Database Schema (Supabase PostgreSQL with Native Supabase Auth)
-- Safe to run repeatedly in your Supabase SQL Editor

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY, -- Maps to Supabase auth.users.id
  email TEXT NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Teams Table (Global Master List)
CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY, -- External API team ID (e.g., 'espn:football:nfl:12')
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

-- 4. User Pinned Games (Individual Game-by-Game Tracking)
CREATE TABLE IF NOT EXISTS public.user_pinned_games (
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  game_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, game_id)
);

-- 5. Grant Table Permissions to Supabase API Roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.teams TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_subscriptions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_pinned_games TO anon, authenticated, service_role;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pinned_games ENABLE ROW LEVEL SECURITY;

-- 6. Profiles Policies
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Anyone can read profiles"
ON public.profiles
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Anyone can insert profiles"
ON public.profiles
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Anyone can update profiles"
ON public.profiles
FOR UPDATE USING (true);

-- 7. Teams Policies (Public read & upsert for global teams master list)
DROP POLICY IF EXISTS "Anyone can read teams" ON public.teams;
CREATE POLICY "Anyone can read teams"
ON public.teams
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert teams" ON public.teams;
CREATE POLICY "Anyone can insert teams"
ON public.teams
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update teams" ON public.teams;
CREATE POLICY "Anyone can update teams"
ON public.teams
FOR UPDATE USING (true);

-- 8. User Subscriptions Policies
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Anyone can manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "Anyone can manage subscriptions" 
ON public.user_subscriptions
FOR ALL USING (true) WITH CHECK (true);

-- 9. User Pinned Games Policies
DROP POLICY IF EXISTS "Anyone can manage pinned games" ON public.user_pinned_games;
CREATE POLICY "Anyone can manage pinned games"
ON public.user_pinned_games
FOR ALL USING (true) WITH CHECK (true);

-- 10. Automatic Profile Creation Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, timezone)
  VALUES (new.id::text, COALESCE(new.email, 'user@domain.local'), 'America/New_York')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
