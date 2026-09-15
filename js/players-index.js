// ─── 👥 שחקנים ───────────────────────────────────────────────────────────────
// לאתר יש 1,570 עמודי שחקן ב-/player/, וגוגל היה ערוץ הכניסה היחיד אליהם.
// זה השער אליהם מבפנים: מדף אחד, חיפוש אחד, ומשם לעמוד המלא.
//
// למה הרשימה נמשכת מ-player/index.json ולא נבנית מ-SQUADS:
// את הקובץ הזה כותב scripts/player_pages.js מתוך קריאת התיקיות שקיימות בפועל
// (allSlugs → readdirSync + filter), כלומר כל שורה בו היא עמוד שבאמת יושב על
// הדיסק. רשימה שנבנית מחדש בדפדפן הייתה מסתמכת על כך ששתי פונקציות slug
// נפרדות מסכימות לנצח — וזה כבר נכשל פעם אחת בפיצ'ר הזה: מחלוקת על הגרש בין
// crowdSlug ל-slugFor ייצרה 475 קישורים ל-404, ובשמות ישראליים ג'/ז'/צ'/ץ'
// זה לא מקרה קצה אלא רוב הספרייה. רשימה שנגזרת מהדיסק לא יכולה לסטות.
//
// הטעינה עצלה, בפתיחה הראשונה של המסך ולא בטעינת העמוד: 74KB שמי שלא נכנס
// לכאן לא משלם עליהם. וכשהיא נכשלת המסך אומר את זה ומציע לנסות שוב, במקום
// לשבת ריק.

const PI_SRC   = '/player/index.json';
const PI_LIMIT = 60;          // כמה שורות מציירים בבת אחת

let _piRows  = null;          // [[שם, slug, מפתח-חיפוש], …] ממוין לפי שיא דירוג
let _piState = 'idle';        // idle · loading · ready · error

function piEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// אותה נורמליזציה בדיוק כמו בחיפוש שעל עמודי /player/ עצמם
// (scripts/player_pages.js, ‎st()): גרש ומרכאות נושרים, ומקף מתקפל לרווח.
// מי שמקליד "פאצו" מחפש את ויקטור פאצ'ו, ומי שהדביק שם מתוך כתובת /player/
// מקבל אותו חזרה. שני המשטחים חייבים להתנהג אותו דבר.
function piNorm(s) {
  return String(s ?? '').replace(/["'׳״.()]/g, '').replace(/[-\s]+/g, ' ').trim();
}

/* ── מה כל שורה אומרת ──────────────────────────────────────────────────────
   index.json מחזיק שם ו-slug בלבד, והוא כבר ממוין לפי שיא הדירוג — כלומר
   הסדר עצמו הוא מידע. אבל 1,570 שמות עירומים הם לא מסך.
   js/data.js טעון כאן (בניגוד לעמודים הסטטיים), ו-mgIndex() כבר בנה מתוכו
   קריירה לכל שחקן עבור המשחקונים. מושכים ממנו את מה שמזהה אדם במבט אחד:
   המועדון שבו שיחק הכי הרבה, העמדה, טווח העונות, וכמה עונות. השיא עצמו יושב
   בקצה כמספר.
   הכל דרך typeof/try — שורה בלי מטא־דאטה עדיין שורה תקינה עם קישור עובד. */
function piMeta(name) {
  if (typeof mgFind !== 'function') return null;
  let e = null;
  try { e = mgFind(name); } catch (err) { return null; }
  if (!e || !e.rows || !e.rows.length) return null;

  const cnt = {};
  (e.all || e.rows).forEach(r => { cnt[r.teamId] = (cnt[r.teamId] ?? 0) + 1; });
  const mainId = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];

  const first = e.first ? e.first.season : '';
  const last  = e.last  ? e.last.season  : '';
  const span  = first && last && first !== last ? `${first}–${last}` : (first || last);

  const bits = [];
  const pos = (typeof POS_HE === 'object' && POS_HE) ? POS_HE[e.pos] : null;
  if (pos) bits.push(pos);
  if (mainId) bits.push(typeof mgClub === 'function' ? mgClub(mainId) : mainId);
  if (span) bits.push(span);
  bits.push(e.seasons === 1 ? 'עונה אחת' : `${e.seasons} עונות`);

  // כל פרט בתוך span משלו: בטלפון השורה עוטפת, ובלי זה היא נשברה באמצע טווח
  // העונות ("1999/00–" בשורה אחת, "2007/08" בשנייה). השבירה מותרת רק בין פרטים.
  return {
    badge: (mainId && typeof mgBadge === 'function') ? mgBadge(mainId) : '⚽',
    html:  bits.map(b => `<span class="pi-b">${piEsc(b)}</span>`).join(' · '),
    peak:  e.peak,
  };
}

/* ── הרשימה ───────────────────────────────────────────────────────────────── */
function piRow(pair) {
  const name = pair[0], slug = pair[1];
  const m = piMeta(name);
  return `
    <a class="pi-row" href="/player/${encodeURIComponent(slug)}/">
      <span class="pi-badge" aria-hidden="true">${m ? piEsc(m.badge) : '⚽'}</span>
      <span class="pi-body">
        <span class="pi-name">${piEsc(name)}</span>
        ${m ? `<span class="pi-meta">${m.html}</span>` : ''}
      </span>
      ${m ? `<span class="pi-peak" dir="ltr" title="שיא הדירוג">${m.peak}</span>` : ''}
      <span class="pi-arrow" aria-hidden="true">←</span>
    </a>`;
}

function piRender() {
  const box = document.getElementById('pi-list');
  const foot = document.getElementById('pi-foot');
  if (!box) return;
  if (foot) foot.textContent = '';

  if (_piState === 'loading' || _piState === 'idle') {
    box.innerHTML = '<div class="pi-note">טוען את הספרייה…</div>';
    return;
  }
  if (_piState === 'error') {
    box.innerHTML = `
      <div class="pi-note">
        רשימת השחקנים לא נטענה.
        <button class="pi-retry" id="pi-retry">נסה שוב</button>
      </div>`;
    const b = document.getElementById('pi-retry');
    if (b) b.onclick = () => { _piState = 'idle'; piLoad(); piRender(); };
    return;
  }

  const q = document.getElementById('pi-q');
  const v = piNorm(q ? q.value : '');

  // התאמה בתחילת השם קודמת להתאמה באמצעו — מי שמקליד "אלון" מחפש את אלון,
  // לא את כל מי שהמחרוזת קבורה אצלו בפנים. אותו כלל כמו בחיפוש שבעמודים.
  let hits;
  if (!v) {
    hits = _piRows;
  } else {
    const head = [], tail = [];
    for (const r of _piRows) {
      const at = r[2].indexOf(v);
      if (at === 0) head.push(r);
      else if (at > 0) tail.push(r);
    }
    hits = head.concat(tail);
  }

  if (!hits.length) {
    box.innerHTML = '<div class="pi-note">אין שחקן כזה בספרייה.</div>';
    if (foot) foot.textContent = 'בספרייה רק מי ששיחק שתי עונות ומעלה.';
    return;
  }

  box.innerHTML = hits.slice(0, PI_LIMIT).map(piRow).join('');
  if (foot) {
    const total = hits.length.toLocaleString('he-IL');
    foot.textContent = hits.length > PI_LIMIT
      ? (v ? `מציג ${PI_LIMIT} מתוך ${total} התאמות — הוסף אות כדי לצמצם`
           : `מציג את ${PI_LIMIT} הראשונים מתוך ${total} שחקנים — חפש כדי למצוא מישהו מסוים`)
      : `${total} ${hits.length === 1 ? 'שחקן' : 'שחקנים'}`;
  }
}

function piLoad() {
  if (_piState === 'loading' || _piState === 'ready') return;
  _piState = 'loading';
  fetch(PI_SRC)
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(rows => {
      if (!Array.isArray(rows) || !rows.length) throw new Error('empty');
      // מפתח החיפוש מחושב פעם אחת לכל שם, לא בכל הקלדה.
      _piRows = rows.map(r => [r[0], r[1], piNorm(r[0])]);
      _piState = 'ready';
      piRender();
    })
    .catch(() => { _piState = 'error'; piRender(); });
}

function showPlayersIndex() {
  showScreen('players');
  const q = document.getElementById('pi-q');
  if (q && !q.dataset.wired) {
    q.dataset.wired = '1';
    q.addEventListener('input', piRender);
  }
  piLoad();
  piRender();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-players')?.addEventListener('click', showPlayersIndex);
  const back = document.getElementById('players-back');
  if (back) back.onclick = () => showScreen('welcome');
});
