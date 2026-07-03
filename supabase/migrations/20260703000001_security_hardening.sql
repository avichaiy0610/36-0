-- ─────────────────────────────────────────────────────────────────────────────
-- Security hardening: close direct-write holes that bypass the submit-result
-- edge function. The edge function uses the service-role key, which bypasses
-- RLS, so locking client writes does not affect legitimate saves.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Leaderboard forgery: previously any authenticated user could INSERT an
--    arbitrary game_results row (e.g. a fake 108-point 36-0 season) straight
--    to the leaderboard. Only the edge function (service role) may write now.
DROP POLICY IF EXISTS "results_insert" ON game_results;
CREATE POLICY "results_insert" ON game_results FOR INSERT WITH CHECK (false);

-- 2) Squads: same treatment — and drop the client UPDATE policy so a user
--    can't rewrite their stored XI after the fact. Written by service role only.
DROP POLICY IF EXISTS "squads_insert" ON squads;
CREATE POLICY "squads_insert" ON squads FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "squads_update" ON squads;

-- 3) Profiles: a client could set ANY column of its own row, including
--    games_played (achievement fraud) and an unbounded username (stored XSS).
--    Restrict client UPDATE to username + avatar_url only; games_played stays
--    writable exclusively via the SECURITY DEFINER increment_games_played().
REVOKE UPDATE ON profiles FROM authenticated;
GRANT  UPDATE (username, avatar_url) ON profiles TO authenticated;

-- Server-side username validation: 2–20 chars, no angle brackets (defence in
-- depth against XSS / impersonation) — mirrors the client-side check.
-- First neutralise any existing rows that would violate the new constraint
-- (e.g. HTML-payload usernames) so it can be added.
UPDATE profiles SET username = NULL
  WHERE username IS NOT NULL
    AND (char_length(username) NOT BETWEEN 2 AND 20 OR username ~ '[<>]');
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS username_valid;
ALTER TABLE profiles ADD  CONSTRAINT username_valid
  CHECK (username IS NULL OR (char_length(username) BETWEEN 2 AND 20 AND username !~ '[<>]'));

-- 4) Clean up rows created by the direct-write probe (obvious fakes).
DELETE FROM game_results WHERE tier IN ('cheater', 'cheater-forged');
