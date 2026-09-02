-- Achievements were announcing themselves on every run, not on the first one.
--
-- Both functions built `earned` as "everything this run qualifies for", inserted
-- it with ON CONFLICT DO NOTHING, and then returned the whole list. The insert
-- was already idempotent — the badge was awarded once — but the RETURN was not,
-- so the client popped a toast for the same badge every single season.
--
-- The fix is to return what the INSERT actually wrote. `RETURNING` on a statement
-- with ON CONFLICT DO NOTHING yields only the rows that were really inserted,
-- which is exactly "new to this player".
--
-- Note this also means the response is now empty on a repeat run, which is what
-- the client already expects: it only shows toasts when the array is non-empty.

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
    -- only what was really written comes back
    WITH ins AS (
      INSERT INTO user_achievements (user_id, achievement_key)
      SELECT uid, k FROM unnest(earned) AS k
      ON CONFLICT DO NOTHING
      RETURNING achievement_key
    )
    SELECT COALESCE(array_agg(achievement_key), '{}') INTO fresh FROM ins;

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
      ON CONFLICT DO NOTHING
      RETURNING achievement_key
    )
    SELECT COALESCE(array_agg(achievement_key), '{}') INTO fresh FROM ins;
  END IF;

  RETURN jsonb_build_object('achievements', to_jsonb(fresh));
END;
$$;

GRANT EXECUTE ON FUNCTION submit_cup_run(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION submit_cup_run(jsonb) FROM anon;


-- submit_gauntlet_run — the same defect, the same fix.
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
  fresh     text[] := '{}';
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
    WITH ins AS (
      INSERT INTO user_achievements (user_id, achievement_key)
      SELECT uid, k FROM unnest(earned) AS k
      ON CONFLICT DO NOTHING
      RETURNING achievement_key
    )
    SELECT COALESCE(array_agg(achievement_key), '{}') INTO fresh FROM ins;
  END IF;

  RETURN jsonb_build_object('id', run_id, 'achievements', to_jsonb(fresh));
END;
$$;

-- award_career_achievements — the same defect, the same fix.
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
  fresh     text[] := '{}';
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

GRANT EXECUTE ON FUNCTION submit_gauntlet_run(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION award_career_achievements(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION award_career_achievements(jsonb) FROM anon;
