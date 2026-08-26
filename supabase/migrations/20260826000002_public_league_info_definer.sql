-- Fix: public_league_info always returned nothing.
--
-- The leagues tables are locked — RLS on, no client policies — and every other
-- league function is SECURITY DEFINER for exactly that reason. This one was
-- written as a plain SQL function, so it ran with the caller's rights, saw zero
-- rows, and reported an empty league forever: the welcome card and the leagues
-- card could never show how many people were in this week.
--
-- It stays deliberately narrow: it answers only for codes in the site's own
-- PUByyyymmdd shape, so it cannot be used to read private leagues.
CREATE OR REPLACE FUNCTION public_league_info(p_code text)
RETURNS TABLE (name text, settings jsonb, members int, played int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT l.name, l.settings,
         (SELECT count(*) FROM league_members m WHERE m.league_id = l.id)::int,
         (SELECT count(*) FROM league_results r WHERE r.league_id = l.id)::int
    FROM leagues l
   WHERE l.code = upper(btrim(p_code)) AND l.code ~ '^PUB[0-9]{8}$';
$$;

GRANT EXECUTE ON FUNCTION public_league_info(text) TO anon, authenticated;
