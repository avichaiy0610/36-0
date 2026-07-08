-- Quick match now pairs only players who chose the SAME conditions. The searcher
-- passes their settings; we join a waiting quick room whose difficulty/peak/era
-- match, otherwise open a new waiting room with those settings.
DROP FUNCTION IF EXISTS quick_match();
CREATE FUNCTION quick_match(p_settings jsonb DEFAULT '{}')
RETURNS TABLE (code text, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_code text; v_try int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM duel_rooms
   WHERE host_id = auth.uid() AND is_quick AND status = 'waiting'
     AND guest_id IS NULL AND created_at < now() - interval '2 minutes';

  SELECT * INTO v_room FROM duel_rooms d
   WHERE d.is_quick AND d.status = 'waiting' AND d.guest_id IS NULL AND d.host_id <> auth.uid()
     AND coalesce(d.settings->>'difficulty', 'normal') = coalesce(p_settings->>'difficulty', 'normal')
     AND coalesce(d.settings->>'peak_mode', 'false')   = coalesce(p_settings->>'peak_mode', 'false')
     AND coalesce(d.settings->>'era_min', '')          = coalesce(p_settings->>'era_min', '')
     AND coalesce(d.settings->>'era_max', '')          = coalesce(p_settings->>'era_max', '')
   ORDER BY d.created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_room.id IS NOT NULL THEN
    UPDATE duel_rooms SET guest_id = auth.uid(), updated_at = now() WHERE id = v_room.id;
    RETURN QUERY SELECT v_room.code, 'guest'::text; RETURN;
  END IF;

  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM duel_rooms d WHERE d.code = v_code);
    v_try := v_try + 1; IF v_try > 25 THEN RAISE EXCEPTION 'code generation failed'; END IF;
  END LOOP;
  INSERT INTO duel_rooms (code, host_id, is_quick, settings)
    VALUES (v_code, auth.uid(), true, coalesce(p_settings, '{}'::jsonb));
  RETURN QUERY SELECT v_code, 'host'::text;
END $$;
REVOKE ALL ON FUNCTION quick_match(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION quick_match(jsonb) TO authenticated;
