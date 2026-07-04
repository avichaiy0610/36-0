-- ─────────────────────────────────────────────────────────────────────────────
-- Async "leagues with friends" (Phase 1): players join a league by code, keep
-- playing the normal single-player game, and a shared table ranks each member
-- by their best season. No realtime — everyone plays on their own time.
-- All client access goes through SECURITY DEFINER RPCs; the tables themselves
-- are locked (RLS on, no client policies).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leagues (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text UNIQUE NOT NULL,
  name       text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS league_members (
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  user_id   uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (league_id, user_id)
);

ALTER TABLE leagues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
-- no client policies: access only via the RPCs below

-- Create a league and join it as the first member. Returns the share code.
CREATE OR REPLACE FUNCTION create_league(p_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text; v_id uuid; v_try int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF coalesce(btrim(p_name), '') = '' THEN RAISE EXCEPTION 'name required'; END IF;
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM leagues WHERE code = v_code);
    v_try := v_try + 1; IF v_try > 25 THEN RAISE EXCEPTION 'code generation failed'; END IF;
  END LOOP;
  INSERT INTO leagues (code, name, created_by) VALUES (v_code, left(btrim(p_name), 40), auth.uid())
    RETURNING id INTO v_id;
  INSERT INTO league_members (league_id, user_id) VALUES (v_id, auth.uid());
  RETURN v_code;
END $$;

-- Join an existing league by code. Returns the league's name (or errors).
CREATE OR REPLACE FUNCTION join_league(p_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id, name INTO v_id, v_name FROM leagues WHERE code = upper(btrim(p_code));
  IF v_id IS NULL THEN RAISE EXCEPTION 'league not found'; END IF;
  INSERT INTO league_members (league_id, user_id) VALUES (v_id, auth.uid())
    ON CONFLICT DO NOTHING;
  RETURN v_name;
END $$;

-- Leave a league.
CREATE OR REPLACE FUNCTION leave_league(p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM league_members m USING leagues l
   WHERE m.league_id = l.id AND l.code = upper(btrim(p_code)) AND m.user_id = auth.uid();
END $$;

-- The leagues the current user belongs to, with member counts.
CREATE OR REPLACE FUNCTION get_my_leagues()
RETURNS TABLE (code text, name text, members int)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT l.code, l.name,
         (SELECT count(*) FROM league_members m2 WHERE m2.league_id = l.id)::int
  FROM leagues l
  JOIN league_members m ON m.league_id = l.id
  WHERE m.user_id = auth.uid()
  ORDER BY l.created_at DESC;
$$;

-- Standings for a league: each member's best season (by points, then OVR).
-- Members who haven't played yet appear with NULL stats.
CREATE OR REPLACE FUNCTION get_league_standings(p_code text)
RETURNS TABLE (username text, ovr int, points int, wins int, draws int,
               losses int, formation text, tier text, played_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (m.user_id)
         p.username, r.ovr, r.points, r.wins, r.draws, r.losses, r.formation, r.tier, r.created_at
  FROM leagues l
  JOIN league_members m ON m.league_id = l.id
  LEFT JOIN profiles p     ON p.id = m.user_id
  LEFT JOIN game_results r ON r.user_id = m.user_id
  WHERE l.code = upper(btrim(p_code))
  ORDER BY m.user_id, r.points DESC NULLS LAST, r.ovr DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION create_league(text), join_league(text), leave_league(text),
                        get_my_leagues(), get_league_standings(text) FROM anon;
GRANT EXECUTE ON FUNCTION create_league(text)        TO authenticated;
GRANT EXECUTE ON FUNCTION join_league(text)          TO authenticated;
GRANT EXECUTE ON FUNCTION leave_league(text)         TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_leagues()           TO authenticated;
GRANT EXECUTE ON FUNCTION get_league_standings(text) TO authenticated;
