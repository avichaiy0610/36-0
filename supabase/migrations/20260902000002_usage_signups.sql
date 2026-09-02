-- How many people signed up, which nothing was measuring.
--
-- The usage panel answered "how many people were here" and "how many of them
-- were logged in", and both are about ACTIVITY. Neither says how many accounts
-- were created, so there was no way to tell a good day for the site from a good
-- day for the people who already use it.
--
-- profiles.created_at is the signup moment: the row is written by the trigger on
-- auth.users, so one row per account, once.
--
-- Same gate as the rest of the panel — is_site_admin() and nothing else. The
-- profiles table is world-readable for usernames, so this deliberately returns
-- only counts, never a row that could be tied to a person.

CREATE OR REPLACE FUNCTION usage_signups(p_days int DEFAULT 30)
RETURNS TABLE (day date, signups bigint, total bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_days int := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
BEGIN
  IF NOT is_site_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH per_day AS (
    SELECT (p.created_at AT TIME ZONE 'Asia/Jerusalem')::date AS d, count(*) AS n
      FROM profiles p
     WHERE p.created_at > now() - make_interval(days => v_days)
     GROUP BY 1
  )
  SELECT pd.d,
         pd.n,
         -- everyone who had signed up by the end of that day, so the panel shows
         -- the curve and not only the spikes
         (SELECT count(*) FROM profiles q
           WHERE (q.created_at AT TIME ZONE 'Asia/Jerusalem')::date <= pd.d)
    FROM per_day pd
   ORDER BY pd.d DESC;
END $$;

REVOKE ALL ON FUNCTION usage_signups(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION usage_signups(int) FROM anon;
GRANT EXECUTE ON FUNCTION usage_signups(int) TO authenticated;
