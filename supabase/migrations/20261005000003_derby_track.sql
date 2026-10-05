-- אלופי הדרבי: let track() record the 'derby' mode.
--
-- Kept in its own file (not with submit_derby_run in 20261005000002) because
-- scripts/check_track_contract.js scans the WHOLE newest file that defines track()
-- for p->>'key' reads, and submit_derby_run legitimately reads its own keys.
-- The body is COPIED from 20260923000001, not retyped —
-- retyping is how 'cid' replaced 'client_id' and six hours of events were lost.
-- scripts/check_track_contract.js compares the two.
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
                    'story','derby')
     OR v_event NOT IN ('open','finish','share','progress')
  THEN RETURN; END IF;

  INSERT INTO usage_events (client_id, user_id, mode, event, detail)
  VALUES (v_cid, v_uid, v_mode, v_event,
          NULLIF(LEFT(COALESCE(p->>'detail',''), 120), ''));
END;
$$;
