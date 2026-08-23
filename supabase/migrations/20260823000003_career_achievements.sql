-- Career achievements. The career itself lives in the browser — ten seasons of
-- squad state is nobody's business but the player's, and it needs no board — so
-- the only thing that reaches the server is what a run EARNED. One RPC, called
-- when a season is recorded and when a run ends, awards from clamped facts.

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('cr_first',     'הקריירה יוצאת לדרך', 'סיים את העונה הראשונה במצב קריירה',                 '👑', false),
  ('cr_title',     'אלוף',               'זכה באליפות בעונה של קריירה',                        '🏆', false),
  ('cr_dynasty',   'שושלת',              'שלוש אליפויות בקריירה אחת',                          '⭐', false),
  ('cr_survivor',  'עשור במועדון',       'השלם קריירה מלאה בת עשר עונות בלי לרדת ליגה',        '🗿', false),
  ('cr_loyal',     'איש המועדון',        'שמור על אותו שחקן בסגל חמש עונות רצופות',            '❤️', false),
  ('cr_relegated', 'סוף השושלת',         'הקריירה נגמרה בירידת ליגה',                          '💀', true)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

-- Every value is clamped here rather than trusted: the client can claim a run,
-- it cannot claim a ten-season dynasty it never played.
CREATE OR REPLACE FUNCTION award_career_achievements(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid       uuid := auth.uid();
  v_seasons int  := LEAST(GREATEST(COALESCE((p->>'seasons')::int, 0), 0), 10);
  v_titles  int  := LEAST(GREATEST(COALESCE((p->>'titles')::int, 0), 0), v_seasons);
  v_stay    int  := LEAST(GREATEST(COALESCE((p->>'longest_stay')::int, 0), 0), v_seasons);
  v_fin     boolean := COALESCE((p->>'finished')::boolean, false) AND v_seasons >= 10;
  v_releg   boolean := COALESCE((p->>'relegated')::boolean, false);
  earned    text[] := '{}';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;

  IF v_seasons >= 1 THEN earned := earned || 'cr_first';     END IF;
  IF v_titles  >= 1 THEN earned := earned || 'cr_title';     END IF;
  IF v_titles  >= 3 THEN earned := earned || 'cr_dynasty';   END IF;
  IF v_stay    >= 5 THEN earned := earned || 'cr_loyal';     END IF;
  IF v_fin          THEN earned := earned || 'cr_survivor';  END IF;
  IF v_releg        THEN earned := earned || 'cr_relegated'; END IF;

  IF array_length(earned, 1) IS NULL THEN
    RETURN jsonb_build_object('achievements', '[]'::jsonb);
  END IF;

  -- a player without a profile still played the career, it just cannot be decorated
  IF EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING;
  END IF;

  -- only the ones that were NEW this call are worth a toast
  RETURN jsonb_build_object('achievements', to_jsonb(earned));
END $$;

GRANT EXECUTE ON FUNCTION award_career_achievements(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION award_career_achievements(jsonb) FROM anon;
