-- Restore track()'s reading of client_id. It has been dropping EVERY event.
--
-- 20260901000003 added 'january' to the allowed modes by retyping the function
-- body instead of copying it, and retyped `p->>'client_id'` as `p->>'cid'`.
-- js/track.js sends client_id — it always has, as did every earlier definition
-- of this function — so v_cid came out NULL and the guard on the next line
-- returned without inserting. Silently, and with a 204, because the RPC itself
-- succeeded: it did exactly what it was told.
--
-- Live from 2026-09-01 15:30 to 21:20 Israel. Games kept being played and saved
-- the whole time — game_results, challenge_results, gauntlet_runs and
-- salary_runs all have rows through the gap — so nothing was lost except the
-- usage numbers themselves, which cannot be recovered.
--
-- The one change against 20260901000001 is 'january' in the mode list. Nothing
-- else in this body differs, deliberately.
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
                    'duel','league','entry','salarycap','install','january')
     OR v_event NOT IN ('open','finish','share','progress')
  THEN RETURN; END IF;

  INSERT INTO usage_events (client_id, user_id, mode, event, detail)
  VALUES (v_cid, v_uid, v_mode, v_event,
          NULLIF(LEFT(COALESCE(p->>'detail',''), 120), ''));
END;
$$;
