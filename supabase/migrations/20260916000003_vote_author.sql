-- ─────────────────────────────────────────────────────────────────────────────
-- The review list names the voter, when there is a name to give.
--
-- I built it without names and argued the case: judging a vote does not require
-- naming the person, and the moment a face is attached the owner is moderating
-- people instead of data. The owner overruled it — "לא ברור מי הציע, חשוב לדעת
-- לדעתי" — and on his own site, in his own moderation queue, that is his call
-- to make. It is also the more useful answer to the problem he raised in the
-- first place: a troll is a PERSON voting repeatedly, and a list that refuses to
-- say who cannot show a pattern across players.
--
-- WHAT CAN AND CANNOT BE SHOWN. voter is 'u:' || auth.uid() for a signed-in
-- voter and 'a:' || client_id otherwise. For the first, the uuid joins profiles
-- and yields the username he picked, which is already public on every
-- leaderboard — so nothing is revealed here that the site does not already
-- publish. For the second there is no name in existence: an anonymous vote is
-- anonymous by construction, and the honest answer is the client id's short
-- prefix, which at least lets two votes from the same browser be recognised as
-- one person without ever identifying who.
--
-- The uuid itself is NOT returned. A username is a name a person chose to be
-- known by; a uuid is a key into the rest of their data, and the dashboard has
-- no use for it.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS crowd_votes_for(text, text);

CREATE FUNCTION crowd_votes_for(p_player_key text, p_season text)
RETURNS TABLE (id bigint, ovr smallint, tag text, is_user boolean,
               excluded boolean, updated_at timestamptz, who text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT v.id, v.ovr, v.tag, v.is_user, v.excluded, v.updated_at,
         CASE
           -- signed in: the name he chose, the same one the boards already show
           WHEN v.is_user THEN COALESCE(p.username, 'משתמש מחוק')
           -- anonymous: no name exists. The first six of the client id are
           -- enough to see the same browser twice and not enough to be anybody.
           ELSE 'אנונימי · ' || substr(v.voter, 3, 6)
         END AS who
    FROM player_votes v
    LEFT JOIN profiles p
      ON v.is_user AND p.id = NULLIF(substr(v.voter, 3), '')::uuid
   WHERE v.player_key = p_player_key AND v.season = p_season
     AND is_site_admin()
   ORDER BY v.ovr ASC, v.id ASC
   LIMIT 500;
$$;

REVOKE ALL ON FUNCTION crowd_votes_for(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crowd_votes_for(text, text) TO authenticated;
