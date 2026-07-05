-- League phase 2: fixed capacity, uniform settings set by the creator, and a
-- one-shot draft per member (no replay). The table is "final" once the league
-- is full and everyone has played.

ALTER TABLE leagues ADD COLUMN IF NOT EXISTS max_players int   NOT NULL DEFAULT 10;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS settings    jsonb NOT NULL DEFAULT '{}';

-- create_league now takes a capacity and the shared settings.
DROP FUNCTION IF EXISTS create_league(text);
CREATE FUNCTION create_league(p_name text, p_max int, p_settings jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text; v_id uuid; v_try int := 0; v_max int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF coalesce(btrim(p_name), '') = '' THEN RAISE EXCEPTION 'name required'; END IF;
  v_max := greatest(2, least(30, coalesce(p_max, 10)));
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM leagues WHERE code = v_code);
    v_try := v_try + 1; IF v_try > 25 THEN RAISE EXCEPTION 'code generation failed'; END IF;
  END LOOP;
  INSERT INTO leagues (code, name, created_by, max_players, settings)
    VALUES (v_code, left(btrim(p_name), 40), auth.uid(), v_max, coalesce(p_settings, '{}'::jsonb))
    RETURNING id INTO v_id;
  INSERT INTO league_members (league_id, user_id) VALUES (v_id, auth.uid());
  RETURN v_code;
END $$;

-- join_league rejects a full league.
CREATE OR REPLACE FUNCTION join_league(p_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_name text; v_max int; v_count int; v_is_member boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id, name, max_players INTO v_id, v_name, v_max FROM leagues WHERE code = upper(btrim(p_code));
  IF v_id IS NULL THEN RAISE EXCEPTION 'league not found'; END IF;
  SELECT EXISTS (SELECT 1 FROM league_members WHERE league_id = v_id AND user_id = auth.uid()) INTO v_is_member;
  SELECT count(*) INTO v_count FROM league_members WHERE league_id = v_id;
  IF NOT v_is_member AND v_count >= v_max THEN RAISE EXCEPTION 'league full'; END IF;
  INSERT INTO league_members (league_id, user_id) VALUES (v_id, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN v_name;
END $$;
GRANT EXECUTE ON FUNCTION create_league(text, int, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION create_league(text, int, jsonb) FROM anon;

-- Richer league info: capacity, settings, and completion status.
DROP FUNCTION IF EXISTS get_league_info(text);
CREATE FUNCTION get_league_info(p_code text)
RETURNS TABLE (name text, max_players int, settings jsonb, members int,
               is_member boolean, has_played boolean, played_count int, is_complete boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT l.name, l.max_players, l.settings,
    (SELECT count(*) FROM league_members m  WHERE m.league_id = l.id)::int,
    EXISTS (SELECT 1 FROM league_members m  WHERE m.league_id = l.id AND m.user_id = auth.uid()),
    EXISTS (SELECT 1 FROM league_results r  WHERE r.league_id = l.id AND r.user_id = auth.uid()),
    (SELECT count(*) FROM league_results r  WHERE r.league_id = l.id)::int,
    ((SELECT count(*) FROM league_members m WHERE m.league_id = l.id) >= l.max_players
      AND (SELECT count(*) FROM league_results r WHERE r.league_id = l.id)
          >= (SELECT count(*) FROM league_members m WHERE m.league_id = l.id))
  FROM leagues l WHERE l.code = upper(btrim(p_code));
$$;
GRANT EXECUTE ON FUNCTION get_league_info(text) TO authenticated;
REVOKE ALL ON FUNCTION get_league_info(text) FROM anon;

-- Standings now also return the squad (for the squad-view modal).
DROP FUNCTION IF EXISTS get_league_standings(text);
CREATE FUNCTION get_league_standings(p_code text)
RETURNS TABLE (username text, ovr int, points int, wins int, draws int, losses int,
               gf int, ga int, formation text, tier text, players jsonb, played_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.username, lr.ovr, lr.points, lr.wins, lr.draws, lr.losses, lr.gf, lr.ga,
         lr.formation, lr.tier, lr.players, lr.created_at
  FROM leagues l
  JOIN league_members m  ON m.league_id = l.id
  LEFT JOIN profiles p   ON p.id = m.user_id
  LEFT JOIN league_results lr ON lr.league_id = l.id AND lr.user_id = m.user_id
  WHERE l.code = upper(btrim(p_code));
$$;
GRANT EXECUTE ON FUNCTION get_league_standings(text) TO authenticated;
