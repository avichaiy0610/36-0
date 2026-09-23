-- מצב סיפור achievements. The mode runs in the browser, like the career and the
-- salary cap, so what reaches the server is what a chapter EARNED — clamped and
-- checked against the chapters that exist, never trusted as given.
--
-- array_append, never `earned || 'key'` (see 20260831000001: an untyped literal
-- on the right parses as an array and aborts the function). And the function
-- returns only what its INSERT actually wrote, so a badge announces itself once
-- (20260902000001).

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('sm_first',     'פרק ראשון',          'סיים פרק במצב סיפור',                                         '📖', false),
  ('sm_star',      'כתבת היסטוריה',      'השג כוכב אחד לפחות בפרק של מצב סיפור',                        '⭐', false),
  ('sm_three',     'שלושה כוכבים',       'השג את כל שלושת הכוכבים בפרק של מצב סיפור',                   '🌟', false),
  ('sm_miracle',   'הנס מהצפון',         'זכה באליפות עם עירוני קריית שמונה 2011/12',                   '🏔', false),
  ('sm_survivor',  'להישאר בחיים',       'השאר את הפועל ירושלים 1999/00 בליגה',                         '🩹', false),
  ('sm_milan',     'מעבר למילאן',        'העפל עם הפועל תל אביב לחצי הגמר של גביע אופ"א 2001/02',       '🔴', false),
  ('sm_zero',      'שובר האפס',          'נצח משחק בבית של מכבי חיפה בליגת האלופות 2009/10',            '⚽', false),
  ('sm_bargain',   'מו"מ קשוח',          'קנה שחקן ב-85% מהמחיר המבוקש או פחות',                        '🤝', false),
  ('sm_collector', 'כל הסיפורים',        'השג כוכב אחד לפחות בכל פרקי מצב הסיפור',                      '📚', false),
  ('sm_rotterdam', 'גביע בבלומפילד',     'זכה בגביע אופ"א 2001/02 עם הפועל תל אביב',                    '🏆', true)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

CREATE OR REPLACE FUNCTION award_story_achievements(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid        uuid    := auth.uid();
  -- the chapters that exist (js/story-data.js); anything else earns nothing
  v_known    text[]  := ARRAY['b7-2015','ks-2011','netanya-2007','netanya-2015','hj-1999','haifa-2020',
                              'hta-2001','haifa-2002','haifa-2009','mta-2002','mta-2004'];
  v_chapter  text    := COALESCE(p->>'chapter', '');
  v_stars    int     := LEAST(GREATEST(COALESCE((p->>'stars')::int, 0), 0), 3);
  v_cup      boolean := COALESCE((p->>'champion')::boolean, false);
  v_bargain  boolean := COALESCE((p->>'bargain')::boolean, false);
  v_total    int     := array_length(v_known, 1);
  v_starred  int     := LEAST(GREATEST(COALESCE((p->>'starred')::int, 0), 0), v_total);
  earned     text[]  := '{}';
  fresh      text[]  := '{}';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;
  IF NOT (v_chapter = ANY (v_known)) THEN
    RETURN jsonb_build_object('achievements', '[]'::jsonb);
  END IF;

  earned := array_append(earned, 'sm_first');
  IF v_stars >= 1 THEN earned := array_append(earned, 'sm_star');  END IF;
  IF v_stars  = 3 THEN earned := array_append(earned, 'sm_three'); END IF;
  IF v_chapter = 'ks-2011'    AND v_stars >= 1 THEN earned := array_append(earned, 'sm_miracle');  END IF;
  IF v_chapter = 'hj-1999'    AND v_stars >= 1 THEN earned := array_append(earned, 'sm_survivor'); END IF;
  IF v_chapter = 'hta-2001'   AND v_stars >= 2 THEN earned := array_append(earned, 'sm_milan');    END IF;
  IF v_chapter = 'hta-2001'   AND v_cup        THEN earned := array_append(earned, 'sm_rotterdam'); END IF;
  IF v_chapter = 'haifa-2009' AND v_stars >= 1 THEN earned := array_append(earned, 'sm_zero');     END IF;
  IF v_bargain                                  THEN earned := array_append(earned, 'sm_bargain');  END IF;
  IF v_starred >= v_total                       THEN earned := array_append(earned, 'sm_collector'); END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    WITH ins AS (
      INSERT INTO user_achievements (user_id, achievement_key)
      SELECT uid, k FROM unnest(earned) AS k
      ON CONFLICT DO NOTHING
      RETURNING achievement_key
    )
    SELECT COALESCE(array_agg(achievement_key), '{}') INTO fresh FROM ins;
  END IF;

  RETURN jsonb_build_object('achievements', to_jsonb(fresh));
END $$;

GRANT EXECUTE ON FUNCTION award_story_achievements(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION award_story_achievements(jsonb) FROM anon;
