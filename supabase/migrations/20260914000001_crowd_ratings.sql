-- ─────────────────────────────────────────────────────────────────────────────
-- דירוגי הקהל — the crowd's ratings.
--
-- Every tag the game already has (js/tags.js) is a fact the data proves: top
-- scorer, title winner, one-club man. Not one of them is an opinion. The tables
-- here open exactly what the data cannot know — who took the free kicks, who
-- led the dressing room, who never became what he was supposed to be.
--
-- Nothing here touches the game at runtime. A rating the owner approves reaches
-- js/data.js through scripts/apply_crowd_ratings.js, the same way chemistry and
-- tags already do. The simulation stays deterministic and works offline, and no
-- network failure can move a balance number or a board.
--
-- Raw votes are never read from outside. The world sees crowd_ratings and
-- nothing else.
--
-- ── WHAT THIS SCHEMA DELIBERATELY DOES NOT DEFEND AGAINST ────────────────────
-- Sybil attacks. An anonymous voter supplies his own p_voter, so a loop of
-- fresh UUIDs is a loop of fresh rate-limit buckets, and `n` on any
-- player-season is manufacturable by one person with a script. Trimming 10%
-- from each end defends against a handful of outliers; it does nothing against
-- a forged majority. That is inherent to voting without an account, and
-- anonymous voting was chosen on purpose, to get volume.
--
-- What bounds the damage is the human gate: nothing reaches the game until the
-- owner approves a row in the dashboard and then runs the apply script by hand.
-- But `n` is the trust signal the owner reads off that dashboard — "412 people
-- said 86" — and `n` is precisely the number an attacker can inflate. Read it
-- as "at least this many opinions were submitted", never as "this many people
-- think so". This is a decision that was made, not a hole that was missed.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── the closed tag list ─────────────────────────────────────────────────────
-- Thirteen keys. The client shows ten: for a keeper set_piece→reflexes,
-- magic→sweeper, pace→distribution are swapped in. Enforced here so that no
-- other value can ever enter the table.
CREATE TABLE IF NOT EXISTS crowd_tags (
  key   text PRIMARY KEY,
  label text NOT NULL
);

INSERT INTO crowd_tags (key, label) VALUES
  ('set_piece',    'בעיטות נייחות'),
  ('derby_king',   'מלך הדרבי'),
  ('leader',       'מנהיג'),
  ('pace',         'מהירות יוצאת דופן'),
  ('magic',        'קסם ברגליים'),
  ('tough',        'קשוח'),
  ('big_games',    'שחקן של משחקים גדולים'),
  ('unfulfilled',  'לא מומש'),
  ('injuries',     'פציעות רדפו אותו'),
  ('cult_hero',    'אגדת קהל'),
  ('reflexes',     'רפלקסים'),
  ('sweeper',      'יציאות'),
  ('distribution', 'משחק ברגליים')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

ALTER TABLE crowd_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crowd_tags_read ON crowd_tags;
CREATE POLICY crowd_tags_read ON crowd_tags FOR SELECT USING (true);

-- REVOKE before GRANT, and it is not decoration. Supabase's bootstrap runs
-- `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,
-- authenticated`, so every table a migration creates in this schema is born
-- with SELECT/INSERT/UPDATE/DELETE for both roles before a single GRANT is
-- written. RLS still stops the rows, but "there is no GRANT" is simply not a
-- true sentence in this project unless it is made true. service_role is left
-- alone on purpose — apply_crowd_ratings.js needs it.
REVOKE ALL ON TABLE crowd_tags FROM anon, authenticated;
GRANT SELECT ON TABLE crowd_tags TO anon, authenticated;

-- ── the votes ───────────────────────────────────────────────────────────────
-- `voter` is a namespaced identity, and the prefix is the security model of
-- this whole table: 'u:' || auth.uid() for a signed-in voter, 'a:' || client_id
-- (the uuid js/track.js already keeps) for an anonymous one.
--
-- WHY THE PREFIX EXISTS. Without it the two identity spaces share one key
-- space, and auth.uid()::text is a bare UUID — indistinguishable from the
-- client-supplied client_id, which has to match the same regex. Those UUIDs are
-- public: career_board() is granted to anon and returns user_id next to
-- username (20260825000003_career_board.sql). So one unauthenticated call
-- harvests real user ids, and a second call to vote_player with a harvested id
-- as p_voter would collide with that person's primary key, overwrite his rating
-- through the ON CONFLICT branch, and let the attacker read it back through
-- my_player_vote afterwards. The prefix makes that unreachable by construction:
-- nothing a client sends can ever address a 'u:' row, because 'u:' is built
-- inside vote_player and only from a verified token.
--
-- The unique key is what turns a repeat vote into an update: changing your mind
-- is allowed; voting twice on one player-season from one identity is not.
--
-- created_at is written once and never again — note that it is absent from the
-- ON CONFLICT DO UPDATE list further down, and updated_at is the opposite. The
-- first draft had only updated_at, and the rate limit built on it measured the
-- wrong quantity entirely: "distinct player-seasons this identity touched this
-- hour". Hammering ONE player-season held that count at 1 forever, while
-- somebody legitimately revising forty old opinions was locked out.
CREATE TABLE IF NOT EXISTS player_votes (
  player_key text        NOT NULL CHECK (char_length(player_key) BETWEEN 1 AND 64),
  -- The season format every squad in js/data.js uses, all 27 of them, from
  -- 1999/00 to 2025/26. Unbounded client text here would be unauthenticated
  -- storage amplification, since p_voter is forgeable and costs nothing.
  season     text        NOT NULL CHECK (season ~ '^[0-9]{4}/[0-9]{2}$'),
  -- The namespace invariant, in the database rather than only in two function
  -- bodies and a comment above them. A future backfill, an admin tool or a
  -- Task 7 RPC cannot quietly write an unprefixed voter and collapse the two
  -- identity spaces back into one.
  voter      text        NOT NULL CHECK (voter ~ '^[ua]:'),
  is_user    boolean     NOT NULL DEFAULT false,
  ovr        smallint    NOT NULL CHECK (ovr BETWEEN 40 AND 99),
  tag        text        REFERENCES crowd_tags(key),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_key, season, voter)
);

-- The PK already indexes (player_key, season) as a prefix, so on those two
-- columns alone this index would be dead weight paid for on every write. The
-- INCLUDE is what earns it: crowd_ratings groups the entire table by
-- (player_key, season) and needs ovr and tag, neither of which is in the PK, so
-- without the payload the planner seq-scans and hash-aggregates. With it the
-- view is an index-only scan over groups that arrive already in order.
--
-- It is not free, and the cost lands where it is least obvious: INCLUDE columns
-- count in indnatts and sit in the HOT-blocking attribute bitmap, so changing
-- ovr or tag now blocks a HOT update. A revision writes a new heap tuple at a
-- new TID plus an entry in every index — see the upsert in vote_player, which
-- is written so that a re-vote changing nothing writes nothing.
CREATE INDEX IF NOT EXISTS player_votes_ps
  ON player_votes (player_key, season) INCLUDE (ovr, tag);

-- Not optional: the rate limit asks "how many votes did this identity CREATE in
-- the last hour", and it asks on every single vote.
CREATE INDEX IF NOT EXISTS player_votes_rate
  ON player_votes (voter, created_at);

-- Direct reads are closed completely. No SELECT policy, and no GRANT — see the
-- note at crowd_tags: without this REVOKE, PostgREST would answer
-- /rest/v1/player_votes with 200 and an empty array instead of 403, and on a
-- table that is empty for its first weeks those two are indistinguishable.
ALTER TABLE player_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE player_votes FROM anon, authenticated;

-- ── the notes ───────────────────────────────────────────────────────────────
-- Text about a real, living person. user_id is mandatory, moderation comes
-- before publication, and every approved note can be reported. That is the
-- heaviest decision in the spec and it is enforced here, not in the client.
--
-- profiles(id) rather than auth.users(id): the convention throughout this
-- schema (001_initial.sql:34, :59, :87, career_runs, gauntlet_runs, and ten
-- more), and it restores the guarantee that a note's author has a profile row —
-- which is what the moderation queue needs in order to show a username.
CREATE TABLE IF NOT EXISTS player_notes (
  id          bigserial PRIMARY KEY,
  player_key  text        NOT NULL CHECK (char_length(player_key) BETWEEN 1 AND 64),
  season      text        NOT NULL CHECK (season ~ '^[0-9]{4}/[0-9]{2}$'),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        text        NOT NULL CHECK (char_length(body) BETWEEN 2 AND 80),
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected')),
  reports     int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_notes_ps     ON player_notes (player_key, season, status);
CREATE INDEX IF NOT EXISTS player_notes_queue  ON player_notes (status, created_at);
-- Both of submit_player_note's daily limits count rows by author and date.
CREATE INDEX IF NOT EXISTS player_notes_author ON player_notes (user_id, created_at);

ALTER TABLE player_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS player_notes_read_approved ON player_notes;
CREATE POLICY player_notes_read_approved ON player_notes
  FOR SELECT USING (status = 'approved');

-- SELECT only. Writing goes through submit_player_note, which is SECURITY
-- DEFINER and therefore needs no privilege on the table — and anyone who could
-- write directly could skip moderation, which is the entire point of the table.
REVOKE ALL ON TABLE player_notes FROM anon, authenticated;
GRANT SELECT ON TABLE player_notes TO anon, authenticated;

-- ── who reported what ───────────────────────────────────────────────────────
-- The reports counter on player_notes is only meaningful if one person can push
-- it up by one. Without this table report_note was an open anonymous endpoint
-- with no dedupe, and note ids are enumerable because approved notes are
-- world-readable — so a single loop could drive any note's counter to any
-- number and decide what the owner sees at the top of his queue.
CREATE TABLE IF NOT EXISTS note_reports (
  note_id    bigint      NOT NULL REFERENCES player_notes(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (note_id, user_id)
);

-- Postgres does not index a foreign key column for you, and the PK here leads
-- with note_id — so without this, deleting an account seq-scans the whole table
-- to service the ON DELETE CASCADE.
CREATE INDEX IF NOT EXISTS note_reports_user ON note_reports (user_id);

ALTER TABLE note_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE note_reports FROM anon, authenticated;

-- ── approved ratings ────────────────────────────────────────────────────────
-- What the owner approved in the dashboard. scripts/apply_crowd_ratings.js
-- reads from here.
--
-- WHY player_key AND season ARE NOT CLAMPED HERE, WHILE THEY ARE ON THE TWO
-- TABLES ABOVE. Read this before Task 7 leans on it, because the obvious
-- version of the reason is wrong. It is true of approve_rating, which copies a
-- row that already passed the CHECKs on player_votes. It is NOT true of
-- dismiss_rating, which reads a vote count with SELECT … INTO and then inserts
-- COALESCE(v_n, 0) without requiring that the player-season exists at all — so
-- it will write whatever key it is handed. What actually makes both tables safe
-- is not their input path but their door: every RPC that writes them is behind
-- is_site_admin(), so the only person who can put junk here is the owner, on
-- his own dashboard. Widen that gate and these two columns need the CHECKs.
CREATE TABLE IF NOT EXISTS rating_approvals (
  id          bigserial PRIMARY KEY,
  player_key  text        NOT NULL,
  season      text        NOT NULL,
  -- Both sides are range-checked. old_ovr arrives from the admin client just as
  -- new_ovr does, and an unchecked one would quietly corrupt the before/after
  -- log that the apply script writes.
  old_ovr     smallint    NOT NULL CHECK (old_ovr BETWEEN 40 AND 99),
  new_ovr     smallint    NOT NULL CHECK (new_ovr BETWEEN 40 AND 99),
  votes       int         NOT NULL,
  applied_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One pending approval per player-season. Once the script stamps applied_at
-- that player can be approved again — history is kept, the queue stays clean.
CREATE UNIQUE INDEX IF NOT EXISTS rating_approvals_pending
  ON rating_approvals (player_key, season) WHERE applied_at IS NULL;

ALTER TABLE rating_approvals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE rating_approvals FROM anon, authenticated;

-- ── dismissals ──────────────────────────────────────────────────────────────
-- "Dismiss" drops a row off the queue until more votes accumulate. The vote
-- count at the moment of dismissal is kept, so the row only comes back when
-- something genuinely new has been said.
CREATE TABLE IF NOT EXISTS rating_dismissals (
  player_key text NOT NULL,
  season     text NOT NULL,
  at_votes   int  NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_key, season)
);

ALTER TABLE rating_dismissals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE rating_dismissals FROM anon, authenticated;

-- ── the trimmed average ─────────────────────────────────────────────────────
-- Sort, drop GREATEST(1, floor(n*0.1)) from each end, average what is left,
-- round. Below 5 votes it returns NULL. A separate function so that it can be
-- checked in a single SELECT.
--
-- Why the threshold test is a scalar subquery and not k.c: the outer query
-- aggregates (avg), so any direct reference to k.c inside its SELECT list would
-- fail with "must appear in the GROUP BY clause". In the WHERE it is fine —
-- WHERE runs before aggregation.
CREATE OR REPLACE FUNCTION crowd_trimmed_avg(vals smallint[])
RETURNS smallint
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  WITH n AS (SELECT array_length(vals, 1) AS c),
       k AS (SELECT GREATEST(1, floor(c * 0.1))::int AS cut, c FROM n),
       s AS (
         SELECT v, row_number() OVER (ORDER BY v) AS rn
           FROM unnest(vals) AS v
       )
  SELECT CASE WHEN (SELECT c FROM k) < 5 THEN NULL
              ELSE round(avg(s.v))::smallint END
    FROM s, k
   WHERE s.rn > k.cut AND s.rn <= k.c - k.cut;
$$;

-- A function is EXECUTE-able by PUBLIC by default, so the REVOKE narrows the
-- grant to something deliberate. But unlike the four RPCs at the bottom of this
-- file, this one MUST be granted back to anon and authenticated, and getting
-- that wrong takes the whole feature dark.
--
-- WHY THE VIEW DOES NOT COVER IT. security_invoker = false redirects permission
-- checks on RELATIONS to the view owner — it sets checkAsUser on the range
-- table entry. It does not change GetUserId(), and EXECUTE on a function in the
-- query tree is checked against the CURRENT user at executor init
-- (init_fcache → pg_proc_aclcheck with GetUserId()). A security-definer view
-- confers no function execute rights. Without the GRANT below, every
-- `SELECT … FROM crowd_ratings` fails with "permission denied for function
-- crowd_trimmed_avg" — every player-card hover, dead. Nor does inlining rescue
-- it: inline_function() declines to inline when the ACL check fails, so the
-- error surfaces either way.
--
-- THE BETTER END STATE, AND WHY IT IS NOT HERE. Folding this arithmetic
-- directly into the view body would leave no function call to authorise and no
-- /rpc/crowd_trimmed_avg endpoint at all. That is cleaner, and it is the thing
-- to do the day somebody has a database in front of them. It was not done now
-- because this migration has never been executed anywhere: an untested rewrite
-- of the only real arithmetic in the file is a worse risk than an exposed pure
-- calculator that touches no data, whose only abuse is burning CPU on an array
-- already bounded by the request body limit.
REVOKE ALL ON FUNCTION crowd_trimmed_avg(smallint[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crowd_trimmed_avg(smallint[]) TO anon, authenticated;

-- ── the public aggregate ────────────────────────────────────────────────────
-- The only thing the world reads.
--
-- What is exposed and what is not, and this is the distinction that is easy to
-- miss: the counter n always comes out, the rating only from five votes up
-- (crowd_trimmed_avg returns NULL below that). A first attempt filtered with
-- HAVING count(*) >= 5, which would have killed the state the spec calls "two
-- more votes and the rating appears" — the client would not have received a row
-- at all, would have fallen into the empty state, and the counter meant to work
-- as the incentive simply would not have existed.
--
-- The tag is gated on the same five. At n=1 an ungated tag_top publishes one
-- individual's answer under the words "the crowd" — which is the raw-vote
-- exposure the header of this file says never happens. The threshold appears
-- twice in this file, here and inside crowd_trimmed_avg; they move together.
--
-- security_invoker = false is what lets the view read player_votes while the
-- caller has no access to it at all: the view runs with its owner's rights
-- (postgres), and postgres owns the table and therefore bypasses its RLS. That
-- is the default, and it is written out explicitly because it is the assumption
-- the whole privacy of this feature rests on.
CREATE OR REPLACE VIEW crowd_ratings
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

REVOKE ALL ON TABLE crowd_ratings FROM anon, authenticated;
GRANT SELECT ON TABLE crowd_ratings TO anon, authenticated;

-- ── voting ──────────────────────────────────────────────────────────────────
-- p_voter reaches this function from the client only when the client is
-- anonymous. A signed-in user cannot be impersonated and cannot impersonate: if
-- auth.uid() exists it overrides anything that was sent, and the identity it
-- builds lands in a namespace no client string can reach.
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
    -- The 'u:' prefix is built here, from the token, and nowhere else in the
    -- schema. That is the invariant the table's header comment relies on.
    v_voter := 'u:' || uid::text;
  ELSE
    -- client_id from js/track.js is a uuid. Anything else is refused, or the
    -- table opens up to arbitrary keys and the vote counter loses all meaning.
    --
    -- The IS NULL test is not redundant: `NULL !~ '…'` evaluates to NULL, and
    -- IF on NULL is not-true, so the branch would fall straight through,
    -- v_voter would stay NULL, and the INSERT would raise on NOT NULL — a 500
    -- instead of a tidy {"error":"bad voter"}. Reachable in ordinary use the
    -- moment localStorage is blocked, which is every private window.
    IF p_voter IS NULL
       OR p_voter !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN jsonb_build_object('error', 'bad voter');
    END IF;
    v_voter := 'a:' || p_voter;
  END IF;

  IF p_ovr IS NULL OR p_ovr < 40 OR p_ovr > 99 THEN
    RETURN jsonb_build_object('error', 'bad ovr');
  END IF;

  -- These two mirror the table's CHECK constraints so that a bad key comes back
  -- as a readable error the client can act on, instead of a raw 23514 it has to
  -- parse. The CHECKs stay as the real enforcement; these are the manners.
  IF p_player_key IS NULL
     OR char_length(p_player_key) < 1 OR char_length(p_player_key) > 64 THEN
    RETURN jsonb_build_object('error', 'bad player');
  END IF;

  IF p_season IS NULL OR p_season !~ '^[0-9]{4}/[0-9]{2}$' THEN
    RETURN jsonb_build_object('error', 'bad season');
  END IF;

  IF p_tag IS NOT NULL AND NOT EXISTS (SELECT 1 FROM crowd_tags WHERE key = p_tag) THEN
    RETURN jsonb_build_object('error', 'bad tag');
  END IF;

  -- The limit applies to new opinions only. Budgeting revisions would punish
  -- exactly the behaviour this feature invites — "you can change your mind" —
  -- so what is budgeted is rows created, the quantity that grows without bound.
  --
  -- A revision is NOT free, though, and the earlier draft of this comment
  -- claimed it was. The INCLUDE on player_votes_ps blocks HOT, so changing ovr
  -- or tag costs a new heap tuple plus an entry in all three indexes. Unmetered
  -- revisions and a covering index multiply into a 4x-amplified bloat loop from
  -- one client-chosen identity. The WHERE on the upsert below is what makes
  -- that loop unprofitable: the common case, re-sending an unchanged vote,
  -- writes nothing at all.
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

  -- created_at is intentionally not listed, on either side: it is the DEFAULT
  -- on insert and untouched on update, which is what makes the count above
  -- mean "created this hour".
  --
  -- is_user follows whoever is writing now. Omitting it from this list was a
  -- real hole while the two namespaces were shared: an attacker could pre-seed
  -- a row anonymously under a victim's uuid (is_user false), the victim would
  -- later vote signed-in and only ovr/tag/updated_at would move, and the stale
  -- false flag then let the attacker read the row back. The prefix above closes
  -- that at the root; this keeps the flag honest rather than load-bearing.
  --
  -- The WHERE turns an identical re-vote into a no-op: no heap tuple, no index
  -- tuples, no error, and the function still answers ok. Nothing in this file
  -- or in the Task 7 dashboard reads updated_at, so leaving it stale on a write
  -- that changed nothing costs nothing.
  INSERT INTO player_votes (player_key, season, voter, is_user, ovr, tag, updated_at)
  VALUES (p_player_key, p_season, v_voter, uid IS NOT NULL, p_ovr, p_tag, now())
  ON CONFLICT (player_key, season, voter)
  DO UPDATE SET ovr        = EXCLUDED.ovr,
                tag        = EXCLUDED.tag,
                is_user    = EXCLUDED.is_user,
                updated_at = now()
          WHERE player_votes.ovr     IS DISTINCT FROM EXCLUDED.ovr
             OR player_votes.tag     IS DISTINCT FROM EXCLUDED.tag
             OR player_votes.is_user IS DISTINCT FROM EXCLUDED.is_user;

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION vote_player(text, text, smallint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vote_player(text, text, smallint, text, text) TO anon, authenticated;

-- ── my own vote (so the card can say "you said 86") ─────────────────────────
-- The prefixes are mirrored from vote_player, and that mirror is the access
-- control. A signed-in caller can only ever be handed a 'u:' row built from his
-- own token; a client-supplied p_voter can only ever reach the 'a:' space. The
-- two spaces are disjoint, so no string a caller invents addresses somebody
-- else's signed-in row — which is why is_user is not consulted here. It is a
-- record of who wrote the row, not a permission check.
CREATE OR REPLACE FUNCTION my_player_vote(
  p_player_key text,
  p_season     text,
  p_voter      text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid     uuid := auth.uid();
  v_voter text := CASE WHEN uid IS NOT NULL     THEN 'u:' || uid::text
                       WHEN p_voter IS NOT NULL THEN 'a:' || p_voter END;
  r       player_votes%ROWTYPE;
BEGIN
  IF v_voter IS NULL THEN RETURN jsonb_build_object('vote', NULL); END IF;
  SELECT * INTO r FROM player_votes
   WHERE player_key = p_player_key AND season = p_season AND voter = v_voter;
  IF NOT FOUND THEN RETURN jsonb_build_object('vote', NULL); END IF;
  RETURN jsonb_build_object('vote', jsonb_build_object('ovr', r.ovr, 'tag', r.tag));
END $$;

REVOKE ALL ON FUNCTION my_player_vote(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION my_player_vote(text, text, text) TO anon, authenticated;

-- ── writing a line ──────────────────────────────────────────────────────────
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
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;

  -- The guard that comes with a profiles(id) foreign key, and the reason the
  -- convention is safe to adopt: submit_career_run and submit_salary_run both
  -- check this before inserting. Without it an authenticated caller whose
  -- profile row is missing gets a raw 23503 and a 500 — where the auth.users
  -- key this column used to carry would simply have succeeded.
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    RETURN jsonb_build_object('error', 'no profile');
  END IF;

  IF p_player_key IS NULL
     OR char_length(p_player_key) < 1 OR char_length(p_player_key) > 64 THEN
    RETURN jsonb_build_object('error', 'bad player');
  END IF;

  IF p_season IS NULL OR p_season !~ '^[0-9]{4}/[0-9]{2}$' THEN
    RETURN jsonb_build_object('error', 'bad season');
  END IF;

  -- The same cleaning as set_my_club: one line, no control characters, no
  -- angle brackets.
  clean := NULLIF(btrim(left(regexp_replace(COALESCE(p_body, ''), '[\r\n\t<>]', ' ', 'g'), 80)), '');
  IF clean IS NULL OR char_length(clean) < 2 THEN
    RETURN jsonb_build_object('error', 'empty');
  END IF;

  -- Two limits, answering two different questions. One line per person per
  -- player per day, so nobody floods one footballer. And ten lines per person
  -- per day in total, so nobody works through the dataset a player at a time
  -- and buries the moderation queue — which the first limit alone permits
  -- exactly, once per player, every single day.
  IF EXISTS (SELECT 1 FROM player_notes
              WHERE user_id = uid AND player_key = p_player_key
                AND created_at > now() - interval '1 day') THEN
    RETURN jsonb_build_object('error', 'already today');
  END IF;

  IF (SELECT count(*) FROM player_notes
       WHERE user_id = uid AND created_at > now() - interval '1 day') >= 10 THEN
    RETURN jsonb_build_object('error', 'too many today');
  END IF;

  INSERT INTO player_notes (player_key, season, user_id, body)
  VALUES (p_player_key, p_season, uid, clean);

  RETURN jsonb_build_object('ok', true, 'status', 'pending');
END $$;

REVOKE ALL ON FUNCTION submit_player_note(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_player_note(text, text, text) TO authenticated;

-- ── reporting a line ────────────────────────────────────────────────────────
-- authenticated only, and one report per person per note. The counter is a
-- moderation signal the owner sorts his queue by, so it has to cost an account
-- to move it — approved note ids are world-readable and therefore enumerable,
-- and an anonymous unbounded increment would let one script decide what the
-- owner looks at first.
--
-- Still returns ok for an id that does not exist and for a note that was never
-- approved: an answer that distinguishes the two is precisely the tool for
-- mapping the queue that has not been published yet.
CREATE OR REPLACE FUNCTION report_note(p_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;

  -- Same guard as submit_player_note: note_reports.user_id is a profiles(id)
  -- key, so a caller without a profile row would raise 23503 rather than be
  -- told what went wrong.
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    RETURN jsonb_build_object('error', 'no profile');
  END IF;

  -- The INSERT is the gate. It writes nothing when the note is missing or
  -- unapproved (the SELECT yields no row) and nothing when this person already
  -- reported it (the PK conflicts), so FOUND is true only for a report that is
  -- genuinely new — and only then does the counter move.
  INSERT INTO note_reports (note_id, user_id)
  SELECT p_id, uid FROM player_notes WHERE id = p_id AND status = 'approved'
  ON CONFLICT (note_id, user_id) DO NOTHING;

  IF FOUND THEN
    UPDATE player_notes SET reports = reports + 1 WHERE id = p_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION report_note(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION report_note(bigint) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- THE DASHBOARD
--
-- Everything below is read and written by admin.html through js/crowd-admin.js,
-- and by nobody else. The queue is not "everything the crowd said" — it is where
-- the crowd and the data disagree. But the official rating lives in js/data.js,
-- which does not exist in this database and never will, so the ranking cannot
-- happen here: the RPC returns the aggregate and the client crosses it against
-- SQUADS. See js/crowd-admin.js for the other half.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── the disagreement queue ──────────────────────────────────────────────────
-- Everyone with enough votes, minus what was dismissed and has said nothing new
-- since.
--
-- The filter is avg_trimmed IS NOT NULL and not a test on n, and the difference
-- is not cosmetic. crowd_ratings returns a row for ANY number of votes — that is
-- deliberate, it is what makes "two more votes and the rating appears" possible
-- on the card — so n alone is satisfied by a single vote. What "enough votes"
-- means is defined in exactly one place, crowd_trimmed_avg, and NULL is how that
-- place says no. A second threshold written here as `n >= 5` would be a copy
-- that silently stops agreeing the day the first one moves.
--
-- is_site_admin() gates this even though crowd_ratings itself is world-readable,
-- so no row here is new exposure. What the gate protects is the join: which
-- player-seasons the owner dismissed, and at what vote count, is the shape of
-- his moderation, and it is inferable from the rows this function omits. Same
-- door as notes_queue and as the rest of the panel.
--
-- ORDER BY n DESC with a LIMIT is not the order the owner sees: the real sort is
-- |crowd − official| × log(n) and it can only happen in the client, which is the
-- only side that knows the official rating. So this is a prefilter, and it keeps
-- the most-voted 500 rather than the most-disagreed-with 500 — a huge gap backed
-- by six votes can in principle fall off the end. Acceptable while the queue is
-- nowhere near 500 rows with five votes each; the day it is, this needs the join
-- against data.js that the database cannot do, i.e. a materialised copy of the
-- official ratings, not a bigger LIMIT.
CREATE OR REPLACE FUNCTION crowd_queue()
RETURNS TABLE (player_key text, season text, n int, avg_trimmed smallint,
               tag_top text, tag_top_n int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.player_key, c.season, c.n, c.avg_trimmed, c.tag_top, c.tag_top_n
    FROM crowd_ratings c
    LEFT JOIN rating_dismissals d
      ON d.player_key = c.player_key AND d.season = c.season
   WHERE is_site_admin()
     AND c.avg_trimmed IS NOT NULL        -- below five votes there is nothing to decide
     AND (d.player_key IS NULL OR c.n > d.at_votes)
   ORDER BY c.n DESC
   LIMIT 500;
$$;

REVOKE ALL ON FUNCTION crowd_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crowd_queue() TO authenticated;

-- ── the owner's two answers ─────────────────────────────────────────────────
-- is_site_admin() is defined in 20260824000001_usage_events.sql and already
-- gates every other section of the panel. Not a new gate: two gates that drift
-- apart is one dashboard section that opens for somebody the other one blocks.
--
-- "Approve" does not touch the game. It writes a row here, and
-- scripts/apply_crowd_ratings.js is what writes js/data.js, by hand, later.
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

  -- rating_approvals CHECKs both columns, so an out-of-range value would land as
  -- a raw 23514 — a 500-shaped error out of a function that answers every other
  -- bad input with a tidy {"error": …}. Checked here so the failure mode is the
  -- same shape whatever goes wrong.
  IF p_old IS NULL OR p_old NOT BETWEEN 40 AND 99
     OR p_new IS NULL OR p_new NOT BETWEEN 40 AND 99 THEN
    RETURN jsonb_build_object('error', 'bad ovr');
  END IF;

  -- The same avg_trimmed IS NOT NULL test as the queue, and for the same reason:
  -- n alone comes out true on a single vote, and approving a single vote is
  -- precisely what the threshold exists to prevent. It is repeated here rather
  -- than trusted from the queue because this function is reachable directly —
  -- the client's row is a suggestion, not an authorisation.
  SELECT n INTO v_n FROM crowd_ratings
   WHERE player_key = p_player_key AND season = p_season AND avg_trimmed IS NOT NULL;
  IF v_n IS NULL THEN RETURN jsonb_build_object('error', 'not enough votes'); END IF;

  -- old_ovr is in the UPDATE list on purpose. It is the official rating as the
  -- client read it out of js/data.js a moment ago, so on a second approval of
  -- the same pending row — after the queue was reloaded, or after data.js moved,
  -- which is the whole point of this feature — the stored one is stale. It is
  -- the "before" half of the line the apply script logs, and a stale before with
  -- a fresh after is a log entry that describes a change nobody made.
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

-- "Dismiss" is not "no". It is "not at this many votes" — the count is kept, and
-- the row returns to the queue only when something genuinely new has been said.
CREATE OR REPLACE FUNCTION dismiss_rating(p_player_key text, p_season text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_n int;
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  -- No avg_trimmed test and no NOT FOUND branch: dismissing a player-season that
  -- has no votes is harmless and writes at_votes 0, which just means the row
  -- appears the moment it gets its first. The rating_dismissals header records
  -- that this is the path which will write whatever key it is handed, and that
  -- the gate above is the only thing keeping the table clean.
  SELECT n INTO v_n FROM crowd_ratings
   WHERE player_key = p_player_key AND season = p_season;
  INSERT INTO rating_dismissals (player_key, season, at_votes)
  VALUES (p_player_key, p_season, COALESCE(v_n, 0))
  ON CONFLICT (player_key, season) DO UPDATE SET at_votes = EXCLUDED.at_votes;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION dismiss_rating(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dismiss_rating(text, text) TO authenticated;

-- ── moderating a line ───────────────────────────────────────────────────────
-- Text about a real, living person. Nothing reaches a screen before it passes
-- through here.
CREATE OR REPLACE FUNCTION moderate_note(p_id bigint, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  -- 'pending' is refused as well as everything else. The column's CHECK would
  -- accept it, and it would be a quiet way to un-decide a note that was already
  -- answered — including un-rejecting one.
  IF p_status NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('error', 'bad status');
  END IF;
  UPDATE player_notes SET status = p_status WHERE id = p_id;
  -- An id that matches nothing affected no rows, and answering ok to that would
  -- tell the dashboard a note was decided when none was.
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'no such note'); END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION moderate_note(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION moderate_note(bigint, text) TO authenticated;

-- ── the moderation queue ────────────────────────────────────────────────────
-- A plain JOIN and not a LEFT JOIN: player_notes.user_id is NOT NULL and
-- REFERENCES profiles(id) ON DELETE CASCADE, so a pending note whose author has
-- no profile row cannot exist — submit_player_note refuses to create one, and
-- deleting the account takes the note with it.
--
-- The column is username. profiles has no display_name, and a migration that
-- says otherwise fails on push.
--
-- reports is deliberately not selected, though the queue is the one place it
-- would seem to belong. report_note only ever increments a note that is already
-- approved, so on a pending row the counter is 0 by construction — a column that
-- can only ever read zero invites the owner to read meaning into it.
CREATE OR REPLACE FUNCTION notes_queue()
RETURNS TABLE (id bigint, player_key text, season text, username text,
               body text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT nt.id, nt.player_key, nt.season, p.username, nt.body, nt.created_at
    FROM player_notes nt
    JOIN profiles p ON p.id = nt.user_id
   WHERE nt.status = 'pending' AND is_site_admin()
   ORDER BY nt.created_at ASC
   LIMIT 200;
$$;

REVOKE ALL ON FUNCTION notes_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION notes_queue() TO authenticated;
