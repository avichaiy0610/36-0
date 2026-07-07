-- ─────────────────────────────────────────────────────────────────────────────
-- Duel polish: settings merge (no more reverts), season-swap reroll, and a
-- per-user online duel record (just for fun).
-- ─────────────────────────────────────────────────────────────────────────────

-- Merge only the provided keys, so setting one option never wipes the others.
CREATE OR REPLACE FUNCTION set_duel_settings(p_code text, p_settings jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_room FROM duel_rooms WHERE code = upper(btrim(p_code)) FOR UPDATE;
  IF v_room.id IS NULL THEN RAISE EXCEPTION 'room not found'; END IF;
  IF v_room.host_id <> auth.uid() THEN RAISE EXCEPTION 'only host'; END IF;
  IF v_room.status <> 'waiting' THEN RAISE EXCEPTION 'too late'; END IF;
  UPDATE duel_rooms
     SET settings = coalesce(settings, '{}'::jsonb) || coalesce(p_settings, '{}'::jsonb),
         updated_at = now()
   WHERE id = v_room.id;
END $$;

-- Reroll: 'team' advances the seeded sequence; 'season' swaps to a specific
-- other season of the same club (the client picks it, we just store it). Up to
-- two rerolls per round, only by the round's first picker, before anyone picked.
DROP FUNCTION IF EXISTS duel_reroll(text);
CREATE FUNCTION duel_reroll(p_code text, p_mode text DEFAULT 'team', p_squad text DEFAULT NULL)
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
  IF (v_d->>'rr')::int >= 2 THEN RAISE EXCEPTION 'no rerolls left'; END IF;

  IF p_mode = 'season' AND p_squad IS NOT NULL THEN
    v_d := jsonb_set(v_d, '{squadId}', to_jsonb(p_squad), true);
  ELSE
    v_d := jsonb_set(v_d, '{cursor}', to_jsonb((v_d->>'cursor')::int + 1));
    v_d := v_d - 'squadId';
  END IF;
  v_d := jsonb_set(v_d, '{rr}', to_jsonb((v_d->>'rr')::int + 1));
  UPDATE duel_rooms SET draft = v_d, updated_at = now() WHERE id = v_room.id;
END $$;
REVOKE ALL ON FUNCTION duel_reroll(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION duel_reroll(text, text, text) TO authenticated;

-- Pick: same as before, but also clears any season override when the round ends.
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

-- Per-user online duel record.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS duel_wins   int NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS duel_losses int NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS duel_draws  int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION record_duel_outcome(p_outcome text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF    p_outcome = 'win'  THEN UPDATE profiles SET duel_wins   = duel_wins   + 1 WHERE id = auth.uid();
  ELSIF p_outcome = 'loss' THEN UPDATE profiles SET duel_losses = duel_losses + 1 WHERE id = auth.uid();
  ELSIF p_outcome = 'draw' THEN UPDATE profiles SET duel_draws  = duel_draws  + 1 WHERE id = auth.uid();
  END IF;
END $$;
REVOKE ALL ON FUNCTION record_duel_outcome(text) FROM anon;
GRANT EXECUTE ON FUNCTION record_duel_outcome(text) TO authenticated;

CREATE OR REPLACE FUNCTION get_duel_record()
RETURNS TABLE (wins int, losses int, draws int)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT duel_wins, duel_losses, duel_draws FROM profiles WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION get_duel_record() FROM anon;
GRANT EXECUTE ON FUNCTION get_duel_record() TO authenticated;
