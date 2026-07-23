// 36-0 news-reactive post engine (growth plan B).
// Runs on a schedule (GitHub Actions). Each run it:
//   1. processes Telegram button taps (approve / reject) from the last run,
//   2. publishes any approved drafts to the game's Facebook page,
//   3. pulls Israeli-football news (Google News RSS, transfer-focused),
//   4. drafts posts for fresh items and queues them (status 'pending'),
//   5. pings Telegram with each draft + ✅/🗑️ buttons.
// The owner also reviews/edits in the admin panel. Drafting is automatic;
// publishing only happens after an explicit approval. Facebook now; the queue
// carries a `platform` column so Twitter/Instagram slot in later.
//
// Env (GitHub Action secrets): SUPABASE_URL, SUPABASE_SERVICE_KEY,
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, FB_PAGE_ID, FB_PAGE_TOKEN.
// DRY_RUN=1 fetches + drafts + prints only (no DB / FB / queue writes).
const fs = require('fs');
const path = require('path');

const {
  SUPABASE_URL, SUPABASE_SERVICE_KEY,
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
  FB_PAGE_ID, FB_PAGE_TOKEN, DRY_RUN,
} = process.env;
const SITE = 'https://www.36-0.co.il';
const MAX_NEW_PER_RUN = 3;          // keep the queue/Telegram from flooding
const QUERIES = [
  'ליגת העל כדורגל העברות',
  'כדורגל ישראלי חתם שחקן',
];
const TRANSFER = /חתמ|חתימ|יחתו|עבר ל|עבר אל|הצטרף|עזב|נמכר|רכש|רוכשת?|השאל|סגר|רשמי|חדש ב/;

const TEAMS = new Function(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') +
  '\n;return TEAMS;')();

/* ── helpers ──────────────────────────────────────────────────────────────── */
// fetch with a hard timeout so a stalled server can't hang the whole run
function fetchT(url, opts = {}, ms = 20000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
}
const dec = s => String(s || '')
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function sb(method, pathq, body, extraHeaders) {
  const res = await fetchT(`${SUPABASE_URL}/rest/v1/${pathq}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json', ...(extraHeaders || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`supabase ${res.status}: ${txt}`);
  return txt ? JSON.parse(txt) : null;
}
async function stateGet(key) {
  const r = await sb('GET', `engine_state?key=eq.${key}&select=value`);
  return r && r[0] ? r[0].value : null;
}
async function stateSet(key, value) {
  await sb('POST', 'engine_state', { key, value: String(value) }, { Prefer: 'resolution=merge-duplicates' });
}
async function tg(method, payload) {
  const res = await fetchT(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return res.json();
}

/* ── news + drafting ──────────────────────────────────────────────────────── */
// unambiguous city/short forms (only cities with a single top-flight club, so no
// wrong guesses). Ambiguous ones (חיפה, ת"א, ירושלים, פ"ת, ר"ג) need the full name.
const CLUB_ALIASES = {
  'באר שבע': 'hapoel-beersheba', 'נתניה': 'maccabi-netanya', 'אשדוד': 'ms-ashdod',
  'סכנין': 'bnei-sakhnin', 'קריית שמונה': 'ironi-ks', 'קרית שמונה': 'ironi-ks',
  'טבריה': 'ironi-tiberias', 'חדרה': 'hapoel-hadera', 'נס ציונה': 'sakhnina-ns',
  'רעננה': 'hapoel-raanana', 'ריינה': 'maccabi-bnei-raina', 'כפר סבא': 'hapoel-kfar-saba',
  'עכו': 'hapoel-aco', 'אשקלון': 'hapoel-ashkelon', 'קריית גת': 'maccabi-kg', 'נוף הגליל': 'hapoel-galil',
};
function detectClub(title) {
  let best = null;
  for (const id of Object.keys(TEAMS)) {
    const name = TEAMS[id].name;
    if (title.includes(name) && (!best || name.length > best.name.length)) best = { id, name };
  }
  if (best) return best;
  for (const alias of Object.keys(CLUB_ALIASES)) {
    if (title.includes(alias)) { const id = CLUB_ALIASES[alias]; return { id, name: TEAMS[id].name }; }
  }
  return null;
}
// pull position + transfer direction out of a Hebrew headline for a contextual hook
const POSITIONS = [['שוער', 'שוער'], ['בלם', 'בלם'], ['מגן', 'מגן'], ['קשר', 'קשר'], ['מקשר', 'קשר'],
  ['חלוץ', 'חלוץ'], ['חלוצן', 'חלוץ'], ['כנף', 'שחקן כנף'], ['אגף', 'שחקן אגף']];
const DIR_IN = /מגיע|חתמ|הצטרף|סגר|רשמי|יחתו|בדרך ל|נחת|רוכשת?|צירפ|קלט|יצטרף/;
const DIR_OUT = /עזב|נמכר|עובר מ|נפרד|מסיים|בדרך מ|שוחרר|הושאל|מכר/;
function detectPosition(t) { for (const [k, v] of POSITIONS) if (t.includes(k)) return v; return null; }
function detectDirection(t) { return DIR_IN.test(t) ? 'in' : DIR_OUT.test(t) ? 'out' : null; }

// returns a page POST (auto-publishable, with link) and a natural COMMENT
// (no link, mentions the game — to paste manually on sports outlets' posts)
function draft(item) {
  const t = item.title, club = detectClub(t), pos = detectPosition(t), dir = detectDirection(t);
  const cn = club ? club.name : null, link = club ? `${SITE}/team/${club.id}/` : `${SITE}/`;
  const tags = '#ליגת_העל #כדורגל_ישראלי';

  const post = club
    ? `⚽ ${t}\n\n${pos && dir === 'in' ? `${pos} חדש ל${cn}. ` : ''}מי ההרכב הכי חזק של ${cn} בכל הזמנים? בנו אותו 👇\n${link}\n\n${tags}`
    : `⚽ ${t}\n\nבנו את הרכב החלומות שלכם מכל תולדות ליגת העל 👇\n${SITE}/\n\n${tags}`;

  let comment;
  if (club && pos && dir === 'in') comment = `מגיע ${pos} ל${cn} 👀 הוא נכנס לכם לנבחרת כל הזמנים של הקבוצה? (בניתי את שלי ב-36-0 ולא הצלחתי להחליט 😅)`;
  else if (club && dir === 'in') comment = `חתימה חדשה ב${cn}. את מי מנבחרת כל הזמנים של הקבוצה הוא בכלל יכול להדיח? (התחלתי לשחק עם זה ב-36-0, קשה 😅)`;
  else if (club && dir === 'out') comment = `${cn} מתפרקת לנו מול העיניים... מי אצלכם בנבחרת כל הזמנים של הקבוצה אף אחד לא נוגע בו? (ב-36-0 בניתי הרכב מטורף)`;
  else if (club) comment = `מדברים על ${cn}. בניתם כבר את נבחרת כל הזמנים שלה? יש משחק חינמי (36-0) שנתקעתי עליו שעה 😅`;
  else comment = `חלון ההעברות בליגת העל רותח 🔥 בניתם כבר את נבחרת החלומות שלכם מכל הדורות? (יש משחק חינמי, 36-0, ממכר)`;

  return { post, comment, club };
}
async function fetchNews() {
  const items = [], seen = new Set();
  for (const q of QUERIES) {
    const url = 'https://news.google.com/rss/search?' +
      new URLSearchParams({ q, hl: 'he', gl: 'IL', ceid: 'IL:he' });
    let raw;
    try { raw = await (await fetchT(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text(); }
    catch (e) { console.error('feed fail', q, e.message); continue; }
    for (const block of raw.split('<item>').slice(1)) {
      const title = dec((block.match(/<title>(.*?)<\/title>/s) || [])[1]);
      const link = dec((block.match(/<link>(.*?)<\/link>/s) || [])[1]);
      if (!title || !link || seen.has(title)) continue;
      seen.add(title);
      // keep only clearly-relevant items (a club named, or a transfer verb)
      if (detectClub(title) || TRANSFER.test(title)) items.push({ title, link });
    }
  }
  return items;
}

/* ── publishing ───────────────────────────────────────────────────────────── */
async function fbPublish(text) {
  const body = new URLSearchParams({ message: text, access_token: FB_PAGE_TOKEN });
  const res = await fetchT(`https://graph.facebook.com/v21.0/${FB_PAGE_ID}/feed`, { method: 'POST', body });
  const j = await res.json();
  if (!res.ok || j.error) throw new Error('fb: ' + JSON.stringify(j.error || j));
  return j.id;
}

/* ── run steps ────────────────────────────────────────────────────────────── */
async function processCallbacks() {
  const offset = await stateGet('tg_offset');
  const u = await tg('getUpdates', { offset: offset ? +offset + 1 : undefined, allowed_updates: ['callback_query'], timeout: 0 });
  if (!u.ok || !u.result.length) return;
  for (const up of u.result) {
    await stateSet('tg_offset', up.update_id);
    const cq = up.callback_query;
    if (!cq) continue;
    const [action, id] = String(cq.data || '').split(':');
    if (!id) continue;
    const status = action === 'a' ? 'approved' : 'rejected';
    await sb('PATCH', `post_queue?id=eq.${id}`, { status });
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: action === 'a' ? '✅ אושר' : '🗑️ נדחה' });
    await tg('editMessageText', {
      chat_id: cq.message.chat.id, message_id: cq.message.message_id,
      text: cq.message.text + `\n\n— ${action === 'a' ? '✅ אושר, יתפרסם בקרוב' : '🗑️ נדחה'}`,
    });
  }
}
async function publishApproved() {
  if (!FB_PAGE_ID || !FB_PAGE_TOKEN) return;
  const rows = await sb('GET', 'post_queue?status=eq.approved&platform=eq.facebook&select=id,draft_text&order=created_at.asc');
  for (const r of rows) {
    try {
      const fbId = await fbPublish(r.draft_text);
      await sb('PATCH', `post_queue?id=eq.${r.id}`, { status: 'posted', fb_post_id: fbId, posted_at: new Date().toISOString() });
      await tg('sendMessage', { chat_id: TELEGRAM_CHAT_ID, text: '📢 פורסם בעמוד הפייסבוק:\n\n' + r.draft_text });
    } catch (e) {
      await tg('sendMessage', { chat_id: TELEGRAM_CHAT_ID, text: '⚠️ פרסום נכשל (#' + r.id + '): ' + e.message });
    }
  }
}
async function draftNew() {
  const news = await fetchNews();
  // dedupe against anything already queued (any status), by headline
  const existing = await sb('GET', 'post_queue?select=headline&order=created_at.desc&limit=500');
  const seen = new Set((existing || []).map(r => r.headline));
  let added = 0;
  for (const item of news) {
    if (added >= MAX_NEW_PER_RUN) break;
    if (seen.has(item.title)) continue;
    const d = draft(item);
    const rows = await sb('POST', 'post_queue',
      { headline: item.title, source_url: item.link, draft_text: d.post, comment_text: d.comment, publish_type: 'post', platform: 'facebook' },
      { Prefer: 'return=representation' });
    const id = rows[0].id;
    added++;
    await tg('sendMessage', {
      chat_id: TELEGRAM_CHAT_ID,
      text: `📰 ${item.title}\n\n` +
        `💬 תגובה — רק בשבילך (העתק והדבק ידנית על פוסטים של אתרי הספורט). לא מתפרסמת אוטומטית:\n${d.comment}\n\n` +
        `📄 פוסט לעמוד שלנו — זה מה שהכפתור "פרסם את הפוסט" מפרסם:\n${d.post}\n\n` +
        `✏️ לעריכה: פאנל האדמין ← "📣 תור פוסטים לאישור"`,
      reply_markup: { inline_keyboard: [[
        { text: '✅ פרסם את הפוסט', callback_data: 'a:' + id },
        { text: '🗑️ דחה', callback_data: 'r:' + id },
      ]] },
    });
  }
  console.log(`drafted ${added} new post(s) from ${news.length} news item(s)`);
}

async function main() {
  if (DRY_RUN) {
    const news = await fetchNews();
    console.log(`DRY RUN — ${news.length} relevant items:\n`);
    news.slice(0, 8).forEach(i => { const d = draft(i); console.log('──── ' + i.title + '\n💬 ' + d.comment + '\n📄 ' + d.post + '\n'); });
    return;
  }
  for (const [name, fn] of [['callbacks', processCallbacks], ['publish', publishApproved], ['draft', draftNew]]) {
    try { await fn(); } catch (e) { console.error(name, 'failed:', e.message); }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
