-- ─────────────────────────────────────────────────────────────────────────────
-- set_vote_excluded also hands back the tag.
--
-- The dashboard redraws a row from this function's answer rather than reloading
-- the queue, which is right — but the answer only carried n and the average, so
-- the TAG column kept whatever it was rendered with. Excluding five of six votes
-- left a row reading "no crowd rating, fewer than 5" next to a tag still
-- claiming five people had chosen it.
--
-- Worth naming the shape of the mistake, because it is the same one twice in two
-- days: a partial update is more dangerous than no update. A row that refuses to
-- change is obviously stale; a row where three cells move and a fourth does not
-- looks authoritative and is wrong.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_vote_excluded(p_id bigint, p_on boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE r player_votes%ROWTYPE;
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;

  UPDATE player_votes SET excluded = COALESCE(p_on, true)
   WHERE id = p_id
   RETURNING * INTO r;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'no such vote'); END IF;

  -- Every column the row displays, from one round trip. tag_top is already NULL
  -- below the threshold inside crowd_ratings_all, so the client gets a coherent
  -- "nothing to show" for all of it at once rather than per cell.
  RETURN (
    SELECT jsonb_build_object(
             'ok', true, 'excluded', r.excluded,
             'n',   COALESCE(c.n, 0),
             'avg', c.avg_trimmed,
             'tag', c.tag_top,
             'tag_n', c.tag_top_n)
      FROM (SELECT 1) one
      LEFT JOIN crowd_ratings_all c
        ON c.player_key = r.player_key AND c.season = r.season
  );
END $$;

REVOKE ALL ON FUNCTION set_vote_excluded(bigint, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_vote_excluded(bigint, boolean) TO authenticated;
