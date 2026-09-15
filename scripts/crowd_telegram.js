#!/usr/bin/env node
// ─── תור דירוגי הקהל והצמדים, לטלגרם ────────────────────────────────────────
//
// הדשבורד עובד, אבל הוא דורש לפתוח מחשב. התור נע בקצב שבו הבעלים מסתכל בו,
// ומאז מיגרציה 20260915000001 הקצב הזה הוא גם הקצב שבו הפיצ'ר נחשף לציבור —
// שום דירוג לא מוצג לפני שהוא פורסם. אז צוואר הבקבוק הוא לא ההצבעות, הוא
// שלוש לחיצות בטלפון.
//
// זה בדיוק מה שהאתגרים כבר עושים: הצעה נשלחת לטלגרם עם כפתורים, והוובהוק
// supabase/functions/challenge-tap עונה ברגע שלוחצים.
//
// ── החלוקה שחשוב להבין לפני שנוגעים כאן ────────────────────────────────────
// **השולח מחליט מה הלחיצה תעשה. הוובהוק רק מבצע.**
//
// הסיבה אינה אסתטית. ה-RPC-ים (approve_rating, publish_crowd, approve_duo)
// מגודרים ב-is_site_admin(), שבודק אימייל בתוך ה-JWT — ול-service_role, שזה
// מה שהוובהוק מחזיק, אין אימייל. הרחבת השער הייתה נוגעת בפרימיטיב אבטחה שכל
// הסכימה נשענת עליו, בשביל פיצ'ר אחד. במקום זה הסקריפט הזה — שרץ עם אותו
// מפתח ויכול לקרוא הכל — מחשב מראש את ההחלטה המלאה, שומר אותה ב-engine_state,
// והוובהוק כותב שורה אחת שכבר אומתה. אותו דפוס בדיוק כמו chal_pending.
//
//   node scripts/crowd_telegram.js            # שולח מה שעוד לא נשלח
//   node scripts/crowd_telegram.js --dry      # מראה מה היה נשלח
//
// דורש SUPABASE_URL, SUPABASE_SERVICE_KEY, TELEGRAM_CHAL_BOT_TOKEN,
// TELEGRAM_CHAT_ID.

const DRY = process.argv.includes('--dry');

const URL   = process.env.SUPABASE_URL;
const KEY   = process.env.SUPABASE_SERVICE_KEY;
const TOKEN = process.env.TELEGRAM_CHAL_BOT_TOKEN;
const CHAT  = process.env.TELEGRAM_CHAT_ID;

if (!URL || !KEY) { console.error('חסר SUPABASE_URL או SUPABASE_SERVICE_KEY'); process.exit(1); }
if (!DRY && (!TOKEN || !CHAT)) {
  console.error('חסר TELEGRAM_CHAL_BOT_TOKEN או TELEGRAM_CHAT_ID');
  process.exit(1);
}

// כמה לשלוח בהרצה. תור של מאתיים הודעות בבת אחת הוא תור שנמחק ולא נקרא.
const BATCH = +(process.env.CROWD_TG_BATCH || 6);

async function sb(method, pathq, body, extra) {
  const res = await fetch(`${URL}/rest/v1/${pathq}`, {
    method,
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json', ...(extra || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`supabase ${res.status}: ${txt}`);
  return txt ? JSON.parse(txt) : null;
}

/* ── למה לא קוראים כאן ל-crowd_queue ו-duo_queue ───────────────────────────
   שניהם מגודרים ב-is_site_admin(), שבודק אימייל בתוך ה-JWT — ול-service_role,
   שזה מה שהסקריפט הזה מחזיק, אין אימייל. קריאה אליהם הייתה מחזירה אפס שורות
   תמיד, והסקריפט היה מדווח "התורים ריקים" לנצח בלי לשגות ולו פעם אחת. זה סוג
   הכישלון שנראה בדיוק כמו הצלחה.

   אז הקריאה היא ישירות מהטבלאות — service_role עוקף RLS ממילא — והסינון
   שהתורים עושים ב-SQL נעשה כאן. */

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// הדירוג הרשמי חי ב-js/data.js ולא במסד, ו-rating_approvals.old_ovr הוא
// NOT NULL: בלי המספר הזה האישור נדחה על CHECK.
let _official = null;
function officialFor(key, season) {
  if (!_official) {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') +
                    ';this.SQUADS=SQUADS;', ctx);
    const norm = s => String(s ?? '')
      .replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/[׳’`´']/g, "'")
      .replace(/\s+/g, ' ').trim();
    _official = new Map();
    ctx.SQUADS.forEach(sq => sq.players.forEach(p => {
      const k = norm(p.name) + '|' + sq.season;
      if (!_official.has(k)) _official.set(k, []);
      if (!_official.get(k).includes(p.ovr)) _official.get(k).push(p.ovr);
    }));
  }
  return _official.get(key + '|' + season) || null;
}

// כשיש כמה דירוגים רשמיים לאותו שחקן-עונה — 130 מקרים בדאטה — הנבחר הוא הקרוב
// ביותר לדירוג הקהל, כלומר הפער הקטן האפשרי. אותה בחירה שמרנית כמו בדשבורד.
function pickOfficial(ovrs, avg) {
  return ovrs.reduce((best, o) => Math.abs(o - avg) < Math.abs(best - avg) ? o : best, ovrs[0]);
}

async function stateGet(key) {
  const r = await sb('GET', `engine_state?key=eq.${encodeURIComponent(key)}&select=value`);
  return r && r[0] ? r[0].value : null;
}

async function stateSet(key, value) {
  await sb('POST', 'engine_state', { key, value: String(value) },
    { Prefer: 'resolution=merge-duplicates' });
}

async function tg(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/* ── המזהה הקצר ────────────────────────────────────────────────────────────
   callback_data של טלגרם מוגבל ל-64 בייטים, ושם שחקן בעברית הוא כשני בייטים
   לתו — כלומר מפתח מלא לא נכנס, וגם לא חצי ממנו. אז הכפתור נושא מזהה קצר,
   וההחלטה המלאה יושבת ב-engine_state.

   המזהה דטרמיניסטי מהמפתח בכוונה: כך הרצה שנייה מזהה שהפריט כבר נשלח במקום
   להציף את הצ'אט באותו שחקן שוב ושוב. */
function shortId(s) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ s.charCodeAt(i), 2246822519) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 10);
}

const esc = s => String(s ?? '').replace(/[<&>]/g, c => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' }[c]));

/* ── מה נשלח ───────────────────────────────────────────────────────────────
   שתי תורים, אותו מנגנון. הדירוגים ממוינים בשרת לפי מספר מצביעים; הצמדים
   לפי כמה אנשים הציעו. כאן רק חותכים לאצווה ומדלגים על מה שכבר ממתין לתשובה. */
const CA_MIN_GAP = 2;   // כמו בדשבורד: פער של נקודה אחת הוא רעש

async function collect() {
  const out = [];

  const [ratings, published, rDismissed] = await Promise.all([
    sb('GET', 'crowd_ratings_all?select=player_key,season,n,avg_trimmed,tag_top,tag_top_n' +
              '&avg_trimmed=not.is.null&order=n.desc&limit=300'),
    sb('GET', 'crowd_published?select=player_key,season'),
    sb('GET', 'rating_dismissals?select=player_key,season,at_votes'),
  ]);
  const pubSet  = new Set((published  || []).map(p => p.player_key + '|' + p.season));
  const dismiss = new Map((rDismissed || []).map(d => [d.player_key + '|' + d.season, d.at_votes]));

  for (const r of (ratings || [])) {
    const pk = r.player_key + '|' + r.season;
    const at = dismiss.get(pk);
    if (at != null && r.n <= at) continue;          // נדחה ולא צבר מאז
    const ovrs = officialFor(r.player_key, r.season);
    if (!ovrs) continue;                            // שחקן-עונה שכבר לא בדאטה
    const official = pickOfficial(ovrs, r.avg_trimmed);
    const gap = r.avg_trimmed - official;
    const isPub = pubSet.has(pk);
    // פריט נשלח אם יש על מה להחליט: או שהקהל חולק על הדירוג, או שהוא עוד לא
    // פורסם. שחקן שכבר פורסם ושהקהל מסכים איתו אינו החלטה שממתינה.
    if (Math.abs(gap) < CA_MIN_GAP && isPub) continue;
    const itemKey = `r|${r.player_key}|${r.season}`;
    out.push({
      kind: 'r', itemKey, id: shortId(itemKey),
      payload: { t: 'r', k: r.player_key, s: r.season, n: r.n,
                 avg: r.avg_trimmed, old: official, pub: isPub },
      text:
        `⭐ <b>${esc(r.player_key)}</b> · ${esc(r.season)}\n` +
        `הקהל: <b>${r.avg_trimmed}</b> · ${r.n} הצבעות` +
        (r.tag_top ? `\nתגית מובילה: ${esc(r.tag_top)} (${r.tag_top_n})` : '') +
        (r.published ? '\n👁 כבר מוצג לציבור' : '\n🚫 מוסתר מהציבור'),
      buttons: [[
        { text: '✅ קבל לדאטה', callback_data: `cw:${shortId(itemKey)}:a` },
        { text: r.published ? '🚫 הסתר' : '👁 פרסם', callback_data: `cw:${shortId(itemKey)}:p` },
        { text: '🗑️ בטל', callback_data: `cw:${shortId(itemKey)}:x` },
      ]],
    });
  }

  // אותה סיבה שלא קוראים ל-duo_queue: הוא מגודר ב-is_site_admin(). הקיבוץ
  // נעשה כאן, ובנפח הזה זה זול — הצעת צמד היא פעולה נדירה בהרבה מהצבעה.
  const [sugg, dDismissed] = await Promise.all([
    sb('GET', 'duo_suggestions?select=pair_key&limit=20000'),
    sb('GET', 'duo_dismissals?select=pair_key,at_votes'),
  ]);
  const counts = new Map();
  (sugg || []).forEach(s => counts.set(s.pair_key, (counts.get(s.pair_key) || 0) + 1));
  const dDrop = new Map((dDismissed || []).map(d => [d.pair_key, d.at_votes]));

  const duos = [...counts.entries()]
    .filter(([k, n]) => { const at = dDrop.get(k); return at == null || n > at; })
    .sort((x, y) => y[1] - x[1])
    .slice(0, 300)
    .map(([pair_key, n]) => ({ pair_key, n }));

  for (const d of duos) {
    const itemKey = `d|${d.pair_key}`;
    const [a, b] = String(d.pair_key).split('|');
    out.push({
      kind: 'd', itemKey, id: shortId(itemKey),
      payload: { t: 'd', p: d.pair_key, n: d.n },
      text: `🔗 <b>${esc(a)}</b> + <b>${esc(b)}</b>\n${d.n} הציעו שהם צמד`,
      buttons: [[
        { text: '✅ קבל', callback_data: `cw:${shortId(itemKey)}:a` },
        { text: '🗑️ בטל', callback_data: `cw:${shortId(itemKey)}:x` },
      ]],
    });
  }

  return out;
}

async function main() {
  const items = await collect();
  if (!items.length) { console.log('התורים ריקים.'); return; }

  let sent = 0, skipped = 0;
  for (const it of items) {
    if (sent >= BATCH) break;
    // ערך לא ריק פירושו שההודעה כבר בחוץ ואף אחד עוד לא ענה עליה. מחרוזת
    // ריקה היא "טופל" — אותה מוסכמה כמו chal_pending.
    const open = await stateGet(`crowd_pending|${it.id}`);
    if (open) { skipped++; continue; }

    if (DRY) {
      console.log(`[יבש] ${it.id}  ${it.text.replace(/\n/g, ' | ').replace(/<[^>]+>/g, '')}`);
      sent++;
      continue;
    }

    await stateSet(`crowd_pending|${it.id}`, JSON.stringify(it.payload));
    const r = await tg('sendMessage', {
      chat_id: CHAT, text: it.text, parse_mode: 'HTML',
      reply_markup: { inline_keyboard: it.buttons },
    });
    if (!r || !r.ok) {
      // אם ההודעה לא יצאה, אסור להשאיר שורה שמתחזה ל"כבר נשלח" — היא הייתה
      // חוסמת את הפריט הזה לנצח.
      await stateSet(`crowd_pending|${it.id}`, '');
      console.log(`⚠ ${it.id} לא נשלח: ${r && r.description}`);
      continue;
    }
    sent++;
  }

  console.log(`נשלחו ${sent} · ממתינים לתשובה ${skipped} · בתור ${items.length}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
