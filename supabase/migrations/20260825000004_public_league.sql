-- The public league of the week.
--
-- Leagues were built for friends: create one, send a code, wait for four people
-- to join and draft. Sixty-two people opened the screen in a day and twenty-two
-- ever played a league season — the coordination, not the mode, is what kills
-- it. This is the same league machinery with the coordination removed: one open
-- league per week, one tap to enter, and a table of strangers who all played
-- the same conditions.
--
-- The week's code and settings are derived on the client the same way for
-- everyone (from the weekly challenge boundary, Israel time), so whoever taps
-- first creates the league and everyone else joins the one that exists. Only
-- codes in the site's own PUByyyymmdd shape can be created through this door,
-- so it cannot be used to mint arbitrary leagues.

CREATE OR REPLACE FUNCTION join_public_league(p_code text, p_name text, p_settings jsonb)
RETURNS TABLE (code text, name text, settings jsonb, members int, has_played boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
            NULL,                       -- the site's own league, nobody's private one
            500,                        -- open to everyone who shows up this week
            COALESCE(p_settings, '{}'::jsonb))
    ON CONFLICT (code) DO NOTHING
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN                -- someone else created it a moment ago
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

-- Reading the week's league before joining it: how many are in, and what the
-- conditions are. Open to anon so the card can invite a signed-out visitor.
CREATE OR REPLACE FUNCTION public_league_info(p_code text)
RETURNS TABLE (name text, settings jsonb, members int, played int)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT l.name, l.settings,
         (SELECT count(*) FROM league_members m WHERE m.league_id = l.id)::int,
         (SELECT count(*) FROM league_results r WHERE r.league_id = l.id)::int
    FROM leagues l
   WHERE l.code = upper(btrim(p_code)) AND l.code ~ '^PUB[0-9]{8}$';
$$;

GRANT EXECUTE ON FUNCTION public_league_info(text) TO anon, authenticated;
