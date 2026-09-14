-- ─────────────────────────────────────────────────────────────────────────────
-- דירוגי הקהל.
--
-- כל התגיות הקיימות (js/tags.js) הן עובדות שהדאטה מוכיחה: מלך שערים, זוכה
-- אליפויות, נאמן למועדון. אף אחת מהן איננה דעה. הטבלאות כאן פותחות בדיוק את
-- מה שהדאטה לא יכולה לדעת — מי בעט נייחות, מי היה מנהיג, מי לא מומש.
--
-- שום דבר כאן לא נוגע במשחק בזמן ריצה. דירוג שהבעלים אישר עובר ל-js/data.js
-- דרך scripts/apply_crowd_ratings.js, בדיוק כמו כימיה ותגיות. הסימולציה
-- נשארת דטרמיניסטית ועובדת אופליין, ואין מצב שכשל רשת מזיז איזון או לוחות.
--
-- הצבעות גולמיות אף פעם לא נקראות מבחוץ. העולם רואה את crowd_ratings בלבד.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── רשימת התגיות הסגורה ─────────────────────────────────────────────────────
-- שלושה עשר מפתחות. הלקוח מציג עשרה: לשוער מוחלפות set_piece→reflexes,
-- magic→sweeper, pace→distribution. האכיפה כאן כדי ששום ערך אחר לא ייכנס.
CREATE TABLE IF NOT EXISTS crowd_tags (
  key   text PRIMARY KEY,
  label text NOT NULL
);

INSERT INTO crowd_tags (key, label) VALUES
  ('set_piece',    'בעיטות נייחות'),
  ('derby_king',   'מלך הדרבי'),
  ('leader',       'מנהיג'),
  ('pace',         'מהירות יוצאת דופן'),
  ('magic',        'קסם ברגליים'),
  ('tough',        'קשוח'),
  ('big_games',    'שחקן של משחקים גדולים'),
  ('unfulfilled',  'לא מומש'),
  ('injuries',     'פציעות רדפו אותו'),
  ('cult_hero',    'אגדת קהל'),
  ('reflexes',     'רפלקסים'),
  ('sweeper',      'יציאות'),
  ('distribution', 'משחק ברגליים')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

ALTER TABLE crowd_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crowd_tags_read ON crowd_tags;
CREATE POLICY crowd_tags_read ON crowd_tags FOR SELECT USING (true);

-- REVOKE לפני GRANT, וזה לא קישוט. Supabase מריצה בבוטסטרפ
-- `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,
-- authenticated`, כך שכל טבלה חדשה בסכימה הזו נולדת עם SELECT/INSERT/UPDATE/
-- DELETE לשני התפקידים האלה עוד לפני שכתבנו שורת GRANT אחת. RLS עוצר את
-- הכתיבות, אבל "אין GRANT" זו אמירה שפשוט לא נכונה בפרויקט הזה אלא אם מבטלים
-- אותה במפורש. service_role לא נוגעים בו — apply_crowd_ratings.js צריך אותו.
REVOKE ALL ON TABLE crowd_tags FROM anon, authenticated;
GRANT SELECT ON TABLE crowd_tags TO anon, authenticated;

-- ── ההצבעות ─────────────────────────────────────────────────────────────────
-- voter = auth.uid()::text כשמחובר, אחרת client_id מ-js/track.js. המפתח
-- הייחודי הוא מה שהופך הצבעה חוזרת לעדכון: מותר לשנות דעה, ואי אפשר להצביע
-- פעמיים על אותו שחקן-עונה מאותה זהות.
CREATE TABLE IF NOT EXISTS player_votes (
  player_key text        NOT NULL,
  season     text        NOT NULL,
  voter      text        NOT NULL,
  is_user    boolean     NOT NULL DEFAULT false,
  ovr        smallint    NOT NULL CHECK (ovr BETWEEN 40 AND 99),
  tag        text        REFERENCES crowd_tags(key),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_key, season, voter)
);

-- ה-PK כבר מתחיל ב-(player_key, season), ולכן הוא משרת גם את השליפה לפי
-- שחקן-עונה. האינדקס הזה קיים בכל זאת כי VIEW ה-crowd_ratings סורק את הטבלה
-- כולה ב-GROUP BY ומעדיף אינדקס צר על פני ה-PK הרחב. השני הוא זה שבאמת חייב
-- להתקיים: בדיקת קצב הריצה שואלת "כמה הצבעות מהמצביע הזה בשעה האחרונה".
CREATE INDEX IF NOT EXISTS player_votes_ps    ON player_votes (player_key, season);
CREATE INDEX IF NOT EXISTS player_votes_rate  ON player_votes (voter, updated_at);

-- קריאה ישירה חסומה לחלוטין. אין policy ל-SELECT, ואין GRANT — ראו ההערה
-- אצל crowd_tags: בלי ה-REVOKE הזה, PostgREST היה מחזיר 200 עם מערך ריק
-- במקום 403, וזה בדיוק ההבדל שאי אפשר להבחין בו בטבלה ריקה ביום הראשון.
ALTER TABLE player_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE player_votes FROM anon, authenticated;

-- ── ההערות ──────────────────────────────────────────────────────────────────
-- טקסט על אדם אמיתי חי. user_id חובה, מודרציה לפני פרסום, וכל הערה מאושרת
-- ניתנת לדיווח. זו ההחלטה הכבדה במפרט והיא נאכפת כאן, לא בלקוח.
CREATE TABLE IF NOT EXISTS player_notes (
  id          bigserial PRIMARY KEY,
  player_key  text        NOT NULL,
  season      text        NOT NULL,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        text        NOT NULL CHECK (char_length(body) BETWEEN 2 AND 80),
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected')),
  reports     int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_notes_ps     ON player_notes (player_key, season, status);
CREATE INDEX IF NOT EXISTS player_notes_queue  ON player_notes (status, created_at);

ALTER TABLE player_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS player_notes_read_approved ON player_notes;
CREATE POLICY player_notes_read_approved ON player_notes
  FOR SELECT USING (status = 'approved');

-- SELECT בלבד. הכתיבה עוברת רק דרך submit_player_note, שהיא SECURITY DEFINER
-- ולכן לא צריכה הרשאה על הטבלה — ומי שיכול לכתוב ישירות יכול לדלג על
-- המודרציה, שהיא כל הנקודה בטבלה הזו.
REVOKE ALL ON TABLE player_notes FROM anon, authenticated;
GRANT SELECT ON TABLE player_notes TO anon, authenticated;

-- ── אישורי דירוג ────────────────────────────────────────────────────────────
-- מה שהבעלים אישר בדשבורד. scripts/apply_crowd_ratings.js קורא מכאן.
CREATE TABLE IF NOT EXISTS rating_approvals (
  id          bigserial PRIMARY KEY,
  player_key  text        NOT NULL,
  season      text        NOT NULL,
  old_ovr     smallint    NOT NULL,
  new_ovr     smallint    NOT NULL CHECK (new_ovr BETWEEN 40 AND 99),
  votes       int         NOT NULL,
  applied_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- אישור אחד ממתין לשחקן-עונה. אחרי שהסקריפט מסמן applied_at, אותו שחקן יכול
-- לקבל אישור חדש — ההיסטוריה נשמרת, התור לא מתמלא בכפילויות.
CREATE UNIQUE INDEX IF NOT EXISTS rating_approvals_pending
  ON rating_approvals (player_key, season) WHERE applied_at IS NULL;

ALTER TABLE rating_approvals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE rating_approvals FROM anon, authenticated;

-- ── דחיות ───────────────────────────────────────────────────────────────────
-- "בטל" מוריד שורה מהתור עד שיצטברו עוד הצבעות. שומרים את מספר ההצבעות שבו
-- נדחתה, כדי שהשורה תחזור רק כשבאמת נאמר משהו חדש.
CREATE TABLE IF NOT EXISTS rating_dismissals (
  player_key text NOT NULL,
  season     text NOT NULL,
  at_votes   int  NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_key, season)
);

ALTER TABLE rating_dismissals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE rating_dismissals FROM anon, authenticated;

-- ── הממוצע הגזום ────────────────────────────────────────────────────────────
-- ממיינים, משמיטים GREATEST(1, floor(n*0.1)) מכל קצה, ממצעים, מעגלים.
-- מתחת ל-5 → NULL. פונקציה נפרדת כדי שאפשר יהיה לבדוק אותה ב-SELECT אחד.
--
-- למה בדיקת הסף היא תת-שאילתה ולא k.c: השאילתה החיצונית מצטברת (avg), ולכן
-- כל התייחסות ישירה ל-k.c בתוך ה-SELECT הייתה נופלת על "must appear in the
-- GROUP BY clause". ב-WHERE זה מותר, כי ה-WHERE רץ לפני הצבירה.
CREATE OR REPLACE FUNCTION crowd_trimmed_avg(vals smallint[])
RETURNS smallint
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  WITH n AS (SELECT array_length(vals, 1) AS c),
       k AS (SELECT GREATEST(1, floor(c * 0.1))::int AS cut, c FROM n),
       s AS (
         SELECT v, row_number() OVER (ORDER BY v) AS rn
           FROM unnest(vals) AS v
       )
  SELECT CASE WHEN (SELECT c FROM k) < 5 THEN NULL
              ELSE round(avg(s.v))::smallint END
    FROM s, k
   WHERE s.rn > k.cut AND s.rn <= k.c - k.cut;
$$;

-- ── ההצבר הציבורי ───────────────────────────────────────────────────────────
-- הדבר היחיד שהעולם קורא.
--
-- מה נחשף ומה לא, וזה ההבדל שקל לפספס: המונה n יוצא תמיד, הדירוג יוצא רק
-- מחמש הצבעות ומעלה (crowd_trimmed_avg מחזיר NULL מתחת לזה). ניסיון ראשון
-- סינן כאן HAVING count(*) >= 5, וזה היה הורג את המצב שהמפרט קורא לו "עוד
-- 2 הצבעות והדירוג ייחשף" — הלקוח לא היה מקבל שורה בכלל, היה נופל למצב
-- הריק, והמונה שאמור לשמש תמריץ פשוט לא היה קיים.
--
-- security_invoker = false הוא מה שמאפשר ל-VIEW לקרוא את player_votes בזמן
-- שלקורא עצמו אין שום גישה אליה: ה-VIEW רץ בהרשאות הבעלים (postgres), שהוא
-- גם הבעלים של הטבלה ולכן עוקף את ה-RLS שלה. זו ברירת המחדל, והיא כתובה כאן
-- במפורש כי היא ההנחה שכל הפרטיות של הפיצ'ר תלויה בה.
CREATE OR REPLACE VIEW crowd_ratings
WITH (security_invoker = false) AS
  SELECT v.player_key,
         v.season,
         count(*)::int                                  AS n,
         crowd_trimmed_avg(array_agg(v.ovr))            AS avg_trimmed,
         (SELECT t.tag FROM player_votes t
           WHERE t.player_key = v.player_key AND t.season = v.season
             AND t.tag IS NOT NULL
           GROUP BY t.tag ORDER BY count(*) DESC, t.tag ASC LIMIT 1)  AS tag_top,
         (SELECT count(*) FROM player_votes t
           WHERE t.player_key = v.player_key AND t.season = v.season
             AND t.tag IS NOT NULL
           GROUP BY t.tag ORDER BY count(*) DESC, t.tag ASC LIMIT 1)::int AS tag_top_n
    FROM player_votes v
   GROUP BY v.player_key, v.season;

GRANT SELECT ON crowd_ratings TO anon, authenticated;

-- ── הצבעה ───────────────────────────────────────────────────────────────────
-- p_voter מגיע מהלקוח רק כשהוא אנונימי. משתמש מחובר לא יכול להתחזות: אם יש
-- auth.uid() הוא גובר על כל מה שנשלח.
CREATE OR REPLACE FUNCTION vote_player(
  p_player_key text,
  p_season     text,
  p_ovr        smallint,
  p_tag        text DEFAULT NULL,
  p_voter      text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid      uuid := auth.uid();
  v_voter  text;
  v_recent int;
BEGIN
  IF uid IS NOT NULL THEN
    v_voter := uid::text;
  ELSE
    -- client_id מ-js/track.js הוא uuid. כל דבר אחר נדחה, אחרת הטבלה נפתחת
    -- למפתחות שרירותיים ומונה ההצבעות מאבד כל משמעות.
    --
    -- בדיקת ה-NULL היא לא ייתור: `NULL !~ '…'` מחזיר NULL, ו-IF על NULL הוא
    -- לא-אמת, כך שהענף היה נופל דרך, v_voter היה נשאר NULL, וה-INSERT היה
    -- מתפוצץ על NOT NULL ומחזיר 500 במקום {"error":"bad voter"} מסודר.
    IF p_voter IS NULL
       OR p_voter !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN jsonb_build_object('error', 'bad voter');
    END IF;
    v_voter := p_voter;
  END IF;

  IF p_ovr IS NULL OR p_ovr < 40 OR p_ovr > 99 THEN
    RETURN jsonb_build_object('error', 'bad ovr');
  END IF;

  IF p_tag IS NOT NULL AND NOT EXISTS (SELECT 1 FROM crowd_tags WHERE key = p_tag) THEN
    RETURN jsonb_build_object('error', 'bad tag');
  END IF;

  SELECT count(*) INTO v_recent
    FROM player_votes
   WHERE voter = v_voter AND updated_at > now() - interval '1 hour';
  IF v_recent >= 40 THEN
    RETURN jsonb_build_object('error', 'rate limited');
  END IF;

  INSERT INTO player_votes (player_key, season, voter, is_user, ovr, tag, updated_at)
  VALUES (p_player_key, p_season, v_voter, uid IS NOT NULL, p_ovr, p_tag, now())
  ON CONFLICT (player_key, season, voter)
  DO UPDATE SET ovr = EXCLUDED.ovr, tag = EXCLUDED.tag, updated_at = now();

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION vote_player(text, text, smallint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vote_player(text, text, smallint, text, text) TO anon, authenticated;

-- ── ההצבעה שלי (כדי שהכרטיס יידע להראות "אתה 86") ──────────────────────────
CREATE OR REPLACE FUNCTION my_player_vote(
  p_player_key text,
  p_season     text,
  p_voter      text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid     uuid := auth.uid();
  v_voter text := CASE WHEN uid IS NOT NULL THEN uid::text ELSE p_voter END;
  r       player_votes%ROWTYPE;
BEGIN
  IF v_voter IS NULL THEN RETURN jsonb_build_object('vote', NULL); END IF;

  -- is_user = false כשהזהות הגיעה מהלקוח, וזה שומר על משהו אמיתי: מזהי
  -- המשתמשים חשופים לכל העולם בלוחות (career_board מחזיר user_id), כך שבלי
  -- התנאי הזה כל אנונימי היה יכול לשלוח user_id של אדם אחר ולקרוא מה הוא
  -- חושב על כל שחקן-עונה. הצבעה של מחובר נקראת רק דרך הטוקן שלו.
  SELECT * INTO r FROM player_votes
   WHERE player_key = p_player_key AND season = p_season AND voter = v_voter
     AND (uid IS NOT NULL OR is_user = false);
  IF NOT FOUND THEN RETURN jsonb_build_object('vote', NULL); END IF;
  RETURN jsonb_build_object('vote', jsonb_build_object('ovr', r.ovr, 'tag', r.tag));
END $$;

REVOKE ALL ON FUNCTION my_player_vote(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION my_player_vote(text, text, text) TO anon, authenticated;

-- ── הערה ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION submit_player_note(
  p_player_key text,
  p_season     text,
  p_body       text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid   uuid := auth.uid();
  clean text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not signed in'); END IF;

  -- אותו ניקוי כמו set_my_club: שורה אחת, בלי תווי בקרה ובלי סוגריים משולשים
  clean := NULLIF(btrim(left(regexp_replace(COALESCE(p_body, ''), '[\r\n\t<>]', ' ', 'g'), 80)), '');
  IF clean IS NULL OR char_length(clean) < 2 THEN
    RETURN jsonb_build_object('error', 'empty');
  END IF;

  IF EXISTS (SELECT 1 FROM player_notes
              WHERE user_id = uid AND player_key = p_player_key
                AND created_at > now() - interval '1 day') THEN
    RETURN jsonb_build_object('error', 'already today');
  END IF;

  INSERT INTO player_notes (player_key, season, user_id, body)
  VALUES (p_player_key, p_season, uid, clean);

  RETURN jsonb_build_object('ok', true, 'status', 'pending');
END $$;

REVOKE ALL ON FUNCTION submit_player_note(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_player_note(text, text, text) TO authenticated;

-- ── דיווח ───────────────────────────────────────────────────────────────────
-- מחזיר ok גם על מזהה שלא קיים ועל הערה שלא אושרה: תשובה שמבדילה בין השניים
-- היא בדיוק הכלי שמאפשר למפות את התור שעוד לא פורסם.
CREATE OR REPLACE FUNCTION report_note(p_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE player_notes SET reports = reports + 1 WHERE id = p_id AND status = 'approved';
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION report_note(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION report_note(bigint) TO anon, authenticated;
