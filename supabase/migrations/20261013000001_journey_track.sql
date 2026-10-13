-- מסע ה־11: let track() record the 'journey' mode.
--
-- Own file for the same reason as 20261005000003: scripts/check_track_contract.js
-- scans the whole newest file that defines track(). The body is COPIED from
-- 20261005000003 with one word added to the allow-list, not retyped.
-- The client sends open (the hub), progress start-<level> / break-<n>,
-- finish <level>[-break] when the eleventh man is taken, share png.
CREATE OR REPLACE FUNCTION track(p jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid   uuid := NULLIF(p->>'client_id','')::uuid;
  v_uid   uuid := auth.uid();
  v_mode  text := lower(COALESCE(p->>'mode', ''));
  v_event text := lower(COALESCE(p->>'event', ''));
BEGIN
  IF v_cid IS NULL THEN RETURN; END IF;
  IF v_mode NOT IN ('draft','challenge','career','minigame','gauntlet','europe',
                    'duel','league','entry','salarycap','install','january',
                    'story','derby','journey')
     OR v_event NOT IN ('open','finish','share','progress')
  THEN RETURN; END IF;

  INSERT INTO usage_events (client_id, user_id, mode, event, detail)
  VALUES (v_cid, v_uid, v_mode, v_event,
          NULLIF(LEFT(COALESCE(p->>'detail',''), 120), ''));
END;
$$;
