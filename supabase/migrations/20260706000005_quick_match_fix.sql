-- Fix: the OUT column `code` collided with duel_rooms.code inside the code-gen
-- EXISTS subquery ("column reference code is ambiguous"). Qualify the table.
CREATE OR REPLACE FUNCTION quick_match()
RETURNS TABLE (code text, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room duel_rooms%ROWTYPE; v_code text; v_try int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM duel_rooms
   WHERE host_id = auth.uid() AND is_quick AND status = 'waiting'
     AND guest_id IS NULL AND created_at < now() - interval '2 minutes';
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
