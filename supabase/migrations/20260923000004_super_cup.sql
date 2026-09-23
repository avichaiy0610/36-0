-- הסופר-קאפ האירופי: one more night after a European final, for the Champions
-- League or Europa League winner, against the winner of the other one.
--
-- Its own function rather than another redefinition of submit_europe_run: the
-- match is played AFTER the campaign's last report, and that function has been
-- rewritten five times already.
--
-- The one check the server can make: you only get to a Super Cup by winning
-- one of the two trophies, and those are awarded by submit_europe_run BEFORE
-- the Super Cup can be played (euSubmit fires the moment the final is won). No
-- eu_bigears and no eu_uel → nothing to award.
--
-- Counted, like the trophies it follows (20260904000001): the client sends this
-- once per Super Cup, guarded by c.usc.submitted, so times_earned is a tally.
-- array_append, never `earned || 'key'` (20260831000001).

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('eu_super', 'הסופר-קאפ', 'זכה בסופר-קאפ האירופי', '🏅', false)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

CREATE OR REPLACE FUNCTION submit_super_cup(p jsonb)
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

  IF v_won AND EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_id = uid AND achievement_key IN ('eu_bigears', 'eu_uel')
  ) THEN
    earned := array_append(earned, 'eu_super');
  END IF;

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

GRANT EXECUTE ON FUNCTION submit_super_cup(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION submit_super_cup(jsonb) FROM anon;
