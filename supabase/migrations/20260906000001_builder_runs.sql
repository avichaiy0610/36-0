-- בונה כדורגלן — the board.
--
-- The build itself never leaves the device; what reaches the server is one
-- finished career. Free play, so there is no day key and no one-attempt rule:
-- the board is the best career anyone has ever built, not the best one today.
--
-- Trust model, stated plainly because it is bounded rather than absolute: the
-- server cannot replay a fifteen-season simulation, so it cannot PROVE a legacy
-- score. What it can do is refuse anything the game could not have produced —
-- fifteen seasons of roughly forty appearances, a peak inside the attribute
-- scale, and honours that cannot outnumber the seasons that could carry them.
-- Same posture as award_career_achievements.

CREATE TABLE IF NOT EXISTS builder_runs (
  id         bigserial PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('fw','w','cm','df','gk')),
  peak       int  NOT NULL CHECK (peak BETWEEN 30 AND 99),
  legacy     int  NOT NULL CHECK (legacy BETWEEN 0 AND 2500),
  apps       int  NOT NULL DEFAULT 0 CHECK (apps    BETWEEN 0 AND 600),
  goals      int  NOT NULL DEFAULT 0 CHECK (goals   BETWEEN 0 AND 600),
  assists    int  NOT NULL DEFAULT 0 CHECK (assists BETWEEN 0 AND 600),
  clean      int  NOT NULL DEFAULT 0 CHECK (clean   BETWEEN 0 AND 600),
  titles     int  NOT NULL DEFAULT 0 CHECK (titles  BETWEEN 0 AND 15),
  boots      int  NOT NULL DEFAULT 0 CHECK (boots   BETWEEN 0 AND 15),
  poty       int  NOT NULL DEFAULT 0 CHECK (poty    BETWEEN 0 AND 15),
  seed       bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS builder_runs_legacy_idx ON builder_runs (legacy DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS builder_runs_user_idx   ON builder_runs (user_id);

ALTER TABLE builder_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS builder_runs_read ON builder_runs;
CREATE POLICY builder_runs_read ON builder_runs FOR SELECT USING (true);

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('pb_first',  'קריירה ראשונה',   'סיים קריירה אחת בבונה כדורגלן',                    '🧬', false),
  ('pb_boot',   'מלך השערים',      'סיים עונה בראש טבלת המבקיעים בקריירה שבנית',        '👑', false),
  ('pb_legend', 'אגדה',            'קריירה של 700 נקודות מורשת ומעלה',                  '🌟', false),
  ('pb_loyal',  'עשור בצמרת',      'שלוש אליפויות ומעלה בקריירה אחת',                   '🏆', false)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

CREATE OR REPLACE FUNCTION submit_builder_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid       uuid := auth.uid();
  v_role    text := COALESCE(p->>'role', '');
  v_peak    int  := LEAST(GREATEST(COALESCE((p->>'peak')::int, 0), 30), 99);
  v_legacy  int  := LEAST(GREATEST(COALESCE((p->>'legacy')::int, 0), 0), 2500);
  v_apps    int  := LEAST(GREATEST(COALESCE((p->>'apps')::int, 0), 0), 600);
  v_goals   int  := LEAST(GREATEST(COALESCE((p->>'goals')::int, 0), 0), 600);
  v_assists int  := LEAST(GREATEST(COALESCE((p->>'assists')::int, 0), 0), 600);
  v_clean   int  := LEAST(GREATEST(COALESCE((p->>'clean')::int, 0), 0), 600);
  v_titles  int  := LEAST(GREATEST(COALESCE((p->>'titles')::int, 0), 0), 15);
  v_boots   int  := LEAST(GREATEST(COALESCE((p->>'boots')::int, 0), 0), 15);
  v_poty    int  := LEAST(GREATEST(COALESCE((p->>'poty')::int, 0), 0), 15);
  v_seed    bigint := COALESCE((p->>'seed')::bigint, 0);
  earned    text[] := '{}';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;
  IF v_role NOT IN ('fw','w','cm','df','gk') THEN
    RETURN jsonb_build_object('error', 'bad role');
  END IF;

  INSERT INTO builder_runs
    (user_id, role, peak, legacy, apps, goals, assists, clean, titles, boots, poty, seed)
  VALUES
    (uid, v_role, v_peak, v_legacy, v_apps, v_goals, v_assists, v_clean,
     v_titles, v_boots, v_poty, v_seed);

  -- array_append, NEVER `earned || 'pb_first'`.
  --
  -- With an untyped literal Postgres resolves || to anyarray || anyarray, tries
  -- to parse the string as an array literal, and raises 22P02. The exception
  -- aborts the whole function — INSERT included — so every run that earned
  -- something is silently thrown away while every run that earned nothing saves
  -- fine. That is exactly what happened to submit_gauntlet_run and
  -- award_career_achievements, and it took a day and a fake account to find,
  -- because the data looked like a simulation bug and never like a database one.
  earned := array_append(earned, 'pb_first');
  IF v_boots  >= 1   THEN earned := array_append(earned, 'pb_boot');   END IF;
  IF v_legacy >= 700 THEN earned := array_append(earned, 'pb_legend'); END IF;
  IF v_titles >= 3   THEN earned := array_append(earned, 'pb_loyal');  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'achievements', to_jsonb(earned));
END $$;

-- The board: one row per player, his best career only, so a prolific player
-- cannot fill the top ten with variations of the same build.
CREATE OR REPLACE FUNCTION builder_board(p_limit int DEFAULT 50)
RETURNS TABLE (
  rank bigint, name text, role text, peak int, legacy int,
  goals int, assists int, clean int, titles int, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH best AS (
    SELECT DISTINCT ON (r.user_id)
           r.user_id, r.role, r.peak, r.legacy, r.goals, r.assists,
           r.clean, r.titles, r.created_at
    FROM builder_runs r
    ORDER BY r.user_id, r.legacy DESC, r.created_at ASC
  )
  SELECT ROW_NUMBER() OVER (ORDER BY b.legacy DESC, b.created_at ASC),
         COALESCE(pr.username, 'אנונימי'),
         b.role, b.peak, b.legacy, b.goals, b.assists, b.clean, b.titles, b.created_at
  FROM best b
  LEFT JOIN profiles pr ON pr.id = b.user_id
  ORDER BY b.legacy DESC, b.created_at ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

GRANT EXECUTE ON FUNCTION submit_builder_run(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION builder_board(int) TO anon, authenticated;
