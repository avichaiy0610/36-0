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
    .replace(/[‎‏‪-‮⁦-⁩]/g, '')
    .replace(/[׳’`´']/g, "'")
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
