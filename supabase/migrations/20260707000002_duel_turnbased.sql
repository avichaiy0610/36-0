-- ─────────────────────────────────────────────────────────────────────────────
-- Duel = shared TURN-BASED draft. Both players draw the same teams (seeded); the
-- first pick alternates each round (RPS decides the last round); the round's
-- first picker may reroll the drawn team once. Host sets the shared game settings;
-- each player picks their own formation. State lives in room.draft:
--   { phase, fmt:{host,guest}, round, cursor, rr, rps:{host,guest,decided,tie},
--     picks:{host:[],guest:[]}, roundState:{host?,guest?} }
-- ─────────────────────────────────────────────────────────────────────────────

-- Host sets the room's shared settings while still in the lobby.
CREATE OR REPLACE FUNCTION set_duel_settings(p_code text, p_settings jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_room FROM duel_rooms WHERE code = upper(btrim(p_code)) FOR UPDATE;
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'room not found'; END IF;
  IF v_room.host_id <> auth.uid() THEN RAISE EXCEPTION 'only host'; END IF;
  IF v_room.status <> 'waiting' THEN RAISE EXCEPTION 'too late'; END IF;
  UPDATE duel_rooms SET settings = coalesce(p_settings, '{}'::jsonb), updated_at = now() WHERE id = v_room.id;
END $$;
REVOKE ALL ON FUNCTION set_duel_settings(text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION set_duel_settings(text, jsonb) TO authenticated;

-- Each player submits their formation; when both are in, drafting begins.
CREATE OR REPLACE FUNCTION duel_set_formation(p_code text, p_formation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_role text; v_d jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_room FROM duel_rooms WHERE code = upper(btrim(p_code)) FOR UPDATE;
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'room not found'; END IF;
  IF    v_room.host_id  = auth.uid() THEN v_role := 'host';
  ELSIF v_room.guest_id = auth.uid() THEN v_role := 'guest';
  ELSE  RAISE EXCEPTION 'not a participant'; END IF;

  v_d := v_room.draft;
  IF NOT (v_d ? 'phase') THEN
    v_d := jsonb_build_object('phase','formation','fmt','{}'::jsonb,'round',0,'cursor',0,'rr',0,
             'picks', jsonb_build_object('host','[]'::jsonb,'guest','[]'::jsonb),
             'roundState','{}'::jsonb,'rps','{}'::jsonb);
  END IF;
  IF v_d->>'phase' NOT IN ('formation') THEN RETURN; END IF;   -- already started
  v_d := jsonb_set(v_d, ARRAY['fmt', v_role], to_jsonb(p_formation), true);
  IF (v_d#>'{fmt,host}') IS NOT NULL AND (v_d#>'{fmt,guest}') IS NOT NULL THEN
    v_d := jsonb_set(v_d, '{phase}', '"draft"');
  END IF;
  UPDATE duel_rooms SET draft = v_d, status = 'drafting', updated_at = now() WHERE id = v_room.id;
END $$;
REVOKE ALL ON FUNCTION duel_set_formation(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION duel_set_formation(text, text) TO authenticated;

-- First picker of the current round rerolls the drawn team (once per round).
CREATE OR REPLACE FUNCTION duel_reroll(p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_role text; v_d jsonb; v_round int; v_first text; v_rs jsonb;
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
  IF v_round < 10 THEN v_first := CASE WHEN v_round % 2 = 0 THEN 'host' ELSE 'guest' END;
  ELSE v_first := v_d#>>'{rps,decided}'; END IF;
  IF v_role <> v_first THEN RAISE EXCEPTION 'only first picker'; END IF;
  v_rs := coalesce(v_d->'roundState','{}'::jsonb);
  IF (v_rs ? 'host') OR (v_rs ? 'guest') THEN RAISE EXCEPTION 'too late to reroll'; END IF;
  IF (v_d->>'rr')::int >= 1 THEN RAISE EXCEPTION 'no rerolls left'; END IF;
  v_d := jsonb_set(v_d, '{cursor}', to_jsonb((v_d->>'cursor')::int + 1));
  v_d := jsonb_set(v_d, '{rr}', to_jsonb((v_d->>'rr')::int + 1));
  UPDATE duel_rooms SET draft = v_d, updated_at = now() WHERE id = v_room.id;
END $$;
REVOKE ALL ON FUNCTION duel_reroll(text) FROM anon;
GRANT EXECUTE ON FUNCTION duel_reroll(text) TO authenticated;

-- Pick a player. Server enforces whose turn it is and that the player is free.
-- p_pick = { round, squadId, player, slotId, pos, ovr }
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
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_all) e
             WHERE e->>'squadId' = p_pick->>'squadId' AND e->>'player' = p_pick->>'player') THEN
    RAISE EXCEPTION 'player taken';
  END IF;

  v_rs := jsonb_set(v_rs, ARRAY[v_role], p_pick, true);

  IF (v_rs ? 'host') AND (v_rs ? 'guest') THEN
    -- round complete: commit both picks and advance
    v_d := jsonb_set(v_d, '{picks,host}',  coalesce(v_d#>'{picks,host}','[]'::jsonb)  || jsonb_build_array(v_rs->'host'));
    v_d := jsonb_set(v_d, '{picks,guest}', coalesce(v_d#>'{picks,guest}','[]'::jsonb) || jsonb_build_array(v_rs->'guest'));
    v_round := v_round + 1;
    v_d := jsonb_set(v_d, '{round}',  to_jsonb(v_round));
    v_d := jsonb_set(v_d, '{cursor}', to_jsonb((v_d->>'cursor')::int + 1));
    v_d := jsonb_set(v_d, '{rr}',     '0');
    v_d := jsonb_set(v_d, '{roundState}', '{}'::jsonb);
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
REVOKE ALL ON FUNCTION duel_draft_pick(text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION duel_draft_pick(text, jsonb) TO authenticated;

-- Rock-paper-scissors to decide who picks first in the final round.
CREATE OR REPLACE FUNCTION duel_rps(p_code text, p_choice text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_role text; v_d jsonb; v_rps jsonb; v_h text; v_g text; v_win text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_choice NOT IN ('rock','paper','scissors') THEN RAISE EXCEPTION 'bad choice'; END IF;
  SELECT * INTO v_room FROM duel_rooms WHERE code = upper(btrim(p_code)) FOR UPDATE;
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'room not found'; END IF;
  IF    v_room.host_id  = auth.uid() THEN v_role := 'host';
  ELSIF v_room.guest_id = auth.uid() THEN v_role := 'guest';
  ELSE  RAISE EXCEPTION 'not a participant'; END IF;
  v_d := v_room.draft;
  IF v_d->>'phase' <> 'rps' THEN RAISE EXCEPTION 'not rps phase'; END IF;
  v_rps := coalesce(v_d->'rps','{}'::jsonb);
  IF v_rps ? v_role THEN RETURN; END IF;              -- already chose
  v_rps := jsonb_set(v_rps, ARRAY[v_role], to_jsonb(p_choice), true);

  IF (v_rps ? 'host') AND (v_rps ? 'guest') THEN
    v_h := v_rps->>'host'; v_g := v_rps->>'guest';
    IF v_h = v_g THEN
      v_rps := jsonb_build_object('tie', true);        -- replay
    ELSE
      v_win := CASE
        WHEN (v_h='rock' AND v_g='scissors') OR (v_h='scissors' AND v_g='paper') OR (v_h='paper' AND v_g='rock')
        THEN 'host' ELSE 'guest' END;
      v_rps := jsonb_build_object('decided', v_win, 'host', v_h, 'guest', v_g);
      v_d := jsonb_set(v_d, '{phase}', '"draft"');
    END IF;
  END IF;
  v_d := jsonb_set(v_d, '{rps}', v_rps);
  UPDATE duel_rooms SET draft = v_d, updated_at = now() WHERE id = v_room.id;
END $$;
REVOKE ALL ON FUNCTION duel_rps(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION duel_rps(text, text) TO authenticated;
