-- אלופי הדרבי: the runs, six achievements, and 'derby' in track().
--
-- The mode runs in the browser, so what reaches the server is clamped and
-- checked against the clubs that exist (js/derby-data.js derbyClubs(); a test in
-- scripts/sim/derby_test.js keeps v_known equal to it) — never trusted as given.
-- `xi` is stored from day one as the raw material for the fans' XI (spec §8);
-- nothing reads it and it is shown to no one until the owner approves.
--
-- array_append, never `earned || 'key'` (20260831000001: an untyped literal on
-- the right parses as an array and aborts the whole function).

CREATE TABLE IF NOT EXISTS derby_runs (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club        text NOT NULL,
  difficulty  text NOT NULL,
  wins        int  NOT NULL,
  losses      int  NOT NULL,
  won         boolean NOT NULL,
  xi          jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS derby_runs_club_idx ON derby_runs (club, created_at DESC);
ALTER TABLE derby_runs ENABLE ROW LEVEL SECURITY;
-- no policies: rows are written by submit_derby_run only

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('dc_first',    'אלופי הדרבי',  'נצח בסדרת דרבי',                              '🏆', false),
  ('dc_sweep',    'טאטוא',        'נצח סדרת דרבי 3:0',                           '🧹', false),
  ('dc_comeback', 'קאמבק',        'נצח סדרת דרבי אחרי פיגור 0:2',                '🔥', false),
  ('dc_decider',  'משחק חמישי',   'נצח את היריבה המושבעת במשחק החמישי',           '⚔️', false),
  ('dc_hard',     'בלי הנחות',    'נצח סדרת דרבי ברמה קשה',                      '💪', false),
  ('dc_all',      'כל הדרבים',    'נצח סדרת דרבי עם כל אחד מהמועדונים',           '🌍', false)
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
                              'maccabi-netanya','maccabi-pt','bnei-sakhnin','hapoel-beersheba','hapoel-haifa',
                              'bnei-yehuda','ironi-ks','hapoel-pt'];
  v_club     text    := COALESCE(p->>'club', '');
  v_diff     text    := COALESCE(p->>'difficulty', '');
  v_w        int     := LEAST(GREATEST(COALESCE((p->>'wins')::int, 0), 0), 3);
  v_l        int     := LEAST(GREATEST(COALESCE((p->>'losses')::int, 0), 0), 3);
  v_comeback boolean := COALESCE((p->>'comeback')::boolean, false);
  v_decider  boolean := COALESCE((p->>'decider')::boolean, false);
  v_total    int     := array_length(v_known, 1);
  v_clubs    int     := LEAST(GREATEST(COALESCE((p->>'won_clubs')::int, 0), 0), v_total);
  v_xi       jsonb   := CASE WHEN jsonb_typeof(p->'xi') = 'array' AND jsonb_array_length(p->'xi') <= 11
                             THEN p->'xi' ELSE '[]'::jsonb END;
  v_won      boolean;
  earned     text[]  := '{}';
  fresh      text[]  := '{}';
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;
  IF NOT (v_club = ANY (v_known)) OR v_diff NOT IN ('easy','normal','hard') THEN
    RETURN jsonb_build_object('error', 'bad run');
  END IF;
  -- a finished best-of-5 has exactly one side on three
  IF NOT ((v_w = 3 AND v_l < 3) OR (v_l = 3 AND v_w < 3)) THEN
    RETURN jsonb_build_object('error', 'bad series');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    RETURN jsonb_build_object('error', 'no profile');
  END IF;
  v_won := v_w = 3;

  INSERT INTO derby_runs (user_id, club, difficulty, wins, losses, won, xi)
  VALUES (uid, v_club, v_diff, v_w, v_l, v_won, v_xi);

  IF v_won THEN
    earned := array_append(earned, 'dc_first');
    IF v_l = 0                    THEN earned := array_append(earned, 'dc_sweep');    END IF;
    IF v_comeback AND v_l = 2     THEN earned := array_append(earned, 'dc_comeback'); END IF;
    IF v_decider AND v_l = 2      THEN earned := array_append(earned, 'dc_decider');  END IF;
    IF v_diff = 'hard'            THEN earned := array_append(earned, 'dc_hard');     END IF;
    IF v_clubs >= v_total         THEN earned := array_append(earned, 'dc_all');      END IF;
  END IF;

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
