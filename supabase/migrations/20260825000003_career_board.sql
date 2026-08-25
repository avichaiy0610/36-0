-- The dynasty board.
--
-- 145 careers were completed on the day the mode's telemetry first ran, and not
-- one of them was measured against anybody. The run itself still never leaves
-- the browser — ten seasons of squad state is the player's business — so what
-- lands here is only the shape of a finished dynasty: how long it lasted, how
-- many titles it won, and how it ended.
--
-- One row per player: their best dynasty, not their last. A run replaces the
-- stored one only when it is better by the board's own order — titles first,
-- because titles are what a dynasty is judged on, then points, then seasons.

CREATE TABLE IF NOT EXISTS career_runs (
  user_id      uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  club_name    text NOT NULL,
  start_year   int  NOT NULL,
  seasons      int  NOT NULL CHECK (seasons BETWEEN 1 AND 10),
  titles       int  NOT NULL CHECK (titles >= 0),
  points       int  NOT NULL CHECK (points >= 0),
  best_rank    int,
  longest_stay int  NOT NULL DEFAULT 0,
  finished     boolean NOT NULL DEFAULT false,
  relegated    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- the board's order, in one place
CREATE INDEX IF NOT EXISTS career_runs_board_idx
  ON career_runs (titles DESC, points DESC, seasons DESC, created_at ASC);

ALTER TABLE career_runs ENABLE ROW LEVEL SECURITY;
-- Readable by everyone (it is a leaderboard); written only through the RPC
-- below, which clamps every value it stores.
DROP POLICY IF EXISTS "career runs are public" ON career_runs;
CREATE POLICY "career runs are public" ON career_runs FOR SELECT USING (true);

-- ── recording a dynasty ─────────────────────────────────────────────────────
-- Called when a run ends, cleared or relegated. Every number is clamped here:
-- the client can claim a career, it cannot claim eleven seasons or more titles
-- than seasons. The club name is the player's own text, so it is trimmed to the
-- same length the input allows and stripped of line breaks.
CREATE OR REPLACE FUNCTION submit_career_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid       uuid := auth.uid();
  v_seasons int  := LEAST(GREATEST(COALESCE((p->>'seasons')::int, 0), 1), 10);
  v_titles  int;
  v_points  int  := LEAST(GREATEST(COALESCE((p->>'points')::int, 0), 0), 10 * 120);
  v_rank    int  := NULLIF(LEAST(GREATEST(COALESCE((p->>'best_rank')::int, 0), 0), 20), 0);
  v_stay    int;
  v_club    text := NULLIF(btrim(left(regexp_replace(COALESCE(p->>'club_name', ''), '[\r\n\t]', ' ', 'g'), 24)), '');
  v_start   int  := LEAST(GREATEST(COALESCE((p->>'start_year')::int, 1999), 1990), 2100);
  v_fin     boolean := COALESCE((p->>'finished')::boolean, false);
  v_rel     boolean := COALESCE((p->>'relegated')::boolean, false);
  improved  boolean := false;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    RETURN jsonb_build_object('error', 'no profile');
  END IF;

  v_titles := LEAST(GREATEST(COALESCE((p->>'titles')::int, 0), 0), v_seasons);
  v_stay   := LEAST(GREATEST(COALESCE((p->>'longest_stay')::int, 0), 0), v_seasons);

  INSERT INTO career_runs (user_id, club_name, start_year, seasons, titles, points,
                           best_rank, longest_stay, finished, relegated)
  VALUES (uid, COALESCE(v_club, 'המועדון שלי'), v_start, v_seasons, v_titles, v_points,
          v_rank, v_stay, v_fin, v_rel)
  ON CONFLICT (user_id) DO UPDATE
    SET club_name    = EXCLUDED.club_name,
        start_year   = EXCLUDED.start_year,
        seasons      = EXCLUDED.seasons,
        titles       = EXCLUDED.titles,
        points       = EXCLUDED.points,
        best_rank    = EXCLUDED.best_rank,
        longest_stay = EXCLUDED.longest_stay,
        finished     = EXCLUDED.finished,
        relegated    = EXCLUDED.relegated,
        created_at   = now()
    WHERE (EXCLUDED.titles, EXCLUDED.points, EXCLUDED.seasons)
        > (career_runs.titles, career_runs.points, career_runs.seasons)
  RETURNING true INTO improved;

  RETURN jsonb_build_object('best', COALESCE(improved, false));
END $$;

REVOKE ALL ON FUNCTION submit_career_run(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_career_run(jsonb) TO authenticated;

-- ── reading it ──────────────────────────────────────────────────────────────
-- Usernames live on profiles, so the board joins them here rather than making
-- every client do it.
CREATE OR REPLACE FUNCTION career_board(p_limit int DEFAULT 50)
RETURNS TABLE (
  rank bigint, user_id uuid, username text, club_name text,
  seasons int, titles int, points int, best_rank int,
  longest_stay int, finished boolean, relegated boolean
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT row_number() OVER (ORDER BY c.titles DESC, c.points DESC, c.seasons DESC, c.created_at ASC),
         c.user_id, p.username, c.club_name,
         c.seasons, c.titles, c.points, c.best_rank,
         c.longest_stay, c.finished, c.relegated
    FROM career_runs c
    JOIN profiles p ON p.id = c.user_id
   ORDER BY c.titles DESC, c.points DESC, c.seasons DESC, c.created_at ASC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

GRANT EXECUTE ON FUNCTION career_board(int) TO anon, authenticated;
