-- Durable "already saw the league-complete notice" tracking.
-- The client used to remember this only in localStorage, so the heads-up popup
-- reappeared on every login whenever storage was cleared or the user switched
-- device/browser. Track it per membership in the DB instead — device-independent
-- and permanent.

ALTER TABLE league_members
  ADD COLUMN IF NOT EXISTS completion_seen boolean NOT NULL DEFAULT false;

-- get_my_leagues now also exposes whether THIS user has acknowledged the
-- completion of each league (drives the login-time popup).
DROP FUNCTION IF EXISTS get_my_leagues();
CREATE FUNCTION get_my_leagues()
RETURNS TABLE (code text, name text, members int, is_complete boolean, completion_seen boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT l.code, l.name,
    (SELECT count(*) FROM league_members m2 WHERE m2.league_id = l.id)::int,
    ((SELECT count(*) FROM league_members m2 WHERE m2.league_id = l.id) >= l.max_players
      AND (SELECT count(*) FROM league_results r WHERE r.league_id = l.id)
          >= (SELECT count(*) FROM league_members m2 WHERE m2.league_id = l.id)),
    m.completion_seen
  FROM leagues l
  JOIN league_members m ON m.league_id = l.id
  WHERE m.user_id = auth.uid()
  ORDER BY l.created_at DESC;
$$;
REVOKE ALL ON FUNCTION get_my_leagues() FROM anon;
GRANT EXECUTE ON FUNCTION get_my_leagues() TO authenticated;

-- Mark the completion notice as seen for the current user in the given leagues.
CREATE OR REPLACE FUNCTION mark_leagues_complete_seen(p_codes text[])
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE league_members m
  SET completion_seen = true
  FROM leagues l
  WHERE m.league_id = l.id
    AND m.user_id = auth.uid()
    AND l.code = ANY (SELECT upper(btrim(c)) FROM unnest(p_codes) AS c);
$$;
REVOKE ALL ON FUNCTION mark_leagues_complete_seen(text[]) FROM anon;
GRANT EXECUTE ON FUNCTION mark_leagues_complete_seen(text[]) TO authenticated;
