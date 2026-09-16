-- ─────────────────────────────────────────────────────────────────────────────
-- Every decision can be taken back.
--
-- "אחרי שאישרתי צמדים אין לי אופציה לשנות את דעתי". Right, and it was true of
-- dismissals too, and of ratings as well as duos — the same one-way door in four
-- places. Approve or dismiss and the row left the screen with nothing to press.
--
-- The design read the queue as a conveyor: decide, it leaves, next. That is the
-- wrong shape for a judgement call made in a few seconds on a phone. Every other
-- control in this feature is already reversible — publishing toggles, excluding a
-- vote toggles — and these two were the exception for no reason beyond how they
-- happened to be written first.
--
-- WHAT UNDO MEANS AT EACH STAGE, because they are genuinely different:
--   dismissed → pending   delete the dismissal. Nothing else ever happened.
--   approved  → pending   delete the approval before any script has read it.
--   applied   → pending   the approval was already built into
--                         js/crowd-overrides.js. Deleting the row is not enough:
--                         the overlay has to be rebuilt, and only the owner can
--                         run that. So this path is allowed and reports back that
--                         a rebuild is owed, rather than pretending the undo is
--                         complete. Lying about that would leave the game showing
--                         something the queue says was withdrawn.
--
-- Nothing here can touch js/data.js or chemistry_duos.csv — the crowd never
-- reaches them at all since 20260916, so an undo cannot corrupt the main game
-- even if it is wrong.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── the queue reports the decision, instead of hiding what was decided ──────
DROP FUNCTION IF EXISTS crowd_queue();

CREATE FUNCTION crowd_queue()
RETURNS TABLE (player_key text, season text, n int, avg_trimmed smallint,
               tag_top text, tag_top_n int, published boolean, decision text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.player_key, c.season, c.n, c.avg_trimmed, c.tag_top, c.tag_top_n,
         (p.player_key IS NOT NULL) AS published,
         CASE WHEN d.player_key IS NOT NULL THEN 'dismissed'
              WHEN a.applied_at IS NOT NULL THEN 'applied'
              WHEN a.player_key IS NOT NULL THEN 'approved'
              ELSE 'pending' END AS decision
    FROM crowd_ratings_all c
    LEFT JOIN rating_dismissals d
      ON d.player_key = c.player_key AND d.season = c.season AND c.n <= d.at_votes
    LEFT JOIN crowd_published p
      ON p.player_key = c.player_key AND p.season = c.season
    LEFT JOIN LATERAL (
      SELECT ra.player_key, ra.applied_at FROM rating_approvals ra
       WHERE ra.player_key = c.player_key AND ra.season = c.season
       ORDER BY ra.applied_at NULLS FIRST LIMIT 1
    ) a ON true
   WHERE is_site_admin()
   ORDER BY c.n DESC, c.player_key ASC
   LIMIT 500;
$$;

REVOKE ALL ON FUNCTION crowd_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crowd_queue() TO authenticated;

DROP FUNCTION IF EXISTS duo_queue();

CREATE FUNCTION duo_queue()
RETURNS TABLE (pair_key text, n int, decision text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.pair_key, count(*)::int AS n,
         CASE WHEN max(CASE WHEN d.pair_key IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'dismissed'
              WHEN max(CASE WHEN a.applied_at IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'applied'
              WHEN max(CASE WHEN a.pair_key IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'approved'
              ELSE 'pending' END AS decision
    FROM duo_suggestions s
    LEFT JOIN duo_dismissals d ON d.pair_key = s.pair_key
    LEFT JOIN duo_approvals  a ON a.pair_key = s.pair_key
   WHERE is_site_admin()
   GROUP BY s.pair_key
   ORDER BY count(*) DESC, s.pair_key ASC
   LIMIT 300;
$$;

REVOKE ALL ON FUNCTION duo_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION duo_queue() TO authenticated;

-- ── taking it back ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION undo_rating(p_player_key text, p_season text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE was_applied boolean := false;
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;

  SELECT EXISTS (SELECT 1 FROM rating_approvals
                  WHERE player_key = p_player_key AND season = p_season
                    AND applied_at IS NOT NULL) INTO was_applied;

  DELETE FROM rating_approvals WHERE player_key = p_player_key AND season = p_season;
  DELETE FROM rating_dismissals WHERE player_key = p_player_key AND season = p_season;

  -- An applied approval is already inside js/crowd-overrides.js, and only the
  -- owner can rebuild that. Say so instead of implying the undo is finished.
  RETURN jsonb_build_object('ok', true, 'rebuild', was_applied);
END $$;

REVOKE ALL ON FUNCTION undo_rating(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION undo_rating(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION undo_duo(p_pair_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE was_applied boolean := false;
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;

  SELECT EXISTS (SELECT 1 FROM duo_approvals
                  WHERE pair_key = p_pair_key AND applied_at IS NOT NULL) INTO was_applied;

  DELETE FROM duo_approvals  WHERE pair_key = p_pair_key;
  DELETE FROM duo_dismissals WHERE pair_key = p_pair_key;

  RETURN jsonb_build_object('ok', true, 'rebuild', was_applied);
END $$;

REVOKE ALL ON FUNCTION undo_duo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION undo_duo(text) TO authenticated;
