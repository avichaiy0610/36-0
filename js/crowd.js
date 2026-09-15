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
  // A row with a count but no average. crowd_trimmed_avg returns NULL if and
  // only if n < 5, so the database should never hand us n >= 5 with no rating —
  // but deciding what is displayable is THIS function's job, and it must not be
  // correct only for as long as a remote invariant holds. Without the guard a
  // schema change or a hand-edited row renders the word "null" where a rating
  // goes. Never 'shown' without a number to show.
  if (row.avg_trimmed == null) {
    return { state: 'few', left: Math.max(1, CROWD_MIN_VOTES - n) };
  }
  if (n < CROWD_MIN_VOTES) return { state: 'few', left: CROWD_MIN_VOTES - n };
  return { state: 'shown', n, avg: row.avg_trimmed };
}

/* ── רשת ───────────────────────────────────────────────────────────────────
   הכרטיס נפתח בהובר, לפעמים כמה פעמים בשנייה. בלי מטמון זה מבול בקשות על
   אותו שחקן. המטמון חי לטעינת העמוד בלבד ונפרד אחרי הצבעה, כדי שהמספר
   שהמצביע רואה מיד יהיה המספר החדש.

   כל קריאה כאן חייבת להיכשל בשקט. הכרטיס נפתח בתוך דראפט חי, ושגיאת רשת,
   דפדפן אופליין או בקשה חסומה לא יכולים לזרוק ולא יכולים להשאיר את הכרטיס
   תקוע על "טוען". כל פונקציה מחזירה ערך שמיש גם כשהכל נופל. */
const _crowdCache = new Map();
const _crowdMine  = new Map();

function crowdCacheKey(key, season) { return key + '|' + season; }

function crowdClientId() {
  // אותו מזהה ש-js/track.js משתמש בו (CID_KEY = 't360_cid'). אם הוא לא זמין
  // — localStorage חסום, גלישה פרטית — אין הצבעה אנונימית, ומה שמוצע הוא
  // התחברות. לא ממציאים כאן מזהה חדש: הוא יישכח בטעינה הבאה וייצור זהות
  // חדשה בכל רענון, כלומר הצבעה כפולה מאותו אדם.
  try { return localStorage.getItem('t360_cid') || null; } catch (e) { return null; }
}

async function crowdFetch(key, season) {
  const ck = crowdCacheKey(key, season);
  if (_crowdCache.has(ck)) return _crowdCache.get(ck);
  try {
    const { data, error } = await _supabase
      .from('crowd_ratings')
      .select('n, avg_trimmed, tag_top, tag_top_n')
      .eq('player_key', key).eq('season', season).maybeSingle();
    if (error) return null;
    // "נשלף בהצלחה ואין שורה" נשמר במטמון; "הבקשה נכשלה" לא. בלי ההבחנה הזאת
    // הובר אחד בזמן ניתוק היה קובע null לכל חיי העמוד, והכרטיס היה אומר "אין
    // דעות עליו" גם אחרי שהרשת חזרה.
    const row = data || null;
    _crowdCache.set(ck, row);
    return row;
  } catch (e) { return null; }
}

async function crowdFetchMine(key, season) {
  const ck = crowdCacheKey(key, season);
  if (_crowdMine.has(ck)) return _crowdMine.get(ck);
  try {
    const { data, error } = await _supabase.rpc('my_player_vote', {
      p_player_key: key, p_season: season, p_voter: crowdClientId(),
    });
    if (error) return null;
    const mine = (data && data.vote) || null;
    _crowdMine.set(ck, mine);
    return mine;
  } catch (e) { return null; }
}

async function crowdVote(key, season, ovr, tag) {
  try {
    const { data, error } = await _supabase.rpc('vote_player', {
      p_player_key: key, p_season: season,
      p_ovr: ovr, p_tag: tag || null, p_voter: crowdClientId(),
    });
    if (error || (data && data.error)) {
      // המטמון לא נגעו בו: הצבעה שנכשלה לא מרשה לנו לטעון שמשהו השתנה.
      return { ok: false, error: (data && data.error) || 'network' };
    }
    const ck = crowdCacheKey(key, season);
    _crowdCache.delete(ck);      // ההצבר כבר לא נכון — שיישלף מחדש
    _crowdMine.set(ck, { ovr, tag: tag || null });
    return { ok: true };
  } catch (e) { return { ok: false, error: 'network' }; }
}

async function crowdSubmitNote(key, season, body) {
  try {
    const { data, error } = await _supabase.rpc('submit_player_note', {
      p_player_key: key, p_season: season, p_body: body,
    });
    if (error || (data && data.error)) {
      return { ok: false, error: (data && data.error) || 'network' };
    }
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
