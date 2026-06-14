-- profiles
CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username   text UNIQUE,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile row on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO profiles (id, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- game_results
-- No UPDATE or DELETE policy intentionally — game records are immutable
CREATE TABLE game_results (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ovr        int NOT NULL CHECK (ovr BETWEEN 0 AND 99),
  wins       int NOT NULL CHECK (wins >= 0),
  draws      int NOT NULL CHECK (draws >= 0),
  losses     int NOT NULL CHECK (losses >= 0),
  points     int NOT NULL CHECK (points >= 0),
  gf         int NOT NULL CHECK (gf >= 0),
  ga         int NOT NULL CHECK (ga >= 0),
  formation  text NOT NULL,
  tier       text NOT NULL,
  settings   jsonb NOT NULL DEFAULT '{}',
  matches    jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results_insert" ON game_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "results_select" ON game_results FOR SELECT USING (true);

CREATE INDEX ON game_results (user_id);

-- squads
CREATE TABLE squads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id  uuid NOT NULL REFERENCES game_results(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  players    jsonb NOT NULL DEFAULT '[]',
  is_public  boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "squads_insert" ON squads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "squads_select" ON squads FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "squads_update" ON squads FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX ON squads (user_id);
CREATE INDEX ON squads (result_id);

-- achievements catalog (static data — writes via service role only, not browser clients)
CREATE TABLE achievements (
  key       text PRIMARY KEY,
  name_he   text NOT NULL,
  desc_he   text NOT NULL,
  icon      text NOT NULL,
  is_hidden boolean DEFAULT false
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_select" ON achievements FOR SELECT USING (true);

-- user_achievements
CREATE TABLE user_achievements (
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_key text NOT NULL REFERENCES achievements(key),
  unlocked_at     timestamptz DEFAULT now(),
  result_id       uuid REFERENCES game_results(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, achievement_key)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ua_select" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
-- INSERT intentionally blocked for browser clients — only service role (Edge Function) can grant achievements
CREATE POLICY "ua_insert" ON user_achievements FOR INSERT WITH CHECK (false);

CREATE INDEX ON user_achievements (achievement_key);
