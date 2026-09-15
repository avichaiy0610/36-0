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
   מימושים שנפרדים = כל קישור באתר מוביל ל-404.

   וזה בדיוק מה שקרה. הגרסה הראשונה כאן נבנתה מ-crowdKey, ש**מאחד** גרשים
   ו**שומר** אותם; slugFor ב-scripts/player_pages.js **מוחק** אותם. מדידה מול
   הדאטה: 475 מתוך 2,724 השמות ייצרו slug אחר, וכל אחד מהם 404 קשה — שמות
   ישראלים רוויים ב-ג' ז' צ' ץ', אז זה הרוב הסביר ולא הזנב. ויקטור פאצ'ו, מתי
   חג'ג', יניב אברג'יל, ז'אן טלסניקוב, עמיר תורג'מן.

   הכיוון של התיקון אינו שרירותי: 946 כתובות /player/ כבר יושבות ב-sitemap.xml
   החי והוגשו לגוגל, והן מנוע הרכישה של האתר. הכתובות של המחולל הן הקנוניות,
   והפונקציה הזאת היא שזזה אליהן — לא להפך.

   מה שכתוב כאן הוא **תעתיק עצמאי** של slugFor(clean(name)) מ-player_pages.js:
     clean   = String(s || '').replace(/‎|‏/g, '').trim()
     slugFor = clean(name).replace(/["'׳״.()]/g, '').replace(/\s+/g, '-')

   ובמפורש: לא להרכיב אותו מ-crowdKey, גם לא כקיצור נחמד. crowdKey מקפל גם
   גרש מתולתל ו-backtick לגרש ישר, ואז שלב המחיקה מעלים אותם — בעוד המחולל
   שומר אותם בכתובת כי מעולם לא איחד. זה נכשל על שני שמות אמיתיים:
     ג`בייר בושנאק   דרך crowdKey: גבייר-בושנאק     בדיסק: ג`בייר-בושנאק
     אנדרה ז’ראלדש   דרך crowdKey: אנדרה-זראלדש     בדיסק: אנדרה-ז’ראלדש
   וכך גם כל "שיפור" אחר: איחוד גרשים, או הסרת כל טווח סימני הכיווניות במקום
   LRM ו-RLM בלבד. scripts/sim/crowd_harness.js נועל את זה מול שמות אמיתיים.

   crowdKey לא זז. הוא מפתח המסד וחייב להמשיך להסכים עם pcNorm, כולל הגרש.
   ששתי הפונקציות ייפרדו כאן זה הדבר הנכון: מפתח וכתובת הם שני דברים. */
function crowdSlug(name) {
  return String(name || '')
    .replace(/‎|‏/g, '')     // = clean(): LRM ו-RLM בלבד
    .trim()
    .replace(/["'׳״.()]/g, '')   // גרש, גרשיים, מרכאות, נקודה, סוגריים
    .replace(/\s+/g, '-');
}

/* ── למי בכלל יש עמוד ──────────────────────────────────────────────────────
   scripts/player_pages.js מייצר עמוד רק לשחקן עם שתי עונות ומעלה, וזה לא
   שרירותי: קומיט 2f599397 הוציא את העמודים הדקים החוצה אחרי ש-AdSense פסל
   אותם כ-low value content. עמוד לשחקן של עונה אחת היה מחזיר בדיוק את זה, על
   ערוץ הרכישה היחיד של האתר.

   מדידה: 2,724 שחקנים, 1,533 זכאים, ולכולם כבר יש עמוד. כלומר אין מה למלא —
   צריך רק לא לקשר ל-1,191 שמלכתחילה לא אמורים לקבל עמוד. שחקן בלי עמוד פשוט
   לא מקבל קישור, וזה בלתי נראה.

   הבנייה עצלה בתוך הפונקציה בכוונה: SQUADS לא קיים בהקשר של ה-harness, והפניה
   אליו ברמה העליונה הייתה הורגת אותו. */
let _crowdSeasons = null;
function crowdHasPage(name) {
  if (typeof SQUADS === 'undefined') return false;
  if (!_crowdSeasons) {
    _crowdSeasons = new Map();
    SQUADS.forEach(sq => sq.players.forEach(p => {
      const k = crowdKey(p.name);
      if (!_crowdSeasons.has(k)) _crowdSeasons.set(k, new Set());
      _crowdSeasons.get(k).add(sq.season);
    }));
  }
  const s = _crowdSeasons.get(crowdKey(name));
  return !!s && s.size >= 2;
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
const _crowdNotesC = new Map();

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

// ממוטמן מאותה סיבה בדיוק כמו crowdFetch: הכרטיס נפתח בהובר, לפעמים כמה פעמים
// בשנייה, וקריאה לא ממוטמנת כאן הייתה בקשה שלישית בכל ריחוף. שורה מאושרת
// משתנה רק דרך מודרציה של הבעלים, אז מטמון לכל חיי העמוד בטוח בדיוק כמו שם.
async function crowdNotes(key, season) {
  const ck = crowdCacheKey(key, season);
  if (_crowdNotesC.has(ck)) return _crowdNotesC.get(ck);
  try {
    const { data, error } = await _supabase
      .from('player_notes')
      .select('id, body')
      .eq('player_key', key).eq('season', season).eq('status', 'approved')
      .order('created_at', { ascending: false }).limit(3);
    // בלי לפרק את error, בקשה שנכשלה ורשימה ריקה באמת נראות זהות — ואז ריחוף
    // אחד בזמן ניתוק היה מקפיא "אין שורות" לכל חיי העמוד. רק הצלחה נשמרת.
    if (error) return [];
    const notes = data || [];
    _crowdNotesC.set(ck, notes);
    return notes;
  } catch (e) { return []; }
}

/* ── הווידג'ט ──────────────────────────────────────────────────────────────
   במצב סרק זו שורה אחת. היא מתרחבת רק כשנוגעים בה. הכרטיס כבר צפוף — פאנל
   שנפתח מעצמו היה הופך אותו למסך. */
// הגרש נכלל אף שכל תכונה שנכתבת כאן עטופה במרכאות כפולות: זה עוזר משותף,
// שמות ישראלים בדאטה הזאת מלאים בגרשים (ויקטור פאצ'ו), ואסור שסגנון הציטוט של
// כל קורא עתידי יהיה מה שמפריד בין בטוח לשבור.
function crowdEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// הווידג'ט נכנס לכרטיס כשלד ריק ומתמלא אסינכרונית. pcHTML הוא סינכרוני
// ולא ניתן להמתין בתוכו בלי להקפיא את פתיחת הכרטיס.
function crowdBlock(name, season, pos, official) {
  if (!name || !season) return '';
  // הדירוג הרשמי נכתב כמספר ולא כמחרוזת חופשית: הוא נקרא בחזרה עם parseInt,
  // ומה שלא מספר אין לו מה לעשות בתוך תכונה ב-HTML.
  const off = parseInt(official, 10);
  // data-key הוא המפתח המנורמל, וממנו אי אפשר להרכיב בחזרה את השם כפי שהוא
  // נכתב. המצב הריק פונה לשחקן בשמו, ולכן השם נשמר כאן בנפרד.
  //
  // .crowd-body הוא מה ש-crowdRenderLine ו-crowdOpenPanel מחליפים. כל דבר
  // שאמור לשרוד רינדור מחדש יושב מחוץ לו — הקישור לעמוד המלא הוא אח שלו ולא
  // צאצא, אחרת crowdMount היה מוחק אותו כמה מאות מילישניות אחרי פתיחת הכרטיס
  // והוא היה גלוי רק בהבזק של "טוען…".
  //
  // ה-href עובר encodeURIComponent בלבד ולא crowdEsc: הוא כבר בתוך מרכאות
  // כפולות ו-encodeURIComponent מקודד גרשים ממילא.
  //
  // והקישור נפלט רק למי שיש לו עמוד. קישור שנפתח בלשונית חדשה אל 404 גרוע
  // מלא לקשר בכלל, ול-vercel.json אין SPA fallback שיתפוס אותו.
  const full = crowdHasPage(name)
    ? `<a class="crowd-full" href="/player/${encodeURIComponent(crowdSlug(name))}/"
         target="_blank" rel="noopener">העמוד המלא של ${crowdEsc(name)} ↗</a>`
    : '';
  return `
    <div class="pc-sec crowd" data-key="${crowdEsc(crowdKey(name))}"
         data-name="${crowdEsc(name)}"
         data-season="${crowdEsc(season)}" data-pos="${crowdEsc(pos || '')}"
         data-official="${off || ''}">
      <div class="crowd-body"><div class="crowd-line">טוען…</div></div>
      ${full}
    </div>`;
}

// נקרא אחרי שה-innerHTML הוצב. מוצא את סקשן ה-crowd שעוד לא מולא וממלא אותו.
async function crowdMount(root) {
  // הכרטיס נפתח בתוך דראפט חי, והמעלה הזאת נקראת בלי await. כל מה שנזרק כאן
  // היה יוצא כ-unhandled rejection באמצע משחק — אותו חוזה של שכבת הרשת.
  try {
    const box = (root || document).querySelector('.crowd:not([data-ready])');
    if (!box) return;
    box.setAttribute('data-ready', '1');
    const key = box.dataset.key, season = box.dataset.season;
    // השורות המאושרות נשלפות כאן ולא בפתיחת הפאנל: בלי מסך הן לא קיימות, וכל
    // מסלול המודרציה מוביל לשום מקום — הבעלים מאשר טקסט שאיש לא יראה.
    const [row, mine, notes] = await Promise.all([
      crowdFetch(key, season), crowdFetchMine(key, season), crowdNotes(key, season),
    ]);
    // הכרטיס עלול להיסגר בזמן ההמתנה — כתיבה לאלמנט מנותק היא בזבוז שקט
    if (!box.isConnected) return;
    crowdRenderLine(box, row, mine, notes);
  } catch (e) { /* הווידג'ט נשאר על "טוען…" — הכרטיס עצמו לא נפגע */ }
}

function crowdRenderLine(box, row, mine, notes) {
  // כותבים למעטפת הפנימית בלבד, כדי שהקישור לעמוד המלא ישרוד. ה-|| box הוא
  // כדי שעמודי /player/ יוכלו להשתמש באותן פונקציות גם בלי המעטפת.
  const body = box.querySelector('.crowd-body') || box;
  const d = crowdDisplay(row);
  const tag = row && row.tag_top ? CROWD_TAGS[row.tag_top] : null;
  const name = box.dataset.name || '';
  let txt;
  if (d.state === 'shown') {
    txt = `דירוג קהל ממוצע <span dir="ltr">${d.avg}</span> <span class="crowd-n">⟨${d.n}⟩</span>` +
          (tag ? ` · <span class="crowd-tag">${tag.icon} ${crowdEsc(tag.label)}</span>` : '');
  } else if (d.state === 'few') {
    txt = `עוד ${d.left} הצבעות והדירוג ייחשף`;
  } else {
    // בשמו, לא "עליו". זו הפנייה הראשונה שרוב השחקנים יראו במשך שבועות.
    txt = name ? `עוד אין דעות על ${crowdEsc(name)} — תהיה הראשון`
               : 'עוד אין דעות עליו — תהיה הראשון';
  }
  const you = mine ? `<span class="crowd-you">אתה <span dir="ltr">${mine.ovr}</span></span> · ` : '';
  // עד שלוש שורות מאושרות מתחת לשורת הסיכום, וכלום כשאין. בפאנל הפתוח הן לא
  // מוצגות — שם המשתמש כותב, לא קורא.
  const notesHtml = (notes && notes.length)
    ? `<div class="crowd-notes">${notes.map(nt =>
        `<div class="crowd-note-row-r">“${crowdEsc(nt.body)}”</div>`).join('')}</div>`
    : '';
  body.innerHTML = `<div class="crowd-line">${you}${txt}<button class="crowd-open" type="button">${
    mine ? 'שנה' : 'דרג'}</button></div>${notesHtml}`;
  body.querySelector('.crowd-open').addEventListener('click', () => crowdOpenPanel(box, row, mine));

  // במצב הריק השורה לא נושאת מידע, ואין מה לקבור מתחת לפאנל — הבעיה כאן היא
  // ההפך, להוציא הצבעה ראשונה. במצב shown הפאנל היה מסתיר מספר אמיתי, ולכן
  // הפתיחה האוטומטית מוגבלת לריק בלבד.
  //
  // ו-!mine הוא מה שמונע לולאה: אחרי הצבעה שנשמרה ושליפה מחדש שנכשלה, השורה
  // חוזרת למצב ריק — ובלי התנאי הזה הפאנל היה נפתח שוב מיד מעל "אתה 86".
  if (d.state === 'empty' && !mine) crowdOpenPanel(box, row, mine);

  crowdResized(box);
}

/* ── "הגובה שלי השתנה" ─────────────────────────────────────────────────────
   הווידג'ט משנה את גובה הכרטיס המארח בארבעה רגעים: כשהשלד מתמלא, כשנפתחת
   החוגה אוטומטית במצב הריק, כשהמשתמש לוחץ "דרג" בעצמו, וכשהפאנל מתקפל בחזרה
   לשורה אחרי הצבעה. המארח הוא זה שיודע למדוד ולמקם — הווידג'ט רק אומר מתי.

   אירוע ולא callback, כי המארח כבר מחזיק את האלמנט ואין למי להירשם מראש:
   הבלוק נוצר כמחרוזת HTML בתוך pcHTML, הרבה לפני שיש ממנו אלמנט. */
function crowdResized(box) {
  try {
    box.dispatchEvent(new CustomEvent('crowd:resize', { bubbles: true }));
  } catch (e) { /* דפדפן בלי CustomEvent — הכרטיס פשוט לא ימוקם מחדש */ }
}

/* ── נעילת הסגירה ──────────────────────────────────────────────────────────
   pcHide נקרא ב-mouseleave של הכרטיס. גרירת החוגה יוצאת מגבולות הכרטיס דרך
   קבע, ובלי הנעילה הזאת הכרטיס נסגר באמצע ההצבעה — זה לא ליטוש, בלעדיה
   הפאנל שבור בשימוש רגיל בדסקטופ.

   הנעילה נמדדת מחדש בכל שאלה ולא נשמרת כאמת בפני עצמה. דגל בוליאני שנקבע
   ב-pointerdown ומתנקה ב-pointerup נתקע על true ברגע ש-pointerup לא מגיע —
   שחרור מחוץ לחלון, מעבר לחלון אחר באמצע גרירה, פאנל שהוחלף תוך כדי — וכרטיס
   שהנעילה שלו תקועה הוא כרטיס שאי אפשר לסגור אותו יותר. לכן כל ענף כאן נשען
   על ה-DOM החי: החוגה שעודה מחוברת, והשדה שבאמת מחזיק את הפוקוס. */
let _crowdDragEl = null;
let _crowdKeyDial = null;
let _crowdGuarded = false;

function crowdBusy() {
  if (_crowdDragEl && !_crowdDragEl.isConnected) _crowdDragEl = null;   // הפאנל הוחלף מתחת ליד
  if (_crowdDragEl) return true;
  // הקלדה לא צריכה דגל משלה: השאלה "האם הסמן בשדה" נשאלת ישירות מהדפדפן,
  // ותשובה שמגיעה מ-activeElement לא יכולה להישאר תקועה אחרי שהפוקוס עבר.
  const a = document.activeElement;
  if (!a || !a.classList || !a.isConnected) return false;
  if (a.classList.contains('crowd-note')) return true;
  // החוגה היא המקרה העדין. קליק עליה נותן לה פוקוס, והפוקוס שורד את ה-pointerup
  // — אז "activeElement הוא חוגה" נשאר true הרבה אחרי שהיד ירדה, והכרטיס הופך
  // לכזה ש-mouseleave וגלילה כבר לא סוגרים. בכרטיס מעוגן אין ✕ ואין רקע (שניהם
  // נבנים רק בענף המודאלי), כלומר Escape הוא היציאה היחידה, והגלילה החסומה
  // משאירה אותו נעוץ בקואורדינטות שהעמוד כבר גלל מהן.
  //
  // אבל אי אפשר פשוט להוציא את החוגה מכאן: Tab אליה וחיצים משנים את הדירוג בלי
  // שום pointerdown, ו-mouseleave אחד היה סוגר את הכרטיס באמצע הצבעה במקלדת.
  // מה שצריך זה המודאליות, לא הפוקוס — ולכן היא נמדדת כאן ולא נשאלת מהדפדפן:
  // :focus-visible הוא היוריסטיקה של ה-UA, ו-matches() על סלקטור לא נתמך זורק
  // SyntaxError — מתוך crowdBusy הוא היה מבעבע ל-pcHide, הפונקציה האחת שאסור
  // לה לזרוק, והופך קוסמטיקה שמתקנת את עצמה לכרטיס שאי אפשר לסגור בכלל.
  //
  // a === _crowdKeyDial דורש שהדגל, הפוקוס החי והחיבור ל-DOM יסכימו בו זמנית,
  // ולכן הוא לא יכול להיתקע גם כש-blur לא נורה על אלמנט שהוסר.
  return a === _crowdKeyDial;
}

// רשתות הביטחון, פעם אחת על החלון: אירוע השחרור לא בהכרח חוזר לחוגה שהתחילה
// את הגרירה, ולפעמים לא מגיע אליה בכלל.
function crowdBusyGuards() {
  if (_crowdGuarded) return;
  _crowdGuarded = true;
  ['pointerup', 'pointercancel'].forEach(t =>
    window.addEventListener(t, () => { _crowdDragEl = null; }, true));
  window.addEventListener('blur', () => { _crowdDragEl = null; });
}

function crowdOpenPanel(box, row, mine) {
  // אותה מעטפת פנימית כמו ב-crowdRenderLine, ומאותה סיבה
  const body = box.querySelector('.crowd-body') || box;
  const key = box.dataset.key, season = box.dataset.season;
  const pos = box.dataset.pos;
  const official = parseInt(box.dataset.official, 10) || 75;
  const start = mine ? mine.ovr : official;
  const shelf = crowdShelf(pos);
  const signedIn = typeof getCurrentUser === 'function' && !!getCurrentUser();
  crowdBusyGuards();

  body.innerHTML = `
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
                 type="button" data-tag="${crowdEsc(t.key)}">${t.icon} ${crowdEsc(t.label)}</button>`).join('')}</div>
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
  // תגית שמורה שאיננה על המדף הנוכחי — reflexes של שוער על שחקן שהעמדה שלו
  // נקראת כאן כשחקן שדה — לא מדליקה שום צ'יפ, ובלי התנאי הזה היא נשארת דרוכה
  // בשקט ונשלחת שוב בלחיצה על שמור. מה שלא מוצג, לא נשלח.
  let tag = (mine && shelf.some(t => t.key === mine.tag)) ? mine.tag : null;

  // הכרטיס לא נסגר כל עוד יד על החוגה
  dial.addEventListener('pointerdown', () => { _crowdDragEl = dial; _crowdKeyDial = null; });
  ['pointerup', 'pointercancel'].forEach(t =>
    dial.addEventListener(t, () => { _crowdDragEl = null; }));
  dial.addEventListener('input', () => { out.textContent = dial.value; });
  // מקלדת: החל מהקשה ראשונה על החוגה היא נעולה, ועד שהפוקוס עוזב אותה.
  // pointerdown מכבה את זה במפורש — עכבר הוא לא מקלדת, ומשם _crowdDragEl
  // לוקח אחריות, לאורך הגרירה בלבד.
  dial.addEventListener('keydown', () => { _crowdKeyDial = dial; });
  dial.addEventListener('blur',    () => { if (_crowdKeyDial === dial) _crowdKeyDial = null; });

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
    // Escape בתוך השדה חייב קודם כל לשחרר אותו. כל עוד הסמן כאן הנעילה פעילה
    // ו-pcHide חוזר בלי לסגור — כלומר המקש שתפקידו לסגור את הכרטיס היה נבלע.
    // השחרור קורה כאן, לפני שהאירוע מבעבע ל-document ומגיע ל-pcHide.
    note.addEventListener('keydown', ev => { if (ev.key === 'Escape') note.blur(); });
    const send = box.querySelector('.crowd-note-send');
    send.addEventListener('click', async () => {
      // text ולא body — body כאן הוא המעטפת שכותבים אליה, ובפונקציה שכל עניינה
      // "לכתוב ל-body ולא ל-box" שם כפול הוא מלכודת
      const text = note.value.trim();
      if (text.length < 2 || send.disabled) return;
      send.disabled = true;               // לחיצה כפולה = שתי בקשות על אותה שורה
      const r = await crowdSubmitNote(key, season, text);
      const hint = box.querySelector('.crowd-note-hint');
      // הפאנל עלול להיסגר ולהתרנדר מחדש בזמן ההמתנה
      if (!hint || !hint.isConnected) return;
      hint.textContent = r.ok ? 'נשלח — יוצג אחרי אישור.'
                        : r.error === 'already today' ? 'כבר כתבת עליו היום.'
                        : 'לא נשלח, נסה שוב.';
      if (r.ok) { note.value = ''; note.disabled = true; }
      else send.disabled = false;         // נכשל — צריך להיות אפשר לנסות שוב
    });
  }

  const done = box.querySelector('.crowd-done');
  done.addEventListener('click', async () => {
    if (done.disabled) return;
    done.disabled = true;
    _crowdDragEl = null;
    _crowdKeyDial = null;   // נשמר — אין יותר הצבעה באוויר שצריך להגן עליה
    const ovr = parseInt(dial.value, 10);
    const r = await crowdVote(key, season, ovr, tag);
    if (!r.ok) {
      const dn = box.querySelector('.crowd-dial-note');
      if (dn) dn.textContent =
        r.error === 'rate limited' ? 'יותר מדי הצבעות בשעה האחרונה.' : 'לא נשמר, נסה שוב.';
      if (done.isConnected) done.disabled = false;
      return;
    }
    // השורות המאושרות נשלפות שוב יחד עם ההצבר: crowdRenderLine מצייר רק את מה
    // שנמסר לה, ובלי זה הצבעה אחת הייתה מוחקת מהמסך שורות שכבר אושרו.
    const [fresh, notes] = await Promise.all([crowdFetch(key, season), crowdNotes(key, season)]);
    if (box.isConnected) crowdRenderLine(box, fresh, { ovr, tag }, notes);
  });

  // הפאנל גבוה מהשורה בכ-150px, וזה נכון גם כשהמשתמש לחץ "דרג" בעצמו — לא רק
  // במצב הריק שנפתח לבד. בלי האות הזה כרטיס מעוגן בשורה התחתונה מקבל חוגה
  // שנחתכת מתחת לקצה המסך, שזה בדיוק הבאג שהמדידה מחדש נועדה לפתור.
  crowdResized(box);
}
