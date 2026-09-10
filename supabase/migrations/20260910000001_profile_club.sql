-- ─────────────────────────────────────────────────────────────────────────────
-- המועדון שלך, on the leaderboards.
--
-- js/club.js says it in its own header: "STORAGE is localStorage only. No table,
-- no migration, no sign-in." That was right for what the club did — rename the
-- screens the player is looking at. It stops being right the moment the club has
-- to appear under somebody ELSE'S name on a board, because your browser has
-- never heard of their club. So the club now has one server-side copy, on the
-- profile, and it exists for exactly one reason: so other people can see it.
--
-- The device is still the source of truth. This column is a PUBLISHED copy —
-- written on save, adopted on sign-in when a new device has none.
--
-- WHY AN RPC AND NOT A PLAIN UPDATE: 20260703000001 revoked UPDATE on profiles
-- and granted it back column by column (username, avatar_url) precisely so a
-- client could not write arbitrary profile state. A club is arbitrary profile
-- state, and worse — its colours are interpolated straight into an <svg
-- fill="…"> that every viewer injects as HTML. An unvalidated c1 is a stored
-- XSS in every leaderboard row. So the column is never granted to the client;
-- it is written only through this function, which rebuilds the object key by
-- key and never stores a field it did not check.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS club jsonb;

-- ── publishing your club ────────────────────────────────────────────────────
-- Returns the object it actually stored, so the client can see what survived.
--
-- WHAT IS VALIDATED HERE, AND WHAT IS DELIBERATELY NOT: the fields that can hurt
-- somebody are checked strictly — colours must be #rrggbb, and clubId must be a
-- bare slug, because it becomes a path (crests/<id>.png). The enum-ish fields
-- (shape/pattern/icon) are only shape-checked as short lowercase words: the
-- client already falls back to a default for a key it does not know
-- (`CREST_SHAPES[cr.shape] || CREST_SHAPES.shield`), so a stale value renders a
-- plain crest instead of nothing — and a hard-coded list in SQL would silently
-- reject any icon added to club.js later. Names are trimmed to the same 24 the
-- input allows and stripped of angle brackets, matching username_valid.
CREATE OR REPLACE FUNCTION set_my_club(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid    uuid := auth.uid();
  v_name text;
  v_city text;
  v_club jsonb;
  txt    text;
  -- one place for "a short, safe, single-line piece of the player's own text"
  clean  text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;

  -- Clearing the club is a legitimate save: an empty name means "I no longer
  -- have a club", and the published copy has to follow the device.
  IF p IS NULL OR jsonb_typeof(p) <> 'object' THEN
    UPDATE profiles SET club = NULL WHERE id = uid;
    RETURN jsonb_build_object('club', NULL);
  END IF;

  v_name := NULLIF(btrim(left(regexp_replace(
              COALESCE(p->>'name', ''), '[\r\n\t<>]', ' ', 'g'), 24)), '');
  IF v_name IS NULL THEN
    UPDATE profiles SET club = NULL WHERE id = uid;
    RETURN jsonb_build_object('club', NULL);
  END IF;

  v_city := NULLIF(btrim(left(regexp_replace(
              COALESCE(p->>'city', ''), '[\r\n\t<>]', ' ', 'g'), 24)), '');

  v_club := jsonb_build_object(
    'v',    1,
    'name', v_name,
    'city', v_city,
    'crest', jsonb_build_object(
      -- anything that is not the badge of a real club is the built crest
      'source',  CASE WHEN p#>>'{crest,source}' = 'club' THEN 'club' ELSE 'built' END,
      -- a path segment, so: lowercase slug or nothing at all
      'clubId',  CASE WHEN p#>>'{crest,clubId}' ~ '^[a-z0-9-]{1,40}$'
                      THEN p#>>'{crest,clubId}' END,
      'shape',   CASE WHEN p#>>'{crest,shape}'   ~ '^[a-z]{2,16}$' THEN p#>>'{crest,shape}'   END,
      'pattern', CASE WHEN p#>>'{crest,pattern}' ~ '^[a-z]{2,16}$' THEN p#>>'{crest,pattern}' END,
      'icon',    CASE WHEN p#>>'{crest,icon}'    ~ '^[a-z]{2,16}$' THEN p#>>'{crest,icon}'    END,
      -- the two that end up inside an SVG attribute
      'c1',      CASE WHEN p#>>'{crest,c1}' ~ '^#[0-9a-fA-F]{6}$' THEN p#>>'{crest,c1}' END,
      'c2',      CASE WHEN p#>>'{crest,c2}' ~ '^#[0-9a-fA-F]{6}$' THEN p#>>'{crest,c2}' END
    )
  );

  -- The kit is NOT published. A board draws a crest and a name; a shirt is worn
  -- by the team photo and the back page, which are drawn on the owner's own
  -- device from the owner's own record. Publishing it would be storing a field
  -- nothing reads — and this project has a long memory of fields nobody sets.
  UPDATE profiles SET club = v_club WHERE id = uid;
  RETURN jsonb_build_object('club', v_club);
END $$;

REVOKE ALL ON FUNCTION set_my_club(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_my_club(jsonb) TO authenticated;

-- ── the boards that read profiles through an RPC ────────────────────────────
-- game_results and gauntlet_runs are read straight from PostgREST with a
-- profiles(...) embed, so those two boards need no SQL at all — the client just
-- asks for one more column. These two build their rows in SQL and have to hand
-- the club out themselves.

-- Both are DROPped first: CREATE OR REPLACE refuses to change a function's
-- return type, and adding a column to RETURNS TABLE is changing it. Dropping a
-- read-only board function is safe — nothing depends on it but the client, and
-- the client is deployed with this.
DROP FUNCTION IF EXISTS career_board(int);
DROP FUNCTION IF EXISTS salary_board(int);

CREATE FUNCTION career_board(p_limit int DEFAULT 50)
RETURNS TABLE (
  rank bigint, user_id uuid, username text, club_name text,
  seasons int, titles int, points int, best_rank int,
  longest_stay int, finished boolean, relegated boolean,
  club jsonb
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT row_number() OVER (ORDER BY c.titles DESC, c.points DESC, c.seasons DESC, c.created_at ASC),
         c.user_id, p.username, c.club_name,
         c.seasons, c.titles, c.points, c.best_rank,
         c.longest_stay, c.finished, c.relegated,
         p.club
    FROM career_runs c
    JOIN profiles p ON p.id = c.user_id
   ORDER BY c.titles DESC, c.points DESC, c.seasons DESC, c.created_at ASC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

GRANT EXECUTE ON FUNCTION career_board(int) TO anon, authenticated;

CREATE FUNCTION salary_board(p_limit int DEFAULT 50)
RETURNS TABLE (
  rank bigint, user_id uuid, username text, difficulty text,
  budget int, spent int, free_agents int, ovr int,
  points int, wins int, draws int, losses int,
  club jsonb
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH best AS (
    SELECT DISTINCT ON (s.user_id)
           s.user_id, s.difficulty, s.budget, s.spent, s.free_agents,
           s.ovr, s.points, s.wins, s.draws, s.losses, s.created_at
      FROM salary_runs s
     ORDER BY s.user_id, s.points DESC, s.spent ASC, s.created_at ASC
  )
  SELECT row_number() OVER (ORDER BY b.points DESC, b.spent ASC, b.created_at ASC),
         b.user_id, p.username, b.difficulty,
         b.budget, b.spent, b.free_agents, b.ovr,
         b.points, b.wins, b.draws, b.losses,
         p.club
    FROM best b
    JOIN profiles p ON p.id = b.user_id
   ORDER BY b.points DESC, b.spent ASC, b.created_at ASC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

GRANT EXECUTE ON FUNCTION salary_board(int) TO anon, authenticated;
