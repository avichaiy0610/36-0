-- League-specific seasons: when a member plays a draft "for a league", the
-- result is recorded here (best kept per member), separate from their general
-- games. The league table then shows each member's dedicated league team.

CREATE TABLE IF NOT EXISTS league_results (
  league_id  uuid REFERENCES leagues(id)  ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  ovr        int,
  points     int,
  wins       int,
  draws      int,
  losses     int,
  gf         int,
  ga         int,
  formation  text,
  tier       text,
  players    jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (league_id, user_id)
);

ALTER TABLE league_results ENABLE ROW LEVEL SECURITY;
-- no client policies: written by the service-role edge function, read via RPC

-- Standings now come from league_results (each member's league season).
-- Members who haven't played the league draft yet appear with NULL stats.
DROP FUNCTION IF EXISTS get_league_standings(text);
CREATE FUNCTION get_league_standings(p_code text)
RETURNS TABLE (username text, ovr int, points int, wins int, draws int,
               losses int, gf int, ga int, formation text, tier text, played_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.username, lr.ovr, lr.points, lr.wins, lr.draws, lr.losses, lr.gf, lr.ga,
         lr.formation, lr.tier, lr.created_at
  FROM leagues l
  JOIN league_members m  ON m.league_id = l.id
  LEFT JOIN profiles p   ON p.id = m.user_id
  LEFT JOIN league_results lr ON lr.league_id = l.id AND lr.user_id = m.user_id
  WHERE l.code = upper(btrim(p_code));
$$;
GRANT EXECUTE ON FUNCTION get_league_standings(text) TO authenticated;

-- Membership + play status for the current user (drives the league screen UI).
CREATE OR REPLACE FUNCTION get_league_info(p_code text)
RETURNS TABLE (name text, is_member boolean, has_played boolean, members int)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT l.name,
    EXISTS (SELECT 1 FROM league_members m WHERE m.league_id = l.id AND m.user_id = auth.uid()),
    EXISTS (SELECT 1 FROM league_results r WHERE r.league_id = l.id AND r.user_id = auth.uid()),
    (SELECT count(*) FROM league_members m2 WHERE m2.league_id = l.id)::int
  FROM leagues l WHERE l.code = upper(btrim(p_code));
$$;
REVOKE ALL ON FUNCTION get_league_info(text) FROM anon;
GRANT EXECUTE ON FUNCTION get_league_info(text) TO authenticated;
