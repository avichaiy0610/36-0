-- מצב סיפור: a leaderboard per chapter.
--
-- Everyone in a chapter starts from the same squad, budget and seedless rules,
-- so the comparison is fair. The mode runs in the browser, so — as with the
-- salary cap (20260901000001) — what reaches the server is clamped and checked
-- against the chapters that exist, never trusted as given. The board shows each
-- player's best run per chapter.

CREATE TABLE IF NOT EXISTS story_runs (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter     text NOT NULL,
  score       int  NOT NULL,
  stars       int  NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS story_runs_board_idx
  ON story_runs (chapter, score DESC, stars DESC, created_at ASC);
ALTER TABLE story_runs ENABLE ROW LEVEL SECURITY;
-- no policies: rows are written by submit_story_run and read by story_board only

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
                            'hta-2001','haifa-2002','haifa-2009','mta-2002','mta-2004'];
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

GRANT EXECUTE ON FUNCTION submit_story_run(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION submit_story_run(jsonb) FROM anon;

-- Each player's best run in one chapter, ranked.
CREATE OR REPLACE FUNCTION story_board(p_chapter text, p_limit int DEFAULT 50)
RETURNS TABLE (rank bigint, user_id uuid, username text, score int, stars int, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH best AS (
    SELECT DISTINCT ON (s.user_id) s.user_id, s.score, s.stars, s.created_at
      FROM story_runs s
     WHERE s.chapter = p_chapter
     ORDER BY s.user_id, s.score DESC, s.stars DESC, s.created_at ASC
  )
  SELECT row_number() OVER (ORDER BY b.score DESC, b.stars DESC, b.created_at ASC),
         b.user_id, p.username, b.score, b.stars, b.created_at
    FROM best b
    JOIN profiles p ON p.id = b.user_id
   ORDER BY b.score DESC, b.stars DESC, b.created_at ASC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

GRANT EXECUTE ON FUNCTION story_board(text, int) TO anon, authenticated;
