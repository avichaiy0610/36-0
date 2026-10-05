-- מצב סיפור: your best per chapter, from the server.
--
-- The hub's stars lived only in the browser (localStorage), so a chapter
-- finished on the phone showed no stars on the computer. Every signed-in run is
-- already in story_runs (20260923000003); this hands the caller their own best
-- per chapter so the client can merge it in. Stars are graded (⭐⭐ needs ⭐),
-- so a count is enough to rebuild which stars were won.

CREATE OR REPLACE FUNCTION my_story_best()
RETURNS TABLE (chapter text, stars int, score int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.chapter, MAX(s.stars), MAX(s.score)
    FROM story_runs s
   WHERE s.user_id = auth.uid()
   GROUP BY s.chapter;
$$;

GRANT EXECUTE ON FUNCTION my_story_best() TO authenticated;
REVOKE ALL ON FUNCTION my_story_best() FROM anon, public;
