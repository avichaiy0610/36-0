-- מצב סיפור: let track() record the 'story' mode.
--
-- track() drops any mode missing from its allow-list, silently and with a 204 —
-- that is how 'salarycap' and 'install' spent a week unrecorded. The story mode
-- emits 'open' (the chapter hub), 'progress' ('<chapter>|start') and 'finish'
-- ('<chapter>|<stars>'), read back in admin.html's "📖 מצב סיפור" section
-- through usage_detail.
--
-- The body is COPIED from 20260901000005, not retyped: retyping is how 'cid'
-- replaced 'client_id' and every event was dropped for six hours. The one change
-- is 'story' in the mode list. scripts/check_track_contract.js compares the two.
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
                    'story')
     OR v_event NOT IN ('open','finish','share','progress')
  THEN RETURN; END IF;

  INSERT INTO usage_events (client_id, user_id, mode, event, detail)
  VALUES (v_cid, v_uid, v_mode, v_event,
          NULLIF(LEFT(COALESCE(p->>'detail',''), 120), ''));
END;
$$;
