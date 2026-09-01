-- The European knockouts: new badges for the ladder, and a fix for a function
-- that has never once awarded anything.
--
-- ── THE BUG ──────────────────────────────────────────────────────────────────
-- submit_europe_run was written as `earned := earned || 'eu_first'`. In plpgsql,
-- with `earned text[]` and an UNTYPED literal on the right, Postgres resolves ||
-- to anyarray || anyarray, tries to parse 'eu_first' as an array literal, and
-- raises 22P02 malformed array literal. The exception aborts the whole function.
--
-- So every European campaign that won even one qualifying tie threw, and the
-- client swallowed it in a bare catch. Nobody has ever held a single eu_* badge,
-- and nothing in the UI could have said so.
--
-- This is the same defect 20260823000005 fixed in submit_gauntlet_run and
-- award_career_achievements on 2026-08-23 — that migration simply did not reach
-- this function. array_append is unambiguous; `|| 'key'` must never come back.
--
-- ── WHAT IS NEW ──────────────────────────────────────────────────────────────
-- The campaign no longer stops at a table position: places 1-8 go straight to
-- the last 16, 9-24 play a knockout play-off, and the ladder runs to a final.
-- Two badges for that, because five knockout rounds had no recognition at all.

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('eu_final',   'ליל הגמר',           'הגע לגמר ליגת האלופות',                    '🌙', true),
  ('eu_bigears', 'האוזניים הגדולות',   'זכה בליגת האלופות',                        '🏆', true)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

CREATE OR REPLACE FUNCTION submit_europe_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid       uuid := auth.uid();
  -- four qualifying ties, and you cannot have won more than you played
  v_won     int  := LEAST(GREATEST(COALESCE((p->>'won_ties')::int, 0), 0), 4);
  -- a rank only exists if you got through all four; 0 means "did not qualify"
  v_rank    int  := LEAST(GREATEST(COALESCE((p->>'rank')::int, 0), 0), 36);
  v_pts     int  := LEAST(GREATEST(COALESCE((p->>'points')::int, 0), 0), 24);
  v_clean   boolean := COALESCE((p->>'clean_tie')::boolean, false);
  v_giant   boolean := COALESCE((p->>'beat_giant')::boolean, false);
  -- the knockout ladder: play-off, last 16, quarter, semi, final — five at most,
  -- and only four of them if a top-8 finish skipped the play-off round
  v_ko      int  := LEAST(GREATEST(COALESCE((p->>'ko_won')::int, 0), 0), 5);
  v_fin     boolean := COALESCE((p->>'reached_final')::boolean, false);
  v_cup     boolean := COALESCE((p->>'trophy')::boolean, false);
  v_qual    boolean := v_won = 4 AND v_rank BETWEEN 1 AND 36;
  -- nothing past the league phase can be true without having reached it, and the
  -- trophy cannot be true without the final. The campaign runs in the browser,
  -- so every one of these has to be checked here rather than trusted.
  v_deep    boolean := v_qual AND v_rank <= 24;
  earned    text[] := '{}';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;

  IF v_won >= 1 THEN earned := array_append(earned, 'eu_first');   END IF;
  IF v_won >= 3 THEN earned := array_append(earned, 'eu_playoff'); END IF;   -- three won = the play-off is tie four
  IF v_clean  THEN earned := array_append(earned, 'eu_clean');     END IF;
  IF v_qual   THEN earned := array_append(earned, 'eu_group');     END IF;

  IF v_qual AND v_pts >= 8              THEN earned := array_append(earned, 'eu_points');   END IF;
  IF v_qual AND v_rank BETWEEN 9 AND 24 THEN earned := array_append(earned, 'eu_knockout'); END IF;
  IF v_qual AND v_rank <= 8             THEN earned := array_append(earned, 'eu_top8');     END IF;
  IF v_qual AND v_giant                 THEN earned := array_append(earned, 'eu_giant');    END IF;

  IF v_deep AND v_fin              THEN earned := array_append(earned, 'eu_final');   END IF;
  IF v_deep AND v_cup AND v_fin AND v_ko >= 4
                                   THEN earned := array_append(earned, 'eu_bigears'); END IF;

  IF array_length(earned, 1) > 0 AND EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('achievements', to_jsonb(earned));
END;
$$;

GRANT EXECUTE ON FUNCTION submit_europe_run(jsonb) TO authenticated;
