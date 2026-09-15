// js/crowd-nudges.js
// ─── איך בכלל מוצאים את דירוגי הקהל ───────────────────────────────────────────
//
// הפיצ'ר עצמו חי בתוך כרטיס השחקן, והכרטיס נפתח בריחוף בדסקטופ ובלחיצה על ⓘ או
// לחיצה ארוכה בנייד. זו אינטראקציה שרוב האנשים לא יודעים שהיא קיימת, ו"מה חדש"
// לא נקרא. בלי הקובץ הזה הפיצ'ר בנוי ובלתי נראה.
//
// שלושה רמזים כאן, והרביעי — התג "חדש" על כפתור הדירוג — יושב ב-js/crowd.js,
// כי הוא נבנה באותה שורה שהוא מקשט.
//
// שלושה חוקים משותפים לכולם:
//
//   1. כל רמז מסיר את עצמו, ולתמיד. הדגל נכתב ל-localStorage ברגע שהרמז נראה
//      על המסך — לא כשמישהו סוגר אותו, כי אף אחד מהם לא דורש סגירה. רמז שחוזר
//      הוא מטרד, וזה בדיוק מה שהופך הכוונה להצקה.
//
//   2. כל פנייה ל-localStorage עטופה. בגלישה פרטית הוא זורק, ורמז שנופל אסור לו
//      לקחת איתו את מסך הדראפט או את מסך התוצאות. כל פונקציה ציבורית כאן עטופה
//      ב-try/catch שלם מאותה סיבה: הן נקראות מתוך game.js, בתוך משחק חי.
//
//   3. מי שכבר הצביע פעם אחת לא מקבל אף אחד מהם. crowdHasVoted() הוא העדות,
//      והיא נכונה גם למי שהצביע מדפדפן אחר — js/crowd.js כותב את הדגל גם כשהשרת
//      מחזיר הצבעה קיימת.
//
// ולמה הכל בקובץ אחד: אלה רמזים לפיצ'ר חדש, כלומר הם זמניים. ביום שבו הפיצ'ר
// כבר לא חדש מוחקים קובץ אחד ושלוש שורות קריאה, ולא מחפשים חתיכות בארבעה מקומות.

/* ── מפתחות ודגלים ───────────────────────────────────────────────────────────
   שלושה מפתחות נפרדים ולא אחד: הם מתיישנים בזמנים שונים ומסיבות שונות. הנקודה
   על 👥 שחקנים יורדת כשלוחצים עליה, ושני הרמזים האחרים כשרואים אותם. */
const CN_KEY_DRAFT = '36-0-crowd-tip';    // הרמז בזמן דראפט
const CN_KEY_XI    = '36-0-crowd-xi';     // ההצעה במסך התוצאות
const CN_KEY_NAV   = '36-0-crowd-nav';    // הנקודה על כפתור הניווט

function cnSeen(k) {
  try { return localStorage.getItem(k) === '1'; } catch (e) { return true; }
}
function cnMark(k) {
  try { localStorage.setItem(k, '1'); } catch (e) { /* גלישה פרטית */ }
}

// cnSeen מחזיר true כשהאחסון חסום, ולא false. זה נראה הפוך ונבחר בכוונה: בלי
// אחסון אין שום דרך לזכור שהרמז כבר הוצג, ורמז שאי אפשר לכבות אותו יופיע בכל
// דראפט ובכל סיום עונה, לנצח. לא להציג בכלל עדיף על להציג בלי סוף.

function cnVoted() {
  try { return typeof crowdHasVoted === 'function' && crowdHasVoted(); }
  catch (e) { return false; }
}

/* ── ריחוף מול לחיצה ─────────────────────────────────────────────────────────
   אסור להגיד למישהו בטלפון "רחף". שתי הגרסאות נכתבות לתוך ה-DOM ו-CSS בוחר
   אחת, באותה שאילתת מדיה בדיוק שמראה את כפתור ה-ⓘ (css/style.css, .pc-info):
   @media (hover: none), (pointer: coarse). ההכרעה נשארת במקום אחד — אילו הייתה
   נעשית כאן ב-matchMedia, מכשיר היברידי היה יכול לקבל כפתור ⓘ גלוי יחד עם משפט
   שמסביר לו לרחף.

   ושתי הגרסאות לא אומרות את אותו דבר במילים אחרות: ברשימת הדראפט המגע נפתח
   דרך ⓘ, ובמגרש דווקא בלחיצה ארוכה — שני מסלולים שונים בקוד (js/player-card.js),
   ולכן שני משפטים שונים. */
function cnEither(hover, touch) {
  return '<span class="cn-hover">' + hover + '</span>' +
         '<span class="cn-touch">' + touch + '</span>';
}

function cnBox(id, cls, html) {
  const d = document.createElement('div');
  d.id = id;
  d.className = cls;
  d.innerHTML = html;
  return d;
}

/* ── 2. הרמז בזמן הדראפט ─────────────────────────────────────────────────────
   מעל רשימת השחקנים, אחרי שהרולטה נחתה — בכוונה אחרי, כדי שלא יתחרה בה. שורה
   שקטה שמסבירה מה פותח כרטיס שחקן; מי שלא ידע שיש כרטיס, לא ידע שיש דירוג.

   נמחק בתחילת כל סבב ומצויר לכל היותר פעם אחת בחיים של הדפדפן, כלומר בפועל הוא
   חי סבב אחד ונעלם. לא מתווסף לו ✕: דבר שצריך לסגור אותו הוא בדיוק מה שהבעלים
   ביקש שלא יהיה כאן.

   במצב קלאסי הכרטיס לא נפתח בכלל (js/player-card.js, pcShow) — שם הרמז יהיה
   שקר, ולכן אין אותו. */
const CN_DRAFT_ID = 'crowd-draft-tip';

function crowdDraftTipClear() {
  try {
    const el = document.getElementById(CN_DRAFT_ID);
    if (el) el.remove();
  } catch (e) { /* לא קריטי */ }
}

function crowdDraftTip() {
  try {
    crowdDraftTipClear();
    if (cnSeen(CN_KEY_DRAFT) || cnVoted()) return;
    if (typeof state !== 'undefined' && state && state.classic) return;
    const list = document.getElementById('players-list');
    if (!list || !list.firstChild || !list.parentNode) return;   // אין רשימה, אין על מה להצביע
    cnMark(CN_KEY_DRAFT);
    const tip = cnBox(CN_DRAFT_ID, 'crowd-tip',
      '💡 ' + cnEither(
        'ריחוף על שחקן ברשימה פותח את הכרטיס שלו',
        'כפתור ה-ⓘ שליד השם פותח את הכרטיס של השחקן') +
      ' — ושם אפשר <b>לדרג אותו בעצמך</b>.');
    list.parentNode.insertBefore(tip, list);
  } catch (e) { /* רמז שנכשל לא מפיל דראפט */ }
}

/* ── 4. ההצעה במסך התוצאות ───────────────────────────────────────────────────
   הרגע הכי טוב לבקש דעה: העונה נגמרה, ההרכב על המסך, והאדם בדיוק ראה מה כל אחד
   מאחד-עשר עשה. הרמז יושב מעל המגרש בפאנל השמאלי — במקום שבו ההרכב נמצא, כי אין
   טעם להצביע על משהו שלא רואים. ברוחב טלפון הפאנל הזה יורד למטה, וזה נשאר נכון:
   הרמז מופיע בדיוק כשגוללים אל ההרכב.

   הוא נמחק בתחילת כל showResults ומצויר בזנב החשיפה, אחרי שהסיכום כבר נפתח.
   המחיקה היא העיקר: הפרויקט הזה מכיר את הבאג שבו שדה שאיש לא מאפס נגרר לעונה
   הבאה, ולמסך התוצאות יש שישה בעלים שונים.

   מתי הוא לא מופיע, וכל סעיף כאן הוא מצב אמיתי ולא זהירות סתמית:
     · מצב קלאסי — לכרטיס אין דרך להיפתח, אז ההצעה בלתי אפשרית לביצוע
     · חשיפת ליגה או דו-קרב (_leagueReviewMode / _duelReviewMode) — ההרכב שעל
       המגרש שייך למישהו אחר, ו"השחקנים שלך" הוא פשוט לא נכון שם
     · מסך תוצאות בלי בחירות — אין למה להצביע
     · מסך תוצאות שכבר לא פעיל — היוזר עבר לאירופה או לעונה הבאה תוך כדי */
const CN_XI_ID = 'crowd-xi-tip';

function crowdXiTipClear() {
  try {
    const el = document.getElementById(CN_XI_ID);
    if (el) el.remove();
  } catch (e) { /* לא קריטי */ }
}

function crowdXiTip() {
  try {
    crowdXiTipClear();
    if (cnSeen(CN_KEY_XI) || cnVoted()) return;
    if (typeof state === 'undefined' || !state || state.classic) return;
    if (window._leagueReviewMode || window._duelReviewMode) return;
    const picks = state.picks || [];
    if (!picks.some(p => p && p.player && p.squad)) return;
    const res = document.getElementById('screen-results');
    if (!res || !res.classList.contains('active')) return;
    const panel = res.querySelector('.pitch-panel');
    const pitch = panel && panel.querySelector('.pitch-container');
    if (!pitch) return;
    cnMark(CN_KEY_XI);
    const tip = cnBox(CN_XI_ID, 'crowd-tip crowd-tip-xi',
      '<b class="cn-t">⭐ דרג את השחקנים שלך</b>' +
      cnEither(
        'רחף על שחקן במגרש כדי לפתוח את הכרטיס שלו',
        'לחיצה ארוכה על שחקן במגרש פותחת את הכרטיס שלו') +
      ' — ושם דירוג הקהל.');
    panel.insertBefore(tip, pitch);
  } catch (e) { /* רמז שנכשל לא מפיל מסך תוצאות */ }
}

/* ── 3. הנקודה על 👥 שחקנים ──────────────────────────────────────────────────
   כפתור ניווט חדש בשורה של תשעה כפתורים ותיקים הוא כפתור שאיש לא יסתכל עליו.
   הנקודה יורדת בלחיצה הראשונה — לא כשמישהו מגיע למסך בדרך אחרת, כי מה שהיא
   מסמנת זה "יש כאן משהו שלא ראית", וללחוץ עליו זה לראות אותו.

   מוזרקת מ-JS ולא יושבת ב-index.html: מי שכבר לחץ פעם לא אמור לראות הבזק של
   נקודה שנמחקת רגע אחרי הצביעה הראשונה של הדפדפן.

   היא שייכת לקהל ולא למסך השחקנים — המסך הזה הוא שער לעמודי /player/, ושם יושב
   הווידג'ט על עמוד מלא ולא בכרטיס חולף. זו הדרך הנוחה ביותר להגיע לדרג מישהו. */
function crowdNavDot() {
  try {
    if (cnSeen(CN_KEY_NAV)) return;
    const btn = document.getElementById('nav-players');
    if (!btn || btn.querySelector('.crowd-dot')) return;
    const dot = document.createElement('span');
    dot.className = 'crowd-dot';
    dot.setAttribute('aria-hidden', 'true');
    btn.appendChild(dot);
    // המאזין נרשם רק כשהנקודה באמת קיימת, כך שאין מה להסיר ואין מה לכתוב
    // לאחר מכן — כפתור בלי נקודה לא צובר מאזין בכל טעינה.
    btn.addEventListener('click', () => { cnMark(CN_KEY_NAV); dot.remove(); });
  } catch (e) { /* נקודה שנכשלה לא מפילה ניווט */ }
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', crowdNavDot);
else crowdNavDot();
