// "מה חדש" — the changelog the player actually sees.
//
// Every line here is editable from the admin panel. The bullets of a version are
// ONE multi-line string rather than one key per bullet, which is what makes the
// thing maintainable: adding, removing or reordering a line is typing in a
// textarea, not adding rows to the text catalog.
//
// Adding a version:
//   1. put it at the TOP of WHATS_NEW and bump APP_VERSION to match
//   2. run  node scripts/sync_whatsnew_texts.js  to add its three catalog rows
// The dot on the button lights up by itself for anyone who has not opened the
// panel since that version.

const APP_VERSION = '1.45';

const WHATS_NEW = [
  {
    v: '1.45', date: '23.8.2026', title: 'קריירה ומשחקונים',
    items: [
      '👑 מצב קריירה — עשר עונות במועדון אחד. בוחרים 11 שחקנים מסגלי עונה אחת, משחקים אותה בפורמט האמיתי שלה, ואז שומרים 6 ובוחרים 5 חדשים מהעונה הבאה.',
      '⏳ השחקנים שלך מזדקנים באמת — הדירוג של כל שחקן ששמרת הוא הדירוג האמיתי שלו בעונה הבאה, והוא עובר למועדון שאליו עבר במציאות. מי שיצא מהליגה או פרש, פשוט לא יהיה שם.',
      '💀 סיום בשני המקומות האחרונים = ירידת ליגה, והקריירה נגמרת. אליפות פותחת את מוקדמות אירופה — והשושלת ממשיכה בלי קשר לתוצאה שם.',
      '🎲 משחקונים — מדף חדש של משחקים קצרים לצד המשחק הגדול.',
      '⚽ כדורדל — אותם 11 מועדונים לכל המדינה, פעם ביום, בניסיון אחד. בסוף מקבלים 11 ריבועים ושיתוף שלא מסגיר כלום.',
      '🎯 נחש את השחקן — טבלת קריירה שנחשפת עונה אחרי עונה, שישה ניחושים. שחקן חדש כל יום, זהה לכולם.',
      '⚖️ מי טוב יותר — שני שחקנים, הדירוגים מוסתרים, טעות אחת מסיימת את הרצף.',
      '💰 מכירה פומבית — 500 מטבעות במקום הגרלה. מציעים בעיוור מול שלושה יריבים, ומי שמשלם יותר מדי על חלוץ משלם על זה בהגנה.',
    ],
  },
  {
    v: '1.4', date: '23.8.2026', title: 'גאונטלט ואירופה',
    items: [
      '🗺 מצב גאונטלט — מסע של שמונה קרבות מול קבוצות אמיתיות מההיסטוריה של הליגה, עם קמעות, חנות ומטבעות. הפסד אחד מסיים את הריצה.',
      '🇪🇺 מסע אירופי — אלופת הליגה ממשיכה למוקדמות ליגת האלופות: ארבעה סיבובים בית וחוץ, ומי שעובר את כולם מגיע לשלב הליגה עם טבלה של 36 קבוצות.',
      '🏆 שבעה הישגים חדשים שרק הגאונטלט יכול להעניק, ולוח שיאים לפי עומק הריצה.',
      '⚽ נעל הזהב — הישג למי ששובר את שיא ה-35 של ערן זהבי בעונה אחת.',
    ],
  },
  {
    v: '1.3', date: '19.8.2026', title: 'העונה כמו שהיא הייתה',
    items: [
      '📅 פורמט ליגה אותנטי לכל עונה שנבחרת — כולל שיטת הקיזוז של 2009-2011, שבה נקודות העונה הסדירה נחתכות בחצי.',
      '🥇 לוח שיאים נפרד לכל עונה היסטורית, בנוסף ללוח הכללי.',
      '🎖 שבעה הישגי רטרו שאפשר להשיג רק בעונות הישנות.',
      '🔢 דירוג ושם מועדון עם העונה על כל שחקן במגרש — בדראפט, לפני העונה ובתוצאות.',
    ],
  },
];

/* ── editable copy ────────────────────────────────────────────────────────── */
const wnText = (key, def) =>
  (typeof siteText === 'function' ? siteText(key, def) : def) ?? def;

function wnEntry(e) {
  const raw = wnText(`wn-${e.v}-items`, e.items.join('\n'));
  return {
    v: e.v,
    date: wnText(`wn-${e.v}-date`, e.date),
    title: wnText(`wn-${e.v}-title`, e.title),
    items: String(raw).split('\n').map(s => s.trim()).filter(Boolean),
  };
}

/* ── the unseen dot ───────────────────────────────────────────────────────── */
const WN_SEEN_KEY = '36-0-whatsnew-seen';

function wnSeen() {
  try { return localStorage.getItem(WN_SEEN_KEY); } catch (e) { return null; }
}
// Unseen for anyone whose stored version is not the current one. A brand-new
// visitor counts as unseen too — the panel is a decent first thing to open.
function wnUnseen() { return wnSeen() !== APP_VERSION; }
function wnMarkSeen() {
  try { localStorage.setItem(WN_SEEN_KEY, APP_VERSION); } catch (e) {}
  document.getElementById('wn-dot')?.style.setProperty('display', 'none');
}

/* ── the panel ────────────────────────────────────────────────────────────── */
function wnOpen() {
  const box = document.getElementById('wn-body');
  if (!box) return;
  box.innerHTML = WHATS_NEW.map((raw, i) => {
    const e = wnEntry(raw);
    return `
      <div class="wn-ver${i === 0 ? ' wn-latest' : ''}">
        <div class="wn-ver-head">
          <span class="wn-ver-num" dir="ltr">v${e.v}</span>
          <span class="wn-ver-title">${e.title}</span>
          <span class="wn-ver-date">${e.date}</span>
        </div>
        <ul class="wn-list">${e.items.map(t => `<li>${t}</li>`).join('')}</ul>
      </div>`;
  }).join('');
  document.getElementById('whatsnew-modal').style.display = 'flex';
  wnMarkSeen();
}

function wnClose() {
  const m = document.getElementById('whatsnew-modal');
  if (m) m.style.display = 'none';
}

function wnInit() {
  const btn = document.getElementById('btn-whatsnew');
  if (!btn) return;
  // the label is its own span: writing textContent on the button would delete
  // the unseen dot that lives inside it
  const label = document.getElementById('wn-label');
  if (label) label.textContent = wnText('wn-button', 'מה חדש!');
  const ver = document.getElementById('wn-version');
  if (ver) ver.textContent = 'v' + APP_VERSION;
  const dot = document.getElementById('wn-dot');
  if (dot) dot.style.display = wnUnseen() ? '' : 'none';
  btn.onclick = wnOpen;
  document.getElementById('wn-close')?.addEventListener('click', wnClose);
  // clicking the backdrop closes, clicking the card does not
  document.getElementById('whatsnew-modal')?.addEventListener('click', ev => {
    if (ev.target.id === 'whatsnew-modal') wnClose();
  });
}

document.addEventListener('DOMContentLoaded', wnInit);
