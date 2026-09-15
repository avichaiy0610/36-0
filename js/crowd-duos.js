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

/* הצעה להוריד צמד היא הצעה נגדית, לא הצעה. אותו מפתח בדיוק עם קידומת, כדי
   ששני התורים יחיו באותה טבלה ושאי אפשר יהיה לבלבל ביניהם: "-" אינו תו חוקי
   בשם מנורמל, אז מפתח שמתחיל בו לא יכול להיות צמד רגיל. */
function cdDropKey(a, b) { return '-' + cdPairKey(a, b); }

// הכרטיס נסגר ב-mouseleave. הקלדה בשדה החיפוש מחזיקה אותו פתוח, בדיוק כמו
// שורת ההערה של דירוג הקהל.
let _cdBusy = false;
function cdBusy() { return _cdBusy; }

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

/* ── חיפוש בכל המשחק ──────────────────────────────────────────────────────
   ה-11 הוא קיצור דרך, לא הגבול. הגרסה הראשונה הגבילה את ההצעה לשחקנים
   שבמקרה נמצאים על המגרש שלך, וזה פתר בעיית ממשק על חשבון הפיצ'ר: רוב
   הצמדים שאנשים באמת זוכרים לא ייפגשו באותו הרכב במקרה.

   הסינון נשאר אותו סינון — מי שלא חלק סגל איתו אינו צמד — אבל המאגר הוא
   עכשיו כל מי ששיחק אי פעם. הבנייה עצלה: SQUADS לא קיים בהקשר של ה-harness. */
let _cdAll = null;
function cdAllNames() {
  if (_cdAll) return _cdAll;
  if (typeof SQUADS === 'undefined') return (_cdAll = []);
  const seen = new Map();
  SQUADS.forEach(sq => sq.players.forEach(p => {
    const k = crowdKey(p.name);
    // השם המוצג הוא זה של העונה החזקה ביותר שלו, כדי ששני איותים של אותו
    // אדם לא יופיעו כשתי תוצאות חיפוש.
    const cur = seen.get(k);
    if (!cur || p.ovr > cur.ovr) seen.set(k, { name: p.name, ovr: p.ovr });
  }));
  return (_cdAll = [...seen.values()].sort((a, b) => b.ovr - a.ovr).map(x => x.name));
}

// אותה נרמול שבה מסך 👥 שחקנים ועמודי /player/ מחפשים, כדי ששלושת שדות
// החיפוש באתר יענו אותו דבר על אותה הקלדה.
function cdSearchNorm(s) {
  return String(s ?? '').replace(/["'׳״.()]/g, '').replace(/[-\s]+/g, ' ').trim();
}

function cdSearch(name, q) {
  const v = cdSearchNorm(q);
  if (v.length < 2) return [];
  const self = crowdKey(name);
  const out = [];
  for (const other of cdAllNames()) {
    if (out.length >= 8) break;
    const k = crowdKey(other);
    if (k === self) continue;
    if (!cdSearchNorm(other).includes(v)) continue;
    if (typeof chemPair === 'function' && chemPair(name, other)) continue;
    if (!cdSharedSquad(name, other)) continue;
    out.push(other);
  }
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
  const mine = await cdLoadMine();
  if (!wrap.isConnected) return;

  const chip = (other, kind) => {
    const key = kind === 'drop' ? cdDropKey(name, other) : cdPairKey(name, other);
    const done = mine.has(key);
    return `<button class="cd-chip${done ? ' done' : ''}${kind === 'drop' ? ' drop' : ''}"` +
           ` type="button" data-key="${crowdEsc(key)}"${done ? ' disabled' : ''}>` +
           `${done ? '✓ ' : ''}${crowdEsc(other)}</button>`;
  };

  const cands = cdCandidates(name);
  // הצמדים שכבר במשחק, כדי שאפשר יהיה לומר שאחד מהם שגוי. 271 הצמדים נאספו
  // בכלל אוטומטי (ארבע עונות יחד, קווים תואמים), וכלל לא יודע מי באמת היה
  // צמד — אז מי שרואה טעות צריך דרך לומר את זה, ולא רק דרך להוסיף.
  // pcPartnersOf חי ב-js/player-card.js ומחזיר [{who, tier, seasons, titles}].
  // who כבר מנורמל, וזה בסדר: chemNorm ב-js/chemistry.js זהה תו-בתו ל-crowdKey,
  // אז המפתח שנבנה ממנו הוא בדיוק המפתח של CHEM_PAIRS.
  const existing = (typeof pcPartnersOf === 'function' ? pcPartnersOf(name) : [])
    .slice(0, 8).map(p => p.who || p);

  wrap.innerHTML =
    (cands.length
      ? `<div class="cd-note">מי מהם היה צמד איתו?</div><div class="cd-shelf">${
          cands.map(o => chip(o, 'add')).join('')}</div>` : '') +
    `<div class="cd-search-row">
       <input class="cd-q" maxlength="24" placeholder="או חפש כל שחקן אחר…">
     </div>
     <div class="cd-shelf cd-results"></div>` +
    (existing.length
      ? `<div class="cd-note cd-drop-note">צמד שלא היה? סמן אותו:</div>
         <div class="cd-shelf">${existing.map(o => chip(o, 'drop')).join('')}</div>` : '');

  // חיפוש מקומי לגמרי — SQUADS כבר בזיכרון, אז אין כאן בקשת רשת ואין השהיה.
  const q = wrap.querySelector('.cd-q');
  const res = wrap.querySelector('.cd-results');
  if (q) {
    q.addEventListener('focus', () => { _cdBusy = true; });
    q.addEventListener('blur',  () => { _cdBusy = false; });
    q.addEventListener('input', () => {
      const hits = cdSearch(name, q.value);
      res.innerHTML = hits.map(o => chip(o, 'add')).join('');
      if (typeof crowdResized === 'function') crowdResized(wrap);
    });
  }

  wrap.addEventListener('click', async ev => {
    const b = ev.target.closest('.cd-chip');
    if (!b || b.disabled) return;
    b.disabled = true;
    const r = await cdSuggest(b.dataset.key);
    if (!b.isConnected) return;
    if (r.ok) {
      b.classList.add('done');
      b.textContent = '✓ ' + b.textContent;
    } else {
      b.disabled = false;
      const n = wrap.querySelector('.cd-note');
      if (n) n.textContent = r.error === 'rate limited'
        ? 'יותר מדי הצעות בשעה האחרונה.' : 'לא נשלח, נסה שוב.';
    }
  });

  if (typeof crowdResized === 'function') crowdResized(wrap);
}
