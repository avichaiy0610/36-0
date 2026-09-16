-- ─────────────────────────────────────────────────────────────────────────────
-- Who suggested a pair — the same answer the vote list already gives.
--
-- "לא ברור מי הציע את הצמדים דרך אגב". Same gap, same reason, same fix: the duo
-- queue showed the pair and a count, and a count cannot show a pattern. The
-- person worth spotting is the one who suggests twenty pairs in an evening, and
-- that is invisible in a column that only says "1".
--
-- Same rules as crowd_votes_for: a signed-in suggester is named by the username
-- he already shows on every leaderboard, an anonymous one gets the first six of
-- his client id — enough to recognise the same browser twice, not enough to be
-- anybody. The uuid never leaves the database.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION duo_suggesters(p_pair_key text)
RETURNS TABLE (who text, is_user boolean, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
           WHEN s.is_user THEN COALESCE(p.username, 'משתמש מחוק')
           ELSE 'אנונימי · ' || substr(s.voter, 3, 6)
         END AS who,
         s.is_user,
         s.created_at
    FROM duo_suggestions s
    LEFT JOIN profiles p
      ON s.is_user AND p.id = NULLIF(substr(s.voter, 3), '')::uuid
   WHERE s.pair_key = p_pair_key
     AND is_site_admin()
   ORDER BY s.created_at ASC
   LIMIT 200;
$$;

REVOKE ALL ON FUNCTION duo_suggesters(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION duo_suggesters(text) TO authenticated;
