-- ─────────────────────────────────────────────────────────────────────────────
-- Every vote, one by one, and a switch to throw one away.
--
-- THE OWNER'S OBJECTION, AND HE IS RIGHT. The trimmed mean drops the extremes of
-- a distribution. That defends against noise; it does not defend against intent.
-- Five honest voters and one person who set out to bury a player produce a
-- distribution the trim cannot tell apart from an ordinary spread, and at higher
-- counts a handful of coordinated votes sit comfortably inside the kept range.
-- Statistics cannot see motive. A person looking at the votes can.
--
-- WHAT WAS MISSING, AND MY ERROR. The dashboard showed one row per player-season
-- — the aggregate verdict — because that is the decision being made. That is
-- still right for the decision, but it left the owner unable to SEE what he was
-- deciding from. Raw votes are unreadable from outside (RLS, verified: anon gets
-- 401), and I described that as though it applied to him too. It never did: the
-- dashboard runs as his own login, and is_site_admin() is exactly the gate that
-- can hand him the rows nobody else may have.
--
-- WHAT IS AND IS NOT SHOWN. The number, the tag, whether the voter was signed in,
-- and when. NOT who. Judging a vote does not require naming the person who cast
-- it, and the moment a face is attached the owner is moderating people instead of
-- data. is_user is the one signal that matters for trust — an account is harder
-- to mint than a client id — and it is enough.
--
-- EXCLUSION, NOT DELETION. A thrown-away vote stays in the table with a flag.
-- Deleting would make the act invisible and irreversible, and would quietly let
-- the same person vote again into the hole it left. Excluded votes leave the
-- aggregate and stay on the review list, struck through, so the decision can be
-- undone.
-- ─────────────────────────────────────────────────────────────────────────────

-- A handle for a single vote. The primary key is (player_key, season, voter) and
-- voter identifies a person — which is precisely the thing the review list must
-- not carry. A surrogate id lets the dashboard point at a row without ever
-- learning whose it is.
ALTER TABLE player_votes ADD COLUMN IF NOT EXISTS id bigserial;
ALTER TABLE player_votes ADD COLUMN IF NOT EXISTS excluded boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS player_votes_id ON player_votes (id);

-- ── the aggregate now ignores what was thrown away ──────────────────────────
-- Same shape as before, one WHERE deeper. Everything downstream — crowd_ratings,
-- crowd_queue, approve_rating — reads through this, so excluding a vote moves
-- the published number, the queue's gap and the approval in one step.
CREATE OR REPLACE VIEW crowd_ratings_all
WITH (security_invoker = false) AS
  SELECT v.player_key,
         v.season,
         count(*)::int                                  AS n,
         crowd_trimmed_avg(array_agg(v.ovr))            AS avg_trimmed,
         CASE WHEN count(*) >= 5 THEN
           (SELECT t.tag FROM player_votes t
             WHERE t.player_key = v.player_key AND t.season = v.season
               AND t.tag IS NOT NULL AND NOT t.excluded
             GROUP BY t.tag ORDER BY count(*) DESC, t.tag ASC LIMIT 1)
         END                                            AS tag_top,
         CASE WHEN count(*) >= 5 THEN
           (SELECT count(*) FROM player_votes t
             WHERE t.player_key = v.player_key AND t.season = v.season
               AND t.tag IS NOT NULL AND NOT t.excluded
             GROUP BY t.tag ORDER BY count(*) DESC, t.tag ASC LIMIT 1)::int
         END                                            AS tag_top_n
    FROM player_votes v
   WHERE NOT v.excluded
   GROUP BY v.player_key, v.season;

REVOKE ALL ON TABLE crowd_ratings_all FROM anon, authenticated;

-- ── the review list ─────────────────────────────────────────────────────────
-- Ordered by the rating itself, not by time: a troll is found by looking at the
-- shape of the distribution, and a sorted column is where an outlier announces
-- itself. Excluded rows stay in the list so the decision can be seen and undone.
CREATE OR REPLACE FUNCTION crowd_votes_for(p_player_key text, p_season text)
RETURNS TABLE (id bigint, ovr smallint, tag text, is_user boolean,
               excluded boolean, updated_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT v.id, v.ovr, v.tag, v.is_user, v.excluded, v.updated_at
    FROM player_votes v
   WHERE v.player_key = p_player_key AND v.season = p_season
     AND is_site_admin()
   ORDER BY v.ovr ASC, v.id ASC
   LIMIT 500;
$$;

REVOKE ALL ON FUNCTION crowd_votes_for(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crowd_votes_for(text, text) TO authenticated;

-- ── the switch ──────────────────────────────────────────────────────────────
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

  -- The new aggregate comes back with the answer, so the dashboard can redraw
  -- the row from one round trip instead of guessing or refetching the queue.
  RETURN (
    SELECT jsonb_build_object('ok', true, 'excluded', r.excluded,
                              'n', COALESCE(c.n, 0), 'avg', c.avg_trimmed)
      FROM (SELECT 1) one
      LEFT JOIN crowd_ratings_all c
        ON c.player_key = r.player_key AND c.season = r.season
  );
END $$;

REVOKE ALL ON FUNCTION set_vote_excluded(bigint, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_vote_excluded(bigint, boolean) TO authenticated;
