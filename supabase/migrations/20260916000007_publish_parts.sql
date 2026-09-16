-- ─────────────────────────────────────────────────────────────────────────────
-- Publish the number and the tag separately.
--
-- "אני רוצה שתהיה לי אופציה לאשר רק חלק ממה שאנשים אמרו (למשל אם הוסיפו
-- תגיות)". The publish switch was one switch over two different claims, and they
-- are not the same kind of claim at all:
--
--   the NUMBER is an average — it moves smoothly, outliers are already trimmed,
--   and one person cannot shift it far.
--
--   the TAG is a plurality — whichever label got the most picks wins outright.
--   At five votes, three people agreeing makes a tag, and a tag is a sentence
--   about a man ("לא מומש", "פציעות רדפו אותו") in a way a number is not.
--
-- So the owner may well believe the crowd's 84 and not want to publish
-- "לא מומש" over somebody's name, or the reverse. One switch forced him to take
-- both or neither.
--
-- Two boolean columns rather than two tables: publication is one fact about one
-- player-season with two parts, and splitting the row would make "published"
-- mean two different things depending on which table you asked.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE crowd_published ADD COLUMN IF NOT EXISTS show_ovr boolean NOT NULL DEFAULT true;
ALTER TABLE crowd_published ADD COLUMN IF NOT EXISTS show_tag boolean NOT NULL DEFAULT true;

-- ── the public view honours each half on its own ────────────────────────────
CREATE OR REPLACE VIEW crowd_ratings
WITH (security_invoker = false) AS
  SELECT a.player_key,
         a.season,
         a.n,
         CASE WHEN p.show_ovr THEN a.avg_trimmed END AS avg_trimmed,
         CASE WHEN p.show_tag THEN a.tag_top     END AS tag_top,
         CASE WHEN p.show_tag THEN a.tag_top_n   END AS tag_top_n
    FROM crowd_ratings_all a
    LEFT JOIN crowd_published p
      ON p.player_key = a.player_key AND p.season = a.season;

REVOKE ALL ON TABLE crowd_ratings FROM anon, authenticated;
GRANT SELECT ON TABLE crowd_ratings TO anon, authenticated;

-- ── one switch per part ─────────────────────────────────────────────────────
-- p_what is 'ovr' or 'tag'. A row appears the first time either half is turned
-- on and disappears when both are off, so "published at all" stays a single
-- readable fact rather than a row that lingers meaning nothing.
CREATE OR REPLACE FUNCTION publish_crowd_part(
  p_player_key text, p_season text, p_what text, p_on boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_ovr boolean; v_tag boolean;
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  IF p_what NOT IN ('ovr', 'tag') THEN RETURN jsonb_build_object('error', 'bad part'); END IF;

  IF p_on AND NOT EXISTS (SELECT 1 FROM crowd_ratings_all
                           WHERE player_key = p_player_key AND season = p_season
                             AND avg_trimmed IS NOT NULL) THEN
    RETURN jsonb_build_object('error', 'not enough votes');
  END IF;

  SELECT show_ovr, show_tag INTO v_ovr, v_tag
    FROM crowd_published WHERE player_key = p_player_key AND season = p_season;

  -- A row that does not exist yet means nothing is published. Turning one part
  -- on must not silently turn the other on with it, which a plain default would.
  v_ovr := COALESCE(v_ovr, false);
  v_tag := COALESCE(v_tag, false);
  IF p_what = 'ovr' THEN v_ovr := p_on; ELSE v_tag := p_on; END IF;

  IF NOT v_ovr AND NOT v_tag THEN
    DELETE FROM crowd_published WHERE player_key = p_player_key AND season = p_season;
  ELSE
    INSERT INTO crowd_published (player_key, season, show_ovr, show_tag)
    VALUES (p_player_key, p_season, v_ovr, v_tag)
    ON CONFLICT (player_key, season)
    DO UPDATE SET show_ovr = EXCLUDED.show_ovr, show_tag = EXCLUDED.show_tag;
  END IF;

  RETURN jsonb_build_object('ok', true, 'show_ovr', v_ovr, 'show_tag', v_tag);
END $$;

REVOKE ALL ON FUNCTION publish_crowd_part(text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION publish_crowd_part(text, text, text, boolean) TO authenticated;

-- ── the queue reports each half ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS crowd_queue();

CREATE FUNCTION crowd_queue()
RETURNS TABLE (player_key text, season text, n int, avg_trimmed smallint,
               tag_top text, tag_top_n int, show_ovr boolean, show_tag boolean,
               decision text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.player_key, c.season, c.n, c.avg_trimmed, c.tag_top, c.tag_top_n,
         COALESCE(p.show_ovr, false), COALESCE(p.show_tag, false),
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
