-- Which mode people actually play.
--
-- Career, the mini-games and Europe run entirely in the browser: they leave no
-- row anywhere, so "what works and what doesn't" was unanswerable — game_results
-- only ever showed the draft. This table is the answer, and nothing more.
--
-- It is invisible to players by construction: the site only ever WRITES to it,
-- no screen reads it, and only the admin account can see the aggregates. What
-- is stored is a mode, an event (open/finish), a short detail, a random
-- per-browser id and — only when signed in — the account id. No IP, no user
-- agent, no URL, nothing anyone typed. That is exactly the "anonymous,
-- aggregate usage data" the privacy policy already declares.

CREATE TABLE IF NOT EXISTS usage_events (
  id        bigserial PRIMARY KEY,
  ts        timestamptz NOT NULL DEFAULT now(),
  -- random UUID kept in the browser's localStorage; not derived from anything
  client_id uuid NOT NULL,
  user_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  mode      text NOT NULL,
  event     text NOT NULL,
  detail    text
);

CREATE INDEX IF NOT EXISTS usage_events_ts_idx ON usage_events (ts DESC);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: writes go through track() and reads through
-- usage_stats()/usage_detail(), both SECURITY DEFINER. Neither a visitor nor a
-- signed-in player can read, edit or delete a single row.

-- Housekeeping (manual, whenever it matters): the table only grows.
--   DELETE FROM usage_events WHERE ts < now() - interval '180 days';

-- ── the admin gate ──────────────────────────────────────────────────────────
-- Same rule as site_texts and contact_messages, in one place.
CREATE OR REPLACE FUNCTION is_site_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '') = 'avichaiy0610@outlook.com';
$$;

-- ── writing an event ────────────────────────────────────────────────────────
-- Open to anon: most mini-game and career play happens without an account, and
-- counting only signed-in players would answer the wrong question. The client
-- picks nothing but the mode, the event and a 40-char detail — the identity
-- comes from the token, and an unknown mode is dropped rather than stored.
CREATE OR REPLACE FUNCTION track(p jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mode  text := lower(COALESCE(p->>'mode', ''));
  v_event text := lower(COALESCE(p->>'event', ''));
  v_uid   uuid := auth.uid();
  v_cid   uuid;
BEGIN
  IF v_mode NOT IN ('draft','challenge','career','minigame','gauntlet','europe','duel','league')
     OR v_event NOT IN ('open','finish') THEN
    RETURN;
  END IF;

  BEGIN
    v_cid := (p->>'client_id')::uuid;
  EXCEPTION WHEN others THEN
    RETURN;                       -- a malformed id is not worth an error
  END;
  IF v_cid IS NULL THEN RETURN; END IF;

  -- a signed-in user without a profile row would break the FK; the event still
  -- counts, it just counts as anonymous
  IF v_uid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid) THEN
    v_uid := NULL;
  END IF;

  INSERT INTO usage_events (client_id, user_id, mode, event, detail)
  VALUES (v_cid, v_uid, v_mode, v_event,
          NULLIF(left(COALESCE(p->>'detail', ''), 40), ''));
END $$;

GRANT EXECUTE ON FUNCTION track(jsonb) TO anon, authenticated;

-- ── reading the numbers (admin only) ────────────────────────────────────────
-- Per day and mode: how many people opened it, how many finished a run. The
-- gap between the two is the whole point — a mode everyone opens and nobody
-- finishes is a different problem from one nobody opens.
CREATE OR REPLACE FUNCTION usage_stats(p_days int DEFAULT 30)
RETURNS TABLE (
  day date, mode text,
  opens bigint, open_people bigint,
  finishes bigint, finish_people bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_site_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT (e.ts AT TIME ZONE 'Asia/Jerusalem')::date,
         e.mode,
         count(*)                    FILTER (WHERE e.event = 'open'),
         count(DISTINCT e.client_id) FILTER (WHERE e.event = 'open'),
         count(*)                    FILTER (WHERE e.event = 'finish'),
         count(DISTINCT e.client_id) FILTER (WHERE e.event = 'finish')
    FROM usage_events e
   WHERE e.ts > now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 30), 1), 365))
   GROUP BY 1, 2
   ORDER BY 1 DESC, 2;
END $$;

-- Totals for the same window, split by detail — which mini-game, how far a
-- career got — with no day breakdown, because that split is only interesting
-- in aggregate.
CREATE OR REPLACE FUNCTION usage_detail(p_days int DEFAULT 30)
RETURNS TABLE (
  mode text, detail text, event text,
  events bigint, people bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_site_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT e.mode, COALESCE(e.detail, '—'), e.event,
         count(*), count(DISTINCT e.client_id)
    FROM usage_events e
   WHERE e.ts > now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 30), 1), 365))
   GROUP BY 1, 2, 3
   ORDER BY 1, 5 DESC;
END $$;

-- Everyone who did anything on a given day, across all modes — the one number
-- the per-mode table cannot add up for you.
CREATE OR REPLACE FUNCTION usage_daily(p_days int DEFAULT 30)
RETURNS TABLE (day date, people bigint, signed_in bigint, events bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_site_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT (e.ts AT TIME ZONE 'Asia/Jerusalem')::date,
         count(DISTINCT e.client_id),
         count(DISTINCT e.user_id),
         count(*)
    FROM usage_events e
   WHERE e.ts > now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 30), 1), 365))
   GROUP BY 1
   ORDER BY 1 DESC;
END $$;

REVOKE ALL ON FUNCTION usage_stats(int)  FROM anon;
REVOKE ALL ON FUNCTION usage_detail(int) FROM anon;
REVOKE ALL ON FUNCTION usage_daily(int)  FROM anon;
GRANT EXECUTE ON FUNCTION usage_stats(int)  TO authenticated;
GRANT EXECUTE ON FUNCTION usage_detail(int) TO authenticated;
GRANT EXECUTE ON FUNCTION usage_daily(int)  TO authenticated;
