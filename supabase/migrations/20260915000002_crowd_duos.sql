-- ─────────────────────────────────────────────────────────────────────────────
-- הצעת צמדים — the crowd proposes a pairing, never its strength.
--
-- chemistry_duos.csv is a hand-curated list: 660 candidates, 271 kept. The rule
-- that generates them (scripts/build_chemistry.js) is four seasons side by side,
-- compatible lines, and titles won together. A good rule, and still a rule: it
-- cannot know who is REMEMBERED. Two centre-backs who spent six quiet seasons
-- together clear it; a partnership everyone recalls from two stormy seasons does
-- not.
--
-- THE DIVISION THAT SHAPES EVERYTHING HERE. A suggestion carries two names and
-- nothing else. The tier is a function of facts — tierOf(seasons, titles) at
-- build_chemistry.js:109 — and a passing player can neither judge it nor should
-- be asked to. What he can say is the one thing with no source: that these two
-- were a pair. Seasons, titles and tier are computed from the data at the moment
-- the owner approves, by the same code that writes the CSV today.
--
-- WHY THERE IS NO VOTE THRESHOLD, unlike ratings. A suggestion is a DISCRETE
-- CLAIM, not an average. One person saying "Harazi and Davidovich" is worth
-- seeing; there is nothing to average and no outlier to trim. The queue is
-- sorted by how many people said it, and that is the whole ranking.
--
-- It is also why the brigading problem that shaped 20260915000001 does not
-- arise: you cannot attack a player by proposing a duo for him. The worst a
-- coordinated group achieves is noise in the owner's queue, and the queue is
-- sorted.
--
-- NOTHING REACHES THE GAME ALONE. Two manual gates, same as ratings: approve in
-- the dashboard, then run scripts/apply_crowd_duos.js, then build_chem_js.js.
-- A duo is worth 0.4 to 1.0 rating points (CHEM_BONUS in js/chemistry.js), so
-- this is a balance change and is treated as one.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS duo_suggestions (
  -- Two crowdKeys, sorted and joined with '|' — byte-identical to the key
  -- format js/chem-data.js already uses, so a suggestion and a shipped pair are
  -- the same string and can be compared without translating either.
  pair_key   text        NOT NULL CHECK (char_length(pair_key) BETWEEN 3 AND 130
                                         AND pair_key LIKE '%|%'),
  voter      text        NOT NULL CHECK (voter ~ '^[ua]:'),
  is_user    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pair_key, voter)
);

CREATE INDEX IF NOT EXISTS duo_suggestions_rate ON duo_suggestions (voter, created_at);

ALTER TABLE duo_suggestions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE duo_suggestions FROM anon, authenticated;

-- ── suggesting ──────────────────────────────────────────────────────────────
-- The identity prefixes are assembled here and nowhere a client can reach, the
-- same invariant 20260914000001 established for votes: 'u:' can only ever come
-- from a verified token, so no string a caller sends can address a signed-in
-- user's row.
CREATE OR REPLACE FUNCTION suggest_duo(p_pair_key text, p_voter text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid      uuid := auth.uid();
  v_voter  text;
  v_recent int;
BEGIN
  IF uid IS NOT NULL THEN
    v_voter := 'u:' || uid::text;
  ELSE
    IF p_voter !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR p_voter IS NULL THEN
      RETURN jsonb_build_object('error', 'bad voter');
    END IF;
    v_voter := 'a:' || p_voter;
  END IF;

  IF p_pair_key IS NULL OR p_pair_key NOT LIKE '%|%'
     OR char_length(p_pair_key) > 130 THEN
    RETURN jsonb_build_object('error', 'bad pair');
  END IF;

  -- Whether the two men ever shared a pitch cannot be checked here: SQUADS
  -- lives in js/data.js, not in Postgres. The client filters so it never offers
  -- an impossible pair, and scripts/apply_crowd_duos.js refuses one on the way
  -- in — because a client can be forged and the CSV is the thing that matters.
  SELECT count(*) INTO v_recent
    FROM duo_suggestions
   WHERE voter = v_voter AND created_at > now() - interval '1 hour';
  IF v_recent >= 30 THEN
    RETURN jsonb_build_object('error', 'rate limited');
  END IF;

  INSERT INTO duo_suggestions (pair_key, voter, is_user)
  VALUES (p_pair_key, v_voter, uid IS NOT NULL)
  ON CONFLICT (pair_key, voter) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION suggest_duo(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION suggest_duo(text, text) TO anon, authenticated;

-- ── what I already suggested ────────────────────────────────────────────────
-- So the card can show "הוצע" on a pair this person already sent, instead of
-- inviting him to send it again. Returns only HIS OWN rows: an anonymous caller
-- can never resolve a signed-in user's, because 'a:' || anything never begins
-- with 'u:'.
CREATE OR REPLACE FUNCTION my_duo_suggestions(p_voter text DEFAULT NULL)
RETURNS TABLE (pair_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.pair_key FROM duo_suggestions s
   WHERE s.voter = CASE WHEN auth.uid() IS NOT NULL
                        THEN 'u:' || auth.uid()::text
                        ELSE 'a:' || p_voter END
   LIMIT 500;
$$;

REVOKE ALL ON FUNCTION my_duo_suggestions(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION my_duo_suggestions(text) TO anon, authenticated;

-- ── the owner's queue ───────────────────────────────────────────────────────
-- Sorted by how many people said it. Dismissed pairs drop out until somebody
-- new says it, the same shape rating_dismissals uses.
CREATE TABLE IF NOT EXISTS duo_dismissals (
  pair_key   text NOT NULL PRIMARY KEY,
  at_votes   int  NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE duo_dismissals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE duo_dismissals FROM anon, authenticated;

CREATE OR REPLACE FUNCTION duo_queue()
RETURNS TABLE (pair_key text, n int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.pair_key, count(*)::int AS n
    FROM duo_suggestions s
    LEFT JOIN duo_dismissals d ON d.pair_key = s.pair_key
   WHERE is_site_admin()
   GROUP BY s.pair_key, d.at_votes
  HAVING d.at_votes IS NULL OR count(*) > d.at_votes
   ORDER BY count(*) DESC, s.pair_key ASC
   LIMIT 300;
$$;

REVOKE ALL ON FUNCTION duo_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION duo_queue() TO authenticated;

-- ── approving and dismissing ────────────────────────────────────────────────
-- An approval is a row scripts/apply_crowd_duos.js will read. It does not write
-- chemistry_duos.csv and it does not touch the game; that is the second gate,
-- and it is a command the owner types.
CREATE TABLE IF NOT EXISTS duo_approvals (
  pair_key   text        NOT NULL PRIMARY KEY,
  votes      int         NOT NULL,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE duo_approvals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE duo_approvals FROM anon, authenticated;

CREATE OR REPLACE FUNCTION approve_duo(p_pair_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_n int;
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  SELECT count(*)::int INTO v_n FROM duo_suggestions WHERE pair_key = p_pair_key;
  IF v_n = 0 THEN RETURN jsonb_build_object('error', 'no suggestions'); END IF;

  INSERT INTO duo_approvals (pair_key, votes) VALUES (p_pair_key, v_n)
  ON CONFLICT (pair_key) DO UPDATE SET votes = EXCLUDED.votes
   WHERE duo_approvals.applied_at IS NULL;

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION approve_duo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_duo(text) TO authenticated;

CREATE OR REPLACE FUNCTION dismiss_duo(p_pair_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_n int;
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  SELECT count(*)::int INTO v_n FROM duo_suggestions WHERE pair_key = p_pair_key;
  INSERT INTO duo_dismissals (pair_key, at_votes) VALUES (p_pair_key, COALESCE(v_n, 0))
  ON CONFLICT (pair_key) DO UPDATE SET at_votes = EXCLUDED.at_votes;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION dismiss_duo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dismiss_duo(text) TO authenticated;
