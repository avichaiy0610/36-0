-- אלופי הדרבי: the admin list of who played. Reads derby_runs (created in
-- 20261005000002), so it must apply after that file.
--
-- Same shape as usage_detail(): SECURITY DEFINER, pinned search_path, and a
-- 'forbidden' exception for anyone but is_site_admin(). Granted to authenticated
-- only; anon is revoked. derby_runs itself keeps RLS on with no policies.
-- p_days / p_limit are clamped, so the admin page cannot ask for the whole table.
CREATE OR REPLACE FUNCTION derby_admin_runs(p_days int DEFAULT 30, p_limit int DEFAULT 500)
RETURNS TABLE (
  id bigint, created_at timestamptz, username text, user_id uuid,
  club text, difficulty text, series jsonb, series_won int, title boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_site_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT r.id, r.created_at, p.username, r.user_id,
         r.club, r.difficulty, r.series, r.series_won, r.title
    FROM derby_runs r
    LEFT JOIN profiles p ON p.id = r.user_id
   WHERE r.created_at > now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 30), 1), 365))
   ORDER BY r.created_at DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 500), 1), 2000);
END $$;

REVOKE ALL ON FUNCTION derby_admin_runs(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION derby_admin_runs(int, int) FROM anon;
GRANT EXECUTE ON FUNCTION derby_admin_runs(int, int) TO authenticated;
