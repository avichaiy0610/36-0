-- ─────────────────────────────────────────────────────────────────────────────
-- Duel Phase B+C: the synchronized alternating draft, plus a league-complete
-- flag for the "your league finished" popup.
-- ─────────────────────────────────────────────────────────────────────────────

-- get_my_leagues now reports completion so the client can pop a one-time notice.
DROP FUNCTION IF EXISTS get_my_leagues();
CREATE FUNCTION get_my_leagues()
RETURNS TABLE (code text, name text, members int, is_complete boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT l.code, l.name,
    (SELECT count(*) FROM league_members m2 WHERE m2.league_id = l.id)::int,
    ((SELECT count(*) FROM league_members m2 WHERE m2.league_id = l.id) >= l.max_players
      AND (SELECT count(*) FROM league_results r WHERE r.league_id = l.id)
          >= (SELECT count(*) FROM league_members m2 WHERE m2.league_id = l.id))
  FROM leagues l
  JOIN league_members m ON m.league_id = l.id
  WHERE m.user_id = auth.uid()
  ORDER BY l.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION get_my_leagues() TO authenticated;
REVOKE ALL ON FUNCTION get_my_leagues() FROM anon;

-- get_duel_room now also returns the shared draft state (picks so far).
DROP FUNCTION IF EXISTS get_duel_room(text);
CREATE FUNCTION get_duel_room(p_code text)
RETURNS TABLE (code text, status text, settings jsonb, seed bigint,
               host_name text, guest_name text,
               host_ready boolean, guest_ready boolean, is_host boolean, draft jsonb)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT r.code, r.status, r.settings, r.seed,
         coalesce(hp.username, 'מארח'),
         CASE WHEN r.guest_id IS NULL THEN NULL ELSE coalesce(gp.username, 'יריב') END,
         r.host_ready, r.guest_ready, (r.host_id = auth.uid()), r.draft
  FROM duel_rooms r
  LEFT JOIN profiles hp ON hp.id = r.host_id
  LEFT JOIN profiles gp ON gp.id = r.guest_id
  WHERE r.code = upper(btrim(p_code))
    AND (r.host_id = auth.uid() OR r.guest_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION get_duel_room(text) TO authenticated;
REVOKE ALL ON FUNCTION get_duel_room(text) FROM anon;

-- ── Authoritative pick: server enforces turn order and no double-picks ──────
-- Both clients derive the shared team sequence and turn order from the room's
-- `seed`; only the picks (the mutable shared state) live in draft.picks here.
-- p_pick = { i, squadId, player, slotId, pos, ovr }
CREATE OR REPLACE FUNCTION duel_pick(p_code text, p_pick jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_room  duel_rooms%ROWTYPE;
  v_role  text;
  v_first text;
  v_turn  int;
  v_expected text;
  v_picks jsonb;
  v_total int := 22;   -- 11 picks per player
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
  IF v_role <> v_expected THEN RAISE EXCEPTION 'not your turn'; END IF;
  IF coalesce((p_pick->>'i')::int, -1) <> v_turn THEN RAISE EXCEPTION 'stale turn'; END IF;

  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_picks) e
             WHERE e->>'squadId' = p_pick->>'squadId' AND e->>'player' = p_pick->>'player') THEN
    RAISE EXCEPTION 'player taken';
  END IF;

  v_picks := v_picks || jsonb_build_object(
    'by', v_role, 'i', v_turn,
    'squadId', p_pick->>'squadId', 'player', p_pick->>'player',
    'slotId', p_pick->>'slotId', 'pos', p_pick->>'pos',
    'ovr', coalesce((p_pick->>'ovr')::int, 0));

  UPDATE duel_rooms SET
    draft      = jsonb_set(coalesce(draft, '{}'::jsonb), '{picks}', v_picks),
    status     = CASE WHEN jsonb_array_length(v_picks) >= v_total THEN 'done' ELSE 'drafting' END,
    updated_at = now()
  WHERE id = v_room.id;
END $$;

REVOKE ALL ON FUNCTION duel_pick(text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION duel_pick(text, jsonb) TO authenticated;
