-- A ninth "mode" that is not a mode: where the visit came from.
--
-- 1,367 player pages and 31 team pages are indexed by Google, and nothing in
-- the game could tell whether a single person ever walked through them. This
-- adds `entry`, whose detail is a coarse source — 'player-page', 'google',
-- 'facebook', 'whatsapp' — recorded once per person per day. The referring URL
-- itself is never sent, only the category, which is what the privacy policy's
-- "anonymous, aggregate usage data" has always covered.
CREATE OR REPLACE FUNCTION track(p jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mode  text := lower(COALESCE(p->>'mode', ''));
  v_event text := lower(COALESCE(p->>'event', ''));
  v_uid   uuid := auth.uid();
  v_cid   uuid;
BEGIN
  IF v_mode NOT IN ('draft','challenge','career','minigame','gauntlet','europe','duel','league','entry')
     OR v_event NOT IN ('open','finish','share') THEN
    RETURN;
  END IF;

  BEGIN
    v_cid := (p->>'client_id')::uuid;
  EXCEPTION WHEN others THEN
    RETURN;
  END;
  IF v_cid IS NULL THEN RETURN; END IF;

  IF v_uid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid) THEN
    v_uid := NULL;
  END IF;

  INSERT INTO usage_events (client_id, user_id, mode, event, detail)
  VALUES (v_cid, v_uid, v_mode, v_event,
          NULLIF(left(COALESCE(p->>'detail', ''), 40), ''));
END $$;

GRANT EXECUTE ON FUNCTION track(jsonb) TO anon, authenticated;
