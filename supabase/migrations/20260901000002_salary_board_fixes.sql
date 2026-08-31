-- Two holes the end-to-end check found in 20260901000001, both worth naming.
--
-- 1. The board returned nothing. salary_runs has RLS on with no policies, and
--    salary_board is plain SQL, so it ran as the CALLER and read zero rows. The
--    career board avoided this with an explicit public SELECT policy; this one
--    takes the same route, so the shape of the two boards stays the same.
--
-- 2. Worse: clamping SANITISED a bogus claim into a record. A submission of
--    40 wins was clamped to 36 and stored as a perfect 36-0 season — the check
--    ran on the clamped values, so an impossible claim became the best result
--    on the board instead of being refused. Out-of-range input is now rejected
--    rather than rounded into legality.

DROP POLICY IF EXISTS "salary runs are public" ON salary_runs;
CREATE POLICY "salary runs are public" ON salary_runs FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION submit_salary_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid    uuid := auth.uid();
  v_diff text := lower(COALESCE(p->>'difficulty', 'normal'));
  -- read RAW, judge, then store. No clamp may turn a false claim into a true one.
  v_bud  int  := COALESCE((p->>'budget')::int, -1);
  v_spent int := COALESCE((p->>'spent')::int, -1);
  v_free int  := COALESCE((p->>'free_agents')::int, 0);
  v_ovr  int  := COALESCE((p->>'ovr')::int, -1);
  v_w    int  := COALESCE((p->>'wins')::int, -1);
  v_d    int  := COALESCE((p->>'draws')::int, -1);
  v_l    int  := COALESCE((p->>'losses')::int, -1);
  v_gf   int  := COALESCE((p->>'gf')::int, 0);
  v_ga   int  := COALESCE((p->>'ga')::int, 0);
  v_games int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;
  IF v_diff NOT IN ('easy','normal','hard') THEN
    RETURN jsonb_build_object('error', 'bad difficulty');
  END IF;
  -- 36 in the modern format, fewer in the historical ones; nothing above 36.
  v_games := v_w + v_d + v_l;
  IF v_w < 0 OR v_d < 0 OR v_l < 0 OR v_games < 1 OR v_games > 36 THEN
    RETURN jsonb_build_object('error', 'not a season');
  END IF;
  -- the budgets are 12 / 20 / 28; anything else did not come from the game
  IF v_bud NOT IN (12, 20, 28) THEN
    RETURN jsonb_build_object('error', 'bad budget');
  END IF;
  IF v_spent < 0 OR v_spent > v_bud THEN
    RETURN jsonb_build_object('error', 'bad spend');
  END IF;
  IF v_ovr < 1 OR v_ovr > 99 OR v_free < 0 OR v_free > 11
     OR v_gf < 0 OR v_gf > 300 OR v_ga < 0 OR v_ga > 300 THEN
    RETURN jsonb_build_object('error', 'out of range');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    RETURN jsonb_build_object('error', 'no profile');
  END IF;

  INSERT INTO salary_runs (user_id, difficulty, budget, spent, free_agents,
                           ovr, points, wins, draws, losses, gf, ga)
  VALUES (uid, v_diff, v_bud, v_spent, v_free, v_ovr,
          v_w * 3 + v_d, v_w, v_d, v_l, v_gf, v_ga);

  RETURN jsonb_build_object('points', v_w * 3 + v_d);
END $$;

GRANT EXECUTE ON FUNCTION submit_salary_run(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION submit_salary_run(jsonb) FROM anon;

-- the bogus row the first version accepted, before anyone can see it
DELETE FROM salary_runs WHERE wins = 36 AND draws = 0 AND losses = 0 AND spent = 28;
