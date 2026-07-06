-- ─────────────────────────────────────────────────────────────────────────────
-- Real-time 1v1 "duel rooms" (Phase A: the live waiting room).
-- Two players share a short code; a host creates a room, a guest joins, and both
-- mark ready. State lives in one row per room and is pushed to both clients over
-- Supabase Realtime (postgres_changes). Writes go only through SECURITY DEFINER
-- RPCs; a narrow SELECT policy lets the two participants subscribe to their row.
--
-- Later phases reuse this row: `seed` (shared draft RNG), `draft` (turn/pick
-- state), and the `status` machine (waiting → ready → drafting → done).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS duel_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  host_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  guest_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'waiting',   -- waiting | ready | drafting | done
  settings    jsonb NOT NULL DEFAULT '{}',
  seed        bigint,                            -- shared RNG seed (set when both ready)
  host_ready  boolean NOT NULL DEFAULT false,
  guest_ready boolean NOT NULL DEFAULT false,
  draft       jsonb NOT NULL DEFAULT '{}',       -- reserved for later phases (turns/picks)
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS duel_rooms_code_idx ON duel_rooms (code);

-- Realtime needs to read the row (respecting RLS) and needs full old-row data so
-- filtered UPDATE/DELETE events reach the right subscriber.
ALTER TABLE duel_rooms REPLICA IDENTITY FULL;
ALTER TABLE duel_rooms ENABLE ROW LEVEL SECURITY;

-- Only the two participants may read (and therefore subscribe to) a room.
DROP POLICY IF EXISTS duel_read ON duel_rooms;
CREATE POLICY duel_read ON duel_rooms FOR SELECT TO authenticated
  USING (host_id = auth.uid() OR guest_id = auth.uid());
-- No INSERT/UPDATE/DELETE policies: all writes happen via the RPCs below.

-- Publish the table so clients receive live row changes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'duel_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE duel_rooms;
  END IF;
END $$;

-- ── Create a room, become the host, return the share code ───────────────────
CREATE OR REPLACE FUNCTION create_duel_room(p_settings jsonb DEFAULT '{}')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text; v_try int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  -- tidy up this host's abandoned/old rooms so codes don't pile up
  DELETE FROM duel_rooms
   WHERE host_id = auth.uid() AND status IN ('waiting', 'done')
     AND created_at < now() - interval '3 hours';
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM duel_rooms WHERE code = v_code);
    v_try := v_try + 1; IF v_try > 25 THEN RAISE EXCEPTION 'code generation failed'; END IF;
  END LOOP;
  INSERT INTO duel_rooms (code, host_id, settings)
  VALUES (v_code, auth.uid(), coalesce(p_settings, '{}'::jsonb));
  RETURN v_code;
END $$;

-- ── Join a room as the guest ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION join_duel_room(p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_room FROM duel_rooms WHERE code = upper(btrim(p_code));
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'room not found'; END IF;
  IF v_room.host_id = auth.uid() OR v_room.guest_id = auth.uid() THEN
    RETURN;                                   -- already a participant
  END IF;
  IF v_room.guest_id IS NOT NULL THEN RAISE EXCEPTION 'room full'; END IF;
  UPDATE duel_rooms
     SET guest_id = auth.uid(), updated_at = now()
   WHERE id = v_room.id AND guest_id IS NULL;
END $$;

-- ── Toggle your ready flag; when both are ready the room locks in a seed ─────
CREATE OR REPLACE FUNCTION set_duel_ready(p_code text, p_ready boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_hr boolean; v_gr boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_room FROM duel_rooms WHERE code = upper(btrim(p_code));
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'room not found'; END IF;

  v_hr := v_room.host_ready; v_gr := v_room.guest_ready;
  IF v_room.host_id = auth.uid() THEN v_hr := p_ready;
  ELSIF v_room.guest_id = auth.uid() THEN v_gr := p_ready;
  ELSE RAISE EXCEPTION 'not a participant'; END IF;

  UPDATE duel_rooms SET
    host_ready  = v_hr,
    guest_ready = v_gr,
    seed        = CASE WHEN v_hr AND v_gr AND seed IS NULL
                       THEN (floor(random() * 2147483647))::bigint ELSE seed END,
    status      = CASE WHEN v_hr AND v_gr THEN 'ready' ELSE 'waiting' END,
    updated_at  = now()
  WHERE id = v_room.id;
END $$;

-- ── Leave a room (host leaving ends it; guest leaving frees the slot) ────────
CREATE OR REPLACE FUNCTION leave_duel_room(p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_room FROM duel_rooms WHERE code = upper(btrim(p_code));
  IF v_room.id IS NULL THEN RETURN; END IF;
  IF v_room.host_id = auth.uid() THEN
    DELETE FROM duel_rooms WHERE id = v_room.id;                 -- ends the room
  ELSIF v_room.guest_id = auth.uid() THEN
    UPDATE duel_rooms
       SET guest_id = NULL, guest_ready = false, host_ready = false,
           status = 'waiting', seed = NULL, updated_at = now()
     WHERE id = v_room.id;
  END IF;
END $$;

-- ── Read a room's current state (with usernames) ────────────────────────────
CREATE OR REPLACE FUNCTION get_duel_room(p_code text)
RETURNS TABLE (code text, status text, settings jsonb, seed bigint,
               host_name text, guest_name text,
               host_ready boolean, guest_ready boolean, is_host boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT r.code, r.status, r.settings, r.seed,
         coalesce(hp.username, 'מארח'),
         CASE WHEN r.guest_id IS NULL THEN NULL ELSE coalesce(gp.username, 'יריב') END,
         r.host_ready, r.guest_ready,
         (r.host_id = auth.uid())
  FROM duel_rooms r
  LEFT JOIN profiles hp ON hp.id = r.host_id
  LEFT JOIN profiles gp ON gp.id = r.guest_id
  WHERE r.code = upper(btrim(p_code))
    AND (r.host_id = auth.uid() OR r.guest_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION create_duel_room(jsonb), join_duel_room(text),
                        set_duel_ready(text, boolean), leave_duel_room(text),
                        get_duel_room(text) FROM anon;
GRANT EXECUTE ON FUNCTION create_duel_room(jsonb)         TO authenticated;
GRANT EXECUTE ON FUNCTION join_duel_room(text)            TO authenticated;
GRANT EXECUTE ON FUNCTION set_duel_ready(text, boolean)   TO authenticated;
GRANT EXECUTE ON FUNCTION leave_duel_room(text)           TO authenticated;
GRANT EXECUTE ON FUNCTION get_duel_room(text)             TO authenticated;
