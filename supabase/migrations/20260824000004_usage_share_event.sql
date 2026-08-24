-- A third event: 'share'.
--
-- Sharing is not finishing. A career share pushed through the finish counter
-- would inflate the one number the board exists to protect — how many people
-- actually played a mode to its end — and sharing is worth counting on its own,
-- because it is the only growth loop the game has that costs nothing.
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
     OR v_event NOT IN ('open','finish','share') THEN
    RETURN;
  END IF;

  BEGIN
    v_cid := (p->>'client_id')::uuid;
  EXCEPTION WHEN others THEN
    RETURN;
  END;
  IF v_cid IS NULL THEN RETURN; END IF;

  IF v_uid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid) THEN
    v_uid := NULL;
  END IF;

  INSERT INTO usage_events (client_id, user_id, mode, event, detail)
  VALUES (v_cid, v_uid, v_mode, v_event,
          NULLIF(left(COALESCE(p->>'detail', ''), 40), ''));
END $$;

GRANT EXECUTE ON FUNCTION track(jsonb) TO anon, authenticated;

-- The day×mode table gains a shares column; opens and finishes keep their
-- meaning, so yesterday's rows stay comparable. Postgres will not widen a
-- function's return type in place, so the old one goes first.
DROP FUNCTION IF EXISTS usage_stats(int);
CREATE OR REPLACE FUNCTION usage_stats(p_days int DEFAULT 30)
RETURNS TABLE (
  day date, mode text,
  opens bigint, open_people bigint,
  finishes bigint, finish_people bigint,
  shares bigint, share_people bigint
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
         count(DISTINCT e.client_id) FILTER (WHERE e.event = 'finish'),
         count(*)                    FILTER (WHERE e.event = 'share'),
         count(DISTINCT e.client_id) FILTER (WHERE e.event = 'share')
    FROM usage_events e
   WHERE e.ts > now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 30), 1), 365))
   GROUP BY 1, 2
   ORDER BY 1 DESC, 2;
END $$;

REVOKE ALL ON FUNCTION usage_stats(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION usage_stats(int) TO authenticated;
