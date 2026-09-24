-- מצב סיפור, round two: six more chapters (hta-2009, beitar-2007, aco-2017,
-- reineh-2025, b7-2016, mta-2013). Both server functions check the chapter
-- against a list, so both are redefined — each body COPIED from its previous
-- migration (20260923000002, 20260923000003) with only v_known extended.
-- scripts/sim/story_test.js compares the newest list with STORY_CHAPTERS.

CREATE OR REPLACE FUNCTION award_story_achievements(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid        uuid    := auth.uid();
  -- the chapters that exist (js/story-data.js); anything else earns nothing
  v_known    text[]  := ARRAY['b7-2015','ks-2011','netanya-2007','netanya-2015','hj-1999','haifa-2020',
                              'hta-2001','haifa-2002','haifa-2009','mta-2002','mta-2004',
                              'hta-2009','beitar-2007','aco-2017','reineh-2025','b7-2016','mta-2013'];
  v_chapter  text    := COALESCE(p->>'chapter', '');
  v_stars    int     := LEAST(GREATEST(COALESCE((p->>'stars')::int, 0), 0), 3);
  v_cup      boolean := COALESCE((p->>'champion')::boolean, false);
  v_bargain  boolean := COALESCE((p->>'bargain')::boolean, false);
  v_total    int     := array_length(v_known, 1);
  v_starred  int     := LEAST(GREATEST(COALESCE((p->>'starred')::int, 0), 0), v_total);
  earned     text[]  := '{}';
  fresh      text[]  := '{}';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;
  IF NOT (v_chapter = ANY (v_known)) THEN
    RETURN jsonb_build_object('achievements', '[]'::jsonb);
  END IF;

  earned := array_append(earned, 'sm_first');
  IF v_stars >= 1 THEN earned := array_append(earned, 'sm_star');  END IF;
  IF v_stars  = 3 THEN earned := array_append(earned, 'sm_three'); END IF;
  IF v_chapter = 'ks-2011'    AND v_stars >= 1 THEN earned := array_append(earned, 'sm_miracle');  END IF;
  IF v_chapter = 'hj-1999'    AND v_stars >= 1 THEN earned := array_append(earned, 'sm_survivor'); END IF;
  IF v_chapter = 'hta-2001'   AND v_stars >= 2 THEN earned := array_append(earned, 'sm_milan');    END IF;
  IF v_chapter = 'hta-2001'   AND v_cup        THEN earned := array_append(earned, 'sm_rotterdam'); END IF;
  IF v_chapter = 'haifa-2009' AND v_stars >= 1 THEN earned := array_append(earned, 'sm_zero');     END IF;
  IF v_bargain                                  THEN earned := array_append(earned, 'sm_bargain');  END IF;
  IF v_starred >= v_total                       THEN earned := array_append(earned, 'sm_collector'); END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    WITH ins AS (
      INSERT INTO user_achievements (user_id, achievement_key)
      SELECT uid, k FROM unnest(earned) AS k
      ON CONFLICT DO NOTHING
      RETURNING achievement_key
    )
    SELECT COALESCE(array_agg(achievement_key), '{}') INTO fresh FROM ins;
  END IF;

  RETURN jsonb_build_object('achievements', to_jsonb(fresh));
END $$;

CREATE OR REPLACE FUNCTION submit_story_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid       uuid := auth.uid();
  -- the chapters that exist (js/story-data.js); a test keeps this list in step
  v_known   text[] := ARRAY['b7-2015','ks-2011','netanya-2007','netanya-2015','hj-1999','haifa-2020',
                              'hta-2001','haifa-2002','haifa-2009','mta-2002','mta-2004',
                              'hta-2009','beitar-2007','aco-2017','reineh-2025','b7-2016','mta-2013'];
  v_chapter text := COALESCE(p->>'chapter', '');
  v_stars   int  := LEAST(GREATEST(COALESCE((p->>'stars')::int, 0), 0), 3);
  -- a score is stars × 1000 plus a few hundred either way; nothing real passes these
  v_score   int  := LEAST(GREATEST(COALESCE((p->>'score')::int, 0), -20000), 6000);
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;
  IF NOT (v_chapter = ANY (v_known)) THEN RETURN jsonb_build_object('error', 'no such chapter'); END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    RETURN jsonb_build_object('error', 'no profile');
  END IF;
  INSERT INTO story_runs (user_id, chapter, score, stars) VALUES (uid, v_chapter, v_score, v_stars);
  RETURN jsonb_build_object('score', v_score);
END $$;
