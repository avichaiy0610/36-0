-- אלוף האלופים: Israel's Super Cup — the champion against the cup holder, or
-- against the league runner-up when the champion did the double. Played from
-- the results screen once the cup final is in (js/cup.js, superMount).
--
-- The season itself is simulated in the browser, so, like submit_cup_run, the
-- server can only clamp what it is told. Sent once per match (s.submitted is
-- saved with the cup), so the badge is counted, as the other trophies are.
-- array_append, never `earned || 'key'` (20260831000001).

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('isc_win', 'אלוף האלופים', 'זכה במשחק אלוף האלופים', '🛡️', false)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

CREATE OR REPLACE FUNCTION submit_israel_super(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid      uuid    := auth.uid();
  v_won    boolean := COALESCE((p->>'won')::boolean, false);
  earned   text[]  := '{}';
  fresh    text[]  := '{}';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;

  IF v_won THEN earned := array_append(earned, 'isc_win'); END IF;

  IF array_length(earned, 1) > 0 AND EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    WITH ins AS (
      INSERT INTO user_achievements (user_id, achievement_key)
      SELECT uid, k FROM unnest(earned) AS k
      ON CONFLICT (user_id, achievement_key) DO UPDATE
        SET times_earned = user_achievements.times_earned + 1
      RETURNING achievement_key, (xmax = 0) AS is_new
    )
    SELECT COALESCE(array_agg(achievement_key) FILTER (WHERE is_new), '{}') INTO fresh FROM ins;
  END IF;

  RETURN jsonb_build_object('achievements', to_jsonb(fresh));
END;
$$;

GRANT EXECUTE ON FUNCTION submit_israel_super(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION submit_israel_super(jsonb) FROM anon;
