-- A board for תקרת שכר, and the two modes whose telemetry was being thrown away.
--
-- track() drops an unknown mode by design, and 'salarycap' and 'install' were
-- never added to the list — so every open of the salary-cap card and every view
-- of the install prompt has been silently discarded since they shipped. Both are
-- added here; the events already fire from the client.

CREATE OR REPLACE FUNCTION track(p jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cid   uuid := NULLIF(p->>'client_id', '')::uuid;
  v_uid   uuid := auth.uid();
  v_mode  text := lower(COALESCE(p->>'mode', ''));
  v_event text := lower(COALESCE(p->>'event', ''));
BEGIN
  IF v_cid IS NULL THEN RETURN; END IF;
  IF v_mode NOT IN ('draft','challenge','career','minigame','gauntlet','europe',
                    'duel','league','entry','salarycap','install')
     OR v_event NOT IN ('open','finish','share','progress')
  THEN RETURN; END IF;

  INSERT INTO usage_events (client_id, user_id, mode, event, detail)
  VALUES (v_cid, v_uid, v_mode, v_event,
          NULLIF(left(COALESCE(p->>'detail', ''), 40), ''));
END $$;

GRANT EXECUTE ON FUNCTION track(jsonb) TO anon, authenticated;

-- ── the board ────────────────────────────────────────────────────────────────
-- A capped season is a season played under a spending limit, so the thing worth
-- ranking is not points alone — easy has 28M and hard has 12, and points alone
-- would just rank the budgets. Points first, then the CHEAPER squad wins the
-- tie, which is the question the mode actually asks.
CREATE TABLE IF NOT EXISTS salary_runs (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  difficulty  text NOT NULL,
  budget      int  NOT NULL,
  spent       int  NOT NULL,
  free_agents int  NOT NULL DEFAULT 0,
  ovr         int  NOT NULL,
  points      int  NOT NULL,
  wins        int  NOT NULL,
  draws       int  NOT NULL,
  losses      int  NOT NULL,
  gf          int  NOT NULL DEFAULT 0,
  ga          int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salary_runs_board_idx
  ON salary_runs (points DESC, spent ASC, created_at ASC);

ALTER TABLE salary_runs ENABLE ROW LEVEL SECURITY;
-- no policies: reads and writes go through the two functions below

-- Every number is clamped rather than trusted. The client can say it played a
-- capped season; it cannot say it took 40 points from 36 games.
CREATE OR REPLACE FUNCTION submit_salary_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid    uuid := auth.uid();
  v_diff text := lower(COALESCE(p->>'difficulty', 'normal'));
  v_bud  int  := LEAST(GREATEST(COALESCE((p->>'budget')::int, 0), 0), 40);
  v_spent int := LEAST(GREATEST(COALESCE((p->>'spent')::int, 0), 0), v_bud);
  v_free int  := LEAST(GREATEST(COALESCE((p->>'free_agents')::int, 0), 0), 11);
  v_ovr  int  := LEAST(GREATEST(COALESCE((p->>'ovr')::int, 0), 0), 99);
  v_w    int  := LEAST(GREATEST(COALESCE((p->>'wins')::int, 0), 0), 36);
  v_d    int  := LEAST(GREATEST(COALESCE((p->>'draws')::int, 0), 0), 36);
  v_l    int  := LEAST(GREATEST(COALESCE((p->>'losses')::int, 0), 0), 36);
  v_gf   int  := LEAST(GREATEST(COALESCE((p->>'gf')::int, 0), 0), 300);
  v_ga   int  := LEAST(GREATEST(COALESCE((p->>'ga')::int, 0), 0), 300);
  v_pts  int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;
  IF v_diff NOT IN ('easy','normal','hard') THEN v_diff := 'normal'; END IF;
  IF v_bud < 1 OR (v_w + v_d + v_l) < 1 OR (v_w + v_d + v_l) > 36 THEN
    RETURN jsonb_build_object('error', 'not a season');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    RETURN jsonb_build_object('error', 'no profile');
  END IF;

  v_pts := v_w * 3 + v_d;                       -- derived, never taken on trust

  INSERT INTO salary_runs (user_id, difficulty, budget, spent, free_agents,
                           ovr, points, wins, draws, losses, gf, ga)
  VALUES (uid, v_diff, v_bud, v_spent, v_free, v_ovr, v_pts, v_w, v_d, v_l, v_gf, v_ga);

  RETURN jsonb_build_object('points', v_pts);
END $$;

GRANT EXECUTE ON FUNCTION submit_salary_run(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION submit_salary_run(jsonb) FROM anon;

-- One row per player — his best — so nobody can carpet the board by replaying.
CREATE OR REPLACE FUNCTION salary_board(p_limit int DEFAULT 50)
RETURNS TABLE (
  rank bigint, user_id uuid, username text, difficulty text,
  budget int, spent int, free_agents int, ovr int,
  points int, wins int, draws int, losses int
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH best AS (
    SELECT DISTINCT ON (s.user_id)
           s.user_id, s.difficulty, s.budget, s.spent, s.free_agents,
           s.ovr, s.points, s.wins, s.draws, s.losses, s.created_at
      FROM salary_runs s
     ORDER BY s.user_id, s.points DESC, s.spent ASC, s.created_at ASC
  )
  SELECT row_number() OVER (ORDER BY b.points DESC, b.spent ASC, b.created_at ASC),
         b.user_id, p.username, b.difficulty,
         b.budget, b.spent, b.free_agents, b.ovr,
         b.points, b.wins, b.draws, b.losses
    FROM best b
    JOIN profiles p ON p.id = b.user_id
   ORDER BY b.points DESC, b.spent ASC, b.created_at ASC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

GRANT EXECUTE ON FUNCTION salary_board(int) TO anon, authenticated;
