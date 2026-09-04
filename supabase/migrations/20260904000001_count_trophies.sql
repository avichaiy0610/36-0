-- Count the silverware, don't just remember that it happened.
--
-- The profile could only say "this account HOLDS the State Cup", never "has won
-- it four times". `times_earned` exists on user_achievements and is maintained
-- by the season edge function through increment_achievements() — but the cup and
-- the European runs insert their badges here, with ON CONFLICT DO NOTHING, so a
-- second cup was recorded nowhere at all.
--
-- WHY ONLY A WHITELIST GETS COUNTED. Both functions are called with whatever the
-- run currently qualifies for, and one of them is called REPEATEDLY:
-- euSubmit() fires after every tie, so incrementing every key it passes would
-- count eu_first once per round of a single campaign. Only keys that can be
-- reached exactly once per run are safe to increment:
--
--   cup_win     submit_cup_run is guarded by _run.submitted, which is saved with
--               the cup — one call per cup run, and the key is only present when
--               that run was won.
--   eu_bigears  the three trophies need v_deep AND v_cup AND v_fin AND ko>=3,
--   eu_uel      which is the terminal state of a campaign. euSubmit's own
--   eu_uecl     `done <= c.submitted` guard then blocks any further call.
--
-- Everything else keeps ON CONFLICT DO NOTHING and stays a badge you either have
-- or do not. cup_double and cup_giantkill are deliberately NOT counted: the
-- double is a landmark, not a tally, and the giant-killing is a wooden spoon.
--
-- RETURNING still yields only what is NEW, so the client keeps toasting a badge
-- once and only once — `xmax = 0` is true for a row that was inserted and false
-- for one that was updated, which is exactly the distinction the previous
-- migration (20260902000001) was written to preserve.

CREATE OR REPLACE FUNCTION submit_cup_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid      uuid := auth.uid();
  v_won    boolean := COALESCE((p->>'won')::boolean, false);
  v_rank   int  := LEAST(GREATEST(COALESCE((p->>'rank')::int, 0), 0), 20);
  v_bytier int  := LEAST(GREATEST(COALESCE((p->>'out_to_tier')::int, 0), 0), 2);
  earned   text[] := '{}';
  fresh    text[] := '{}';
  countable text[] := ARRAY['cup_win'];
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;

  IF v_won THEN earned := array_append(earned, 'cup_win'); END IF;
  IF v_won AND v_rank = 1 THEN earned := array_append(earned, 'cup_double'); END IF;
  IF NOT v_won AND v_bytier > 0 THEN earned := array_append(earned, 'cup_giantkill'); END IF;

  IF array_length(earned, 1) > 0 AND EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    WITH ins AS (
      INSERT INTO user_achievements (user_id, achievement_key)
      SELECT uid, k FROM unnest(earned) AS k
      ON CONFLICT (user_id, achievement_key) DO UPDATE
        SET times_earned = user_achievements.times_earned
                         + CASE WHEN EXCLUDED.achievement_key = ANY(countable) THEN 1 ELSE 0 END
      RETURNING achievement_key, (xmax = 0) AS is_new
    )
    SELECT COALESCE(array_agg(achievement_key) FILTER (WHERE is_new), '{}') INTO fresh FROM ins;
  END IF;

  RETURN jsonb_build_object('achievements', to_jsonb(fresh));
END;
$$;

GRANT EXECUTE ON FUNCTION submit_cup_run(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION submit_cup_run(jsonb) FROM anon;


CREATE OR REPLACE FUNCTION submit_europe_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid       uuid := auth.uid();
  v_tier    text := COALESCE(p->>'tier', 'ucl');
  v_won     int  := LEAST(GREATEST(COALESCE((p->>'won_ties')::int, 0), 0), 4);
  v_rank    int  := LEAST(GREATEST(COALESCE((p->>'rank')::int, 0), 0), 36);
  v_pts     int  := LEAST(GREATEST(COALESCE((p->>'points')::int, 0), 0), 24);
  v_clean   boolean := COALESCE((p->>'clean_tie')::boolean, false);
  v_giant   boolean := COALESCE((p->>'beat_giant')::boolean, false);
  v_ko      int  := LEAST(GREATEST(COALESCE((p->>'ko_won')::int, 0), 0), 5);
  v_fin     boolean := COALESCE((p->>'reached_final')::boolean, false);
  v_cup     boolean := COALESCE((p->>'trophy')::boolean, false);
  v_para    boolean := COALESCE((p->>'parachuted')::boolean, false);
  v_allq    int  := CASE WHEN v_tier = 'uecl' THEN 3 ELSE 4 END;
  v_qual    boolean := COALESCE((p->>'reached_league')::boolean, v_won >= v_allq)
                       AND v_rank BETWEEN 1 AND 36;
  v_deep    boolean := v_qual AND v_rank <= 24;
  earned    text[] := '{}';
  fresh     text[] := '{}';
  countable text[] := ARRAY['eu_bigears', 'eu_uel', 'eu_uecl'];
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;
  IF v_tier NOT IN ('ucl', 'uel', 'uecl') THEN v_tier := 'ucl'; END IF;

  IF v_won >= 1 THEN earned := array_append(earned, 'eu_first');   END IF;
  IF v_won >= v_allq - 1 THEN earned := array_append(earned, 'eu_playoff'); END IF;
  IF v_clean  THEN earned := array_append(earned, 'eu_clean');     END IF;
  IF v_qual   THEN earned := array_append(earned, 'eu_group');     END IF;
  IF v_qual AND v_pts >= 8              THEN earned := array_append(earned, 'eu_points');   END IF;
  IF v_qual AND v_rank BETWEEN 9 AND 24 THEN earned := array_append(earned, 'eu_knockout'); END IF;
  IF v_qual AND v_rank <= 8             THEN earned := array_append(earned, 'eu_top8');     END IF;
  IF v_qual AND v_giant                 THEN earned := array_append(earned, 'eu_giant');    END IF;
  IF v_deep AND v_fin                   THEN earned := array_append(earned, 'eu_final');    END IF;

  IF v_deep AND v_cup AND v_fin AND v_ko >= 3 THEN
    IF    v_tier = 'ucl'  THEN earned := array_append(earned, 'eu_bigears');
    ELSIF v_tier = 'uel'  THEN earned := array_append(earned, 'eu_uel');
    ELSE                       earned := array_append(earned, 'eu_uecl');
    END IF;
    IF v_para THEN earned := array_append(earned, 'eu_phoenix'); END IF;
  END IF;

  IF array_length(earned, 1) > 0 AND EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    WITH ins AS (
      INSERT INTO user_achievements (user_id, achievement_key)
      SELECT uid, k FROM unnest(earned) AS k
      ON CONFLICT (user_id, achievement_key) DO UPDATE
        SET times_earned = user_achievements.times_earned
                         + CASE WHEN EXCLUDED.achievement_key = ANY(countable) THEN 1 ELSE 0 END
      RETURNING achievement_key, (xmax = 0) AS is_new
    )
    SELECT COALESCE(array_agg(achievement_key) FILTER (WHERE is_new), '{}') INTO fresh FROM ins;

    -- all three trophies, however many seasons it took
    IF EXISTS (
      SELECT 1 FROM user_achievements
      WHERE user_id = uid AND achievement_key IN ('eu_bigears', 'eu_uel', 'eu_uecl')
      GROUP BY user_id HAVING COUNT(DISTINCT achievement_key) = 3
    ) THEN
      WITH ins2 AS (
        INSERT INTO user_achievements (user_id, achievement_key)
        VALUES (uid, 'eu_treble')
        ON CONFLICT DO NOTHING
        RETURNING achievement_key
      )
      SELECT fresh || COALESCE(array_agg(achievement_key), '{}') INTO fresh FROM ins2;
    END IF;
  END IF;

  RETURN jsonb_build_object('achievements', to_jsonb(fresh));
END;
$$;

GRANT EXECUTE ON FUNCTION submit_europe_run(jsonb) TO authenticated;
