-- Swap two of the caller's own placed players (rearrange positions on the board).
CREATE OR REPLACE FUNCTION duel_move(p_code text, p_a text, p_b text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_role text; v_d jsonb; v_picks jsonb;
        v_out jsonb := '[]'::jsonb; e jsonb; v_apos text; v_bpos text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_room FROM duel_rooms WHERE code = upper(btrim(p_code)) FOR UPDATE;
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'room not found'; END IF;
  IF    v_room.host_id  = auth.uid() THEN v_role := 'host';
  ELSIF v_room.guest_id = auth.uid() THEN v_role := 'guest';
  ELSE  RAISE EXCEPTION 'not a participant'; END IF;
  v_d := v_room.draft;
  IF v_d->>'phase' <> 'draft' THEN RAISE EXCEPTION 'not drafting'; END IF;

  v_picks := coalesce(v_d #> ARRAY['picks', v_role], '[]'::jsonb);
  SELECT x->>'pos' INTO v_apos FROM jsonb_array_elements(v_picks) x WHERE x->>'slotId' = p_a;
  SELECT x->>'pos' INTO v_bpos FROM jsonb_array_elements(v_picks) x WHERE x->>'slotId' = p_b;
  IF v_apos IS NULL OR v_bpos IS NULL THEN RETURN; END IF;   -- both must be occupied

  FOR e IN SELECT * FROM jsonb_array_elements(v_picks) LOOP
    IF e->>'slotId' = p_a THEN
      e := jsonb_set(jsonb_set(e, '{slotId}', to_jsonb(p_b)), '{pos}', to_jsonb(v_bpos));
    ELSIF e->>'slotId' = p_b THEN
      e := jsonb_set(jsonb_set(e, '{slotId}', to_jsonb(p_a)), '{pos}', to_jsonb(v_apos));
    END IF;
    v_out := v_out || jsonb_build_array(e);
  END LOOP;

  v_d := jsonb_set(v_d, ARRAY['picks', v_role], v_out);
  UPDATE duel_rooms SET draft = v_d, updated_at = now() WHERE id = v_room.id;
END $$;
REVOKE ALL ON FUNCTION duel_move(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION duel_move(text, text, text) TO authenticated;
