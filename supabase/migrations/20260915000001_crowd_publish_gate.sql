-- ─────────────────────────────────────────────────────────────────────────────
-- Nothing the crowd says is public until the owner says so.
--
-- WHY THIS EXISTS. 20260914000001 published the trimmed average and the top tag
-- as soon as five votes existed. The owner's objection, and he is right: a
-- coordinated group that hates a player can drive the number people SEE, even
-- though it can never reach the game itself (that needs an approval plus a
-- manual script run). A trimmed mean stops one outlier, not an organised
-- majority, and n is forgeable because an anonymous voter picks his own id.
--
-- WHAT IT COSTS, AND WHY THAT IS SMALLER THAN IT LOOKS. A player shows no crowd
-- number until the owner publishes him, so the visible spread of this feature
-- moves at the speed of approvals rather than the speed of votes. That is a
-- throughput question, not a wall: the queue is sorted, publishing is one click,
-- and the approval path does not have to stay at a desk. This project already
-- runs owner approvals through Telegram — @the360_posts_bot approves post-queue
-- items, and .github/workflows/challenge-taps.yml already polls getUpdates every
-- ten minutes — so a publish/hide tap for this queue is an extension of working
-- infrastructure, not a new system. If the backlog ever becomes the bottleneck,
-- that is the lever, not loosening the gate.
--
-- WHAT IS AND IS NOT HIDDEN. The vote COUNT stays public: it is not a verdict
-- about a person, it is feedback that voting is happening at all, and without
-- it the widget cannot tell "nobody has voted" from "plenty have voted and the
-- owner has not looked yet" — two states that need different words on screen.
-- The trimmed AVERAGE and the top TAG are the judgements, and those are gated.
--
-- PUBLISHING IS NOT APPROVING. approve_rating queues a change to js/data.js.
-- This publishes what the crowd said. The owner may want either without the
-- other: a number he believes but does not want to play with, or a rating he
-- takes into the game quietly. Two tables, two decisions.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crowd_published (
  player_key   text        NOT NULL CHECK (char_length(player_key) BETWEEN 1 AND 64),
  season       text        NOT NULL CHECK (season ~ '^[0-9]{4}/[0-9]{2}$'),
  published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_key, season)
);

ALTER TABLE crowd_published ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE crowd_published FROM anon, authenticated;

-- ── the unfiltered aggregate, for the owner only ────────────────────────────
-- This is what crowd_ratings was. It is no longer reachable from the client:
-- the dashboard reads it through SECURITY DEFINER functions, which run as the
-- owner of this migration and are gated on is_site_admin().
CREATE OR REPLACE VIEW crowd_ratings_all
WITH (security_invoker = false) AS
  SELECT v.player_key,
         v.season,
         count(*)::int                                  AS n,
         crowd_trimmed_avg(array_agg(v.ovr))            AS avg_trimmed,
         CASE WHEN count(*) >= 5 THEN
           (SELECT t.tag FROM player_votes t
             WHERE t.player_key = v.player_key AND t.season = v.season
               AND t.tag IS NOT NULL
             GROUP BY t.tag ORDER BY count(*) DESC, t.tag ASC LIMIT 1)
         END                                            AS tag_top,
         CASE WHEN count(*) >= 5 THEN
           (SELECT count(*) FROM player_votes t
             WHERE t.player_key = v.player_key AND t.season = v.season
               AND t.tag IS NOT NULL
             GROUP BY t.tag ORDER BY count(*) DESC, t.tag ASC LIMIT 1)::int
         END                                            AS tag_top_n
    FROM player_votes v
   GROUP BY v.player_key, v.season;

REVOKE ALL ON TABLE crowd_ratings_all FROM anon, authenticated;

-- ── what the world sees ─────────────────────────────────────────────────────
-- Same column list as before, so no client query changes. The count always
-- comes through; the two judgements come through only after publication.
--
-- CREATE OR REPLACE VIEW cannot change a column's type or position, and it
-- cannot be used to redefine a view other objects depend on in an incompatible
-- way — the shape here is identical to 20260914000001's, so the replace is
-- legal and every existing reader keeps working.
CREATE OR REPLACE VIEW crowd_ratings
WITH (security_invoker = false) AS
  SELECT a.player_key,
         a.season,
         a.n,
         CASE WHEN p.player_key IS NOT NULL THEN a.avg_trimmed END AS avg_trimmed,
         CASE WHEN p.player_key IS NOT NULL THEN a.tag_top     END AS tag_top,
         CASE WHEN p.player_key IS NOT NULL THEN a.tag_top_n   END AS tag_top_n
    FROM crowd_ratings_all a
    LEFT JOIN crowd_published p
      ON p.player_key = a.player_key AND p.season = a.season;

REVOKE ALL ON TABLE crowd_ratings FROM anon, authenticated;
GRANT SELECT ON TABLE crowd_ratings TO anon, authenticated;

-- ── the owner's switch ──────────────────────────────────────────────────────
-- Idempotent in both directions: publishing a published row is a no-op, and so
-- is hiding a hidden one. The dashboard can therefore fire it without tracking
-- state, and a double click cannot produce a surprise.
CREATE OR REPLACE FUNCTION publish_crowd(
  p_player_key text, p_season text, p_on boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;

  IF p_on THEN
    -- Publishing is a judgement about a real person's reputation, so it is
    -- refused on data too thin to be one. Same threshold as the average.
    IF NOT EXISTS (SELECT 1 FROM crowd_ratings_all
                    WHERE player_key = p_player_key AND season = p_season
                      AND avg_trimmed IS NOT NULL) THEN
      RETURN jsonb_build_object('error', 'not enough votes');
    END IF;
    INSERT INTO crowd_published (player_key, season)
    VALUES (p_player_key, p_season)
    ON CONFLICT (player_key, season) DO NOTHING;
  ELSE
    DELETE FROM crowd_published
     WHERE player_key = p_player_key AND season = p_season;
  END IF;

  RETURN jsonb_build_object('ok', true, 'published', p_on);
END $$;

REVOKE ALL ON FUNCTION publish_crowd(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION publish_crowd(text, text, boolean) TO authenticated;

-- ── the dashboard's queue, now carrying the publish state ───────────────────
-- DROPped first: CREATE OR REPLACE refuses to add a column to a RETURNS TABLE,
-- and adding `published` is changing the return type. Dropping a read-only
-- board function is safe — nothing depends on it but the client, and the client
-- ships with this.
DROP FUNCTION IF EXISTS crowd_queue();

CREATE FUNCTION crowd_queue()
RETURNS TABLE (player_key text, season text, n int, avg_trimmed smallint,
               tag_top text, tag_top_n int, published boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.player_key, c.season, c.n, c.avg_trimmed, c.tag_top, c.tag_top_n,
         (p.player_key IS NOT NULL) AS published
    FROM crowd_ratings_all c
    LEFT JOIN rating_dismissals d
      ON d.player_key = c.player_key AND d.season = c.season
    LEFT JOIN crowd_published p
      ON p.player_key = c.player_key AND p.season = c.season
   WHERE c.avg_trimmed IS NOT NULL
     AND (d.player_key IS NULL OR c.n > d.at_votes)
     AND is_site_admin()
   ORDER BY c.n DESC
   LIMIT 500;
$$;

REVOKE ALL ON FUNCTION crowd_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crowd_queue() TO authenticated;

-- ── approve_rating reads the unfiltered aggregate ───────────────────────────
-- It must be able to approve a rating the owner has not published. Left on
-- crowd_ratings it would have refused every unpublished player with
-- "not enough votes" — which would have been a lie, and would have made the two
-- decisions depend on each other in the one direction that makes no sense.
CREATE OR REPLACE FUNCTION approve_rating(
  p_player_key text, p_season text, p_old smallint, p_new smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_n int;
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;

  IF p_old IS NULL OR p_old NOT BETWEEN 40 AND 99
     OR p_new IS NULL OR p_new NOT BETWEEN 40 AND 99 THEN
    RETURN jsonb_build_object('error', 'bad ovr');
  END IF;

  SELECT n INTO v_n FROM crowd_ratings_all
   WHERE player_key = p_player_key AND season = p_season AND avg_trimmed IS NOT NULL;
  IF v_n IS NULL THEN RETURN jsonb_build_object('error', 'not enough votes'); END IF;

  INSERT INTO rating_approvals (player_key, season, old_ovr, new_ovr, votes)
  VALUES (p_player_key, p_season, p_old, p_new, v_n)
  ON CONFLICT (player_key, season) WHERE applied_at IS NULL
  DO UPDATE SET old_ovr = EXCLUDED.old_ovr,
                new_ovr = EXCLUDED.new_ovr,
                votes   = EXCLUDED.votes;

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION approve_rating(text, text, smallint, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_rating(text, text, smallint, smallint) TO authenticated;

-- ── dismiss_rating likewise ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION dismiss_rating(p_player_key text, p_season text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_n int;
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  SELECT n INTO v_n FROM crowd_ratings_all
   WHERE player_key = p_player_key AND season = p_season;
  INSERT INTO rating_dismissals (player_key, season, at_votes)
  VALUES (p_player_key, p_season, COALESCE(v_n, 0))
  ON CONFLICT (player_key, season) DO UPDATE SET at_votes = EXCLUDED.at_votes;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION dismiss_rating(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dismiss_rating(text, text) TO authenticated;
