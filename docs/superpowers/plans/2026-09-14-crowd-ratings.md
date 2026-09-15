# דירוגי הקהל — תוכנית ביצוע

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** לתת לקהל לדרג, לתייג ולכתוב על שחקן-בעונה, להציג "דירוג קהל ממוצע" בכרטיס השחקן ובעמודי `/player/`, ולהעביר את מה שהבעלים אישר לתוך `js/data.js` דרך סקריפט.

**Architecture:** שלוש טבלאות Supabase + `VIEW` ציבורי אחד + שלושה RPC. לקוח חדש ומבודד ב-`js/crowd.js` שכרטיס השחקן קורא לו בשורה אחת. דירוג מאושר **לא** משנה את המשחק בזמן ריצה — סקריפט Node כותב ל-`js/data.js`, בדיוק כמו כימיה, תגיות ותכונות. הסימולציה נשארת דטרמיניסטית ואופליין.

**Tech Stack:** HTML/CSS/JS סטטי בלי build ובלי package.json · Supabase (Postgres + PostgREST + RPC) · Node לסקריפטי דאטה · אימות ב-Chrome headless לפי `.claude/skills/verify`.

**מפרט מקור:** [docs/superpowers/specs/2026-09-14-crowd-ratings-design.md](../specs/2026-09-14-crowd-ratings-design.md)

---

## הוראות עבודה קבועות

**אסור לדחוף.** הבעלים ביקש במפורש `בלי דחיפה`. עובדים בענף `feature/crowd-ratings`, מקמטים חופשי, **אף פעם לא `git push`**.

**אסור להחיל מיגרציה על פרודקשן בלי אישור מפורש.** `supabase db push` נוגע במסד החי. משימה 1 עוצרת ומבקשת אישור.

**שני באגים שהרגו את הפרויקט הזה בעבר, ושניהם רלוונטיים כאן:**
- ב-plpgsql, `arr := arr || 'key'` על `text[]` **לא מוסיף מחרוזת** — Postgres פותר את `||` ל-`anyarray || anyarray`, מנסה לפרסר `'key'` כליטרל מערך וזורק `22P02`. זה הפיל את `submit_gauntlet_run` לגמרי וגרם לכך שכל ריצה עם ניצחון נמחקה. **תמיד `array_append`.**
- "שדה שאף אחד לא מציב הוא שדה שנגרר" — הבאג החוזר ביותר כאן, שלוש פעמים. מצב ההצבעה נקרא מחדש בכל פתיחת כרטיס ולעולם לא נשמר בין פתיחות.

**`profiles` הוא `username`, לא `display_name`.** מיגרציה שמתייחסת ל-`display_name` נכשלת ב-push.

---

## מפת קבצים

| קובץ | אחריות |
|---|---|
| `supabase/migrations/20260914000001_crowd_ratings.sql` | **חדש.** טבלאות, ממוצע גזום, VIEW ציבורי, שלושה RPC, הרשאות |
| `js/crowd.js` | **חדש.** כל לקוח דירוגי הקהל: מפתחות, מדף תגיות, שליפה, HTML הווידג'ט, חיווט, שליחה |
| `css/crowd.css` | **חדש.** הווידג'ט בלבד |
| `js/player-card.js` | **שינוי.** מעביר סגל דרך `pcShow`→`pcHTML`, משבץ את הווידג'ט, נועל סגירה בזמן הצבעה |
| `js/crowd-admin.js` | **חדש.** טבלת המחלוקות ותור ההערות |
| `admin.html` | **שינוי.** סקשן `⭐ דירוגי הקהל` + תג script |
| `index.html` | **שינוי.** תגי script/link לקבצים החדשים |
| `scripts/apply_crowd_ratings.js` | **חדש.** מושך אישורים, כותב ל-`js/data.js`, מייצר לוג |
| `scripts/player_pages.js` | **שינוי.** ווידג'ט + חיפוש בעמודי `/player/` |
| `scripts/sim/crowd_harness.js` | **חדש.** בדיקות Node ללוגיקה הטהורה |
| `js/players-index.js` + `css/players-index.js` | **חדש.** מסך `👥 שחקנים` עם חיפוש |

---

## משימה 0: ענף

- [ ] **שלב 1: לפתוח ענף**

```bash
cd "c:/Users/avich/Desktop/Claude/Project Two/36-0"
git checkout -b feature/crowd-ratings
git status
```

צפוי: `On branch feature/crowd-ratings` ו-`nothing to commit, working tree clean`.

---

## משימה 1: המיגרציה

**Files:**
- Create: `supabase/migrations/20260914000001_crowd_ratings.sql`

### החלטות שננעלות כאן

**ממוצע גזום, מוגדר במדויק:** ממיינים; משמיטים `GREATEST(1, floor(n*0.1))` מכל קצה; ממצעים את מה שנשאר ומעגלים. מתחת ל-5 הצבעות מחזירים `NULL`. זה ממוצע אמיתי — ולכן התווית "דירוג קהל ממוצע" נכונה — והוא חסין להצבעות קיצון בדיוק כמו חציון.

**רשימת התגיות סגורה ונאכפת ב-SQL.** שלושה עשר מפתחות; הלקוח מציג עשרה לפי העמדה.

- [ ] **שלב 1: לכתוב את המיגרציה**

```sql
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
CREATE POLICY crowd_tags_read ON crowd_tags FOR SELECT USING (true);
GRANT SELECT ON crowd_tags TO anon, authenticated;

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

CREATE INDEX IF NOT EXISTS player_votes_ps    ON player_votes (player_key, season);
CREATE INDEX IF NOT EXISTS player_votes_rate  ON player_votes (voter, updated_at);

-- קריאה ישירה חסומה לחלוטין. אין policy ל-SELECT, ואין GRANT.
ALTER TABLE player_votes ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY player_notes_read_approved ON player_notes
  FOR SELECT USING (status = 'approved');
GRANT SELECT ON player_notes TO anon, authenticated;

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

CREATE UNIQUE INDEX IF NOT EXISTS rating_approvals_pending
  ON rating_approvals (player_key, season) WHERE applied_at IS NULL;

ALTER TABLE rating_approvals ENABLE ROW LEVEL SECURITY;

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

-- ── הממוצע הגזום ────────────────────────────────────────────────────────────
-- ממיינים, משמיטים GREATEST(1, floor(n*0.1)) מכל קצה, ממצעים, מעגלים.
-- מתחת ל-5 → NULL. פונקציה נפרדת כדי שאפשר יהיה לבדוק אותה ב-SELECT אחד.
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
    IF p_voter !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
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
  v_voter text := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid()::text ELSE p_voter END;
  r       player_votes%ROWTYPE;
BEGIN
  IF v_voter IS NULL THEN RETURN jsonb_build_object('vote', NULL); END IF;
  SELECT * INTO r FROM player_votes
   WHERE player_key = p_player_key AND season = p_season AND voter = v_voter;
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
```

- [ ] **שלב 2: לבדוק את הממוצע הגזום מול וקטורים ידועים**

זו הלוגיקה היחידה במיגרציה שיכולה להיות שגויה בשקט. מריצים מול מסד מקומי (`supabase start`) או, אחרי אישור, מול המקושר:

```bash
cd "c:/Users/avich/Desktop/Claude/Project Two/36-0"
supabase db push --dry-run
```

ואז ב-SQL:

```sql
SELECT crowd_trimmed_avg(ARRAY[40,80,81,82,99]::smallint[])  AS a,  -- 81
       crowd_trimmed_avg(ARRAY[70,70,70,70,70]::smallint[])  AS b,  -- 70
       crowd_trimmed_avg(ARRAY[60,85,85,85,85,85,85,85,85,99]::smallint[]) AS c,  -- 85
       crowd_trimmed_avg(ARRAY[80,81,82,83]::smallint[])     AS d;  -- NULL
```

צפוי: `a=81 · b=70 · c=85 · d=NULL`.

- `a`: 40 ו-99 מושמטים, ממוצע 80/81/82 = 81.
- `c`: n=10 → `floor(1.0)=1` מכל קצה → נשארות שמונה 85.
- `d`: n=4, מתחת לסף.

אם `a` יוצא 76 — הגזימה לא רצה בכלל והוקפצה לממוצע פשוט. אם `d` מחזיר מספר — בדיקת הסף לא עובדת והפיצ'ר יחשוף דירוגים על בסיס שתי הצבעות.

- [ ] **שלב 3: לוודא שהצבעות גולמיות באמת לא נקראות**

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "$SUPABASE_URL/rest/v1/player_votes?select=*" -H "apikey: $SUPABASE_ANON_KEY"
```

צפוי: `401` או `403` — **לא** `200`. `200` עם מערך ריק זו תקלה, לא הצלחה: המשמעות היא שה-RLS מרשה קריאה והטבלה פשוט ריקה כרגע.

- [ ] **שלב 4: לעצור ולבקש אישור להחלה על פרודקשן**

לא מריצים `supabase db push` על המסד החי בלי אישור מפורש של הבעלים. לשאול, ולחכות.

- [ ] **שלב 5: קומיט**

```bash
git add supabase/migrations/20260914000001_crowd_ratings.sql
git commit -m "feat(crowd): tables, trimmed average and the three RPCs"
```

---

## משימה 2: הלוגיקה הטהורה ב-`js/crowd.js`

**Files:**
- Create: `js/crowd.js`
- Test: `scripts/sim/crowd_harness.js`

הלוגיקה הטהורה היחידה בלקוח היא נרמול השם ובחירת מדף התגיות. שתיהן יכולות להישבר בשקט: שם שמנורמל אחרת מ-`pcNorm` ייצור מפתח שני לאותו שחקן ויפצל את ההצבעות, ומדף שגוי יציע "בעיטות נייחות" לשוער.

- [ ] **שלב 1: לכתוב את הבדיקה הנכשלת**

```js
// scripts/sim/crowd_harness.js
// בדיקות ללוגיקה הטהורה של js/crowd.js. אין כאן framework — הקובץ מדפיס
// שורה לכל בדיקה ויוצא עם קוד 1 אם משהו נפל.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const ctx = { console, window: {}, document: { addEventListener() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'crowd.js'), 'utf8'), ctx);

let failed = 0;
function is(actual, expected, what) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${ok ? '' : `\n      got ${a}\n      want ${e}`}`);
}

// ── crowdKey חייב להסכים עם pcNorm בדיוק ──────────────────────────────────
// pcNorm מסיר סימני כיווניות, מאחד גרשים, מכווץ רווחים ומקצץ. שם שמנורמל
// אחרת ייצור מפתח שני לאותו אדם, וההצבעות ייחתכו לשניים בלי שאף אחד ישים לב.
is(ctx.crowdKey('יוסי אבוקסיס\u200e'), 'יוסי אבוקסיס', 'crowdKey strips the LRM');
is(ctx.crowdKey("ויקטור פאצ\u2019ו"),  "ויקטור פאצ'ו",  'crowdKey unifies apostrophes');
is(ctx.crowdKey('  אלון   מזרחי  '),  'אלון מזרחי',    'crowdKey collapses spaces');

// ── מדף התגיות ────────────────────────────────────────────────────────────
is(ctx.crowdShelf('ST').map(t => t.key),
   ['set_piece','derby_king','leader','pace','magic','tough','big_games','unfulfilled','injuries','cult_hero'],
   'outfield shelf is the ten');
is(ctx.crowdShelf('GK').map(t => t.key),
   ['reflexes','derby_king','leader','distribution','sweeper','tough','big_games','unfulfilled','injuries','cult_hero'],
   'keeper shelf swaps three');
is(ctx.crowdShelf('GK').length, 10, 'keeper shelf is still ten');

// ── ה-slug ────────────────────────────────────────────────────────────────
// שלושה מקומות בונים ממנו קישור. מימוש אחד, ובדיקה אחת.
is(ctx.crowdSlug('אלון מזרחי'), 'אלון-מזרחי', 'slug joins with a hyphen');
is(ctx.crowdSlug("ויקטור פאצ’ו"), "ויקטור-פאצ'ו", 'slug normalises first');

// ── מצב התצוגה ────────────────────────────────────────────────────────────
// הסף הוא 5. מתחת לזה לא מוצג מספר — רק מונה, שגם משמש כתמריץ.
is(ctx.crowdDisplay(null),                    { state: 'empty',   left: 5 },  'no rows at all → empty');
is(ctx.crowdDisplay({ n: 0 }),                { state: 'empty',   left: 5 },  'zero votes → empty');
is(ctx.crowdDisplay({ n: 3 }),                { state: 'few',     left: 2 },  'three votes → two to go');
is(ctx.crowdDisplay({ n: 5, avg_trimmed: 82 }),
                                              { state: 'shown', n: 5, avg: 82 }, 'five votes → shown');

process.exit(failed ? 1 : 0);
```

- [ ] **שלב 2: להריץ ולראות שזה נופל**

```bash
cd "c:/Users/avich/Desktop/Claude/Project Two/36-0"
node scripts/sim/crowd_harness.js
```

צפוי: כישלון עם `Cannot read properties of undefined` או `crowdKey is not a function` — הקובץ `js/crowd.js` עוד לא קיים.

(שתים-עשרה בדיקות: שלוש ל-`crowdKey`, שלוש ל-`crowdShelf`, שתיים ל-`crowdSlug`, וארבע ל-`crowdDisplay`.)

- [ ] **שלב 3: לכתוב את המימום המינימלי**

```js
// js/crowd.js
// ─── דירוגי הקהל ──────────────────────────────────────────────────────────────
//
// כל התגיות במשחק (js/tags.js) הן עובדות שהדאטה מוכיחה. הקובץ הזה פותח את מה
// שהדאטה לא יכולה לדעת: כמה הוא באמת היה שווה באותה עונה, מי בעט נייחות, ומי
// לא מומש. הקהל אומר, הבעלים מאשר, וסקריפט מעביר את זה ל-data.js.
//
// שום דבר כאן לא משנה את המשחק בזמן ריצה.

/* ── מפתחות ────────────────────────────────────────────────────────────────
   חייב להיות זהה ל-pcNorm ב-js/player-card.js. אם השניים ייפרדו, אותו אדם
   יקבל שני מפתחות וההצבעות שלו ייחתכו לשניים בלי שאף אחד ישים לב. */
function crowdKey(s) {
  return String(s ?? '')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[\u05f3\u2019`\u00b4']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── מדף התגיות ────────────────────────────────────────────────────────────
   עשר תגיות, כולן ניטרליות וכולן דברים שאין להם מקור בדאטה. לשוער מוחלפות
   שלוש, כי "בעיטות נייחות" ו"קסם ברגליים" לא שאלה עליו. */
const CROWD_TAGS = {
  set_piece:    { icon: '🎯', label: 'בעיטות נייחות' },
  derby_king:   { icon: '👑', label: 'מלך הדרבי' },
  leader:       { icon: '🧠', label: 'מנהיג' },
  pace:         { icon: '⚡', label: 'מהירות יוצאת דופן' },
  magic:        { icon: '🪄', label: 'קסם ברגליים' },
  tough:        { icon: '🧱', label: 'קשוח' },
  big_games:    { icon: '🔥', label: 'שחקן של משחקים גדולים' },
  unfulfilled:  { icon: '💔', label: 'לא מומש' },
  injuries:     { icon: '🩹', label: 'פציעות רדפו אותו' },
  cult_hero:    { icon: '❤️', label: 'אגדת קהל' },
  reflexes:     { icon: '🧤', label: 'רפלקסים' },
  sweeper:      { icon: '🙌', label: 'יציאות' },
  distribution: { icon: '🦶', label: 'משחק ברגליים' },
};

const CROWD_SHELF_OUT = ['set_piece','derby_king','leader','pace','magic',
                         'tough','big_games','unfulfilled','injuries','cult_hero'];
const CROWD_SHELF_GK  = ['reflexes','derby_king','leader','distribution','sweeper',
                         'tough','big_games','unfulfilled','injuries','cult_hero'];

function crowdShelf(pos) {
  const keys = (pos === 'GK') ? CROWD_SHELF_GK : CROWD_SHELF_OUT;
  return keys.map(key => ({ key, ...CROWD_TAGS[key] }));
}

/* ── ה-slug של עמוד השחקן ──────────────────────────────────────────────────
   מוגדר כאן, במקום אחד, כי שלושה מקומות צריכים אותו: הקישור מכרטיס השחקן,
   מסך 👥 שחקנים, ו-scripts/player_pages.js שמייצר את התיקיות עצמן. שני
   מימושים שנפרדים = כל קישור באתר מוביל ל-404. */
function crowdSlug(name) {
  return crowdKey(name).replace(/\s+/g, '-');
}

/* ── מצב התצוגה ────────────────────────────────────────────────────────────
   ביום הראשון אין לאף שחקן הצבעות, וזה יימשך שבועות. המצב הריק הוא המצב
   הרגיל של הפיצ'ר בתחילת חייו — ולכן הוא מחושב כאן במפורש ולא נופל לענף
   שנכתב בדיעבד. הסף הוא חמש. */
const CROWD_MIN_VOTES = 5;

function crowdDisplay(row) {
  const n = (row && row.n) || 0;
  if (!n) return { state: 'empty', left: CROWD_MIN_VOTES };
  if (n < CROWD_MIN_VOTES) return { state: 'few', left: CROWD_MIN_VOTES - n };
  return { state: 'shown', n, avg: row.avg_trimmed };
}
```

- [ ] **שלב 4: להריץ ולראות שזה עובר**

```bash
node scripts/sim/crowd_harness.js
```

צפוי: שתים-עשרה שורות `PASS` וקוד יציאה 0.

- [ ] **שלב 5: קומיט**

```bash
git add js/crowd.js scripts/sim/crowd_harness.js
git commit -m "feat(crowd): keys, the tag shelf and the display states"
```

---

## משימה 3: שליפה ושליחה

**Files:**
- Modify: `js/crowd.js`

`_supabase` נוצר ב-`js/supabase-client.js` ונקרא ישירות בכל שאר המשחק (`_supabase.rpc('career_board', …)` ב-`js/career.js:519`). אותו דפוס כאן. **כל קריאה חייבת להיכשל בשקט:** כרטיס השחקן נפתח בהובר בתוך דראפט, וכשל רשת לא יכול לשבור אותו.

- [ ] **שלב 1: להוסיף את שכבת הרשת**

```js
/* ── רשת ───────────────────────────────────────────────────────────────────
   הכרטיס נפתח בהובר, לפעמים כמה פעמים בשנייה. בלי מטמון זה מבול בקשות על
   אותו שחקן. המטמון חי לטעינת העמוד בלבד ונפרד אחרי הצבעה, כדי שהמספר
   שהמצביע רואה מיד יהיה המספר החדש. */
const _crowdCache = new Map();
const _crowdMine  = new Map();

function crowdCacheKey(key, season) { return key + '|' + season; }

function crowdClientId() {
  // אותו מזהה שבו track.js משתמש. אם הוא לא זמין (localStorage חסום, גלישה
  // פרטית) — אין הצבעה אנונימית, ומה שמוצע הוא התחברות.
  try { return localStorage.getItem('t360_cid') || null; } catch (e) { return null; }
}

async function crowdFetch(key, season) {
  const ck = crowdCacheKey(key, season);
  if (_crowdCache.has(ck)) return _crowdCache.get(ck);
  let row = null;
  try {
    const { data } = await _supabase
      .from('crowd_ratings')
      .select('n, avg_trimmed, tag_top, tag_top_n')
      .eq('player_key', key).eq('season', season).maybeSingle();
    row = data || null;
  } catch (e) { row = null; }
  _crowdCache.set(ck, row);
  return row;
}

async function crowdFetchMine(key, season) {
  const ck = crowdCacheKey(key, season);
  if (_crowdMine.has(ck)) return _crowdMine.get(ck);
  let mine = null;
  try {
    const { data } = await _supabase.rpc('my_player_vote', {
      p_player_key: key, p_season: season, p_voter: crowdClientId(),
    });
    mine = (data && data.vote) || null;
  } catch (e) { mine = null; }
  _crowdMine.set(ck, mine);
  return mine;
}

async function crowdVote(key, season, ovr, tag) {
  try {
    const { data, error } = await _supabase.rpc('vote_player', {
      p_player_key: key, p_season: season,
      p_ovr: ovr, p_tag: tag || null, p_voter: crowdClientId(),
    });
    if (error || (data && data.error)) return { ok: false, error: (data && data.error) || 'network' };
    // ההצבעה שינתה את ההצבר — המטמון על השחקן הזה כבר לא נכון
    _crowdCache.delete(crowdCacheKey(key, season));
    _crowdMine.set(crowdCacheKey(key, season), { ovr, tag: tag || null });
    return { ok: true };
  } catch (e) { return { ok: false, error: 'network' }; }
}

async function crowdSubmitNote(key, season, body) {
  try {
    const { data, error } = await _supabase.rpc('submit_player_note', {
      p_player_key: key, p_season: season, p_body: body,
    });
    if (error || (data && data.error)) return { ok: false, error: (data && data.error) || 'network' };
    return { ok: true };
  } catch (e) { return { ok: false, error: 'network' }; }
}

async function crowdNotes(key, season) {
  try {
    const { data } = await _supabase
      .from('player_notes')
      .select('id, body')
      .eq('player_key', key).eq('season', season).eq('status', 'approved')
      .order('created_at', { ascending: false }).limit(3);
    return data || [];
  } catch (e) { return []; }
}
```

- [ ] **שלב 2: לוודא שהקובץ עדיין נטען ב-Node בלי `_supabase`**

ה-harness מריץ את הקובץ בהקשר בלי `_supabase`. הפונקציות מוגדרות אבל לא נקראות, אז זה חייב לעבור:

```bash
node scripts/sim/crowd_harness.js
```

צפוי: אותן שתים-עשרה שורות `PASS`. כישלון כאן פירושו שנכתבה קריאה ברמה העליונה במקום בתוך פונקציה.

- [ ] **שלב 3: קומיט**

```bash
git add js/crowd.js
git commit -m "feat(crowd): fetch and submit, every call failing quietly"
```

---

## משימה 4: הווידג'ט — HTML, CSS וחיווט

**Files:**
- Modify: `js/crowd.js`
- Create: `css/crowd.css`

**כלל עיצוב שנאכף בפרויקט הזה שלוש פעמים:** להישאר בפלטה הכהה. בלי משטחים לבנים, בלי מסגרות קרם. `#0d1117` הוא הקרקע. מצב ריק וממולא נראים אותו דבר מבחינת משקל — רק הטקסט משתנה.

- [ ] **שלב 1: לכתוב את ה-HTML ואת החיווט**

```js
/* ── הווידג'ט ──────────────────────────────────────────────────────────────
   במצב סרק זו שורה אחת. היא מתרחבת רק כשנוגעים בה. הכרטיס כבר צפוף — פאנל
   שנפתח מעצמו היה הופך אותו למסך. */
function crowdEsc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// הווידג'ט נכנס לכרטיס כשלד ריק ומתמלא אסינכרונית. pcHTML הוא סינכרוני
// ולא ניתן להמתין בתוכו בלי להקפיא את פתיחת הכרטיס.
function crowdBlock(name, season, pos, official) {
  if (!name || !season) return '';
  return `
    <div class="pc-sec crowd" data-key="${crowdEsc(crowdKey(name))}"
         data-season="${crowdEsc(season)}" data-pos="${crowdEsc(pos || '')}"
         data-official="${official || ''}">
      <div class="crowd-line">טוען…</div>
    </div>`;
}

// נקרא אחרי שה-innerHTML הוצב. מוצא כל סקשן crowd שעוד לא מולא וממלא אותו.
async function crowdMount(root) {
  const box = (root || document).querySelector('.crowd:not([data-ready])');
  if (!box) return;
  box.setAttribute('data-ready', '1');
  const key = box.dataset.key, season = box.dataset.season;
  const [row, mine] = await Promise.all([crowdFetch(key, season), crowdFetchMine(key, season)]);
  // הכרטיס עלול להיסגר בזמן ההמתנה — כתיבה לאלמנט מנותק היא בזבוז שקט
  if (!box.isConnected) return;
  crowdRenderLine(box, row, mine);
}

function crowdRenderLine(box, row, mine) {
  const d = crowdDisplay(row);
  const tag = row && row.tag_top ? CROWD_TAGS[row.tag_top] : null;
  let txt;
  if (d.state === 'shown') {
    txt = `דירוג קהל ממוצע <span dir="ltr">${d.avg}</span> <span class="crowd-n">⟨${d.n}⟩</span>` +
          (tag ? ` · <span class="crowd-tag">${tag.icon} ${crowdEsc(tag.label)}</span>` : '');
  } else if (d.state === 'few') {
    txt = `עוד ${d.left} הצבעות והדירוג ייחשף`;
  } else {
    txt = 'עוד אין דעות עליו — תהיה הראשון';
  }
  const you = mine ? `<span class="crowd-you">אתה <span dir="ltr">${mine.ovr}</span></span> · ` : '';
  box.innerHTML = `<div class="crowd-line">${you}${txt}<button class="crowd-open" type="button">${
    mine ? 'שנה' : 'דרג'}</button></div>`;
  box.querySelector('.crowd-open').addEventListener('click', () => crowdOpenPanel(box, row, mine));
}
```

- [ ] **שלב 2: לכתוב את הפאנל — כולל נעילת הסגירה**

`pcHide` נקרא ב-`mouseleave` של הכרטיס ([player-card.js:459](js/player-card.js#L459)). גרירת חוגה שהאצבע או העכבר יוצאים איתה מגבולות הכרטיס תסגור אותו באמצע ההצבעה. הנעילה היא לא ליטוש — בלעדיה הפאנל שבור בשימוש רגיל בדסקטופ.

```js
// דגל שקורא pcHide לפני שהוא סוגר. נקבע רק בזמן גרירה או הקלדה בפועל.
let _crowdBusy = false;
function crowdBusy() { return _crowdBusy; }

function crowdOpenPanel(box, row, mine) {
  const key = box.dataset.key, season = box.dataset.season;
  const pos = box.dataset.pos;
  const official = parseInt(box.dataset.official, 10) || 75;
  const start = mine ? mine.ovr : official;
  const shelf = crowdShelf(pos);
  const signedIn = typeof getCurrentUser === 'function' && !!getCurrentUser();

  box.innerHTML = `
    <div class="crowd-panel">
      <div class="crowd-dial-row">
        <input class="crowd-dial" type="range" min="40" max="99" value="${start}"
               aria-label="הדירוג שלך">
        <output class="crowd-val" dir="ltr">${start}</output>
      </div>
      <div class="crowd-dial-note">${row && row.avg_trimmed
        ? `הקהל יושב על <span dir="ltr">${row.avg_trimmed}</span>` : 'אתה הראשון'}</div>
      <div class="crowd-shelf">${shelf.map(t =>
        `<button class="crowd-chip${mine && mine.tag === t.key ? ' on' : ''}"
                 type="button" data-tag="${t.key}">${t.icon} ${crowdEsc(t.label)}</button>`).join('')}</div>
      ${signedIn
        ? `<div class="crowd-note-row">
             <input class="crowd-note" maxlength="80" placeholder="שורה אחת עליו (עד 80 תווים)">
             <button class="crowd-note-send" type="button">שלח</button>
           </div>
           <div class="crowd-note-hint">שורות מוצגות רק אחרי אישור.</div>`
        : `<div class="crowd-note-hint">התחבר כדי לכתוב עליו שורה.</div>`}
      <button class="crowd-done" type="button">שמור</button>
    </div>`;

  const dial = box.querySelector('.crowd-dial');
  const out  = box.querySelector('.crowd-val');
  let tag = mine ? mine.tag : null;

  // הכרטיס לא נסגר כל עוד יד על החוגה
  dial.addEventListener('pointerdown', () => { _crowdBusy = true; });
  ['pointerup', 'pointercancel'].forEach(t =>
    dial.addEventListener(t, () => { _crowdBusy = false; }));
  dial.addEventListener('input', () => { out.textContent = dial.value; });

  box.querySelectorAll('.crowd-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const k = chip.dataset.tag;
      tag = (tag === k) ? null : k;      // נגיעה שנייה מבטלת
      box.querySelectorAll('.crowd-chip').forEach(c =>
        c.classList.toggle('on', c.dataset.tag === tag));
    });
  });

  const note = box.querySelector('.crowd-note');
  if (note) {
    note.addEventListener('focus', () => { _crowdBusy = true; });
    note.addEventListener('blur',  () => { _crowdBusy = false; });
    box.querySelector('.crowd-note-send').addEventListener('click', async () => {
      const body = note.value.trim();
      if (body.length < 2) return;
      const r = await crowdSubmitNote(key, season, body);
      const hint = box.querySelector('.crowd-note-hint');
      hint.textContent = r.ok ? 'נשלח — יוצג אחרי אישור.'
                        : r.error === 'already today' ? 'כבר כתבת עליו היום.'
                        : 'לא נשלח, נסה שוב.';
      if (r.ok) { note.value = ''; note.disabled = true; }
    });
  }

  box.querySelector('.crowd-done').addEventListener('click', async () => {
    _crowdBusy = false;
    const ovr = parseInt(dial.value, 10);
    const r = await crowdVote(key, season, ovr, tag);
    if (!r.ok) {
      box.querySelector('.crowd-dial-note').textContent =
        r.error === 'rate limited' ? 'יותר מדי הצבעות בשעה האחרונה.' : 'לא נשמר, נסה שוב.';
      return;
    }
    const fresh = await crowdFetch(key, season);
    if (box.isConnected) crowdRenderLine(box, fresh, { ovr, tag });
  });
}
```

- [ ] **שלב 3: לכתוב את ה-CSS**

```css
/* css/crowd.css — דירוגי הקהל, בתוך כרטיס השחקן.
   נשאר בפלטה הכהה של האפליקציה. משטח לבן כאן נקרא כתקלת רינדור, לא כהדגשה —
   זה נאמר בפרויקט הזה שלוש פעמים. */

.crowd-line {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  font-size: 12px; color: #9aa4b2; line-height: 1.7;
}
.crowd-n   { opacity: .65; }
.crowd-you { color: #e6edf3; font-weight: 600; }
.crowd-tag { color: #cbd5e1; }

.crowd-open {
  margin-inline-start: auto;
  background: #1c2432; color: #9aa4b2;
  border: 1px solid #2b3648; border-radius: 999px;
  padding: 2px 10px; font: inherit; font-size: 11px; cursor: pointer;
}
.crowd-open:hover { background: #232d3d; color: #e6edf3; }

.crowd-panel { display: flex; flex-direction: column; gap: 8px; }

.crowd-dial-row { display: flex; align-items: center; gap: 10px; }
.crowd-dial { flex: 1; accent-color: #f0b429; }
.crowd-val {
  min-width: 34px; text-align: center;
  font-weight: 700; font-size: 15px; color: #f0b429;
}
.crowd-dial-note { font-size: 11px; color: #7d8695; }

.crowd-shelf { display: flex; flex-wrap: wrap; gap: 4px; }
.crowd-chip {
  background: #161c26; color: #9aa4b2;
  border: 1px solid #2b3648; border-radius: 999px;
  padding: 3px 8px; font: inherit; font-size: 11px; cursor: pointer;
}
.crowd-chip:hover { border-color: #3d4a61; color: #e6edf3; }
.crowd-chip.on {
  background: #2a2313; border-color: #f0b429; color: #f0b429;
}

.crowd-note-row { display: flex; gap: 6px; }
.crowd-note {
  flex: 1; min-width: 0;
  background: #0d1117; color: #e6edf3;
  border: 1px solid #2b3648; border-radius: 6px;
  padding: 4px 8px; font: inherit; font-size: 12px;
}
.crowd-note-send, .crowd-done {
  background: #1c2432; color: #e6edf3;
  border: 1px solid #2b3648; border-radius: 6px;
  padding: 4px 12px; font: inherit; font-size: 12px; cursor: pointer;
}
.crowd-done { align-self: flex-start; border-color: #f0b429; color: #f0b429; }
.crowd-note-hint { font-size: 11px; color: #7d8695; }
```

- [ ] **שלב 4: לוודא שה-harness עדיין עובר**

```bash
node scripts/sim/crowd_harness.js
```

צפוי: שתים-עשרה `PASS`, קוד 0.

- [ ] **שלב 5: קומיט**

```bash
git add js/crowd.js css/crowd.css
git commit -m "feat(crowd): the widget — one line at rest, a dial when asked"
```

---

## משימה 5: לחבר לכרטיס השחקן

**Files:**
- Modify: `js/player-card.js` (‎`pcPlayerFor` באזור 524, `pcHTML` ב-319, `pcShow` ב-467, `pcHide` ב-517)
- Modify: `index.html`

**החסם האמיתי:** אובייקט שחקן ב-`SQUADS` הוא `{name, position, ovr}` — **אין בו עונה**. העונה יושבת על הסגל. בלי להעביר אותה, אין על מה להצביע.

- [ ] **שלב 1: להוסיף `pcSquadFor`**

אחרי `pcPlayerFor` (‎`js/player-card.js:540`):

```js
// אחיו של pcPlayerFor: מאיזה סגל האיש הזה הגיע. השחקן עצמו לא יודע — העונה
// היא תכונה של הסגל, לא של השורה — ודירוגי הקהל הם על שחקן-בעונה.
function pcSquadFor(el) {
  if (el.classList.contains('player-card')) {
    return (typeof state !== 'undefined' && state.currentSquad) || null;
  }
  const idx = el.dataset ? el.dataset.idx : null;
  if (idx != null && typeof state !== 'undefined' && state.picks) {
    const pick = state.picks[+idx];
    return (pick && pick.squad) || null;
  }
  return null;
}
```

- [ ] **שלב 2: להעביר את הסגל דרך `pcShow` ו-`pcHTML`**

`pcHTML` ב-319 — לשנות את החתימה ולהוסיף את הבלוק לפני ההחזרה:

```js
function pcHTML(player, slotPos, squad) {
```

ובשורת ההחזרה (‎`return head + realBlock + tagBlock + partners + career;`):

```js
  /* מה שהדאטה לא יכולה לדעת */
  const crowd = (!classic && squad && typeof crowdBlock === 'function')
    ? crowdBlock(name, squad.season,
                 typeof player === 'object' && typeof playerPositions === 'function'
                   ? playerPositions(player)[0] : null,
                 typeof player === 'object' ? (player.ovr || 0) : 0)
    : '';

  return head + realBlock + crowd + tagBlock + partners + career;
```

`pcShow` ב-467:

```js
function pcShow(player, anchor, slotPos, modal, squad) {
```

ואחרי `el.innerHTML = …`:

```js
  el.innerHTML = (modal ? '<button class="pc-x" aria-label="סגור">✕</button>' : '') +
    pcHTML(player, slotPos, squad);
  if (typeof crowdMount === 'function') crowdMount(el);
```

- [ ] **שלב 3: לעדכן את ארבעת הקוראים**

`js/player-card.js:566`, `:599`, `:619` — כל אחד מוסיף `pcSquadFor(el)` כארגומנט חמישי:

```js
_pcTimer = setTimeout(() => pcShow(p, el, pcSlotOf(el), false, pcSquadFor(el)), 140);
```

```js
      pcShow(p, el, pcSlotOf(el), true, pcSquadFor(el));
```

```js
    if (p) pcShow(p, el, pcSlotOf(el), true, pcSquadFor(el));
```

- [ ] **שלב 4: לנעול את הסגירה בזמן הצבעה — עם דלת מילוט**

`pcHide` ב-517. **המנעול חייב לחסום רק סגירה מרומזת.** אם הוא חוסם גם את הדרכים המפורשות לסגור — Escape, ה-✕, לחיצה על הרקע — אז גרירה חיה הופכת כרטיס שאי אפשר לסגור, וזה גרוע יותר מהבאג שהמנעול בא למנוע:

```js
// force = סגירה מפורשת (Escape · ✕ · הרקע). רק סגירה מרומזת — mouseleave,
// גלילה — נחסמת בזמן הצבעה: גרירת החוגה יוצאת מגבולות הכרטיס דרך קבע, ובלי
// זה הפאנל שבור בשימוש רגיל בדסקטופ. אבל מנעול שחוסם גם את ה-✕ הופך את
// הכרטיס לכלוא, אז לשלוש הדרכים המפורשות יש דלת.
function pcHide(force) {
  if (!force && typeof crowdBusy === 'function' && crowdBusy()) return;
  clearTimeout(_pcTimer);
```

**זהירות: `pcHide` מועבר ישירות כמאזין אירועים** בשני מקומות (`x.addEventListener('click', pcHide)` ו-`b.addEventListener('click', pcHide)`), כלומר הוא מקבל את אובייקט ה-Event כארגומנט ראשון — שהוא truthy. זה במקרה נותן את ההתנהגות הרצויה, ובדיוק בגלל זה אסור להשאיר את זה ככה: זה עובד בטעות ויישבר ברגע שמישהו יקרא לפונקציה אחרת. לעטוף במפורש:

```js
if (x) x.addEventListener('click', () => pcHide(true));
```

```js
      b.addEventListener('click', () => pcHide(true));
```

ואת Escape (‎`js/player-card.js:619` בערך):

```js
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') pcHide(true); });
```

- [ ] **שלב 5: הקישור לעמוד המלא — ומבנה שלא נמחק**

מפרט §5.1. הכרטיס הוא המקום היחיד במשחק שכבר מדבר על שחקן מסוים, ולכן הוא הדרך הטבעית לעמוד שלו.

**הבעיה שצריך לפתור קודם:** `crowdRenderLine` ו-`crowdOpenPanel` מחליפים את `box.innerHTML` כולו. קישור שיושב ישירות בתוך `.pc-sec.crowd` יימחק על ידי `crowdMount` כמה מאות מילישניות אחרי שהכרטיס נפתח, ושוב בכל פתיחת פאנל — כלומר הוא יהיה גלוי רק בהבזק של "טוען…".

לכן `crowdBlock` מקבל מעטפת פנימית, והקישור הוא **אח שלה ולא צאצא**:

```js
function crowdBlock(name, season, pos, official) {
  if (!name || !season) return '';
  // .crowd-body הוא מה ש-crowdRenderLine ו-crowdOpenPanel מחליפים. כל דבר
  // שאמור לשרוד רינדור מחדש יושב מחוץ לו, כאן.
  return `
    <div class="pc-sec crowd" data-key="${crowdEsc(crowdKey(name))}"
         data-season="${crowdEsc(season)}" data-pos="${crowdEsc(pos || '')}"
         data-official="${parseInt(official, 10) || 0}">
      <div class="crowd-body"><div class="crowd-line">טוען…</div></div>
      <a class="crowd-full" href="/player/${encodeURIComponent(crowdSlug(name))}/"
         target="_blank" rel="noopener">העמוד המלא של ${crowdEsc(name)} ↗</a>
    </div>`;
}
```

ושתי פונקציות הרינדור כותבות ל-`.crowd-body` במקום ל-`box`. בראש כל אחת מהן:

```js
  const body = box.querySelector('.crowd-body') || box;
```

ואז `body.innerHTML = …` במקום `box.innerHTML = …`. ה-`|| box` הוא כדי שעמודי `/player/` (משימה 9) יוכלו להשתמש באותן פונקציות גם בלי המעטפת.

CSS ב-`css/crowd.css`:

```css
.crowd-full {
  display: inline-block; margin-top: 6px;
  font-size: 11px; color: #7d8695; text-decoration: none;
}
.crowd-full:hover { color: #f0b429; }
```

הקישור נבנה מ-`crowdSlug`, אותה פונקציה שמסך `👥 שחקנים` ו-`scripts/player_pages.js` משתמשים בה — משימה 10 שלב 3 היא הבדיקה שכולם באמת מסכימים. שים לב שה-href עובר `encodeURIComponent` בלבד ולא `crowdEsc` — הוא כבר בתוך מרכאות כפולות ו-`encodeURIComponent` מקודד גרשים ממילא.

- [ ] **שלב 5ב: לשורות המאושרות אין מסך**

`crowdNotes` נכתבה במשימה 3 ואף אחד לא קורא לה. מפרט §1 אומר ששורות מאושרות הופכות לתוכן אמיתי בכרטיס — בלי זה, כל מסלול המודרציה מוביל לשום מקום והבעלים מאשר טקסט שאיש לא יראה.

ב-`crowdMount`, לשלוף אותן יחד עם השאר:

```js
  const [row, mine, notes] = await Promise.all([
    crowdFetch(key, season), crowdFetchMine(key, season), crowdNotes(key, season),
  ]);
  if (!box.isConnected) return;
  crowdRenderLine(box, row, mine, notes);
```

ו-`crowdRenderLine` מוסיפה אותן מתחת לשורה. עד שלוש, וכלום כשאין:

```js
  const notesHtml = (notes && notes.length)
    ? `<div class="crowd-notes">${notes.map(nt =>
        `<div class="crowd-note-row-r">“${crowdEsc(nt.body)}”</div>`).join('')}</div>`
    : '';
```

```css
.crowd-notes { margin-top: 6px; display: flex; flex-direction: column; gap: 3px; }
.crowd-note-row-r { font-size: 11px; color: #9aa4b2; font-style: italic; }
```

`crowdOpenPanel` לא מציגה אותן — כשהפאנל פתוח המשתמש כותב, לא קורא.

- [ ] **שלב 6: לטעון את הקבצים החדשים**

ב-`index.html`, ליד `<script src="js/player-card.js…">` ואחריו:

```html
  <script src="js/crowd.js"></script>
```

ובראש, עם שאר גיליונות הסגנון:

```html
  <link rel="stylesheet" href="css/crowd.css">
```

ואז חותמת מטמון, כמו בכל שינוי נכס בפרויקט:

```bash
node scripts/stamp_assets.js
```

- [ ] **שלב 7: קומיט**

```bash
git add js/player-card.js js/crowd.js css/crowd.css index.html
git commit -m "feat(crowd): the card learns which season it is looking at"
```

---

## משימה 6: אימות בדפדפן — שלושה מצבים

**Files:** אין. אימות בלבד, לפי `.claude/skills/verify`.

**למה שלושה:** דרייבר שזורע מצב בודק את המצב שדמיינת, לא את המצב שמבקר אמיתי נוחת בו. בפרויקט הזה זה כבר הקפיא את הגאונטלט בקליק הראשון. כאן המצב הריק הוא **המצב הרגיל בשבועות הראשונים**, אז הוא נבדק ראשון.

- [ ] **שלב 1: להעתיק לסקראצ'פאד ולהחליף את לקוח Supabase בבדל**

```bash
SP="C:/Users/avich/AppData/Local/Temp/claude/c--Users-avich-Desktop-Claude-Project-Two-36-0/fe49c3f9-74a6-4f1f-af6a-61bb1515735e/scratchpad"
rm -rf "$SP/crowd" && mkdir -p "$SP/crowd"
cp -r "c:/Users/avich/Desktop/Claude/Project Two/36-0/." "$SP/crowd/"
rm -rf "$SP/crowd/.git"
```

ואז לכתוב `$SP/crowd/js/supabase-client.js`:

```js
// בדל אימות — לא נכנס לריפו. מחזיר את התרחיש שנבחר ב-?crowd=
const _p = new URLSearchParams(location.search);
const _scn = _p.get('crowd') || 'empty';
const _rows = {
  empty: null,
  few:   { n: 3 },
  shown: { n: 38, avg_trimmed: 82, tag_top: 'set_piece', tag_top_n: 21 },
};
const _mine = _p.get('mine') ? { ovr: 86, tag: 'leader' } : null;
const _chain = (val) => ({
  select: () => _chain(val), eq: () => _chain(val), order: () => _chain(val),
  limit: () => Promise.resolve({ data: [], error: null }),
  maybeSingle: () => Promise.resolve({ data: val, error: null }),
});
const _supabase = {
  from: () => _chain(_rows[_scn]),
  rpc: (fn) => Promise.resolve({
    data: fn === 'my_player_vote' ? { vote: _mine } : { ok: true }, error: null }),
  auth: { getSession: () => Promise.resolve({ data: { session: null } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  channel: () => ({ on: () => ({ subscribe() {} }), subscribe() {} }),
};
function getCurrentUser() { return _p.get('in') ? { id: 'u', email: 'a@b.c' } : null; }
```

- [ ] **שלב 2: לשרת על פורט חדש ולוודא שהוא באמת שלנו**

פורטים ישנים נשארים תפוסים מסשנים קודמים; שרת שני נכשל בשקט וכל בקשה הולכת לישן.

```bash
cd "$SP/crowd" && python -m http.server 8934 &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8934/js/crowd.js
```

צפוי: `200`. כל דבר אחר = שורש שגוי, לעצור ולתקן לפני שמריצים דפדפן.

- [ ] **שלב 3: להוסיף דרייבר שמגיע לכרטיס פתוח**

אין תמיכה בקליקים בצילום headless, אז מוסיפים דרייבר לפני `</body>` ב-`$SP/crowd/index.html`:

```html
<script>
// לפתוח דראפט ואז לפתוח כרטיס שחקן על השחקן הראשון בסגל שהוגרל.
setTimeout(() => { try { startGame(); } catch (e) {} }, 300);
setTimeout(() => {
  try {
    const sq = state.currentSquad;
    pcShow(sq.players[0], document.querySelector('.player-card'), 'ST', true, sq);
  } catch (e) {
    document.body.insertAdjacentHTML('beforeend',
      '<pre id="drv">driver failed: ' + e.message + '</pre>');
  }
}, 1800);
</script>
```

- [ ] **שלב 4: להריץ את שלושת המצבים**

```bash
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
cd "$SP/crowd"
for S in empty few shown; do
  rm -rf prof
  timeout 120 "$CH" --headless=new --disable-gpu \
    --user-data-dir="$(cygpath -w "$PWD/prof")" --no-first-run \
    --virtual-time-budget=12000 --window-size=430,2200 \
    --screenshot="$(cygpath -w "$PWD/shot-$S.png")" \
    "http://127.0.0.1:8934/index.html?crowd=$S&in=1"
done
ls -la shot-*.png
```

צפוי: שלוש שורות `NNNNN bytes written to file` ושלושה קבצים לא ריקים. **קובץ חסר = הדפדפן לא רץ בכלל — לא להתחיל לנפות את העמוד.**

- [ ] **שלב 5: להסתכל בשלוש התמונות**

לפתוח את `shot-empty.png`, `shot-few.png` ו-`shot-shown.png` בכלי Read — אחת אחת, ולהסתכל בהן בפועל. הדרייבר פותח את הכרטיס כ-`modal`, כלומר הוא ממורכז ולא עוגן לקצה, אז אין מה לחתוך.

**"זה מרונדר" זה לא "זה נראה נכון".** בפרויקט הזה סקיני התקופה נבדקו במשך ימים מול סלקטור שלא היה קיים במסך האמיתי, ואף אחד לא באמת הסתכל. להשוות מול הטבלה למטה שורה-שורה.

מה חייב להיות נכון בכל אחת:

| תרחיש | מה חייב להופיע |
|---|---|
| `empty` | `עוד אין דעות עליו — תהיה הראשון` + כפתור `דרג`. **לא** "טוען…" ולא שורה ריקה |
| `few` | `עוד 2 הצבעות והדירוג ייחשף`. **שום מספר דירוג** |
| `shown` | `דירוג קהל ממוצע 82 ⟨38⟩ · 🎯 בעיטות נייחות` |

ובכל השלוש: הרקע כהה, בלי משטח לבן, והכרטיס לא נחתך.

- [ ] **שלב 6: לבדוק את הפאנל הפתוח ואת הנעילה**

להוסיף לדרייבר, ולהריץ שוב עם `crowd=shown`:

```html
<script>
setTimeout(() => { try { document.querySelector('.crowd-open').click(); } catch (e) {} }, 2600);
setTimeout(() => {
  const d = document.querySelector('.crowd-dial');
  if (d) d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  pcHide();   // חייב להיבלע — יד על החוגה
  document.body.insertAdjacentHTML('beforeend',
    '<pre id="lock">card display=' + document.getElementById('pcard').style.display + '</pre>');
}, 3200);
</script>
```

```bash
rm -rf prof
timeout 120 "$CH" --headless=new --disable-gpu \
  --user-data-dir="$(cygpath -w "$PWD/prof")" --no-first-run \
  --virtual-time-budget=12000 --dump-dom \
  "http://127.0.0.1:8934/index.html?crowd=shown&in=1" | grep -o 'card display=[a-z]*'
```

צפוי: `card display=block`. `none` פירושו שהנעילה לא עובדת והפאנל ייסגר באמצע גרירה.

- [ ] **שלב 7: לרשום את התוצאה**

אין כאן קומיט — לא נגענו בריפו. לדווח מה שלוש התמונות הראו, כולל מה שלא נראה טוב.

---

## משימה 7: סקשן הדשבורד

**Files:**
- Create: `js/crowd-admin.js`
- Modify: `admin.html`

- [ ] **שלב 1: להוסיף RPC לדשבורד למיגרציה**

הטבלה צריכה להצטלב עם הדירוג הרשמי, שחי ב-`js/data.js` ולא במסד. לכן ה-RPC מחזיר את ההצבר, והלקוח מצליב מול `SQUADS` שכבר טעון אצלו.

להוסיף בסוף `supabase/migrations/20260914000001_crowd_ratings.sql`:

```sql
-- ── תור המחלוקות לדשבורד ────────────────────────────────────────────────────
-- מחזיר את כל מי שיש עליו מספיק הצבעות, פחות מה שנדחה ולא צבר הצבעות מאז.
-- ההצלבה מול הדירוג הרשמי נעשית בלקוח: data.js לא קיים במסד.
CREATE OR REPLACE FUNCTION crowd_queue()
RETURNS TABLE (player_key text, season text, n int, avg_trimmed smallint,
               tag_top text, tag_top_n int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.player_key, c.season, c.n, c.avg_trimmed, c.tag_top, c.tag_top_n
    FROM crowd_ratings c
    LEFT JOIN rating_dismissals d
      ON d.player_key = c.player_key AND d.season = c.season
   WHERE c.avg_trimmed IS NOT NULL            -- מתחת ל-5 הצבעות אין על מה להחליט
     AND (d.player_key IS NULL OR c.n > d.at_votes)
   ORDER BY c.n DESC
   LIMIT 500;
$$;

REVOKE ALL ON FUNCTION crowd_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crowd_queue() TO authenticated;

-- ── פעולות הבעלים ───────────────────────────────────────────────────────────
-- is_site_admin() כבר קיים בסכימה ומשמש את שאר הדשבורד.
CREATE OR REPLACE FUNCTION approve_rating(
  p_player_key text, p_season text, p_old smallint, p_new smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_n int;
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  -- avg_trimmed IS NOT NULL הוא הבדיקה האמיתית: n לבדו יוצא גם על הצבעה אחת
  -- מאז שה-VIEW הפסיק לסנן, ואישור על הצבעה אחת הוא בדיוק מה שהסף נועד למנוע.
  SELECT n INTO v_n FROM crowd_ratings
   WHERE player_key = p_player_key AND season = p_season AND avg_trimmed IS NOT NULL;
  IF v_n IS NULL THEN RETURN jsonb_build_object('error', 'not enough votes'); END IF;

  INSERT INTO rating_approvals (player_key, season, old_ovr, new_ovr, votes)
  VALUES (p_player_key, p_season, p_old, p_new, v_n)
  ON CONFLICT (player_key, season) WHERE applied_at IS NULL
  DO UPDATE SET new_ovr = EXCLUDED.new_ovr, votes = EXCLUDED.votes;

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION approve_rating(text, text, smallint, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_rating(text, text, smallint, smallint) TO authenticated;

CREATE OR REPLACE FUNCTION dismiss_rating(p_player_key text, p_season text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_n int;
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  SELECT n INTO v_n FROM crowd_ratings
   WHERE player_key = p_player_key AND season = p_season;
  INSERT INTO rating_dismissals (player_key, season, at_votes)
  VALUES (p_player_key, p_season, COALESCE(v_n, 0))
  ON CONFLICT (player_key, season) DO UPDATE SET at_votes = EXCLUDED.at_votes;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION dismiss_rating(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dismiss_rating(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION moderate_note(p_id bigint, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_site_admin() THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('error', 'bad status');
  END IF;
  UPDATE player_notes SET status = p_status WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION moderate_note(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION moderate_note(bigint, text) TO authenticated;

CREATE OR REPLACE FUNCTION notes_queue()
RETURNS TABLE (id bigint, player_key text, season text, username text,
               body text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT nt.id, nt.player_key, nt.season, p.username, nt.body, nt.created_at
    FROM player_notes nt
    JOIN profiles p ON p.id = nt.user_id
   WHERE nt.status = 'pending' AND is_site_admin()
   ORDER BY nt.created_at ASC
   LIMIT 200;
$$;

REVOKE ALL ON FUNCTION notes_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION notes_queue() TO authenticated;
```

**השער הוא `is_site_admin()`, ולא `is_admin()`.** הוא מוגדר ב-`supabase/migrations/20260824000001_usage_events.sql:37` ומשמש כבר את כל סקשני הדשבורד. לאמת לפני שכותבים:

```bash
grep -rn "is_site_admin" supabase/migrations/ | head -3
```

צפוי: התאמות ב-`20260824000001_usage_events.sql` וב-`20260824000002_usage_grants.sql`. **לא להמציא שער חדש** — שני שערים שנפרדים פירושם סקשן אחד בדשבורד שנפתח למי שהשני חוסם.

- [ ] **שלב 2: לכתוב את `js/crowd-admin.js`**

```js
// ─── ⭐ דירוגי הקהל — הדשבורד ────────────────────────────────────────────────
// הקהל מצביע, כאן מחליטים. "קבל" לא נוגע במשחק: הוא רושם שורה ב-
// rating_approvals, ו-scripts/apply_crowd_ratings.js הוא זה שכותב ל-data.js.

const CA_MIN_GAP = 2;

// מפתח → { ovr, season, teamId } מתוך SQUADS. אותו נרמול כמו crowdKey, אחרת
// ההצלבה מפספסת בדיוק את השחקנים עם גרש בשם.
let _caIndex = null;
function caIndex() {
  if (_caIndex) return _caIndex;
  const m = new Map();
  SQUADS.forEach(sq => sq.players.forEach(p => {
    m.set(crowdKey(p.name) + '|' + sq.season, { ovr: p.ovr, teamId: sq.teamId });
  }));
  return (_caIndex = m);
}

function caEsc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function caLoadRatings() {
  const body = document.getElementById('ca-rows');
  body.innerHTML = '<tr><td colspan="9">טוען…</td></tr>';
  const { data, error } = await _supabase.rpc('crowd_queue');
  if (error) { body.innerHTML = '<tr><td colspan="9">שגיאה בטעינה</td></tr>'; return; }

  const idx = caIndex();
  const rows = (data || []).map(r => {
    const rec = idx.get(r.player_key + '|' + r.season);
    if (!rec) return null;                       // שחקן-עונה שכבר לא בדאטה
    if (r.avg_trimmed == null) return null;      // פחות מ-5 הצבעות: אין דירוג קהל
    const gap = r.avg_trimmed - rec.ovr;
    if (Math.abs(gap) < CA_MIN_GAP) return null;
    return { ...r, official: rec.ovr, teamId: rec.teamId, gap,
             weight: Math.abs(gap) * Math.log(r.n) };
  }).filter(Boolean).sort((a, b) => b.weight - a.weight);

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="9">אין מחלוקות פתוחות.</td></tr>';
    return;
  }

  body.innerHTML = rows.map(r => `
    <tr data-key="${caEsc(r.player_key)}" data-season="${caEsc(r.season)}"
        data-old="${r.official}" data-new="${r.avg_trimmed}">
      <td>${caEsc(r.player_key)}</td>
      <td>${caEsc(r.season)}</td>
      <td>${caEsc(TEAMS[r.teamId] ? TEAMS[r.teamId].name : r.teamId)}</td>
      <td dir="ltr">${r.official}</td>
      <td dir="ltr">${r.avg_trimmed}</td>
      <td dir="ltr">${r.gap > 0 ? '+' : ''}${r.gap}</td>
      <td dir="ltr">${r.n}</td>
      <td>${r.tag_top ? `${CROWD_TAGS[r.tag_top].icon} ${caEsc(CROWD_TAGS[r.tag_top].label)} (${r.tag_top_n})` : '—'}</td>
      <td><button class="ca-ok">✅</button> <button class="ca-no">🗑️</button></td>
    </tr>`).join('');
}

async function caLoadNotes() {
  const body = document.getElementById('ca-notes');
  const { data, error } = await _supabase.rpc('notes_queue');
  if (error) { body.innerHTML = '<tr><td colspan="5">שגיאה בטעינה</td></tr>'; return; }
  if (!data || !data.length) { body.innerHTML = '<tr><td colspan="5">אין הערות ממתינות.</td></tr>'; return; }
  body.innerHTML = data.map(nt => `
    <tr data-id="${nt.id}">
      <td>${caEsc(nt.player_key)}</td>
      <td>${caEsc(nt.season)}</td>
      <td>${caEsc(nt.username)}</td>
      <td>${caEsc(nt.body)}</td>
      <td><button class="ca-note-ok">✅</button> <button class="ca-note-no">🗑️</button></td>
    </tr>`).join('');
}

function caInit() {
  const sec = document.getElementById('ca-section');
  if (!sec) return;

  document.getElementById('ca-rows').addEventListener('click', async ev => {
    const tr = ev.target.closest('tr'); if (!tr) return;
    const args = { p_player_key: tr.dataset.key, p_season: tr.dataset.season };
    if (ev.target.classList.contains('ca-ok')) {
      await _supabase.rpc('approve_rating', {
        ...args, p_old: +tr.dataset.old, p_new: +tr.dataset.new });
      tr.remove();
    } else if (ev.target.classList.contains('ca-no')) {
      await _supabase.rpc('dismiss_rating', args);
      tr.remove();
    }
  });

  document.getElementById('ca-notes').addEventListener('click', async ev => {
    const tr = ev.target.closest('tr'); if (!tr) return;
    const ok = ev.target.classList.contains('ca-note-ok');
    const no = ev.target.classList.contains('ca-note-no');
    if (!ok && !no) return;
    await _supabase.rpc('moderate_note', {
      p_id: +tr.dataset.id, p_status: ok ? 'approved' : 'rejected' });
    tr.remove();
  });

  caLoadRatings();
  caLoadNotes();
}
```

- [ ] **שלב 3: להוסיף את הסקשן ל-`admin.html`**

אחרי סקשן `📣 תור פוסטים לאישור` (סביב שורה 265):

```html
    <h2 style="margin-top:34px">⭐ דירוגי הקהל</h2>
    <div id="ca-section">
      <p style="color:#7d8695;font-size:13px">
        מיון לפי עוצמת המחלוקת כפול מספר המצביעים. "קבל" רושם אישור בלבד —
        המשחק משתנה רק כשמריצים <code>node scripts/apply_crowd_ratings.js</code>.
      </p>
      <table class="admin-table">
        <thead><tr>
          <th>שחקן</th><th>עונה</th><th>מועדון</th><th>רשמי</th>
          <th>קהל</th><th>פער</th><th>הצבעות</th><th>תגית מובילה</th><th></th>
        </tr></thead>
        <tbody id="ca-rows"><tr><td colspan="9">טוען…</td></tr></tbody>
      </table>

      <h3 style="margin-top:22px">📝 שורות ממתינות לאישור</h3>
      <p style="color:#7d8695;font-size:13px">
        שורה לא מוצגת בשום מקום לפני אישור. אלה בני אדם אמיתיים.
      </p>
      <table class="admin-table">
        <thead><tr><th>שחקן</th><th>עונה</th><th>מאת</th><th>הטקסט</th><th></th></tr></thead>
        <tbody id="ca-notes"><tr><td colspan="5">טוען…</td></tr></tbody>
      </table>
    </div>
```

ותגי script — `crowd.js` נדרש כי `crowd-admin.js` משתמש ב-`crowdKey` וב-`CROWD_TAGS`:

```html
  <script src="js/crowd.js"></script>
  <script src="js/crowd-admin.js"></script>
```

ולקרוא ל-`caInit()` באותו מקום שבו שאר הסקשנים מאותחלים.

- [ ] **שלב 4: לאמת את הפאנל offline**

`admin.html` חסום מאחורי `session.user.email`, אז headless מרנדר כלום. לפי `.claude/skills/verify` §3 — להחליף את `js/supabase-client.js` בעותק שבסקראצ'פאד בבדל שמחזיר את אימייל הבעלים, ולהזין שורות דמה:

```js
// בסקראצ'פאד בלבד
const _supabase = {
  auth: { getSession: () => Promise.resolve({ data: { session: { user: { email: 'avichaiy0610@outlook.com' } } } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) }),
  rpc: (fn) => Promise.resolve({
    data: fn === 'crowd_queue'
      ? [{ player_key: 'אלון מזרחי', season: '1999/00', n: 41, avg_trimmed: 92,
           tag_top: 'big_games', tag_top_n: 25 },
         { player_key: 'אסי דומב', season: '1999/00', n: 7, avg_trimmed: 85,
           tag_top: null, tag_top_n: null }]
      : fn === 'notes_queue'
      ? [{ id: 1, player_key: 'אלון מזרחי', season: '1999/00', username: 'dani',
           body: 'הכי טוב שראיתי בליגה', created_at: '2026-09-14' }]
      : { ok: true },
    error: null }),
  channel: () => ({ on: () => ({ subscribe() {} }), subscribe() {} }),
};
function getCurrentUser() { return { id: 'u', email: 'avichaiy0610@outlook.com' }; }
```

```bash
cd "$SP/crowd" && rm -rf prof
timeout 120 "$CH" --headless=new --disable-gpu \
  --user-data-dir="$(cygpath -w "$PWD/prof")" --no-first-run \
  --virtual-time-budget=12000 --window-size=1200,2600 \
  --screenshot="$(cygpath -w "$PWD/shot-admin.png")" \
  "http://127.0.0.1:8934/admin.html"
```

שתי השורות בבדל נבחרו כדי לבדוק את הסינון בשני הכיוונים, מול הדירוגים האמיתיים ב-[data.js:197](js/data.js#L197) ו-[data.js:201](js/data.js#L201):

| שחקן | רשמי | קהל | פער | מה חייב לקרות |
|---|---|---|---|---|
| אלון מזרחי | 88 | 92 | ‎+4 | **מופיע** — מעל סף 2 |
| אסי דומב | 84 | 85 | ‎+1 | **נעלם** — מתחת לסף |

צפוי בתמונה: שתי טבלאות, ובטבלת הדירוגים **שורה אחת בלבד**. אם אסי דומב מופיע — `CA_MIN_GAP` לא נאכף, והתור יתמלא ברעש. אם אלון מזרחי חסר — ההצלבה מול `SQUADS` מפספסת, וכנראה `crowdKey` בצד הדשבורד לא מסכים עם זה שבצד הלקוח.

- [ ] **שלב 5: קומיט**

```bash
git add js/crowd-admin.js admin.html supabase/migrations/20260914000001_crowd_ratings.sql
git commit -m "feat(crowd): the dashboard — disagreements ranked, notes moderated"
```

---

## משימה 8: `scripts/apply_crowd_ratings.js`

**Files:**
- Create: `scripts/apply_crowd_ratings.js`

זה הקובץ שמשנה את המשחק בפועל. הוא היחיד שנוגע ב-`js/data.js`.

- [ ] **שלב 1: לכתוב את הסקריפט**

```js
#!/usr/bin/env node
// ─── דירוגי קהל מאושרים → js/data.js ────────────────────────────────────────
//
// אותו דפוס שבו כימיה, תגיות ותכונות כבר נשלחות: דאטה נוצרת מחוץ לזמן ריצה.
// הסימולציה נשארת דטרמיניסטית ואופליין, ואין מצב שכשל רשת מזיז איזון או לוחות.
//
//   node scripts/apply_crowd_ratings.js            # מראה מה ישתנה
//   node scripts/apply_crowd_ratings.js --write    # כותב באמת
//
// דורש SUPABASE_URL ו-SUPABASE_SERVICE_KEY בסביבה.

const fs   = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const ROOT  = path.join(__dirname, '..');
const DATA  = path.join(ROOT, 'js', 'data.js');
const LOG   = path.join(ROOT, 'crowd_ratings_log.csv');

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) {
  console.error('חסר SUPABASE_URL או SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// אותו נרמול כמו crowdKey ב-js/crowd.js ו-pcNorm ב-js/player-card.js.
// שלושתם חייבים להסכים; אחרת ההצלבה מפספסת בדיוק את השמות עם גרש.
function norm(s) {
  return String(s ?? '')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[\u05f3\u2019`\u00b4']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function pending() {
  const r = await fetch(
    `${URL}/rest/v1/rating_approvals?applied_at=is.null&select=id,player_key,season,old_ovr,new_ovr,votes`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`REST ${r.status}`);
  return r.json();
}

async function markApplied(ids) {
  const r = await fetch(`${URL}/rest/v1/rating_approvals?id=in.(${ids.join(',')})`, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`,
               'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ applied_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`PATCH ${r.status}`);
}

// ── עריכת data.js ────────────────────────────────────────────────────────────
// עורכים טקסט ולא AST: הקובץ נכתב ביד, והכתיבה מחדש שלו דרך מפרסר הייתה
// מוחקת הערות וסדר ששווים יותר מהנוחות. העוגן הוא השורה של אותו שחקן בתוך
// גוש הסגל של אותה עונה, ושינוי מוחל רק כשנמצאה בדיוק התאמה אחת.
function applyOne(src, playerKey, season, newOvr) {
  const sqRe = new RegExp(`season:\\s*'${season.replace('/', '\\/')}',\\s*\\n\\s*players:\\s*\\[`, 'g');
  let m, out = null, count = 0;
  while ((m = sqRe.exec(src))) {
    const start = m.index + m[0].length;
    const end = src.indexOf('\n    ],', start);
    if (end < 0) continue;
    const block = src.slice(start, end);
    const lines = block.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const nm = /name:\s*'((?:[^'\\]|\\.)*)'/.exec(lines[i]);
      if (!nm) continue;
      if (norm(nm[1].replace(/\\'/g, "'")) !== playerKey) continue;
      if (!/\bovr:\s*\d+/.test(lines[i])) continue;
      count++;
      const fixed = lines[i].replace(/\bovr:\s*\d+/, `ovr: ${newOvr}`);
      out = src.slice(0, start) + [...lines.slice(0, i), fixed, ...lines.slice(i + 1)].join('\n') +
            src.slice(end);
    }
  }
  if (count !== 1) return { src, ok: false, why: count === 0 ? 'לא נמצא' : `נמצא ${count} פעמים` };
  return { src: out, ok: true };
}

// peak_ovr חייב להיות לפחות ה-ovr הגבוה ביותר של אותו אדם. דירוג שעלה מעל
// השיא הרשום הופך את השיא לשקר, והכרטיס מציג שני מספרים סותרים.
function fixPeaks(src) {
  const best = new Map();
  const line = /name:\s*'((?:[^'\\]|\\.)*)'[^\n]*?\bovr:\s*(\d+)/g;
  let m;
  while ((m = line.exec(src))) {
    const k = norm(m[1].replace(/\\'/g, "'"));
    best.set(k, Math.max(best.get(k) || 0, +m[2]));
  }
  let fixed = 0;
  const out = src.replace(
    /(name:\s*'((?:[^'\\]|\\.)*)'[^\n]*?\bovr:\s*\d+[^\n]*?\bpeak_ovr:\s*)(\d+)/g,
    (all, head, rawName, peak) => {
      const want = best.get(norm(rawName.replace(/\\'/g, "'"))) || +peak;
      if (want <= +peak) return all;
      fixed++;
      return head + want;
    });
  return { src: out, fixed };
}

(async () => {
  const rows = await pending();
  if (!rows.length) { console.log('אין אישורים ממתינים.'); return; }

  let src = fs.readFileSync(DATA, 'utf8');
  const done = [], skipped = [];

  for (const r of rows) {
    const res = applyOne(src, norm(r.player_key), r.season, r.new_ovr);
    if (!res.ok) { skipped.push({ ...r, why: res.why }); continue; }
    src = res.src;
    done.push(r);
  }

  const peaks = fixPeaks(src);
  src = peaks.src;

  console.log(`הוחלו ${done.length} · דולגו ${skipped.length} · peak_ovr תוקן ב-${peaks.fixed}`);
  skipped.forEach(s => console.log(`  דולג: ${s.player_key} ${s.season} — ${s.why}`));
  done.forEach(d => console.log(`  ${d.player_key} ${d.season}: ${d.old_ovr} → ${d.new_ovr} (${d.votes} הצבעות)`));

  if (!WRITE) { console.log('\nיבש. להרצה אמיתית: --write'); return; }
  if (!done.length) return;

  fs.writeFileSync(DATA, src);
  const head = fs.existsSync(LOG) ? '' : 'when,player,season,old,new,votes\n';
  fs.appendFileSync(LOG, head + done.map(d =>
    `${new Date().toISOString()},"${d.player_key}",${d.season},${d.old_ovr},${d.new_ovr},${d.votes}`
  ).join('\n') + '\n');
  await markApplied(done.map(d => d.id));
  console.log(`\nנכתב ל-${DATA}. להריץ node scripts/stamp_assets.js ולקמט.`);
})().catch(e => { console.error(e.message); process.exit(1); });
```

- [ ] **שלב 2: לבדוק את העריכה על מחרוזת, בלי מסד ובלי לגעת בקובץ**

הסכנה האמיתית כאן היא עריכה שתופסת את השחקן הלא נכון או את העונה הלא נכונה. זה נבדק ישירות:

```bash
cd "c:/Users/avich/Desktop/Claude/Project Two/36-0"
node -e "
const m = require('./scripts/apply_crowd_ratings.js');
" 2>/dev/null || node --input-type=commonjs -e "
const fs=require('fs');
const src=fs.readFileSync('js/data.js','utf8');
// אלון מזרחי, 1999/00, ovr 88 → 92
const before=(src.match(/name: 'אלון מזרחי', position: 'ST', ovr: 88/g)||[]).length;
console.log('lines matching before:', before);
"
```

צפוי: `lines matching before: 1`. אם יותר מאחד — העוגן לא ייחודי וצריך להדק את הביטוי לפני שממשיכים.

ואז הרצה יבשה מלאה, שדורשת מסד:

```bash
node scripts/apply_crowd_ratings.js
```

צפוי בלי אישורים ממתינים: `אין אישורים ממתינים.` ו-`js/data.js` **לא משתנה**:

```bash
git diff --stat js/data.js
```

צפוי: פלט ריק.

- [ ] **שלב 3: קומיט**

```bash
git add scripts/apply_crowd_ratings.js
git commit -m "feat(crowd): approved ratings ship through data.js, not at runtime"
```

---

## משימה 9: עמודי `/player/` — ווידג'ט וחיפוש

**Files:**
- Modify: `scripts/player_pages.js`

היום העמודים סטטיים לגמרי חוץ מ-AdSense, וכל אחד מהם הוא מבוי סתום. זה החלק הכבד ביותר בבנייה והיחיד שאפשר לדחות בלי לפגוע בשאר.

- [ ] **שלב 0: לאתר את השמות האמיתיים בגנרטור**

הצעדים הבאים מתייחסים לעונה הטובה ביותר של השחקן, לעמדה ולדירוג שלו. ל-`scripts/player_pages.js` כבר יש את שלושתם כדי לבנות את טבלת הקריירה — **בשמות משלו.** לאתר אותם לפני שכותבים שורה:

```bash
cd "c:/Users/avich/Desktop/Claude/Project Two/36-0"
grep -n "peak\|best\|ovr\|position\|slug\|function " scripts/player_pages.js | head -40
```

לרשום כאן את שלושת השמות בפועל, ולהשתמש בהם בהמשך במקום ב-`bestSeason` / `bestOvr` / `pos` שמופיעים למטה כמצייני מקום קריאים. **אם הגנרטור בונה slug אחרת מ-`crowdSlug` — זה הרגע לאחד, לא אחרי שמייצרים 1,570 עמודים.**

- [ ] **שלב 1: להזריק את הסקריפטים לתבנית**

ב-`scripts/player_pages.js`, ליד תג ה-AdSense (שורה 322 בערך), להוסיף לפני `</body>`:

```js
  `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="/js/config.js"></script>
   <script src="/js/supabase-client.js"></script>
   <script src="/js/crowd.js"></script>
   <link rel="stylesheet" href="/css/crowd.css">
   <script>
     // עמוד שחקן מדרג את העונה הטובה ביותר שלו — זו העונה שהעמוד עצמו מציג
     // בראש. אין כאן דראפט ואין סגל נוכחי, אז אין עונה "שמולך".
     document.addEventListener('DOMContentLoaded', () => crowdMount(document));
   </script>`
```

ובגוף העמוד, אחרי טבלת הקריירה:

```js
  `<section class="pp-crowd">
     <h2>מה הקהל אומר</h2>
     ${crowdBlockMarkup(name, bestSeason, pos, bestOvr)}
   </section>`
```

כאשר `crowdBlockMarkup` היא העתק-שרת של `crowdBlock` — הגנרטור רץ ב-Node ואין לו גישה ל-`js/crowd.js` שנטען בדפדפן. לייבא אותו במקום להעתיק:

```js
// בראש scripts/player_pages.js
const crowd = (() => {
  const vm = require('vm');
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(require('fs').readFileSync(
    require('path').join(__dirname, '..', 'js', 'crowd.js'), 'utf8'), ctx);
  return ctx;
})();
// ואז: crowd.crowdBlock(name, season, pos, ovr)
```

זה גם מבטיח שהשרת והלקוח לעולם לא ייפרדו — יש מימוש אחד.

- [ ] **שלב 2: להוסיף חיפוש בתחתית כל עמוד**

```js
  `<section class="pp-more">
     <h2>עוד שחקנים</h2>
     <input id="pp-q" placeholder="חפש שחקן…" autocomplete="off">
     <ul id="pp-res"></ul>
     <script>
       // רשימת השמות מוטבעת: 1,570 עמודים סטטיים ואין שרת שיענה על שאילתה.
       const PP_ALL = ${JSON.stringify(allSlugs)};
       const q = document.getElementById('pp-q'), res = document.getElementById('pp-res');
       q.addEventListener('input', () => {
         const v = q.value.trim();
         res.innerHTML = !v ? '' : PP_ALL
           .filter(([n]) => n.includes(v)).slice(0, 12)
           .map(([n, s]) => '<li><a href="/player/' + s + '/">' + n + '</a></li>').join('');
       });
     </script>
   </section>`
```

**לבדוק את המשקל לפני שמקבעים.** 2,721 שמות ועוד slug כפול 1,570 עמודים זה נפח אמיתי:

```bash
node -e "
const PP=require('./scripts/player_pages.js');
console.log('inline bytes:', JSON.stringify(PP.allSlugs ? PP.allSlugs() : []).length);
"
```

אם זה עובר ~60KB לעמוד — להחליף ברשימה חיצונית אחת (`/player/index.json`) שנטענת ב-fetch, במקום הטבעה בכל עמוד.

- [ ] **שלב 3: לייצר מחדש ולבדוק עמוד אחד באמת**

```bash
cd "c:/Users/avich/Desktop/Claude/Project Two/36-0"
node scripts/player_pages.js
ls player | wc -l
```

צפוי: אותו מספר כמו קודם או יותר (1,570+).

```bash
cd "$SP/crowd" 2>/dev/null || cd "c:/Users/avich/Desktop/Claude/Project Two/36-0"
python -m http.server 8935 &
sleep 2
curl -s "http://127.0.0.1:8935/player/אלון-מזרחי/" | grep -c "crowd"
```

צפוי: מספר גדול מ-0.

ואז צילום:

```bash
rm -rf prof
timeout 120 "$CH" --headless=new --disable-gpu \
  --user-data-dir="$(cygpath -w "$PWD/prof")" --no-first-run \
  --virtual-time-budget=12000 --window-size=430,3000 \
  --screenshot="$(cygpath -w "$PWD/shot-player.png")" \
  "http://127.0.0.1:8935/player/אלון-מזרחי/"
```

צפוי בתמונה: סקשן "מה הקהל אומר" עם המצב הריק, וחיפוש בתחתית. **Supabase נכשל כאן בשקט — זה אימות אמיתי של הנתיב האופליין**, והמצב הריק חייב להיראות טוב גם ככה.

- [ ] **שלב 4: קומיט**

```bash
cd "c:/Users/avich/Desktop/Claude/Project Two/36-0"
git add scripts/player_pages.js player sitemap.xml
git commit -m "feat(crowd): the public player pages stop being a dead end"
```

---

## משימה 10: מסך `👥 שחקנים`

**Files:**
- Create: `js/players-index.js`, `css/players-index.css`
- Modify: `index.html`

`js/nav-drawer.js` מתעד שסרגל הנייד לא מחזיק חמישה מודים — אבל המגירה פתרה בדיוק את זה, וכפתור שישי בתוכה תקין.

- [ ] **שלב 1: לכתוב את המסך**

```js
// ─── 👥 שחקנים ───────────────────────────────────────────────────────────────
// 1,570 עמודי שחקן היו מגיעים רק מגוגל. זה השער אליהם מתוך האתר.

let _piIndex = null;
function piIndex() {
  if (_piIndex) return _piIndex;
  const m = new Map();
  SQUADS.forEach(sq => sq.players.forEach(p => {
    const k = crowdKey(p.name);
    const cur = m.get(k);
    if (!cur || p.ovr > cur.ovr) m.set(k, { name: p.name, ovr: p.ovr, season: sq.season });
  }));
  return (_piIndex = [...m.values()].sort((a, b) => b.ovr - a.ovr));
}

// ה-slug מגיע מ-crowdSlug ב-js/crowd.js. מימוש שני כאן היה נפרד מהראשון
// בשקט ביום שבו מישהו יגע באחד מהם, וכל קישור במסך יוביל ל-404.

function piEsc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function piRender(q) {
  const list = piIndex();
  const v = (q || '').trim();
  const rows = (v ? list.filter(p => crowdKey(p.name).includes(v)) : list).slice(0, 60);
  document.getElementById('pi-list').innerHTML = rows.length
    ? rows.map(p => `
        <a class="pi-row" href="/player/${encodeURIComponent(crowdSlug(p.name))}/">
          <span class="pi-name">${piEsc(p.name)}</span>
          <span class="pi-ovr" dir="ltr">${p.ovr}</span>
        </a>`).join('')
    : '<div class="pi-empty">לא נמצא שחקן בשם הזה.</div>';
}

function showPlayersIndex() {
  showScreen('players-index');
  piRender('');
  const q = document.getElementById('pi-q');
  q.value = '';
  q.oninput = () => piRender(q.value);
}
```

- [ ] **שלב 2: להוסיף מסך, כפתור וסגנון**

ב-`index.html`, ליד שאר המסכים:

```html
  <div id="players-index" class="screen screen-page" style="display:none">
    <h1>👥 שחקנים</h1>
    <p class="pi-sub">כל מי ששיחק בליגה מאז 1999. לכל אחד יש עמוד משלו.</p>
    <input id="pi-q" placeholder="חפש שחקן…" autocomplete="off">
    <div id="pi-list"></div>
  </div>
```

ובתוך `.nav-actions`:

```html
  <button class="nav-btn" onclick="showPlayersIndex()">👥 שחקנים</button>
```

```css
/* css/players-index.css */
#pi-q {
  width: 100%; box-sizing: border-box;
  background: #0d1117; color: #e6edf3;
  border: 1px solid #2b3648; border-radius: 8px;
  padding: 10px 12px; font: inherit; font-size: 15px; margin-bottom: 12px;
}
.pi-sub { color: #7d8695; font-size: 13px; margin-bottom: 12px; }
.pi-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-bottom: 1px solid #1c2432;
  color: #e6edf3; text-decoration: none;
}
.pi-row:hover { background: #161c26; }
.pi-ovr { color: #f0b429; font-weight: 700; }
.pi-empty { color: #7d8695; padding: 16px 0; }
```

ולטעון:

```html
  <link rel="stylesheet" href="css/players-index.css">
  <script src="js/players-index.js"></script>
```

```bash
node scripts/stamp_assets.js
```

- [ ] **שלב 3: לאמת שהקישורים לא מובילים ל-404**

זו הבדיקה שמצדיקה את המשימה. `crowdSlug` ו-slug הגנרטור חייבים להסכים — שלושה משטחים בונים ממנו קישור (כרטיס השחקן, המסך הזה, ועמודי `/player/` עצמם):

```bash
cd "c:/Users/avich/Desktop/Claude/Project Two/36-0"
node -e "
const fs=require('fs');
const src=fs.readFileSync('js/data.js','utf8');
const names=new Set();
for (const m of src.matchAll(/name: '((?:[^'\\\\]|\\\\.)*)'/g))
  names.add(m[1].replace(/\\\\'/g,\"'\")
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'')
    .replace(/[\u05f3\u2019\`\u00b4']/g,\"'\")
    .replace(/\s+/g,' ').trim().replace(/\s+/g,'-'));
const have=new Set(fs.readdirSync('player'));
let miss=0;
for (const n of names) if (!have.has(n)) { if (miss<10) console.log('404:', n); miss++; }
console.log('total names', names.size, '· missing pages', miss);
"
```

צפוי: `missing pages 0`, או מספר קטן ומוסבר (שחקנים שהגנרטור מסנן בכוונה). **מספר גדול פירושו ששני ה-slug נפרדו וכל הכפתור מוביל לשומקום** — לתקן לפני שממשיכים.

- [ ] **שלב 4: אימות בדפדפן**

```bash
cd "$SP/crowd" && rm -rf prof
timeout 120 "$CH" --headless=new --disable-gpu \
  --user-data-dir="$(cygpath -w "$PWD/prof")" --no-first-run \
  --virtual-time-budget=12000 --window-size=430,2000 \
  --screenshot="$(cygpath -w "$PWD/shot-index.png")" \
  "http://127.0.0.1:8934/index.html"
```

ועם דרייבר שקורא `showPlayersIndex()` אחרי 800ms. צפוי: רשימה ממוינת לפי דירוג, שדה חיפוש, רקע כהה.

- [ ] **שלב 5: קומיט**

```bash
cd "c:/Users/avich/Desktop/Claude/Project Two/36-0"
git add js/players-index.js css/players-index.css index.html
git commit -m "feat(crowd): a way into the player pages from inside the site"
```

---

## משימה 11: מעבר אחרון

- [ ] **שלב 1: להריץ הכל שוב**

```bash
cd "c:/Users/avich/Desktop/Claude/Project Two/36-0"
node scripts/sim/crowd_harness.js
node scripts/apply_crowd_ratings.js
git status
```

צפוי: `PASS` בכל השורות · `אין אישורים ממתינים.` · עץ עבודה נקי.

- [ ] **שלב 2: לבדוק שמצב קלאסי לא נשבר**

`pcShow` חוזר מוקדם במצב קלאסי ([player-card.js:469](js/player-card.js#L469)), כלומר **אין דירוג קהל במצב קלאסי בכלל**. זו תוצאה נכונה — במצב קלאסי אין תגיות ואין כימיה — אבל היא חייבת להיות מכוונת ולא מקרית, ו-`crowdBlock` מקבל שם `squad` שקיים בזמן שהענף הקלאסי כבר חסם את הכרטיס.

דרייבר לסקראצ'פאד, לפני `</body>`:

```html
<script>
window._errs = [];
window.addEventListener('error', e => window._errs.push(e.message));
setTimeout(() => { try { beginDraftWithState('classic'); } catch (e) { window._errs.push(e.message); } }, 300);
setTimeout(() => {
  try {
    const sq = state.currentSquad;
    pcShow(sq.players[0], document.querySelector('.player-card'), 'ST', true, sq);
  } catch (e) { window._errs.push(e.message); }
}, 1800);
setTimeout(() => {
  const card = document.getElementById('pcard');
  document.body.insertAdjacentHTML('beforeend',
    '<pre id="cls">classic card=' + (card ? card.style.display : 'none') +
    ' errs=' + JSON.stringify(window._errs) + '</pre>');
}, 2400);
</script>
```

```bash
cd "$SP/crowd" && rm -rf prof
timeout 120 "$CH" --headless=new --disable-gpu \
  --user-data-dir="$(cygpath -w "$PWD/prof")" --no-first-run \
  --virtual-time-budget=12000 --dump-dom \
  "http://127.0.0.1:8934/index.html?crowd=shown" | grep -o 'classic card=[^<]*'
```

צפוי: `classic card=none errs=[]` — הכרטיס לא נפתח כלל ושום שגיאה לא נזרקה. `errs` לא ריק פירושו ש-`crowdBlock` או `crowdMount` רצו במסלול שלא נועדו לו.

**לוודא את שם הפונקציה לפני ההרצה** — `beginDraftWithState` מקבל את סגנון המשחק כארגומנט:

```bash
grep -n "function beginDraftWithState" -A 4 "c:/Users/avich/Desktop/Claude/Project Two/36-0/js/game.js"
```

- [ ] **שלב 3: לדווח לבעלים**

מה נבנה, מה אומת בדפדפן ומה לא, ו**שהמיגרציה עוד לא הוחלה על פרודקשן** אם לא ניתן אישור. בלי דחיפה.

---

## מה במפורש לא נבנה

- **מוד "דירוגי הקהל"** — דראפט על דירוגי הקהל. דורש מאות שחקנים עם `n ≥ 5`. נבנה כשהצינור מלא.
- **תגיות קהל עם אפקט** — היום תיאוריות בלבד. קידום תגית ל-`star_tags.csv` עם אחוזים הוא החלטה נפרדת ומפורשת של הבעלים, לעולם לא תוצאה אוטומטית של הצבעות.
- **Story mode** — שיחת תכנון נפרדת.
