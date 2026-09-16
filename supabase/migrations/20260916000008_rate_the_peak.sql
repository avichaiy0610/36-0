-- ─────────────────────────────────────────────────────────────────────────────
-- The peak can be rated too, not only a season.
--
-- "למה הדירוגים הם רק לעונות ולא לשיא?" They were only seasons, and on the
-- /player/ pages the season offered happens to BE his peak season — which is
-- why it looked like a peak rating without being one.
--
-- The two are genuinely different numbers and the game already keeps both:
-- `ovr` is what he was that year, `peak_ovr` is what he was at his best, and
-- peak mode plays the whole league off the second one. A crowd that can only
-- speak about single seasons cannot say anything about the number half the
-- modes actually use.
--
-- HOW IT IS STORED, and why there is no new column. The peak is filed as the
-- season string 'peak'. That reads like a hack and is the opposite: season is
-- already the second half of the key everywhere — the primary key, the
-- aggregate's GROUP BY, the publish gate, the exclusion switch, the dashboard
-- queue, the Telegram payload — so a distinct value flows through all of them
-- untouched and correct, and 'peak' can never collide with a real season
-- because a real season always matches ^[0-9]{4}/[0-9]{2}$.
--
-- A `kind` column beside a season would have encoded the same fact twice, and
-- every query would then have had to remember to filter on both. The one thing
-- that must change is the CHECK, in the three places that carry one.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE player_votes       DROP CONSTRAINT IF EXISTS player_votes_season_check;
ALTER TABLE player_votes       ADD  CONSTRAINT player_votes_season_check
  CHECK (season = 'peak' OR season ~ '^[0-9]{4}/[0-9]{2}$');

ALTER TABLE player_notes       DROP CONSTRAINT IF EXISTS player_notes_season_check;
ALTER TABLE player_notes       ADD  CONSTRAINT player_notes_season_check
  CHECK (season = 'peak' OR season ~ '^[0-9]{4}/[0-9]{2}$');

ALTER TABLE crowd_published    DROP CONSTRAINT IF EXISTS crowd_published_season_check;
ALTER TABLE crowd_published    ADD  CONSTRAINT crowd_published_season_check
  CHECK (season = 'peak' OR season ~ '^[0-9]{4}/[0-9]{2}$');

-- ── the two RPCs that validate the season themselves ────────────────────────
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
  -- 'peak' is a season here: the career best, rated as its own thing.
  IF p_season IS NULL
     OR (p_season <> 'peak' AND p_season !~ '^[0-9]{4}/[0-9]{2}$') THEN
    RETURN jsonb_build_object('error', 'bad season');
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
    IF v_recent >= 40 THEN
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

CREATE OR REPLACE FUNCTION submit_player_note(
  p_player_key text,
  p_season     text,
  p_body       text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid   uuid := auth.uid();
  clean text;
  n_day int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    RETURN jsonb_build_object('error', 'no profile');
  END IF;
  IF p_player_key IS NULL OR char_length(p_player_key) NOT BETWEEN 1 AND 64 THEN
    RETURN jsonb_build_object('error', 'bad player');
  END IF;
  IF p_season IS NULL
     OR (p_season <> 'peak' AND p_season !~ '^[0-9]{4}/[0-9]{2}$') THEN
    RETURN jsonb_build_object('error', 'bad season');
  END IF;

  clean := NULLIF(btrim(left(regexp_replace(COALESCE(p_body, ''), '[\r\n\t<>]', ' ', 'g'), 80)), '');
  IF clean IS NULL OR char_length(clean) < 2 THEN
    RETURN jsonb_build_object('error', 'empty');
  END IF;

  IF EXISTS (SELECT 1 FROM player_notes
              WHERE user_id = uid AND player_key = p_player_key
                AND created_at > now() - interval '1 day') THEN
    RETURN jsonb_build_object('error', 'already today');
  END IF;

  SELECT count(*) INTO n_day FROM player_notes
   WHERE user_id = uid AND created_at > now() - interval '1 day';
  IF n_day >= 10 THEN RETURN jsonb_build_object('error', 'daily cap'); END IF;

  INSERT INTO player_notes (player_key, season, user_id, body)
  VALUES (p_player_key, p_season, uid, clean);

  RETURN jsonb_build_object('ok', true, 'status', 'pending');
END $$;

REVOKE ALL ON FUNCTION submit_player_note(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_player_note(text, text, text) TO authenticated;
