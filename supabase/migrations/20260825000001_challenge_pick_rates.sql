-- How often each player was picked in one challenge.
--
-- Everyone gets the same eleven squads, so the points table answers "who built
-- the best XI" and nothing else. This answers the other question — the one
-- people actually argue about: who did everybody take, and what did you see
-- that they didn't. Borrowed from Immaculate Grid's rarity score, where the
-- second scoreboard is how obscure your correct answers were.
--
-- Reads nothing the board does not already read: challenge_results is public by
-- design, so this is an invoker-rights function, not a definer one.
CREATE OR REPLACE FUNCTION challenge_pick_rates(p_period text, p_key text)
RETURNS TABLE (name text, picks bigint, pct numeric)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH entries AS (
    SELECT r.user_id, r.players
      FROM challenge_results r
     WHERE r.period = p_period
       AND r.challenge_key = p_key
       AND p_period IN ('daily', 'weekly', 'monthly')
  ),
  -- one row per (player, person): the same name twice in one XI still counts once
  picked AS (
    SELECT DISTINCT e.user_id, (p->>'name') AS name
      FROM entries e, jsonb_array_elements(e.players) p
     WHERE COALESCE(p->>'name', '') <> ''
  )
  SELECT k.name,
         count(*)::bigint AS picks,
         round(100.0 * count(*) / GREATEST((SELECT count(*) FROM entries), 1), 1) AS pct
    FROM picked k
   GROUP BY k.name
   ORDER BY count(*) DESC, k.name;
$$;

GRANT EXECUTE ON FUNCTION challenge_pick_rates(text, text) TO anon, authenticated;
