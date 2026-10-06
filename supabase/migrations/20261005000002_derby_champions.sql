-- אלופי הדרבי v2: the runs (three best-of-5 series), ten achievements, and
-- 'derby' in track() (20261005000003).
--
-- The mode runs in the browser, so what reaches the server is checked, never
-- trusted as given: the club must exist (js/derby-data.js derbyClubs()), the
-- three series must name the rivals that club actually meets, in play order
-- (js/derby-match.js derbySeriesRival), and every series must be a finished
-- best-of-5. Tests in scripts/sim/derby_test.js parse this file and keep
-- v_known, v_rivals and v_underdog equal to the JS.
-- `xi` and `bench` are stored as the raw material for the fans' XI (spec §8);
-- nothing reads them and they are shown to no one until the owner approves.
--
-- array_append, never `earned || 'key'` (20260831000001: an untyped literal on
-- the right parses as an array and aborts the whole function).

CREATE TABLE IF NOT EXISTS derby_runs (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club        text NOT NULL,
  difficulty  text NOT NULL,
  series      jsonb NOT NULL,
  series_won  int  NOT NULL,
  title       boolean NOT NULL,
  xi          jsonb NOT NULL DEFAULT '[]'::jsonb,
  bench       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS derby_runs_club_idx ON derby_runs (club, created_at DESC);
CREATE INDEX IF NOT EXISTS derby_runs_user_title_idx ON derby_runs (user_id) WHERE title;
ALTER TABLE derby_runs ENABLE ROW LEVEL SECURITY;
-- no policies: rows are written by submit_derby_run only

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('dc_first',      'אלופי הדרבי',    'ניצחת בשלוש הסדרות',                                   '🏆', false),
  ('dc_sweep',      'טאטוא',          'ניצחת סדרה 3:0',                                       '🧹', false),
  ('dc_comeback',   'קאמבק',          'ניצחת סדרה אחרי פיגור 0:2',                            '🔥', false),
  ('dc_decider',    'משחק חמישי',     'ניצחת את המושבעת במשחק החמישי',                         '⚔️', false),
  ('dc_hard',       'בלי הנחות',      'התואר ברמה קשה',                                       '💪', false),
  ('dc_all',        'כל הדרבים',      'התואר עם כל 13 המועדונים',                             '🌍', false),
  ('dc_arch_sweep', 'שליטה במושבעת',  'ניצחת את סדרת הגמר 3:0',                               '👑', false),
  ('dc_both_sides', 'שני צדי המתרס',  'התואר עם מועדון וגם עם המושבעת שלו',                    '🔄', false),
  ('dc_underdog',   'האנדרדוג',       'ניצחת לפחות 2 סדרות ברמה רגילה או קשה עם אחד משלושת המועדונים הקשים ביותר', '🐺', false),
  ('dc_super_sub',  'מחליף זהב',      'מחליף שלך כבש שער במשחק שניצחת',                        '🌟', false)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

CREATE OR REPLACE FUNCTION submit_derby_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid        uuid    := auth.uid();
  v_known    text[]  := ARRAY['maccabi-haifa','maccabi-tlv','beitar-jerusalem','ms-ashdod','hapoel-tlv',
                              'maccabi-netanya','maccabi-pt','hapoel-haifa','hapoel-beersheba','bnei-sakhnin',
                              'bnei-yehuda','ironi-ks','hapoel-pt'];
  -- club -> [series 1 rival, series 2 rival, archrival (the final)], in play order
  v_rivals   jsonb   := '{
    "maccabi-haifa": ["beitar-jerusalem", "hapoel-haifa", "maccabi-tlv"],
    "maccabi-tlv": ["beitar-jerusalem", "maccabi-haifa", "hapoel-tlv"],
    "beitar-jerusalem": ["maccabi-tlv", "hapoel-tlv", "bnei-sakhnin"],
    "ms-ashdod": ["maccabi-pt", "bnei-yehuda", "hapoel-beersheba"],
    "hapoel-tlv": ["bnei-yehuda", "beitar-jerusalem", "maccabi-tlv"],
    "maccabi-netanya": ["hapoel-hadera", "beitar-jerusalem", "hapoel-beersheba"],
    "maccabi-pt": ["bnei-yehuda", "maccabi-netanya", "hapoel-pt"],
    "hapoel-haifa": ["bnei-sakhnin", "hapoel-tlv", "maccabi-haifa"],
    "hapoel-beersheba": ["maccabi-netanya", "maccabi-tlv", "maccabi-haifa"],
    "bnei-sakhnin": ["maccabi-haifa", "hapoel-haifa", "beitar-jerusalem"],
    "bnei-yehuda": ["maccabi-pt", "maccabi-tlv", "hapoel-tlv"],
    "ironi-ks": ["maccabi-haifa", "hapoel-haifa", "bnei-sakhnin"],
    "hapoel-pt": ["maccabi-netanya", "hapoel-tlv", "maccabi-pt"]
  }'::jsonb;
  -- the three hardest clubs in calibration (DERBY_UNDERDOGS)
  v_underdog text[]  := ARRAY['bnei-sakhnin','hapoel-pt','bnei-yehuda'];
  v_club     text    := COALESCE(p->>'club', '');
  v_diff     text    := COALESCE(p->>'difficulty', '');
  v_series   jsonb   := p->'series';
  v_el       jsonb;
  v_i        int;
  v_w        int;
  v_l        int;
  v_comeback boolean := false;
  v_decider  boolean := false;
  v_supersub boolean := false;
  v_sweep    boolean := false;
  v_series_comeback boolean := false;
  v_fin_w    int;
  v_fin_l    int;
  v_won      int     := 0;
  v_sum_w    int     := 0;
  v_clean    jsonb   := '[]'::jsonb;
  v_title    boolean;
  v_clubs    int     := 0;
  v_both     boolean := false;
  v_total    int     := array_length(v_known, 1);
  v_xi       jsonb   := '[]'::jsonb;
  v_bench    jsonb   := '[]'::jsonb;
  earned     text[]  := '{}';
  fresh      text[]  := '{}';
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;
  IF NOT (v_club = ANY (v_known)) OR v_diff NOT IN ('easy','normal','hard') THEN
    RETURN jsonb_build_object('error', 'bad run');
  END IF;

  -- exactly three finished best-of-5 series, against the rivals this club meets, in order
  IF jsonb_typeof(v_series) IS DISTINCT FROM 'array' OR jsonb_array_length(v_series) <> 3 THEN
    RETURN jsonb_build_object('error', 'bad series');
  END IF;
  FOR v_i IN 0..2 LOOP
    v_el := v_series->v_i;
    IF jsonb_typeof(v_el) IS DISTINCT FROM 'object'
       OR jsonb_typeof(v_el->'rival') IS DISTINCT FROM 'string'
       OR (v_el->>'rival') <> (v_rivals->v_club->>v_i)
       OR jsonb_typeof(v_el->'w') IS DISTINCT FROM 'number'
       OR jsonb_typeof(v_el->'l') IS DISTINCT FROM 'number'
       OR (v_el->>'w')::numeric NOT IN (0,1,2,3)
       OR (v_el->>'l')::numeric NOT IN (0,1,2,3)
       OR (v_el->>'w')::numeric <> trunc((v_el->>'w')::numeric)
       OR (v_el->>'l')::numeric <> trunc((v_el->>'l')::numeric) THEN
      RETURN jsonb_build_object('error', 'bad series');
    END IF;
    -- via numeric: '3.0' parses as numeric but a direct ::int would throw
    v_w := (v_el->>'w')::numeric::int;
    v_l := (v_el->>'l')::numeric::int;
    -- a finished best-of-5 has exactly one side on three
    IF NOT ((v_w = 3 AND v_l < 3) OR (v_l = 3 AND v_w < 3)) THEN
      RETURN jsonb_build_object('error', 'bad series');
    END IF;
    IF v_w = 3 THEN v_won := v_won + 1; END IF;
    IF v_w = 3 AND v_l = 0 THEN v_sweep := true; END IF;
    IF v_w = 3 AND v_l = 2 THEN v_series_comeback := true; END IF;
    v_sum_w := v_sum_w + v_w;
    v_clean := v_clean || jsonb_build_array(jsonb_build_object('rival', v_el->>'rival', 'w', v_w, 'l', v_l));
    v_fin_w := v_w;   -- the last pass leaves the final series
    v_fin_l := v_l;
  END LOOP;
  v_title := v_won = 3;

  -- client flags: true only if the JSON carries the boolean true
  v_comeback := COALESCE(p->'comeback' = 'true'::jsonb, false);
  v_decider  := COALESCE(p->'decider'  = 'true'::jsonb, false);
  v_supersub := COALESCE(p->'super_sub' = 'true'::jsonb, false);

  -- xi / bench: arrays of {squadId, name} objects, else '[]'
  IF jsonb_typeof(p->'xi') = 'array' AND jsonb_array_length(p->'xi') <= 11
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p->'xi') e
                     WHERE jsonb_typeof(e) IS DISTINCT FROM 'object'
                        OR jsonb_typeof(e->'squadId') IS DISTINCT FROM 'string'
                        OR jsonb_typeof(e->'name') IS DISTINCT FROM 'string') THEN
    v_xi := p->'xi';
  END IF;
  IF jsonb_typeof(p->'bench') = 'array' AND jsonb_array_length(p->'bench') <= 7
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p->'bench') e
                     WHERE jsonb_typeof(e) IS DISTINCT FROM 'object'
                        OR jsonb_typeof(e->'squadId') IS DISTINCT FROM 'string'
                        OR jsonb_typeof(e->'name') IS DISTINCT FROM 'string') THEN
    v_bench := p->'bench';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    RETURN jsonb_build_object('error', 'no profile');
  END IF;

  INSERT INTO derby_runs (user_id, club, difficulty, series, series_won, title, xi, bench)
  VALUES (uid, v_club, v_diff, v_clean, v_won, v_title, v_xi, v_bench);

  -- dc_all and dc_both_sides are counted here, from the rows (after this INSERT),
  -- so they follow the account across devices
  IF v_title THEN
    SELECT count(DISTINCT club) INTO v_clubs FROM derby_runs WHERE user_id = uid AND title;
    -- a title with club X and a title with X's archrival (v_rivals[X][2]), in either order
    SELECT EXISTS (
      SELECT 1
      FROM (SELECT DISTINCT club FROM derby_runs WHERE user_id = uid AND title) a
      JOIN (SELECT DISTINCT club FROM derby_runs WHERE user_id = uid AND title) b
        ON b.club = (v_rivals->a.club->>2)
    ) INTO v_both;

    earned := array_append(earned, 'dc_first');
    IF v_diff = 'hard'    THEN earned := array_append(earned, 'dc_hard');       END IF;
    IF v_clubs >= v_total THEN earned := array_append(earned, 'dc_all');        END IF;
    IF v_both             THEN earned := array_append(earned, 'dc_both_sides'); END IF;
  END IF;

  IF v_sweep THEN earned := array_append(earned, 'dc_sweep'); END IF;
  IF v_comeback AND v_series_comeback THEN earned := array_append(earned, 'dc_comeback'); END IF;
  -- the final series is the archrival
  IF v_decider AND v_fin_w = 3 AND v_fin_l = 2 THEN earned := array_append(earned, 'dc_decider'); END IF;
  IF v_fin_w = 3 AND v_fin_l = 0 THEN earned := array_append(earned, 'dc_arch_sweep'); END IF;
  IF v_won >= 2 AND v_diff <> 'easy' AND v_club = ANY (v_underdog) THEN
    earned := array_append(earned, 'dc_underdog');
  END IF;
  -- the mode runs client-side, so this flag is trust-on-submit like the other
  -- client-run modes; at least one game won (sum of w over the series) is only a
  -- weak plausibility check
  IF v_supersub AND v_sum_w >= 1 THEN earned := array_append(earned, 'dc_super_sub'); END IF;

  WITH ins AS (
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING
    RETURNING achievement_key
  )
  SELECT COALESCE(array_agg(achievement_key), '{}') INTO fresh FROM ins;

  RETURN jsonb_build_object('achievements', to_jsonb(fresh));
END $$;

GRANT EXECUTE ON FUNCTION submit_derby_run(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION submit_derby_run(jsonb) FROM anon;
