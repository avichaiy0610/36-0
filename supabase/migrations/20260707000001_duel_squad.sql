-- ─────────────────────────────────────────────────────────────────────────────
-- Duel redesign: each player now plays the full normal draft (own setup,
-- formation, difficulty, mode) and submits their whole squad once, instead of
-- the turn-based pick-by-pick flow. The room's `draft` holds {host:{...},
-- guest:{...}}; when both squads are in, the room is done and both reveal.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION duel_submit_squad(p_code text, p_squad jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_role text; v_draft jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_room FROM duel_rooms WHERE code = upper(btrim(p_code)) FOR UPDATE;
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'room not found'; END IF;
  IF    v_room.host_id  = auth.uid() THEN v_role := 'host';
  ELSIF v_room.guest_id = auth.uid() THEN v_role := 'guest';
  ELSE  RAISE EXCEPTION 'not a participant'; END IF;

  v_draft := coalesce(v_room.draft, '{}'::jsonb);
  IF v_draft ? v_role THEN RETURN; END IF;          -- one squad per player (no resubmit)
  v_draft := jsonb_set(v_draft, ARRAY[v_role], p_squad, true);

  UPDATE duel_rooms SET
    draft      = v_draft,
    status     = CASE WHEN (v_draft ? 'host') AND (v_draft ? 'guest') THEN 'done' ELSE 'drafting' END,
    updated_at = now()
  WHERE id = v_room.id;
END $$;
REVOKE ALL ON FUNCTION duel_submit_squad(text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION duel_submit_squad(text, jsonb) TO authenticated;
