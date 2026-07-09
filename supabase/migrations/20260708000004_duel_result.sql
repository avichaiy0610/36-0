-- ─────────────────────────────────────────────────────────────────────────────
-- Store the duel result once (first writer wins) so BOTH players render the exact
-- same seasons/table — no more each client computing a different simulation.
-- Also: a player is the same person across squads, so dedup picks by NAME.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION duel_set_result(p_code text, p_result jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_d jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_room FROM duel_rooms WHERE code = upper(btrim(p_code)) FOR UPDATE;
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'room not found'; END IF;
  IF v_room.host_id <> auth.uid() AND v_room.guest_id <> auth.uid() THEN RAISE EXCEPTION 'not a participant'; END IF;
  v_d := coalesce(v_room.draft, '{}'::jsonb);
  IF v_d ? 'result' THEN RETURN; END IF;               -- already set — keep the first
  v_d := jsonb_set(v_d, '{result}', p_result, true);
  UPDATE duel_rooms SET draft = v_d, updated_at = now() WHERE id = v_room.id;
END $$;
REVOKE ALL ON FUNCTION duel_set_result(text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION duel_set_result(text, jsonb) TO authenticated;

-- Pick: dedup by player name (not squad+name), so the same person can't be taken twice.
CREATE OR REPLACE FUNCTION duel_draft_pick(p_code text, p_pick jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_role text; v_d jsonb; v_round int;
        v_first text; v_picker text; v_rs jsonb; v_all jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_room FROM duel_rooms WHERE code = upper(btrim(p_code)) FOR UPDATE;
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'room not found'; END IF;
  IF    v_room.host_id  = auth.uid() THEN v_role := 'host';
  ELSIF v_room.guest_id = auth.uid() THEN v_role := 'guest';
  ELSE  RAISE EXCEPTION 'not a participant'; END IF;
  v_d := v_room.draft;
  IF v_d->>'phase' <> 'draft' THEN RAISE EXCEPTION 'not drafting'; END IF;
  v_round := (v_d->>'round')::int;
  IF v_round >= 11 THEN RAISE EXCEPTION 'draft complete'; END IF;
  IF coalesce((p_pick->>'round')::int, -1) <> v_round THEN RAISE EXCEPTION 'stale round'; END IF;
  IF v_round < 10 THEN v_first := CASE WHEN v_round % 2 = 0 THEN 'host' ELSE 'guest' END;
  ELSE v_first := v_d#>>'{rps,decided}'; END IF;
  IF v_first IS NULL THEN RAISE EXCEPTION 'first not decided'; END IF;
  v_rs := coalesce(v_d->'roundState','{}'::jsonb);
  IF NOT (v_rs ? v_first) THEN v_picker := v_first;
  ELSE v_picker := CASE WHEN v_first = 'host' THEN 'guest' ELSE 'host' END; END IF;
  IF v_role <> v_picker THEN RAISE EXCEPTION 'not your turn'; END IF;
  IF v_rs ? v_role THEN RAISE EXCEPTION 'already picked'; END IF;

  v_all := coalesce(v_d#>'{picks,host}','[]'::jsonb) || coalesce(v_d#>'{picks,guest}','[]'::jsonb);
  IF v_rs ? 'host'  THEN v_all := v_all || jsonb_build_array(v_rs->'host');  END IF;
  IF v_rs ? 'guest' THEN v_all := v_all || jsonb_build_array(v_rs->'guest'); END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_all) e WHERE e->>'player' = p_pick->>'player') THEN
    RAISE EXCEPTION 'player taken';
  END IF;

  v_rs := jsonb_set(v_rs, ARRAY[v_role], p_pick, true);
  IF (v_rs ? 'host') AND (v_rs ? 'guest') THEN
    v_d := jsonb_set(v_d, '{picks,host}',  coalesce(v_d#>'{picks,host}','[]'::jsonb)  || jsonb_build_array(v_rs->'host'));
    v_d := jsonb_set(v_d, '{picks,guest}', coalesce(v_d#>'{picks,guest}','[]'::jsonb) || jsonb_build_array(v_rs->'guest'));
    v_round := v_round + 1;
    v_d := jsonb_set(v_d, '{round}',  to_jsonb(v_round));
    v_d := jsonb_set(v_d, '{cursor}', to_jsonb((v_d->>'cursor')::int + 1));
    v_d := jsonb_set(v_d, '{rr}', '0');
    v_d := jsonb_set(v_d, '{roundState}', '{}'::jsonb);
    v_d := v_d - 'squadId';
    IF v_round >= 11 THEN
      v_d := jsonb_set(v_d, '{phase}', '"done"');
    ELSIF v_round = 10 THEN
      v_d := jsonb_set(v_d, '{phase}', '"rps"');
      v_d := jsonb_set(v_d, '{rps}', '{}'::jsonb);
    END IF;
  ELSE
    v_d := jsonb_set(v_d, '{roundState}', v_rs);
  END IF;
  UPDATE duel_rooms SET draft = v_d,
    status = CASE WHEN v_round >= 11 THEN 'done' ELSE 'drafting' END,
    updated_at = now() WHERE id = v_room.id;
END $$;
