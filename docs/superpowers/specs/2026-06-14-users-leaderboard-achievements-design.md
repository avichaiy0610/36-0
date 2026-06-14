# עיצוב: מערכת משתמשים, Leaderboard והישגים
**תאריך:** 2026-06-14  
**פרויקט:** 36-0 | ליגת העל הישראלית  
**סטטוס:** מאושר

---

## סקירה כללית

הוספת מערכת משתמשים מלאה לאתר 36-0 הכוללת: חשבונות אמיתיים (Google + אימייל/סיסמה), לוח שיאים גלובלי, והישגים נשמרים. הכל בעברית RTL כמו שאר האתר.

**Backend:** Supabase (Auth + PostgreSQL + Edge Functions)  
**גישה:** Edge Function לאימות ושמירת תוצאות — מונעת זיוף ניקוד

---

## ארכיטקטורה

```
[דפדפן המשתמש]
      │
      ├─ Supabase Auth Client ──► Auth (Google / אימייל)
      ├─ Supabase JS Client ────► קריאת leaderboard, achievements, פרופיל
      └─ fetch() ───────────────► Edge Function: submit-result
                                        │
                                        ├─ אימות טוקן המשתמש
                                        ├─ ולידציה: wins+draws+losses=36, points=wins×3+draws
                                        ├─ שמירת תוצאה ב-DB
                                        └─ הענקת achievements + החזרת חדשים
```

**קבצים חדשים ב-frontend:**
- `js/auth.js` — התחברות/יציאה, ניהול פרופיל
- `js/leaderboard.js` — מסך לוח שיאים
- `js/achievements.js` — מסך ותצוגת הישגים
- `js/supabase-client.js` — אתחול Supabase

**שינויים ב-`js/game.js`:**
- שליחת תוצאה ל-Edge Function בסיום משחק
- הצגת toast להישגים חדשים

---

## סכמת בסיס הנתונים

### `profiles`
```sql
id          uuid PRIMARY KEY REFERENCES auth.users
username    text UNIQUE NOT NULL
avatar_url  text
created_at  timestamptz DEFAULT now()
```

### `game_results`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES profiles(id)
ovr         int NOT NULL
wins        int NOT NULL
draws       int NOT NULL
losses      int NOT NULL
points      int NOT NULL
gf          int NOT NULL
ga          int NOT NULL
formation   text NOT NULL
tier        text NOT NULL
settings    jsonb NOT NULL  -- { difficulty, era_min, era_max, peak_mode, ratings_visible }
matches     jsonb NOT NULL  -- [{ gf, ga, venue }] × 36 — נדרש לחישוב הישגים כמו "10 שערים במשחק"
created_at  timestamptz DEFAULT now()
```

### `squads`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
result_id   uuid REFERENCES game_results(id)
user_id     uuid REFERENCES profiles(id)
players     jsonb NOT NULL  -- [{ slotId, name, team, season, ovr, pos }]
is_public   boolean DEFAULT false
created_at  timestamptz DEFAULT now()
```

### `achievements` *(נתונים קבועים)*
```sql
key         text PRIMARY KEY
name_he     text NOT NULL
desc_he     text NOT NULL
icon        text NOT NULL
is_hidden   boolean DEFAULT false  -- true = מוצג כ-"???" עד הפתיחה
```

### `user_achievements`
```sql
user_id         uuid REFERENCES profiles(id)
achievement_key text REFERENCES achievements(key)
unlocked_at     timestamptz DEFAULT now()
result_id       uuid REFERENCES game_results(id)
PRIMARY KEY (user_id, achievement_key)
```

**Row Level Security:** כל טבלה מוגנת — משתמש רואה רק את שלו, חוץ מ-leaderboard (ציבורי לקריאה).

---

## רשימת הישגים

### גלויים (נעולים = אפור, שם ותיאור מוצגים)

| key | שם | תיאור | אייקון |
|---|---|---|---|
| `perfect_season` | עונה מושלמת | נצח בכל 36 המשחקים | 🏆 |
| `unbeaten_season` | עונה ללא הפסד | 36 משחקים ללא הפסד | 🛡️ |
| `ovr_88` | הרכב עילי | בנה הרכב עם OVR 88+ | ⭐ |
| `ovr_90` | הרכב האלים | בנה הרכב עם OVR 90+ | 👑 |
| `clean_season` | קיר ברזל | אפס שערים ספוגים בכל העונה | 🧤 |
| `century` | מאה שערים | כבש 100+ שערים בעונה | 💯 |
| `hard_win` | נצחון בקושי | הגע לדרגת "אלוף" במצב קשה | 💪 |
| `blind_win` | ניצחון בעיוור | הגע לדרגת "אלוף" עם דירוגים מוסתרים | 🙈 |
| `era_90s` | גנרציית זהב | כל שחקני ההרכב משנות ה-90 | 📼 |
| `mono_club` | נאמנות אחת | כל שחקני ההרכב מאותה קבוצה | ❤️ |
| `tier_legend` | אגדה | הגע לדרגה הגבוהה ביותר | 🌟 |
| `peak_master` | מאסטר שיא | הגע ל-36-0 במצב שיא | ⚡ |
| `games_10` | מתחיל | שחק 10 משחקים | 🎮 |
| `games_50` | מכור | שחק 50 משחקים | 🔥 |
| `all_formations` | טקטיקאי | ניסה את כל המערכים | 📋 |
| `all_clubs` | ציידי כישרונות | שיחק עם כל קבוצה לפחות פעם | 🗺️ |

### מוסתרים (נעולים = "???", שם ותיאור מוסתרים עד פתיחה)

| key | שם (אחרי פתיחה) | תיאור (אחרי פתיחה) | אייקון |
|---|---|---|---|
| `secret_perfect_hard` | בלתי אפשרי | 36-0 במצב קשה עם דירוגים מוסתרים | 🔮 |
| `secret_big_score` | גoleador | 10+ שערים במשחק אחד | 🎯 |
| `secret_peak_blind` | אגדת אגדות | 36-0 במצב שיא + דירוגים מוסתרים | 💎 |

*(ניתן להוסיף עוד הישגים מוסתרים בעתיד)*

---

## Leaderboard

**שני טאבים:**

**🏅 לפי OVR** — עמודות: #, משתמש, OVR, מערך, דרגה, [צפה בהרכב]  
**⚽ לפי נקודות** — עמודות: #, משתמש, נקודות, נ/ת/ה, שערים, [צפה בהרכב]

- כל שורה = התוצאה הטובה ביותר של המשתמש
- פילטר זמן: כל הזמנים / החודש / השבוע
- "צפה בהרכב" — modal עם המגרש המלא (רק אם המשתמש בחר `is_public = true`)

---

## UI Flows

### סרגל ניווט עליון (כל המסכים)
- שם משתמש + אווטאר (אם מחובר)
- כפתורים: "לוח שיאים" | "הישגים" | "התחבר" / "יציאה"

### התחברות
1. לחיצה על "התחבר" → modal עם Google OAuth + שדות אימייל/סיסמה + הרשמה
2. כניסה ראשונה → modal לבחירת username (פעם אחת בלבד)
3. ניתן לשחק ללא חשבון — התוצאה לא נשמרת ב-leaderboard

### סיום משחק (מסך results)
מתחת לכפתורי השיתוף הקיימים:
- כפתור "שמור תוצאה ב-leaderboard" + checkbox "שתף את ההרכב שלי"
- אם לא מחובר → "התחבר כדי לשמור"

### מסך הישגים
- גריד של כל ההישגים
- גלויים ומושגים: צבעוני + תאריך השגה
- גלויים ולא הושגו: אפור + שם + תיאור
- מוסתרים ולא הושגו: אפור + "???" בלי שם/תיאור

### Toast להישג חדש
אחרי שמירת תוצאה — אם הושג הישג חדש, toast קטן נכנס מהצד עם האייקון והשם. לא חוסם את ה-UI.

---

## Edge Function: `submit-result`

**Input (POST, Bearer token):**
```json
{
  "ovr": 87,
  "wins": 30, "draws": 4, "losses": 2,
  "points": 94, "gf": 78, "ga": 22,
  "formation": "4-3-3",
  "tier": "אלוף",
  "settings": { "difficulty": "normal", "era_min": 1999, "era_max": 2024, "peak_mode": false, "ratings_visible": true },
  "players": [...],
  "matches": [{ "gf": 3, "ga": 1, "venue": "home" }, ...],
  "is_public": true
}
```

**ולידציות:**
- `wins + draws + losses === 36`
- `points === wins * 3 + draws`
- `ovr` בטווח 0–99
- המשתמש מחובר (JWT תקין)

**Output:**
```json
{
  "result_id": "uuid",
  "new_achievements": ["perfect_season", "ovr_90"]
}
```

---

## סדר מימוש מוצע

1. הגדרת Supabase (פרויקט, Auth, טבלאות, RLS)
2. Edge Function `submit-result`
3. `js/supabase-client.js` + `js/auth.js` + UI התחברות
4. שמירת תוצאה מ-`game.js` + toast הישגים
5. מסך הישגים
6. מסך leaderboard + modal הרכב
