-- Rotating challenges (daily / weekly / monthly): everyone plays the same
-- period-derived conditions; each user keeps ONE row per challenge holding
-- their BEST season (multiple attempts allowed — the edge function only
-- overwrites when the new run is better).
--
-- challenge_key formats: daily 'YYYY-MM-DD' · weekly 'YYYY-MM-DD' (that week's
-- Sunday, Israel time) · monthly 'YYYY-MM'.

CREATE TABLE IF NOT EXISTS challenge_results (
  user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE,
  period        text CHECK (period IN ('daily','weekly','monthly')),
  challenge_key text,
  ovr           int,
  points        int,
  wins          int,
  draws         int,
  losses        int,
  gf            int,
  ga            int,
  formation     text,
  tier          text,
  players       jsonb DEFAULT '[]',
  attempts      int DEFAULT 1,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, period, challenge_key)
);

ALTER TABLE challenge_results ENABLE ROW LEVEL SECURITY;

-- The boards (and their squads) are public by design; writes go only through
-- the service-role edge function, which validates the key and keeps the best.
CREATE POLICY "challenge results are public" ON challenge_results
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS challenge_results_board
  ON challenge_results (period, challenge_key, points DESC, ovr DESC);

-- ── Admin-curated challenge conditions ─────────────────────────────────────
-- By default every challenge's conditions are DERIVED from its key (zero
-- maintenance). A row here overrides them — including for FUTURE keys, so
-- challenges can be scheduled in advance from admin.html.
-- settings jsonb (all fields optional; missing ones stay auto-derived):
--   { "formation_id": "4-3-3", "era_min": 2010, "era_max": 2024,
--     "difficulty": "hard", "ratings_visible": false, "peak_mode": true }

CREATE TABLE IF NOT EXISTS challenge_overrides (
  period        text CHECK (period IN ('daily','weekly','monthly')),
  challenge_key text,
  settings      jsonb NOT NULL DEFAULT '{}',
  updated_at    timestamptz DEFAULT now(),
  PRIMARY KEY (period, challenge_key)
);

ALTER TABLE challenge_overrides ENABLE ROW LEVEL SECURITY;

-- Everyone must be able to read (clients build the challenge from it).
CREATE POLICY "challenge overrides read for all" ON challenge_overrides
  FOR SELECT USING (true);

-- Only the admin account may create/update/delete (same rule as site_texts).
-- ⚠ If you log in with a different email, replace it here.
CREATE POLICY "challenge overrides admin write" ON challenge_overrides
  FOR ALL
  USING  ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com');
