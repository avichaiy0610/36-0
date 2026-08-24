-- Belt and braces on the usage aggregates: a function is executable by PUBLIC
-- by default, so REVOKE FROM anon alone left the door open — the email check
-- inside each function was doing all the work. Now the grant is explicit too.
REVOKE ALL ON FUNCTION usage_stats(int)  FROM PUBLIC;
REVOKE ALL ON FUNCTION usage_detail(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION usage_daily(int)  FROM PUBLIC;
REVOKE ALL ON FUNCTION is_site_admin()   FROM PUBLIC;

GRANT EXECUTE ON FUNCTION usage_stats(int)  TO authenticated;
GRANT EXECUTE ON FUNCTION usage_detail(int) TO authenticated;
GRANT EXECUTE ON FUNCTION usage_daily(int)  TO authenticated;
GRANT EXECUTE ON FUNCTION is_site_admin()   TO authenticated;

-- track() stays open to anon on purpose: most mini-game and career play happens
-- without an account, and it can only ever insert one clamped row.
