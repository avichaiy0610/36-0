-- ─────────────────────────────────────────────────────────────────────────────
-- Duel Phase E: robustness. Random matchmaking (quick_match) and a "forced"
-- pick mode so a present player can keep the draft moving when the opponent
-- goes silent (disconnect / AFK) — the turn is auto-filled on their behalf.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE duel_rooms ADD COLUMN IF NOT EXISTS is_quick boolean NOT NULL DEFAULT false;

-- Find an open random room to join, or open one and wait.
CREATE OR REPLACE FUNCTION quick_match()
RETURNS TABLE (code text, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_code text; v_try int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  -- clear this player's own stale quick rooms first
  DELETE FROM duel_rooms
   WHERE host_id = auth.uid() AND is_quick AND status = 'waiting'
     AND guest_id IS NULL AND created_at < now() - interval '2 minutes';
  -- join the oldest waiting quick room that isn't mine
  SELECT * INTO v_room FROM duel_rooms
   WHERE is_quick AND status = 'waiting' AND guest_id IS NULL AND host_id <> auth.uid()
   ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_room.id IS NOT NULL THEN
    UPDATE duel_rooms SET guest_id = auth.uid(), updated_at = now() WHERE id = v_room.id;
    RETURN QUERY SELECT v_room.code, 'guest'::text; RETURN;
  END IF;
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM duel_rooms d WHERE d.code = v_code);
    v_try := v_try + 1; IF v_try > 25 THEN RAISE EXCEPTION 'code generation failed'; END IF;
  END LOOP;
  INSERT INTO duel_rooms (code, host_id, is_quick) VALUES (v_code, auth.uid(), true);
  RETURN QUERY SELECT v_code, 'host'::text;
END $$;
REVOKE ALL ON FUNCTION quick_match() FROM anon;
GRANT EXECUTE ON FUNCTION quick_match() TO authenticated;

-- duel_pick gains a `force` mode: when the room has been idle past the turn
-- timeout, any participant may submit the pick on behalf of the current picker
-- (the present player's client fills the absent player's turn like a bot).
DROP FUNCTION IF EXISTS duel_pick(text, jsonb);
CREATE FUNCTION duel_pick(p_code text, p_pick jsonb, p_force boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_room  duel_rooms%ROWTYPE;
  v_role  text;
  v_first text;
  v_turn  int;
  v_expected text;
  v_picks jsonb;
  v_total int := 22;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_room FROM duel_rooms WHERE code = upper(btrim(p_code)) FOR UPDATE;
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'room not found'; END IF;
  IF v_room.guest_id IS NULL OR v_room.seed IS NULL THEN RAISE EXCEPTION 'not ready'; END IF;

  IF    v_room.host_id  = auth.uid() THEN v_role := 'host';
  ELSIF v_room.guest_id = auth.uid() THEN v_role := 'guest';
  ELSE  RAISE EXCEPTION 'not a participant'; END IF;

  v_picks := coalesce(v_room.draft->'picks', '[]'::jsonb);
  v_turn  := jsonb_array_length(v_picks);
  IF v_turn >= v_total THEN RAISE EXCEPTION 'draft complete'; END IF;

  v_first := CASE WHEN (v_room.seed % 2) = 0 THEN 'host' ELSE 'guest' END;
  v_expected := CASE WHEN (v_turn % 2) = 0 THEN v_first
                     ELSE CASE WHEN v_first = 'host' THEN 'guest' ELSE 'host' END END;

  IF p_force THEN
    -- only allowed once the current picker has clearly stalled
    IF now() - v_room.updated_at < interval '26 seconds' THEN RAISE EXCEPTION 'too soon to force'; END IF;
  ELSE
    IF v_role <> v_expected THEN RAISE EXCEPTION 'not your turn'; END IF;
  END IF;
  IF coalesce((p_pick->>'i')::int, -1) <> v_turn THEN RAISE EXCEPTION 'stale turn'; END IF;

  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_picks) e
             WHERE e->>'squadId' = p_pick->>'squadId' AND e->>'player' = p_pick->>'player') THEN
    RAISE EXCEPTION 'player taken';
  END IF;

  v_picks := v_picks || jsonb_build_object(
    'by', v_expected, 'i', v_turn,
    'squadId', p_pick->>'squadId', 'player', p_pick->>'player',
    'slotId', p_pick->>'slotId', 'pos', p_pick->>'pos',
    'ovr', coalesce((p_pick->>'ovr')::int, 0));

  UPDATE duel_rooms SET
    draft      = jsonb_set(coalesce(draft, '{}'::jsonb), '{picks}', v_picks),
    status     = CASE WHEN jsonb_array_length(v_picks) >= v_total THEN 'done' ELSE 'drafting' END,
    updated_at = now()
  WHERE id = v_room.id;
END $$;
REVOKE ALL ON FUNCTION duel_pick(text, jsonb, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION duel_pick(text, jsonb, boolean) TO authenticated;
