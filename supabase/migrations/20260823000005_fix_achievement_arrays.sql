-- `earned := earned || 'gt_first'` does not append a string to a text[]. With an
-- untyped literal on the right, Postgres resolves || to anyarray || anyarray,
-- tries to read 'gt_first' AS an array, and raises 22P02 "malformed array
-- literal". The exception aborts the whole function — so every gauntlet run
-- that had won at least one fight was rolled back INSERT and all, while a run
-- with no wins never reached the line and saved perfectly.
--
-- That is why the board read 0/8 for everyone and why not one gt_* achievement
-- was ever awarded: the only runs the table could accept were the ones with
-- nothing to award. The same line was copied into the career function hours
-- ago, so it would have starved cr_* the same way.
--
-- array_append is unambiguous.

CREATE OR REPLACE FUNCTION submit_gauntlet_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid      uuid := auth.uid();
  v_depth  int  := LEAST(GREATEST(COALESCE((p->>'depth')::int, 0), 0), 8);
  v_banner int  := LEAST(GREATEST(COALESCE((p->>'banner')::int, 0), 0), 5);
  v_clear  boolean := COALESCE((p->>'cleared')::boolean, false) AND v_depth = 8;
  v_sign   int  := GREATEST(COALESCE((p->>'signings')::int, 0), 0);
  v_relics text[] := COALESCE(ARRAY(SELECT jsonb_array_elements_text(p->'relics')), '{}');
  v_elite  boolean := COALESCE((p->>'beat_elite')::boolean, false);
  v_rid    text := NULLIF(left(COALESCE(p->>'rid', ''), 40), '');
  v_ended  boolean := COALESCE((p->>'ended')::boolean, true);
  earned   text[] := '{}';
  run_id   uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;

  INSERT INTO gauntlet_runs (user_id, rid, ended, depth, cleared, banner, team_ovr,
                             coins, signings, relics, squad, log)
  VALUES (uid, v_rid, v_ended, v_depth, v_clear, v_banner,
          LEAST(GREATEST(COALESCE((p->>'team_ovr')::int, 0), 0), 99),
          GREATEST(COALESCE((p->>'coins')::int, 0), 0),
          v_sign, v_relics, p->'squad', p->'log')
  ON CONFLICT (user_id, rid) DO UPDATE
    SET depth    = GREATEST(gauntlet_runs.depth, EXCLUDED.depth),
        cleared  = gauntlet_runs.cleared OR EXCLUDED.cleared,
        ended    = EXCLUDED.ended,
        banner   = EXCLUDED.banner,
        team_ovr = EXCLUDED.team_ovr,
        coins    = EXCLUDED.coins,
        signings = EXCLUDED.signings,
        relics   = EXCLUDED.relics,
        squad    = EXCLUDED.squad,
        log      = EXCLUDED.log
  RETURNING id INTO run_id;

  IF v_depth >= 1 THEN earned := array_append(earned, 'gt_first');     END IF;
  IF v_depth >= 5 THEN earned := array_append(earned, 'gt_depth5');    END IF;
  IF v_elite       THEN earned := array_append(earned, 'gt_elite');    END IF;
  IF v_clear       THEN earned := array_append(earned, 'gt_cleared');  END IF;
  IF v_clear AND v_banner >= 3 THEN earned := array_append(earned, 'gt_banner3'); END IF;
  IF v_clear AND v_sign = 0    THEN earned := array_append(earned, 'gt_loyal');   END IF;
  IF array_length(v_relics, 1) >= 5 THEN earned := array_append(earned, 'gt_collector'); END IF;

  IF array_length(earned, 1) > 0 AND EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('id', run_id, 'achievements', to_jsonb(earned));
END;
$$;

GRANT EXECUTE ON FUNCTION submit_gauntlet_run(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION award_career_achievements(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid       uuid := auth.uid();
  v_seasons int  := LEAST(GREATEST(COALESCE((p->>'seasons')::int, 0), 0), 10);
  v_titles  int  := LEAST(GREATEST(COALESCE((p->>'titles')::int, 0), 0), v_seasons);
  v_stay    int  := LEAST(GREATEST(COALESCE((p->>'longest_stay')::int, 0), 0), v_seasons);
  v_fin     boolean := COALESCE((p->>'finished')::boolean, false) AND v_seasons >= 10;
  v_releg   boolean := COALESCE((p->>'relegated')::boolean, false);
  earned    text[] := '{}';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;

  IF v_seasons >= 1 THEN earned := array_append(earned, 'cr_first');     END IF;
  IF v_titles  >= 1 THEN earned := array_append(earned, 'cr_title');     END IF;
  IF v_titles  >= 3 THEN earned := array_append(earned, 'cr_dynasty');   END IF;
  IF v_stay    >= 5 THEN earned := array_append(earned, 'cr_loyal');     END IF;
  IF v_fin          THEN earned := array_append(earned, 'cr_survivor');  END IF;
  IF v_releg        THEN earned := array_append(earned, 'cr_relegated'); END IF;

  IF array_length(earned, 1) IS NULL THEN
    RETURN jsonb_build_object('achievements', '[]'::jsonb);
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('achievements', to_jsonb(earned));
END $$;

GRANT EXECUTE ON FUNCTION award_career_achievements(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION award_career_achievements(jsonb) FROM anon;
