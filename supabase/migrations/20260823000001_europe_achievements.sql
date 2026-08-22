-- The European campaign's achievements.
--
-- No table: a European run is not a leaderboard, it is a thing that either
-- happened to your season or did not. Only the badges are recorded, through one
-- SECURITY DEFINER call, exactly as the gauntlet does it.
--
-- Nothing here can be verified server-side — the campaign is simulated in the
-- browser — so every number the client sends is clamped to what the format can
-- actually produce: four ties, eight matches, 36 places.

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('eu_first',    'לילה אירופי',      'נצח תיק אחד במוקדמות ליגת האלופות',              '🇪🇺', false),
  ('eu_playoff',  'עד הפלייאוף',      'הגע לתיק הרביעי - סיבוב הפלייאוף',               '🎟', false),
  ('eu_group',    'שלב הליגה',        'עבור את הפלייאוף והעפל לשלב הליגה של ליגת האלופות', '🏆', false),
  ('eu_clean',    'בלי לספוג',        'עבור תיק שלם, בית וחוץ, בלי לספוג שער',           '🧤', false),
  ('eu_points',   'לא באנו לטייל',    'צבור 8 נקודות או יותר בשלב הליגה',                '📊', false),
  ('eu_knockout', 'פלייאוף הנוקאאוט', 'סיים בין המקומות 9-24 בטבלת שלב הליגה',           '🔥', false),
  ('eu_giant',    'רוצח ענקים',       'נצח מועדון בדירוג 96 ומעלה בשלב הליגה',           '💥', true),
  ('eu_top8',     'שמינית הגמר',      'סיים בשמונת הראשונים מתוך 36',                    '👑', true)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

CREATE OR REPLACE FUNCTION submit_europe_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid       uuid := auth.uid();
  -- four qualifying ties, and you cannot have won more than you played
  v_won     int  := LEAST(GREATEST(COALESCE((p->>'won_ties')::int, 0), 0), 4);
  -- a rank only exists if you got through all four; 0 means "did not qualify"
  v_rank    int  := LEAST(GREATEST(COALESCE((p->>'rank')::int, 0), 0), 36);
  v_pts     int  := LEAST(GREATEST(COALESCE((p->>'points')::int, 0), 0), 24);
  v_clean   boolean := COALESCE((p->>'clean_tie')::boolean, false);
  v_giant   boolean := COALESCE((p->>'beat_giant')::boolean, false);
  v_qual    boolean := v_won = 4 AND v_rank BETWEEN 1 AND 36;
  earned    text[] := '{}';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;

  IF v_won >= 1 THEN earned := earned || 'eu_first'; END IF;
  IF v_won >= 3 THEN earned := earned || 'eu_playoff'; END IF;   -- three won = the play-off is tie four
  IF v_clean  THEN earned := earned || 'eu_clean'; END IF;
  IF v_qual   THEN earned := earned || 'eu_group'; END IF;
  -- everything below the league phase is meaningless without having reached it
  IF v_qual AND v_pts >= 8            THEN earned := earned || 'eu_points'; END IF;
  IF v_qual AND v_rank BETWEEN 9 AND 24 THEN earned := earned || 'eu_knockout'; END IF;
  IF v_qual AND v_rank <= 8           THEN earned := earned || 'eu_top8'; END IF;
  IF v_qual AND v_giant               THEN earned := earned || 'eu_giant'; END IF;

  IF array_length(earned, 1) > 0 AND EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('achievements', to_jsonb(earned));
END;
$$;

GRANT EXECUTE ON FUNCTION submit_europe_run(jsonb) TO authenticated;
