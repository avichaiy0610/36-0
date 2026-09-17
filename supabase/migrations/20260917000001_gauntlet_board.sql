-- The gauntlet board asked for the top 200 RUNS and only then kept each
-- player's best. A run is a row, and the players at the high banners replay
-- endlessly: by 2026-09-17 three of them held all 200 rows between them (74,
-- 64 and 62 runs, every one at banner IV or V), so the board showed three
-- names and 109 players — cleared banner-III runs among them — had vanished.
-- Every run they played pushed someone else further off.
--
-- So the best run is picked here, one per player, before anything is cut —
-- the same shape salary_board has had from the start.
CREATE OR REPLACE FUNCTION gauntlet_board(p_limit int DEFAULT 100)
RETURNS TABLE (
  rank bigint, user_id uuid, username text, avatar_url text, club jsonb,
  depth int, cleared boolean, banner int, team_ovr int, ended boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH best AS (
    SELECT DISTINCT ON (g.user_id)
           g.user_id, g.depth, g.cleared, g.banner, g.team_ovr, g.ended, g.created_at
      FROM gauntlet_runs g
     ORDER BY g.user_id, g.banner DESC, g.depth DESC, g.cleared DESC, g.created_at ASC
  )
  SELECT row_number() OVER (ORDER BY b.banner DESC, b.depth DESC, b.cleared DESC, b.created_at ASC),
         b.user_id, p.username, p.avatar_url, p.club,
         b.depth, b.cleared, b.banner, b.team_ovr, b.ended, b.created_at
    FROM best b
    JOIN profiles p ON p.id = b.user_id
   ORDER BY b.banner DESC, b.depth DESC, b.cleared DESC, b.created_at ASC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
$$;

GRANT EXECUTE ON FUNCTION gauntlet_board(int) TO anon, authenticated;
