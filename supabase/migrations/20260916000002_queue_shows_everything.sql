-- ─────────────────────────────────────────────────────────────────────────────
-- The queue shows every player the crowd has touched, not only the decidable ones.
--
-- THE REPORT: "דירגתי ולא היה עדכון בדאשבורד או בטלגרם". Nothing was lost — all
-- four votes were in player_votes the whole time. They were invisible because
-- crowd_queue filtered on avg_trimmed IS NOT NULL, which is NULL below five
-- votes, so a player with one or two ratings simply did not exist as far as the
-- dashboard was concerned.
--
-- That was defensible as "the queue is a list of DECISIONS, and one vote is not
-- a decision". It is still wrong, for a reason the design missed: for the first
-- weeks EVERY player is below the threshold. So the owner rates someone, opens
-- the dashboard, finds it empty, and has no way to tell a working feature from a
-- broken one. A screen that looks identical whether or not it works is a screen
-- that cannot be trusted.
--
-- So the queue now returns everything with at least one vote. The client already
-- knows how to render a row with no verdict — dashes, 'fewer than 5', approve and
-- publish disabled — because that path was built when excluding votes could drop
-- a row below the threshold. Nothing here makes a one-vote rating approvable; it
-- makes it VISIBLE.
--
-- The Telegram sender keeps its own bar and still only sends decidable items: a
-- message per single vote would be noise, and the dashboard is where you look
-- when you want to see activity rather than answer a question.
-- ─────────────────────────────────────────────────────────────────────────────

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
   WHERE (d.player_key IS NULL OR c.n > d.at_votes)
     AND is_site_admin()
   -- Most votes first, so what is closest to being decidable rises. Ranking by
   -- disagreement happens in the client, which is the only place that knows the
   -- official rating — it lives in js/data.js, not here.
   ORDER BY c.n DESC, c.player_key ASC
   LIMIT 500;
$$;

REVOKE ALL ON FUNCTION crowd_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crowd_queue() TO authenticated;
