-- ─────────────────────────────────────────────────────────────────────────────
-- Duel rerolls now mirror the single-player draft: a per-player pool per swap
-- type, sized by difficulty (easy 3, normal 1, hard 0), for the whole draft.
-- ─────────────────────────────────────────────────────────────────────────────

-- Initialise the reroll pools when drafting begins.
CREATE OR REPLACE FUNCTION duel_set_formation(p_code text, p_formation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_role text; v_d jsonb; v_cnt int;
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
  IF v_d->>'phase' NOT IN ('formation') THEN RETURN; END IF;
  v_d := jsonb_set(v_d, ARRAY['fmt', v_role], to_jsonb(p_formation), true);
  IF (v_d#>'{fmt,host}') IS NOT NULL AND (v_d#>'{fmt,guest}') IS NOT NULL THEN
    v_d := jsonb_set(v_d, '{phase}', '"draft"');
    v_cnt := CASE coalesce(v_room.settings->>'difficulty','normal')
               WHEN 'easy' THEN 3 WHEN 'hard' THEN 0 ELSE 1 END;
    v_d := jsonb_set(v_d, '{rerolls}', jsonb_build_object(
             'host',  jsonb_build_object('team', v_cnt, 'season', v_cnt),
             'guest', jsonb_build_object('team', v_cnt, 'season', v_cnt)), true);
  END IF;
  UPDATE duel_rooms SET draft = v_d, status = 'drafting', updated_at = now() WHERE id = v_room.id;
END $$;

-- Reroll consumes from the caller's pool for the chosen swap type.
DROP FUNCTION IF EXISTS duel_reroll(text, text, text);
CREATE FUNCTION duel_reroll(p_code text, p_mode text DEFAULT 'team', p_squad text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_role text; v_d jsonb; v_round int; v_first text; v_rs jsonb; v_key text; v_left int;
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

  v_key := CASE WHEN p_mode = 'season' THEN 'season' ELSE 'team' END;
  v_left := coalesce((v_d #>> ARRAY['rerolls', v_role, v_key])::int, 0);
  IF v_left <= 0 THEN RAISE EXCEPTION 'no rerolls left'; END IF;

  IF p_mode = 'season' AND p_squad IS NOT NULL THEN
    v_d := jsonb_set(v_d, '{squadId}', to_jsonb(p_squad), true);
  ELSE
    v_d := jsonb_set(v_d, '{cursor}', to_jsonb((v_d->>'cursor')::int + 1));
    v_d := v_d - 'squadId';
  END IF;
  v_d := jsonb_set(v_d, ARRAY['rerolls', v_role, v_key], to_jsonb(v_left - 1), true);
  UPDATE duel_rooms SET draft = v_d, updated_at = now() WHERE id = v_room.id;
END $$;
REVOKE ALL ON FUNCTION duel_reroll(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION duel_reroll(text, text, text) TO authenticated;
