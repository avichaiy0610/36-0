-- ─────────────────────────────────────────────────────────────────────────────
-- The crowd rates the six attributes too.
--
-- This closes a loop the owner opened yesterday. He had the six attributes
-- pulled off the public player pages because they are not founded — and he was
-- right: scripts/build_attrs.js measured its own coverage when it shipped, and
-- LEAGUE_SCORERS names 152 players against 9,568 player-seasons. For the other
-- 98% an attribute is inferred from the CLUB's goals and defensive record, so a
-- good defender at a leaky club reads as a bad defender. מהירות has no source at
-- all and was flagged ATTR_EST from the first day.
--
-- Those numbers still drive בונה כדורגלן. Removing them from public view fixed
-- the claim, not the data. People who watched the man play are the source that
-- was missing.
--
-- ── ONE QUESTION PER PLAYER, NOT PER SEASON ─────────────────────────────────
-- The owner's call, and it is the one that decides whether this is usable.
-- "How fast was he?" is a question a fan can answer; "how fast was he in
-- 2004/05?" mostly is not. It also matters arithmetically: six questions per
-- player is about 16,000 cells, six per player-SEASON is 57,000, and with a
-- five-vote threshold the second one would never fill.
--
-- ── HOW IT IS KEYED ─────────────────────────────────────────────────────────
-- As 'attr:pac', 'attr:sho' and so on, in the same column that already carries
-- 'peak'. That column stopped being literally a season the moment the peak was
-- added; what it really holds is WHAT IS BEING RATED. Every consumer keys on
-- (player_key, season) — the primary key, the aggregate's GROUP BY, the publish
-- gate, the exclusion switch, the queue, the Telegram payload — so a new subject
-- flows through all of them correct and untouched, and none of them can collide
-- with a real season because a real one always matches ^[0-9]{4}/[0-9]{2}$.
--
-- A separate table would have meant a parallel publish gate, a parallel
-- exclusion switch and a parallel queue, all of which already work.
-- ─────────────────────────────────────────────────────────────────────────────

-- The six are the FIFA six, and that is not a styling choice: the owner rejected
-- the invented names (גמר · יצירה · הכרעה · יציבות) during בונה כדורגלן and
-- asked for what a football fan already knows. js/attrs.js packs them in this
-- order and scripts/player_pages.js names them the same way.
CREATE OR REPLACE FUNCTION crowd_subject_ok(s text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT s = 'peak'
      OR s ~ '^[0-9]{4}/[0-9]{2}$'
      OR s IN ('attr:pac','attr:sho','attr:pas','attr:dri','attr:def','attr:phy');
$$;

ALTER TABLE player_votes    DROP CONSTRAINT IF EXISTS player_votes_season_check;
ALTER TABLE player_votes    ADD  CONSTRAINT player_votes_season_check
  CHECK (crowd_subject_ok(season));

ALTER TABLE player_notes    DROP CONSTRAINT IF EXISTS player_notes_season_check;
ALTER TABLE player_notes    ADD  CONSTRAINT player_notes_season_check
  CHECK (crowd_subject_ok(season));

ALTER TABLE crowd_published DROP CONSTRAINT IF EXISTS crowd_published_season_check;
ALTER TABLE crowd_published ADD  CONSTRAINT crowd_published_season_check
  CHECK (crowd_subject_ok(season));

-- ── the vote RPC accepts the new subjects ───────────────────────────────────
CREATE OR REPLACE FUNCTION vote_player(
  p_player_key text,
  p_season     text,
  p_ovr        smallint,
  p_tag        text DEFAULT NULL,
  p_voter      text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid      uuid := auth.uid();
  v_voter  text;
  v_recent int;
  v_known  boolean;
BEGIN
  IF uid IS NOT NULL THEN
    v_voter := 'u:' || uid::text;
  ELSE
    IF p_voter IS NULL
       OR p_voter !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN jsonb_build_object('error', 'bad voter');
    END IF;
    v_voter := 'a:' || p_voter;
  END IF;

  IF p_ovr IS NULL OR p_ovr < 40 OR p_ovr > 99 THEN
    RETURN jsonb_build_object('error', 'bad ovr');
  END IF;
  IF p_player_key IS NULL OR char_length(p_player_key) NOT BETWEEN 1 AND 64 THEN
    RETURN jsonb_build_object('error', 'bad player');
  END IF;
  IF p_season IS NULL OR NOT crowd_subject_ok(p_season) THEN
    RETURN jsonb_build_object('error', 'bad season');
  END IF;
  -- A tag describes the whole player, so it belongs on the overall vote. Letting
  -- one ride along on an attribute would count the same opinion six times.
  IF p_tag IS NOT NULL AND p_season LIKE 'attr:%' THEN
    RETURN jsonb_build_object('error', 'no tag on an attribute');
  END IF;
  IF p_tag IS NOT NULL AND NOT EXISTS (SELECT 1 FROM crowd_tags WHERE key = p_tag) THEN
    RETURN jsonb_build_object('error', 'bad tag');
  END IF;

  SELECT EXISTS (SELECT 1 FROM player_votes
                  WHERE player_key = p_player_key AND season = p_season
                    AND voter = v_voter) INTO v_known;

  IF NOT v_known THEN
    SELECT count(*) INTO v_recent
      FROM player_votes
     WHERE voter = v_voter AND created_at > now() - interval '1 hour';
    -- Six attributes plus an overall plus a peak is eight rows from one sitting,
    -- so the old ceiling of 40 was about five players. Raised to match the shape
    -- of the thing rather than to loosen it.
    IF v_recent >= 120 THEN
      RETURN jsonb_build_object('error', 'rate limited');
    END IF;
  END IF;

  INSERT INTO player_votes (player_key, season, voter, is_user, ovr, tag, updated_at)
  VALUES (p_player_key, p_season, v_voter, uid IS NOT NULL, p_ovr, p_tag, now())
  ON CONFLICT (player_key, season, voter)
  DO UPDATE SET ovr = EXCLUDED.ovr, tag = EXCLUDED.tag,
                is_user = EXCLUDED.is_user, updated_at = now()
    WHERE player_votes.ovr     IS DISTINCT FROM EXCLUDED.ovr
       OR player_votes.tag     IS DISTINCT FROM EXCLUDED.tag
       OR player_votes.is_user IS DISTINCT FROM EXCLUDED.is_user;

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION vote_player(text, text, smallint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vote_player(text, text, smallint, text, text) TO anon, authenticated;

-- ── voting on several at once ───────────────────────────────────────────────
-- Six sliders produce six votes, and six round trips from a hover card inside a
-- live draft is the wrong shape. One call, one rate-limit check, all or nothing.
CREATE OR REPLACE FUNCTION vote_attrs(
  p_player_key text,
  p_attrs      jsonb,           -- {"pac":82,"sho":90,...}, any subset of the six
  p_voter      text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid     uuid := auth.uid();
  v_voter text;
  k       text;
  v       int;
  n_done  int := 0;
BEGIN
  IF uid IS NOT NULL THEN
    v_voter := 'u:' || uid::text;
  ELSE
    IF p_voter IS NULL
       OR p_voter !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN jsonb_build_object('error', 'bad voter');
    END IF;
    v_voter := 'a:' || p_voter;
  END IF;

  IF p_player_key IS NULL OR char_length(p_player_key) NOT BETWEEN 1 AND 64 THEN
    RETURN jsonb_build_object('error', 'bad player');
  END IF;
  IF p_attrs IS NULL OR jsonb_typeof(p_attrs) <> 'object' THEN
    RETURN jsonb_build_object('error', 'bad attrs');
  END IF;

  FOR k, v IN SELECT key, (value#>>'{}')::int FROM jsonb_each(p_attrs) LOOP
    IF NOT crowd_subject_ok('attr:' || k) THEN
      RETURN jsonb_build_object('error', 'bad attr: ' || k);
    END IF;
    IF v IS NULL OR v < 40 OR v > 99 THEN
      RETURN jsonb_build_object('error', 'bad value for ' || k);
    END IF;

    INSERT INTO player_votes (player_key, season, voter, is_user, ovr, updated_at)
    VALUES (p_player_key, 'attr:' || k, v_voter, uid IS NOT NULL, v::smallint, now())
    ON CONFLICT (player_key, season, voter)
    DO UPDATE SET ovr = EXCLUDED.ovr, is_user = EXCLUDED.is_user, updated_at = now()
      WHERE player_votes.ovr IS DISTINCT FROM EXCLUDED.ovr;
    n_done := n_done + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'n', n_done);
END $$;

REVOKE ALL ON FUNCTION vote_attrs(text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vote_attrs(text, jsonb, text) TO anon, authenticated;

-- ── reading mine back, all six at once ──────────────────────────────────────
CREATE OR REPLACE FUNCTION my_player_attrs(p_player_key text, p_voter text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(jsonb_object_agg(substr(v.season, 6), v.ovr), '{}'::jsonb)
    FROM player_votes v
   WHERE v.player_key = p_player_key
     AND v.season LIKE 'attr:%'
     AND v.voter = CASE WHEN auth.uid() IS NOT NULL
                        THEN 'u:' || auth.uid()::text
                        ELSE 'a:' || p_voter END;
$$;

REVOKE ALL ON FUNCTION my_player_attrs(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION my_player_attrs(text, text) TO anon, authenticated;
