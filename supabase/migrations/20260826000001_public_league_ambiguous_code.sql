-- Fix: join_public_league raised 42702 "column reference \"code\" is ambiguous"
-- for every caller, so nobody could enter the weekly league.
--
-- The function RETURNS TABLE (code text, name text, ...), and those output
-- columns are plpgsql variables. `ON CONFLICT (code)` is an expression context,
-- so Postgres could not tell the variable `code` from leagues.code and refused
-- the whole statement. Qualifying it is not possible — a conflict target must be
-- a bare column name — so the block declares which side wins.
--
-- Why the tests missed it: an anonymous call fails on the auth check before it
-- reaches the INSERT, and the browser runs had the RPC faked. It was never once
-- executed for real. It is now, from a signed-in throwaway account.
CREATE OR REPLACE FUNCTION join_public_league(p_code text, p_name text, p_settings jsonb)
RETURNS TABLE (code text, name text, settings jsonb, members int, has_played boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_code text := upper(btrim(COALESCE(p_code, '')));
  v_id   uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF v_code !~ '^PUB[0-9]{8}$' THEN RAISE EXCEPTION 'bad public code'; END IF;

  SELECT l.id INTO v_id FROM leagues l WHERE l.code = v_code;
  IF v_id IS NULL THEN
    INSERT INTO leagues (code, name, created_by, max_players, settings)
    VALUES (v_code,
            left(btrim(COALESCE(p_name, 'הליגה הציבורית')), 40),
            NULL,
            500,
            COALESCE(p_settings, '{}'::jsonb))
    ON CONFLICT (code) DO NOTHING
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      SELECT l.id INTO v_id FROM leagues l WHERE l.code = v_code;
    END IF;
  END IF;

  INSERT INTO league_members (league_id, user_id)
  VALUES (v_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN QUERY
  SELECT l.code, l.name, l.settings,
         (SELECT count(*) FROM league_members m WHERE m.league_id = l.id)::int,
         EXISTS (SELECT 1 FROM league_results r WHERE r.league_id = l.id AND r.user_id = auth.uid())
    FROM leagues l WHERE l.id = v_id;
END $$;

REVOKE ALL ON FUNCTION join_public_league(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_public_league(text, text, jsonb) TO authenticated;
