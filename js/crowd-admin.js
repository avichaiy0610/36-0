// js/crowd-admin.js
// ─── ⭐ דירוגי הקהל — הדשבורד ─────────────────────────────────────────────────
//
// הקהל מצביע, כאן מחליטים. "קבל" לא נוגע במשחק: הוא רושם שורה ב-
// rating_approvals, ו-scripts/apply_crowd_ratings.js הוא זה שכותב ל-data.js.
//
// הטבלה הזאת היא לא "כל מה שהקהל אמר" — זו רשימה של המקומות שבהם הקהל והדאטה
// לא מסכימים, ממוינת לפי כמה שווה להקשיב לאי-ההסכמה: |קהל − רשמי| × log(n).
// מחלוקת חזקה שמגובה בהרבה מצביעים עולה מעל מחלוקת פראית שמגובה בחמישה.
//
// הדירוג הרשמי חי ב-js/data.js ולא במסד, ולכן ה-RPC מחזיר רק את ההצבר
// וההצלבה נעשית כאן.

// פער קטן מזה הוא רעש. הקהל והדירוג לא אמורים להיות זהים, ותור שמתמלא
// בהפרשים של נקודה אחת הוא תור שלא קוראים.
const CA_MIN_GAP = 2;

/* ── ההצלבה מול SQUADS ──────────────────────────────────────────────────────
   המפתח נבנה עם crowdKey מ-js/crowd.js, ולא עם נרמול מקומי. ההצבעות תויקו
   תחת המפתח הזה; כל נרמול אחר יפספס בדיוק את השמות עם גרש, שהם מאות בדאטה
   הזאת (ויקטור פאצ'ו, מתי חג'ג', ז'אן טלסניקוב).

   ולמה ערך המפה הוא רשימה ולא רשומה אחת: אותו שחקן-עונה מופיע ביותר ממועדון
   אחד 467 פעמים בדאטה, ומהן 128 עם דירוג שונה בין המועדונים — ראובן עטר
   1999/00 יושב בשלושה סגלים. ההצבעה מתויקת לפי (שם, עונה) בלבד ולא יודעת
   מאיזה סגל הכרטיס נפתח, אז "הדירוג הרשמי" של שחקן-עונה כזה הוא באמת לא מספר
   אחד. מפה שדורסת (m.set בלולאה) הייתה בוחרת את הסגל האחרון שבמקרה נסרק,
   כלומר פער — ומיקום בתור — שנקבע בסדר של קובץ. */
let _caIndex = null;
function caIndex() {
  if (_caIndex) return _caIndex;
  const m = new Map();
  SQUADS.forEach(sq => sq.players.forEach(p => {
    const k = crowdKey(p.name) + '|' + sq.season;
    let rec = m.get(k);
    if (!rec) m.set(k, rec = { ovrs: [], teams: [] });
    if (rec.ovrs.indexOf(p.ovr) === -1) rec.ovrs.push(p.ovr);
    if (rec.teams.indexOf(sq.teamId) === -1) rec.teams.push(sq.teamId);
  }));
  return (_caIndex = m);
}

/* כשיש כמה דירוגים רשמיים לאותו שחקן-עונה, הנבחר הוא הקרוב ביותר לדירוג
   הקהל — כלומר הפער המוצג הוא הקטן האפשרי. זו הבחירה השמרנית בכוונה: שורה
   נכנסת לתור רק כשהקהל חולק על כל הגרסאות של המספר הרשמי, ולא כשהוא מסכים
   עם אחת מהן ובמקרה נמדד מול אחרת. */
function caOfficial(ovrs, avg) {
  return ovrs.reduce((best, o) =>
    Math.abs(o - avg) < Math.abs(best - avg) ? o : best, ovrs[0]);
}

function caEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function caTeamName(id) {
  return (typeof TEAMS !== 'undefined' && TEAMS[id]) ? TEAMS[id].name : id;
}

// תגית שאינה במדף — מפתח שהוסר מ-CROWD_TAGS ועוד יושב בהצבעות ישנות — מחזירה
// undefined, ו-.icon עליה היה זורק בתוך התבנית ומוחק את כל הטבלה. שורה אחת
// חריגה לא מפילה את התור.
function caTagCell(key, count) {
  const t = key && CROWD_TAGS[key];
  if (!t) return key ? caEsc(key) : '—';
  return `${t.icon} ${caEsc(t.label)} <span dir="ltr">(${count})</span>`;
}

function caStatus(msg) {
  const el = document.getElementById('ca-status');
  if (el) el.textContent = msg || '';
}

/* כמה שורות סוננו ולמה — נקבע בטעינה ונשאר נכון גם אחרי שהבעלים מוריד שורות.
   הספירה עצמה נמדדת מה-DOM ולא מוחזקת כמונה: שורה יורדת מהמסך רק כשהשרת אישר,
   ומונה נפרד שמתעדכן בנפרד הוא בדיוק מה שנשאר תקוע על "4 מחלוקות" מעל טבלה
   שבה שתיים. */
let _caSkip = '';
function caCount() {
  const rows = document.querySelectorAll('#ca-rows tr[data-key]');
  let waiting = 0;
  rows.forEach(tr => { if (tr.dataset.waiting === '1') waiting++; });
  const n = rows.length - waiting;
  caStatus(`${n} מחלוקות` + (waiting ? ` · ${waiting} ממתינות להצבעות` : '') +
           (_caSkip ? ` · ${_caSkip}` : ''));
}

async function caLoadRatings() {
  const body = document.getElementById('ca-rows');
  body.innerHTML = '<tr><td colspan="9">טוען…</td></tr>';
  caStatus('');
  const { data, error } = await _supabase.rpc('crowd_queue');
  if (error) {
    body.innerHTML = '<tr><td colspan="9">שגיאה בטעינה</td></tr>';
    _caSkip = '';
    caStatus('crowd_queue: ' + error.message);
    return;
  }

  const idx = caIndex();
  let missing = 0, small = 0;
  const rows = (data || []).map(r => {
    const rec = idx.get(r.player_key + '|' + r.season);
    // שחקן-עונה שכבר לא קיים בדאטה. נספר ומדווח ולא נבלע בשקט: אם זה קורה
    // להרבה שורות, המפתח שההצבעות מתויקות תחתיו הפסיק להסכים עם SQUADS, וזה
    // באג שנראה בדיוק כמו "אין מחלוקות".
    if (!rec) { missing++; return null; }

    // שורה בלי דירוג קהל — פחות מחמש הצבעות נספרות — נשארת בתור ולא נופלת.
    // היא לא ניתנת לאישור, וזה בסדר: היא שם כדי שתדע שמישהו הצביע. תור שריק
    // כשאין מספיק הצבעות נראה זהה לתור שבור, ובשבועות הראשונים זה המצב הרגיל.
    if (r.avg_trimmed == null) {
      return Object.assign({}, r, {
        official: caOfficial(rec.ovrs, rec.ovrs[0]), gap: null,
        ovrs: rec.ovrs, teams: rec.teams, weight: -1,
      });
    }

    const official = caOfficial(rec.ovrs, r.avg_trimmed);
    const gap = r.avg_trimmed - official;
    if (Math.abs(gap) < CA_MIN_GAP) { small++; return null; }
    return Object.assign({}, r, {
      official, gap, ovrs: rec.ovrs, teams: rec.teams,
      weight: Math.abs(gap) * Math.log(r.n),
    });
  }).filter(Boolean).sort((a, b) => b.weight - a.weight);

  const skipped = [];
  if (small)   skipped.push(`${small} מתחת לסף הפער (${CA_MIN_GAP})`);
  if (missing) skipped.push(`${missing} לא נמצאו בדאטה`);
  _caSkip = skipped.join(' · ');

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="9">אין מחלוקות פתוחות.</td></tr>';
    caCount();
    return;
  }

  // data-old הוא הדירוג הרשמי שנבחר, והוא זה שנשלח כ-p_old. השאר מוצגים
  // לצידו כדי שיהיה ברור שהמספר לא יחיד.
  body.innerHTML = rows.map(r => `
    <tr data-key="${caEsc(r.player_key)}" data-season="${caEsc(r.season)}"
        data-old="${r.official}" data-new="${r.avg_trimmed}"
        data-waiting="${r.gap === null ? 1 : 0}">
      <td>${caEsc(r.player_key)}</td>
      <td dir="ltr">${caEsc(r.season)}</td>
      <td>${r.teams.map(caTeamName).map(caEsc).join(' · ')}</td>
      <td dir="ltr"${r.ovrs.length > 1
        ? ` title="אותו שם-עונה יושב ביותר מסגל אחד, עם דירוג שונה. המוצג הוא הקרוב ביותר לדירוג הקהל — כלומר הפער הקטן ביותר האפשרי."` : ''}>${r.official}${r.ovrs.length > 1
        ? ` <span class="ca-alt">(${r.ovrs.filter(o => o !== r.official)
             .sort((a, b) => b - a).join('/')})</span>` : ''}</td>
      <td dir="ltr">${r.gap === null ? '—' : r.avg_trimmed}</td>
      <td dir="ltr" class="${r.gap === null ? 'ca-alt' : r.gap > 0 ? 'ca-up' : 'ca-down'}">${
        r.gap === null ? `פחות מ-${CROWD_MIN_VOTES}` : (r.gap > 0 ? '+' : '') + r.gap}</td>
      <td><button class="ca-peek" type="button" dir="ltr" title="הצג כל הצבעה בנפרד">${r.n} ▾</button></td>
      <td>${caTagCell(r.tag_top, r.tag_top_n)}</td>
      <td class="ca-act"><button class="ca-pub${r.published ? ' on' : ''}" type="button"${
            r.gap === null ? ' disabled' : ''}
            title="${r.gap === null ? 'אין מספיק הצבעות נספרות'
              : r.published ? 'מוצג לציבור — לחץ כדי להסתיר' : 'מוסתר — לחץ כדי להציג לציבור'}"
            >${r.published ? '👁' : '🚫'}</button>
          <button class="ca-ok" type="button"${r.gap === null ? ' disabled title="אין מספיק הצבעות נספרות"' : ' title="קבל את הדירוג לדאטה"'}>✅</button>
          <button class="ca-no" type="button" title="הורד מהתור">🗑️</button></td>
    </tr>`).join('');
  caCount();
}

async function caLoadNotes() {
  const body = document.getElementById('ca-notes');
  body.innerHTML = '<tr><td colspan="5">טוען…</td></tr>';
  const { data, error } = await _supabase.rpc('notes_queue');
  if (error) { body.innerHTML = '<tr><td colspan="5">שגיאה בטעינה</td></tr>'; return; }
  if (!data || !data.length) {
    body.innerHTML = '<tr><td colspan="5">אין הערות ממתינות.</td></tr>';
    return;
  }
  body.innerHTML = data.map(nt => `
    <tr data-id="${nt.id}">
      <td>${caEsc(nt.player_key)}</td>
      <td dir="ltr">${caEsc(nt.season)}</td>
      <td>${caEsc(nt.username)}</td>
      <td class="ca-body">${caEsc(nt.body)}</td>
      <td class="ca-act"><button class="ca-note-ok" type="button">✅</button>
          <button class="ca-note-no" type="button">🗑️</button></td>
    </tr>`).join('');
}

/* ── לחיצה אחת, תשובה אחת ──────────────────────────────────────────────────
   השורה יורדת מהמסך רק אחרי שהשרת אמר ok. ה-RPC-ים כאן מחזירים
   {"error": "forbidden"} כ-200 ולא כשגיאת רשת, אז מחיקה אופטימית של השורה
   הייתה אומרת לבעלים שהוא אישר דירוג בזמן ששום דבר לא נכתב — וזה השקר הכי
   יקר שיש למסך הזה, כי הוא מתגלה רק בטאסק 8 כשהתור יוצא ריק.

   והכפתורים ננעלים כל עוד הבקשה באוויר: לחיצה כפולה על ✅ היא שתי בקשות על
   אותה שורה, ועל 🗑️ היא שתי כתיבות ל-rating_dismissals. */
function caBusy(tr, on) {
  tr.classList.toggle('ca-wait', !!on);
  tr.querySelectorAll('button').forEach(b => { b.disabled = !!on; });
}

function caFailed(tr, msg) {
  caBusy(tr, false);
  const cell = tr.querySelector('.ca-act');
  if (cell) {
    let e = cell.querySelector('.ca-err');
    if (!e) { e = document.createElement('div'); e.className = 'ca-err'; cell.appendChild(e); }
    e.textContent = msg;
  }
}

// כל קריאה כאן עטופה: הדשבורד הוא מסך אחד ארוך, וחריגה אחת שלא נתפסה משאירה
// את השורה נעולה בלי שום הסבר.
async function caCall(fn, args) {
  try {
    const { data, error } = await _supabase.rpc(fn, args);
    if (error) return { ok: false, msg: error.message };
    if (data && data.error) return { ok: false, msg: data.error };
    // data מוחזר כדי ש-set_vote_excluded יוכל להחזיר את ההצבר החדש באותה
    // נסיעה. שאר הקוראים מתעלמים ממנו.
    return { ok: true, data };
  } catch (e) { return { ok: false, msg: 'network' }; }
}

function caInit() {
  const sec = document.getElementById('ca-section');
  if (!sec) return;

  document.getElementById('ca-rows').addEventListener('click', async ev => {
    const ok  = ev.target.classList.contains('ca-ok');
    const no  = ev.target.classList.contains('ca-no');
    const pub = ev.target.classList.contains('ca-pub');
    const peek = ev.target.classList.contains('ca-peek');
    if (!ok && !no && !pub && !peek) return;
    const tr = ev.target.closest('tr');
    if (!tr || !tr.dataset.key) return;

    // פתיחת פירוט ההצבעות לא משנה כלום ולא נוגעת בשרת מעבר לקריאה, אז היא
    // לא נועלת את השורה ולא עוברת דרך caBusy.
    if (peek) { cdaOpenVotes(tr); return; }

    caBusy(tr, true);
    const args = { p_player_key: tr.dataset.key, p_season: tr.dataset.season };

    // פרסום הוא החלטה נפרדת מאישור, ולכן הוא לא מוריד את השורה מהתור: אפשר
    // להציג לציבור מספר בלי לקחת אותו לדאטה, ואפשר לקחת אותו לדאטה בלי
    // להציג. הכפתור מתחלף במקום והשורה נשארת.
    if (pub) {
      const btn = ev.target;
      const turningOn = !btn.classList.contains('on');
      const r = await caCall('publish_crowd', Object.assign({ p_on: turningOn }, args));
      caBusy(tr, false);
      if (!r.ok) return caFailed(tr, r.msg);
      btn.classList.toggle('on', turningOn);
      btn.textContent = turningOn ? '👁' : '🚫';
      btn.title = turningOn ? 'מוצג לציבור — לחץ כדי להסתיר'
                            : 'מוסתר — לחץ כדי להציג לציבור';
      return;
    }

    const r = ok
      ? await caCall('approve_rating',
          Object.assign({ p_old: +tr.dataset.old, p_new: +tr.dataset.new }, args))
      : await caCall('dismiss_rating', args);
    if (r.ok) { tr.remove(); caCount(); } else caFailed(tr, r.msg);
  });

  document.getElementById('ca-notes').addEventListener('click', async ev => {
    const ok = ev.target.classList.contains('ca-note-ok');
    const no = ev.target.classList.contains('ca-note-no');
    if (!ok && !no) return;
    const tr = ev.target.closest('tr');
    if (!tr || !tr.dataset.id) return;
    caBusy(tr, true);
    const r = await caCall('moderate_note',
      { p_id: +tr.dataset.id, p_status: ok ? 'approved' : 'rejected' });
    if (r.ok) tr.remove(); else caFailed(tr, r.msg);
  });

  const refresh = document.getElementById('ca-refresh');
  if (refresh) refresh.onclick = () => { caLoadRatings(); caLoadNotes(); };

  caLoadRatings();
  caLoadNotes();
}

/* ═══ 🔗 צמדים שהוצעו ══════════════════════════════════════════════════════
   הקהל מציע זוג בלבד. הדרגה שהצמד יקבל מחושבת כאן מהדאטה — אותו כלל בדיוק
   כמו scripts/build_chemistry.js:109 — ומוצגת לפני האישור ולא אחריו, כי צמד
   הוא שינוי איזון: CHEM_BONUS נותן 0.4 עד 1.0 נקודות דירוג. */

// זהה ל-tierOf ב-scripts/build_chemistry.js. אם אחד מהם זז, השני חייב לזוז.
function cdTierOf(seasons, titles) {
  if (seasons >= 7 || (seasons >= 4 && titles >= 2)) return 3;
  if (seasons >= 4 || (seasons >= 3 && titles >= 1)) return 2;
  return 1;
}

// עונות משותפות ואליפויות משותפות, מ-SQUADS ומהטבלאות. אותה ספירה שהמחולל
// עושה — צמד נספר פעם אחת לעונה גם אם שיחקו בשני מועדונים.
let _cdaIdx = null;
function cdaIndex() {
  if (_cdaIdx) return _cdaIdx;
  _cdaIdx = new Map();
  SQUADS.forEach(sq => sq.players.forEach(p => {
    const k = crowdKey(p.name);
    if (!_cdaIdx.has(k)) _cdaIdx.set(k, []);
    _cdaIdx.get(k).push({ id: sq.id, teamId: sq.teamId, season: sq.season });
  }));
  return _cdaIdx;
}

function cdaTogether(keyA, keyB) {
  const idx = cdaIndex();
  const a = idx.get(keyA) || [], b = idx.get(keyB) || [];
  const bIds = new Set(b.map(x => x.id));
  const seasons = new Set(), rows = [];
  a.forEach(x => { if (bIds.has(x.id)) { seasons.add(x.season); rows.push(x); } });
  let titles = 0;
  if (typeof LEAGUE_TABLES !== 'undefined') {
    rows.forEach(r => {
      const t = LEAGUE_TABLES[r.season];
      if (t && t[0] && t[0].teamId === r.teamId) titles++;
    });
  }
  return { seasons: seasons.size, titles, rows };
}

async function cdaLoad() {
  const body = document.getElementById('cda-rows');
  if (!body) return;
  body.innerHTML = '<tr><td colspan="6">טוען…</td></tr>';
  const { data, error } = await _supabase.rpc('duo_queue');
  if (error) { body.innerHTML = '<tr><td colspan="6">שגיאה בטעינה</td></tr>'; return; }
  if (!data || !data.length) { body.innerHTML = '<tr><td colspan="6">אין הצעות פתוחות.</td></tr>'; return; }

  const shipped = (typeof CHEM_PAIRS !== 'undefined') ? CHEM_PAIRS : {};
  body.innerHTML = data.map(r => {
    // מפתח שמתחיל ב-"-" הוא הצעה **להוריד** צמד קיים, לא להוסיף אחד. בלי
    // ההבחנה הזאת אישור של "זה לא צמד" היה מוסיף אותו למשחק — היפוך מוחלט
    // של מה שהמצביעים ביקשו, ובלי שום סימן על המסך.
    const isDrop = r.pair_key.charAt(0) === '-';
    const bareKey = isDrop ? r.pair_key.slice(1) : r.pair_key;
    const [ka, kb] = bareKey.split('|');
    const t = cdaTogether(ka, kb);
    const already = !!shipped[bareKey];
    const tier = t.seasons ? cdTierOf(t.seasons, t.titles) : 0;
    return `
    <tr data-key="${caEsc(r.pair_key)}" data-drop="${isDrop ? 1 : 0}">
      <td>${isDrop ? '<span class="cda-drop">להוריד</span> ' : ''}${caEsc(ka)} + ${caEsc(kb)}</td>
      <td dir="ltr">${r.n}</td>
      <td dir="ltr">${t.seasons}</td>
      <td dir="ltr">${t.titles}</td>
      <td>${isDrop
           ? (already ? '<span class="cda-drop">יוסר מהמשחק</span>'
                      : '<span class="ca-alt">כבר לא במשחק</span>')
           : already ? '<span class="ca-alt">כבר במשחק</span>'
           : !t.seasons ? '<span class="ca-alt">לא חלקו סגל</span>'
           : `דרגה ${tier} · +${(({1:0.4,2:0.7,3:1})[tier])}`}</td>
      <td class="ca-act">
        <button class="cda-ok" type="button"${
          (isDrop ? !already : (already || !t.seasons)) ? ' disabled' : ''}>✅</button>
        <button class="cda-no" type="button">🗑️</button></td>
    </tr>`;
  }).join('');
}

function cdaInit() {
  const body = document.getElementById('cda-rows');
  if (!body) return;
  body.addEventListener('click', async ev => {
    const ok = ev.target.classList.contains('cda-ok');
    const no = ev.target.classList.contains('cda-no');
    if (!ok && !no) return;
    const tr = ev.target.closest('tr');
    if (!tr || !tr.dataset.key) return;
    caBusy(tr, true);
    const r = await caCall(ok ? 'approve_duo' : 'dismiss_duo',
                           { p_pair_key: tr.dataset.key });
    if (r.ok) tr.remove(); else caFailed(tr, r.msg);
  });
  cdaLoad();
}

/* ═══ פירוט ההצבעות ════════════════════════════════════════════════════════
   הממוצע הגזום מפיל קיצוניות של התפלגות. הוא לא יודע לזהות כוונה: חמישה
   מצביעים כנים ואחד שבא לקבור שחקן מייצרים התפלגות שהגזימה לא מבדילה מפיזור
   רגיל. סטטיסטיקה לא רואה מניע — בן אדם שמסתכל על ההצבעות כן.

   מה שמוצג: המספר, התגית, האם המצביע היה מחובר, ומתי. **לא מי.** לשפוט הצבעה
   לא דורש שם, ומהרגע שיש פנים הבעלים מודרר אנשים ולא נתונים. */

function cdaVoteRow(v) {
  const tag = v.tag && CROWD_TAGS[v.tag];
  return `<div class="cv-row${v.excluded ? ' out' : ''}" data-id="${v.id}">
    <span class="cv-ovr" dir="ltr">${v.ovr}</span>
    <span class="cv-tag">${tag ? tag.icon + ' ' + caEsc(tag.label) : '—'}</span>
    <span class="cv-who">${v.is_user ? '👤 מחובר' : 'אנונימי'}</span>
    <button class="cv-x" type="button" title="${v.excluded
      ? 'הוחרגה מהממוצע — לחץ כדי להחזיר' : 'הוצא מהממוצע'}">${v.excluded ? '↩' : '⊘'}</button>
  </div>`;
}

async function cdaOpenVotes(tr) {
  const key = tr.dataset.key, season = tr.dataset.season;
  let box = tr.nextElementSibling;
  if (box && box.classList.contains('cv-wrap')) { box.remove(); return; }  // toggle

  box = document.createElement('tr');
  box.className = 'cv-wrap';
  box.innerHTML = `<td colspan="9"><div class="cv-body">טוען…</div></td>`;
  tr.after(box);

  const { data, error } = await _supabase.rpc('crowd_votes_for',
    { p_player_key: key, p_season: season });
  const body = box.querySelector('.cv-body');
  if (error) { body.textContent = 'crowd_votes_for: ' + error.message; return; }
  if (!data || !data.length) { body.textContent = 'אין הצבעות.'; return; }

  body.innerHTML = `<div class="cv-head">${data.length} הצבעות · ` +
    `${data.filter(v => !v.excluded).length} נספרות</div>` +
    data.map(cdaVoteRow).join('');

  body.addEventListener('click', async ev => {
    if (!ev.target.classList.contains('cv-x')) return;
    const row = ev.target.closest('.cv-row');
    const on = !row.classList.contains('out');
    ev.target.disabled = true;
    const r = await caCall('set_vote_excluded', { p_id: +row.dataset.id, p_on: on });
    ev.target.disabled = false;
    if (!r.ok) { ev.target.title = r.msg || 'לא נשמר'; return; }
    row.classList.toggle('out', on);
    ev.target.textContent = on ? '↩' : '⊘';
    ev.target.title = on ? 'הוחרגה מהממוצע — לחץ כדי להחזיר' : 'הוצא מהממוצע';
    // השרת מחזיר את ההצבר החדש, אז השורה שמעל מתעדכנת מאותה נסיעה ולא
    // מטעינה מחדש של כל התור.
    /* המספרים בשורה שמעל מתעדכנים תמיד, גם — ובעיקר — כשהקהל נשאר בלי דעה.
       הוצאת הצבעה יכולה להוריד את הספירה מתחת לחמש, ואז crowd_trimmed_avg
       מחזיר NULL. גרסה קודמת כאן בדקה `if (d.avg != null)` ודילגה על העדכון
       בדיוק במקרה הזה, כלומר השאירה על המסך דירוג קהל ופער שכבר לא קיימים.
       זה הרגע שבו המסך משקר הכי בקלות: הכל נראה תקין והמספר פשוט ישן. */
    const d = r.data || {};
    const cells = tr.querySelectorAll('td');
    const nBtn = cells[6].querySelector('.ca-peek');
    if (nBtn) nBtn.textContent = (d.n ?? 0) + ' ▾'; else cells[6].textContent = d.n ?? 0;

    const okBtn = tr.querySelector('.ca-ok');
    const pubBtn = tr.querySelector('.ca-pub');
    // התגית היא חלק מהשורה כמו כל השאר. עדכון חלקי מסוכן יותר מאי-עדכון:
    // שורה שלא זזה בכלל נראית ישנה, ושורה שבה שלושה תאים זזו ואחד לא נראית
    // סמכותית ושקרית — התגית המשיכה להכריז (5) ליד "אין מספיק הצבעות".
    // 'tag' in d ולא d.tag: הפונקציה הישנה במסד לא מחזירה את השדה בכלל, ובלי
    // הבדיקה הזאת התגית הייתה נמחקת ל-— בכל לחיצה עד שהמיגרציה תוחל.
    if ('tag' in d) cells[7].innerHTML = caTagCell(d.tag, d.tag_n);

    if (d.avg == null) {
      // אין דירוג קהל. אין גם מה לאשר ואין מה לפרסם.
      cells[4].textContent = '—';
      cells[5].textContent = `פחות מ-${CROWD_MIN_VOTES}`;
      cells[5].className = 'ca-alt';
      delete tr.dataset.new;
      if (okBtn)  { okBtn.disabled = true;  okBtn.title = 'אין מספיק הצבעות נספרות'; }
      if (pubBtn) { pubBtn.disabled = true; pubBtn.title = 'אין מספיק הצבעות נספרות'; }
    } else {
      cells[4].textContent = d.avg;
      const gap = d.avg - (+tr.dataset.old);
      cells[5].textContent = (gap > 0 ? '+' : '') + gap;
      cells[5].className = gap > 0 ? 'ca-up' : 'ca-down';
      tr.dataset.new = d.avg;
      if (okBtn)  { okBtn.disabled = false;  okBtn.title = 'קבל את הדירוג לדאטה'; }
      if (pubBtn) { pubBtn.disabled = false; pubBtn.title = pubBtn.classList.contains('on')
        ? 'מוצג לציבור — לחץ כדי להסתיר' : 'מוסתר — לחץ כדי להציג לציבור'; }
    }
    const head = body.querySelector('.cv-head');
    if (head) head.textContent = `${data.length} הצבעות · ` +
      `${body.querySelectorAll('.cv-row:not(.out)').length} נספרות`;
  });
}
