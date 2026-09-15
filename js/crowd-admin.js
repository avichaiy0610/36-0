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
  const n = document.querySelectorAll('#ca-rows tr[data-key]').length;
  caStatus(`${n} מחלוקות` + (_caSkip ? ` · ${_caSkip}` : ''));
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
    if (r.avg_trimmed == null) return null;   // פחות מ-5 הצבעות: אין דירוג קהל
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
        data-old="${r.official}" data-new="${r.avg_trimmed}">
      <td>${caEsc(r.player_key)}</td>
      <td dir="ltr">${caEsc(r.season)}</td>
      <td>${r.teams.map(caTeamName).map(caEsc).join(' · ')}</td>
      <td dir="ltr"${r.ovrs.length > 1
        ? ` title="אותו שם-עונה יושב ביותר מסגל אחד, עם דירוג שונה. המוצג הוא הקרוב ביותר לדירוג הקהל — כלומר הפער הקטן ביותר האפשרי."` : ''}>${r.official}${r.ovrs.length > 1
        ? ` <span class="ca-alt">(${r.ovrs.filter(o => o !== r.official)
             .sort((a, b) => b - a).join('/')})</span>` : ''}</td>
      <td dir="ltr">${r.avg_trimmed}</td>
      <td dir="ltr" class="${r.gap > 0 ? 'ca-up' : 'ca-down'}">${r.gap > 0 ? '+' : ''}${r.gap}</td>
      <td dir="ltr">${r.n}</td>
      <td>${caTagCell(r.tag_top, r.tag_top_n)}</td>
      <td class="ca-act"><button class="ca-ok" type="button">✅</button>
          <button class="ca-no" type="button">🗑️</button></td>
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
    return { ok: true };
  } catch (e) { return { ok: false, msg: 'network' }; }
}

function caInit() {
  const sec = document.getElementById('ca-section');
  if (!sec) return;

  document.getElementById('ca-rows').addEventListener('click', async ev => {
    const ok = ev.target.classList.contains('ca-ok');
    const no = ev.target.classList.contains('ca-no');
    if (!ok && !no) return;
    const tr = ev.target.closest('tr');
    if (!tr || !tr.dataset.key) return;
    caBusy(tr, true);
    const args = { p_player_key: tr.dataset.key, p_season: tr.dataset.season };
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
