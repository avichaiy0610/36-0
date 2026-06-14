CREATE OR REPLACE FUNCTION get_achievement_stats()
RETURNS TABLE(key text, unlock_count bigint, total_users bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    a.key,
    COUNT(ua.user_id)              AS unlock_count,
    (SELECT COUNT(*) FROM profiles) AS total_users
  FROM achievements a
  LEFT JOIN user_achievements ua ON ua.achievement_key = a.key
  GROUP BY a.key;
$$;

GRANT EXECUTE ON FUNCTION get_achievement_stats() TO anon, authenticated;
