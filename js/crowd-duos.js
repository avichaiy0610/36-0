// js/crowd-duos.js
// ─── הצעת צמדים ───────────────────────────────────────────────────────────────
//
// chemistry_duos.csv נאסף ביד לפי כלל: ארבע עונות יחד, קווים תואמים, אליפויות
// משותפות. כלל טוב, ועדיין כלל — הוא לא יכול לדעת מי נזכר. שני בלמים משש עונות
// שקטות עוברים אותו; צמד שכולם זוכרים משתי עונות סוערות לא.
//
// החלוקה שקובעת את כל הקובץ הזה: **הקהל מציע זוג, לא דרגה.** הדרגה היא פונקציה
// של עובדות (tierOf ב-scripts/build_chemistry.js) ושחקן מזדמן לא יכול לשפוט
// אותה. מה שהוא כן יכול לומר הוא הדבר היחיד שאין לו מקור — ששני אלה היו צמד.
//
// שום דבר כאן לא נוגע במשחק. הצעה יושבת במסד עד שהבעלים מאשר ומריץ סקריפט.

/* ── המפתח ─────────────────────────────────────────────────────────────────
   שני crowdKey ממוינים ומחוברים ב-| — בדיוק הפורמט של CHEM_PAIRS ב-
   js/chem-data.js, שנוצר ב-scripts/build_chem_js.js עם אותה נרמול בדיוק. כך
   הצעה וצמד שכבר קיים הם אותה מחרוזת ואפשר להשוות בלי לתרגם אף אחד מהם. */
function cdPairKey(a, b) {
  const x = crowdKey(a), y = crowdKey(b);
  return (x < y ? x + '|' + y : y + '|' + x);
}

/* ── מי בכלל חלק מגרש עם מי ────────────────────────────────────────────────
   שני שחקנים שלא היו באותו סגל באותה עונה אינם צמד, ואין טעם להציע אותם.
   נבנה עצל: SQUADS לא קיים בהקשר של ה-harness, והפניה אליו ברמה העליונה
   הייתה הורגת אותו. */
let _cdSquads = null;
function cdSquadsOf(name) {
  if (typeof SQUADS === 'undefined') return null;
  if (!_cdSquads) {
    _cdSquads = new Map();
    SQUADS.forEach(sq => sq.players.forEach(p => {
      const k = crowdKey(p.name);
      if (!_cdSquads.has(k)) _cdSquads.set(k, new Set());
      _cdSquads.get(k).add(sq.id);
    }));
  }
  return _cdSquads.get(crowdKey(name)) || null;
}

function cdSharedSquad(a, b) {
  const sa = cdSquadsOf(a), sb = cdSquadsOf(b);
  if (!sa || !sb) return false;
  for (const id of sa) if (sb.has(id)) return true;
  return false;
}

/* ── מי אפשר להציע ────────────────────────────────────────────────────────
   מתוך ה-11 שעל המגרש, ולא מתוך 2,724 השמות: בחירה מרשימה של אלפים בתוך
   כרטיס שנפתח בריחוף היא מסך חיפוש, לא נגיעה. ומעבר לזה — אתה מסתכל על
   הקבוצה שהרכבת, וזה הרגע שבו אתה חושב מי משתלב עם מי.

   נופלים החוצה: הוא עצמו, מי שלא חלק איתו סגל, ומי שכבר צמד שלו — האחרון
   כבר מוצג ככה בסקשן שמעל. */
function cdCandidates(name) {
  if (typeof state === 'undefined' || !state.picks) return [];
  const self = crowdKey(name);
  const seen = new Set();
  const out = [];
  state.picks.forEach(pick => {
    if (!pick || !pick.player) return;
    const other = pick.player.name;
    const k = crowdKey(other);
    if (k === self || seen.has(k)) return;
    seen.add(k);
    if (typeof chemPair === 'function' && chemPair(name, other)) return;
    if (!cdSharedSquad(name, other)) return;
    out.push(other);
  });
  return out;
}

/* ── רשת ───────────────────────────────────────────────────────────────────
   נכשל בשקט, כמו כל שאר שכבת הרשת של דירוגי הקהל: זה נפתח בתוך דראפט חי. */
let _cdMine = null;

async function cdLoadMine() {
  if (_cdMine) return _cdMine;
  _cdMine = new Set();
  try {
    const { data, error } = await _supabase.rpc('my_duo_suggestions', {
      p_voter: crowdClientId(),
    });
    if (!error && Array.isArray(data)) data.forEach(r => _cdMine.add(r.pair_key));
  } catch (e) { /* נשאר ריק — לכל היותר נציע משהו שכבר הצעת, וזה no-op במסד */ }
  return _cdMine;
}

async function cdSuggest(pairKey) {
  try {
    const { data, error } = await _supabase.rpc('suggest_duo', {
      p_pair_key: pairKey, p_voter: crowdClientId(),
    });
    if (error || (data && data.error)) return { ok: false, error: (data && data.error) || 'network' };
    if (_cdMine) _cdMine.add(pairKey);
    return { ok: true };
  } catch (e) { return { ok: false, error: 'network' }; }
}

/* ── ההצעה בכרטיס ─────────────────────────────────────────────────────────
   כפתור אחד במנוחה. נפתח לשורת צ'יפים רק כשמבקשים, בדיוק כמו החוגה — הכרטיס
   כבר צפוף ואסור לו לגדול בשביל משהו שרוב הפתיחות לא נוגעות בו. */
function cdBlock(name) {
  if (!name || !cdCandidates(name).length) return '';
  return `<div class="cd-wrap" data-name="${crowdEsc(name)}">` +
         `<button class="cd-open" type="button">＋ הצע צמד</button></div>`;
}

function cdMount(root) {
  try {
    const wrap = (root || document).querySelector('.cd-wrap:not([data-ready])');
    if (!wrap) return;
    wrap.setAttribute('data-ready', '1');
    wrap.querySelector('.cd-open').addEventListener('click', () => cdOpen(wrap));
  } catch (e) { /* הכרטיס לא נפגע */ }
}

async function cdOpen(wrap) {
  const name = wrap.dataset.name;
  const cands = cdCandidates(name);
  if (!cands.length) return;
  const mine = await cdLoadMine();
  if (!wrap.isConnected) return;

  wrap.innerHTML =
    `<div class="cd-note">מי מהם היה צמד איתו?</div>` +
    `<div class="cd-shelf">${cands.map(o => {
      const key = cdPairKey(name, o);
      const done = mine.has(key);
      return `<button class="cd-chip${done ? ' done' : ''}" type="button"` +
             ` data-key="${crowdEsc(key)}"${done ? ' disabled' : ''}>` +
             `${done ? '✓ ' : ''}${crowdEsc(o)}</button>`;
    }).join('')}</div>`;

  wrap.querySelectorAll('.cd-chip:not(.done)').forEach(chip => {
    chip.addEventListener('click', async () => {
      chip.disabled = true;
      const r = await cdSuggest(chip.dataset.key);
      if (!chip.isConnected) return;
      if (r.ok) {
        chip.classList.add('done');
        chip.textContent = '✓ ' + chip.textContent;
      } else {
        chip.disabled = false;
        const n = wrap.querySelector('.cd-note');
        if (n) n.textContent = r.error === 'rate limited'
          ? 'יותר מדי הצעות בשעה האחרונה.' : 'לא נשלח, נסה שוב.';
      }
    });
  });

  if (typeof crowdResized === 'function') crowdResized(wrap);
}
