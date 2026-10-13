-- מסע ה־11 (v1.61): one row per finished route, the six route achievements as
-- real ones, and the admin list of who played. 'journey' in track() is
-- 20261013000001.
--
-- The mode runs in the browser, so what reaches the server is checked, never
-- trusted as given. The server has no squads table, so it cannot replay a career
-- link; what it CAN derive from the route itself, it derives: the club and the
-- season are the squad id (`<club>-<start year>`), so the club limit, the year
-- gap (jx_time) and the moves back in time (jx_back) are computed here, not
-- read from the client. `broken` and `rank` are trust-on-submit, like the other
-- client-run modes. Keys, names and icons are kept equal to
-- js/journey-achievements.js by scripts/sim/journey_achievements_test.js.
--
-- A route is sent twice: when the eleventh man is taken (rank null), and again
-- after its season (rank 1-16). The second call updates the same row by
-- (user_id, run_id) and can only add the title.
--
-- array_append, never `earned || 'key'` (20260831000001: an untyped literal on
-- the right parses as an array and aborts the whole function).

CREATE TABLE IF NOT EXISTS journey_runs (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  run_id      text NOT NULL,
  level       text NOT NULL,
  formation   text NOT NULL DEFAULT '',
  route       jsonb NOT NULL,
  broken      boolean NOT NULL,
  clubs       int  NOT NULL,
  year_gap    int  NOT NULL,
  backwards   int  NOT NULL,
  ovr         int,
  rank        int,
  created_at  timestamptz NOT NULL DEFAULT now(),
  season_at   timestamptz,
  UNIQUE (user_id, run_id)
);
CREATE INDEX IF NOT EXISTS journey_runs_created_idx ON journey_runs (created_at DESC);
ALTER TABLE journey_runs ENABLE ROW LEVEL SECURITY;
-- no policies: rows are written by submit_journey_run only

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('jx_finish', 'הדרך שלי',         'השלם מסע של 11 שחקנים.',                                               '🧭', false),
  ('jx_chain',  'שרשרת ברזל',       'השלם מסע בלי לשבור את השרשרת.',                                        '🔗', false),
  ('jx_hard',   'בלי מספרים',       'השלם מסע ברמה קשה, בלי לראות דירוגים.',                                '🙈', false),
  ('jx_time',   'מסע בזמן',         'השלם מסע עם פער של עשרים שנה לפחות בין העונה המוקדמת למאוחרת.',          '⌛', false),
  ('jx_back',   'בחזרה לעבר',       'השלם מסע עם לפחות ארבעה מעברים לעונה מוקדמת יותר.',                     '⏪', false),
  ('jx_title',  'אליפות בדרך שלי',  'זכה באליפות הליגה עם הרכב שבנית במסע ה־11, ברמה רגילה או קשה.',          '🏆', false)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

CREATE OR REPLACE FUNCTION submit_journey_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid        uuid   := auth.uid();
  v_run      text   := COALESCE(p->>'run_id', '');
  v_level    text   := COALESCE(p->>'level', '');
  v_form     text   := LEFT(COALESCE(p->>'formation', ''), 12);
  v_route    jsonb  := p->'route';
  v_broken   boolean;
  v_rank     int;
  v_ovr      int;
  v_el       jsonb;
  v_i        int;
  v_id       text;
  v_clubs    text[] := '{}';
  v_years    int[]  := '{}';
  v_names    text[] := '{}';
  v_ids      text[] := '{}';
  v_clean    jsonb  := '[]'::jsonb;
  v_nclubs   int;
  v_maxper   int;
  v_gap      int;
  v_back     int    := 0;
  earned     text[] := '{}';
  fresh      text[] := '{}';
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;
  IF v_run !~ '^[a-z0-9-]{4,40}$' OR v_level NOT IN ('easy','normal','hard','legacy') THEN
    RETURN jsonb_build_object('error', 'bad run');
  END IF;

  -- exactly eleven stations of {squadId, name}
  IF jsonb_typeof(v_route) IS DISTINCT FROM 'array' OR jsonb_array_length(v_route) <> 11 THEN
    RETURN jsonb_build_object('error', 'bad route');
  END IF;
  FOR v_i IN 0..10 LOOP
    v_el := v_route->v_i;
    IF jsonb_typeof(v_el) IS DISTINCT FROM 'object'
       OR jsonb_typeof(v_el->'squadId') IS DISTINCT FROM 'string'
       OR jsonb_typeof(v_el->'name') IS DISTINCT FROM 'string'
       OR (v_el->>'squadId') !~ '^[a-z0-9]+(-[a-z0-9]+)*-(199[0-9]|20[0-4][0-9])$'
       OR length(v_el->>'name') NOT BETWEEN 1 AND 60 THEN
      RETURN jsonb_build_object('error', 'bad route');
    END IF;
    v_id    := v_el->>'squadId';
    v_ids   := array_append(v_ids, v_id);
    v_names := array_append(v_names, v_el->>'name');
    v_clubs := array_append(v_clubs, regexp_replace(v_id, '-[0-9]{4}$', ''));
    v_years := array_append(v_years, right(v_id, 4)::int);
    v_clean := v_clean || jsonb_build_array(jsonb_build_object('squadId', v_id, 'name', v_el->>'name'));
    IF v_i > 0 AND v_years[v_i + 1] < v_years[v_i] THEN v_back := v_back + 1; END IF;
  END LOOP;

  -- no squad and no player twice
  IF (SELECT count(DISTINCT x) FROM unnest(v_ids) x) <> 11
     OR (SELECT count(DISTINCT x) FROM unnest(v_names) x) <> 11 THEN
    RETURN jsonb_build_object('error', 'bad route');
  END IF;

  -- the level's club limit: once on רגיל/קשה, twice on קל, none on a pre-level route
  SELECT count(DISTINCT c), max(n) INTO v_nclubs, v_maxper
    FROM (SELECT c, count(*) AS n FROM unnest(v_clubs) c GROUP BY c) t;
  IF (v_level IN ('normal','hard') AND v_maxper > 1) OR (v_level = 'easy' AND v_maxper > 2) THEN
    RETURN jsonb_build_object('error', 'bad route');
  END IF;
  SELECT max(y) - min(y) INTO v_gap FROM unnest(v_years) y;

  v_broken := COALESCE(p->'broken' = 'true'::jsonb, false);
  IF jsonb_typeof(p->'rank') = 'number' AND (p->>'rank')::numeric BETWEEN 1 AND 20
     AND (p->>'rank')::numeric = trunc((p->>'rank')::numeric) THEN
    v_rank := (p->>'rank')::numeric::int;
  END IF;
  IF jsonb_typeof(p->'ovr') = 'number' AND (p->>'ovr')::numeric BETWEEN 30 AND 99 THEN
    v_ovr := round((p->>'ovr')::numeric)::int;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    RETURN jsonb_build_object('error', 'no profile');
  END IF;

  INSERT INTO journey_runs (user_id, run_id, level, formation, route, broken, clubs, year_gap, backwards, ovr, rank, season_at)
  VALUES (uid, v_run, v_level, v_form, v_clean, v_broken, v_nclubs, v_gap, v_back, v_ovr, v_rank,
          CASE WHEN v_rank IS NULL THEN NULL ELSE now() END)
  ON CONFLICT (user_id, run_id) DO UPDATE
    SET rank      = COALESCE(journey_runs.rank, EXCLUDED.rank),
        season_at = COALESCE(journey_runs.season_at, EXCLUDED.season_at),
        ovr       = COALESCE(journey_runs.ovr, EXCLUDED.ovr);

  earned := array_append(earned, 'jx_finish');
  IF NOT v_broken        THEN earned := array_append(earned, 'jx_chain'); END IF;
  IF v_level = 'hard'    THEN earned := array_append(earned, 'jx_hard');  END IF;
  IF v_gap >= 20         THEN earned := array_append(earned, 'jx_time');  END IF;
  IF v_back >= 4         THEN earned := array_append(earned, 'jx_back');  END IF;
  IF v_rank = 1 AND v_level IN ('normal','hard') THEN earned := array_append(earned, 'jx_title'); END IF;

  WITH ins AS (
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING
    RETURNING achievement_key
  )
  SELECT COALESCE(array_agg(achievement_key), '{}') INTO fresh FROM ins;

  RETURN jsonb_build_object('achievements', to_jsonb(fresh));
END $$;

GRANT EXECUTE ON FUNCTION submit_journey_run(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION submit_journey_run(jsonb) FROM anon;

-- The admin list of who played. Same shape as derby_admin_runs (20261012000001):
-- is_site_admin() or 'forbidden', clamped days/limit, anon revoked.
CREATE OR REPLACE FUNCTION journey_admin_runs(p_days int DEFAULT 30, p_limit int DEFAULT 500)
RETURNS TABLE (
  id bigint, created_at timestamptz, username text, user_id uuid,
  level text, formation text, route jsonb, broken boolean, clubs int,
  year_gap int, backwards int, ovr int, rank int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_site_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT r.id, r.created_at, p.username, r.user_id,
         r.level, r.formation, r.route, r.broken, r.clubs,
         r.year_gap, r.backwards, r.ovr, r.rank
    FROM journey_runs r
    LEFT JOIN profiles p ON p.id = r.user_id
   WHERE r.created_at > now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 30), 1), 365))
   ORDER BY r.created_at DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 500), 1), 2000);
END $$;

REVOKE ALL ON FUNCTION journey_admin_runs(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION journey_admin_runs(int, int) FROM anon;
GRANT EXECUTE ON FUNCTION journey_admin_runs(int, int) TO authenticated;
