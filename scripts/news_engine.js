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
const MAX_NEW_PER_RUN = 2;          // at most 2 Telegram drafts per run
const MIN_SCORE = 4;                // only high-traffic-potential stories get drafted
const MAX_AGE_HOURS = 24;           // only fresh news — nothing older than a day
const QUERIES = [           // all Israeli football, not just transfers
  'ליגת העל בכדורגל',
  'כדורגל ישראלי',
  'נבחרת ישראל בכדורגל',
];
const TRANSFER = /חתמ|חתימ|יחתו|עבר ל|עבר אל|הצטרף|עזב|נמכר|רכש|רוכשת?|השאל|סגר|רשמי|חדש ב/;
const FOOTBALL = /כדורגל|ליגת העל|ליגה לאומית/;                      // must be football
const NOT_FOOTBALL = /כדורסל|יורוליג|יורוקאפ|NBA|כדורעף|הוקי|כדוריד|טניס|שחייה|אתלטיקה/;  // drop other sports
// never make a playful "build your dream team" post under a sensitive story
const NEG_TOPIC = /אלימ|מוות|נהרג|נפטר|הרוג|עולמו|לוויה|ז"ל|אסון|טרגד|פיגוע|גזענ|מעצר|נעצר|נאסר|חקיר|שחיתות|אונס|הטרד|התאבד|גופ[תה]|פשיט[ת]?.רגל/;
// high-traffic signals: the big-fanbase clubs, and a real "event" (not routine news)
const BIG_CLUBS = new Set(['maccabi-haifa', 'maccabi-tlv', 'hapoel-tlv', 'beitar-jerusalem', 'hapoel-beersheba', 'maccabi-netanya', 'hapoel-jerusalem']);
const EVENT = /רשמי|חתמ|חתימ|יחתו|עובר|מגיע|בדרך|סגר|מכר|רכש|קנ|עסק|החזר|חוזר|דרבי|אלוף|אליפות|שיא|כוכב|סנסצי|הודיע|פריד|מודח|מפוטר|מונה/;

const TEAMS = new Function(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') +
  '\n;return TEAMS;')();

// player database (newsjacking SEO): index of every Ligat ha'Al player's career.
// Match on full multi-word names, normalised (drop apostrophes/gershayim/quotes)
// so "ניר דוידוביץ'" still matches a headline that writes "ניר דוידוביץ".
const PP = require('./player_pages.js');
const PLAYER_IDX = PP.buildIndex(PP.load().SQUADS);
const stripQ = s => String(s).replace(/['׳״"]/g, '').replace(/\s+/g, ' ').trim();
// fold Hebrew final letters so keyword regexes match e.g. "חתם" (final mem) too
const deFinal = s => String(s).replace(/[ךםןףץ]/g, c => ({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }[c]));
const NORM_TO_NAME = {};
Object.keys(PLAYER_IDX).forEach(n => { if (n.trim().split(/\s+/).length >= 2) NORM_TO_NAME[stripQ(n)] = n; });
const NORM_NAMES = Object.keys(NORM_TO_NAME);

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
// known players named in a headline (full multi-word names → few false positives)
function detectPlayers(title) {
  const t = stripQ(title);
  return NORM_NAMES.filter(n => t.includes(n)).map(n => NORM_TO_NAME[n]).sort((a, b) => b.length - a.length);
}

// how much traffic potential a story has — big club and/or star player + an event
function storyScore(title) {
  const club = detectClub(title);
  const ovrs = detectPlayers(title).map(n => PLAYER_IDX[n] && PLAYER_IDX[n].peak).filter(Boolean);
  const bestOvr = ovrs.length ? Math.max(...ovrs) : 0;
  let s = 0;
  if (club && BIG_CLUBS.has(club.id)) s += 3; else if (club) s += 1;
  if (bestOvr >= 88) s += 3; else if (bestOvr >= 84) s += 2; else if (bestOvr >= 80) s += 1; else if (ovrs.length) s += 0.5;
  s += EVENT.test(deFinal(title)) ? 1 : -1;   // reward a real event, punish routine news
  return s;
}

// pull position + transfer direction out of a Hebrew headline for a contextual hook
const POSITIONS = [['שוער', 'שוער'], ['בלם', 'בלם'], ['מגן', 'מגן'], ['קשר', 'קשר'], ['מקשר', 'קשר'],
  ['חלוץ', 'חלוץ'], ['חלוצן', 'חלוץ'], ['כנף', 'שחקן כנף'], ['אגף', 'שחקן אגף']];
const DIR_IN = /מגיע|חתמ|הצטרף|סגר|רשמי|יחתו|בדרך ל|נחת|רוכשת?|צירפ|קלט|יצטרף/;
const DIR_OUT = /עזב|נמכר|עובר מ|נפרד|מסיים|בדרך מ|שוחרר|הושאל|מכר/;
function detectPosition(t) { for (const [k, v] of POSITIONS) if (t.includes(k)) return v; return null; }
function detectDirection(t) { const d = deFinal(t); return DIR_IN.test(d) ? 'in' : DIR_OUT.test(d) ? 'out' : null; }

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
  else comment = `כדורגל ישראלי על הבר 🔥 בניתם כבר את נבחרת החלומות שלכם מכל תולדות ליגת העל? (יש משחק חינמי, 36-0, ממכר)`;

  return { post, comment, club };
}
async function fetchNews() {
  const items = [], seen = new Set(), now = Date.now();
  for (const q of QUERIES) {
    const url = 'https://news.google.com/rss/search?' +
      new URLSearchParams({ q: q + ' when:1d', hl: 'he', gl: 'IL', ceid: 'IL:he' });
    let raw;
    try { raw = await (await fetchT(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text(); }
    catch (e) { console.error('feed fail', q, e.message); continue; }
    for (const block of raw.split('<item>').slice(1)) {
      const title = dec((block.match(/<title>(.*?)<\/title>/s) || [])[1]);
      const link = dec((block.match(/<link>(.*?)<\/link>/s) || [])[1]);
      const ts = Date.parse((block.match(/<pubDate>(.*?)<\/pubDate>/s) || [])[1] || '');
      if (!title || !link || seen.has(title)) continue;
      if (!ts || (now - ts) > MAX_AGE_HOURS * 3600e3) continue;   // fresh only — drop old news
      const dt = deFinal(title);
      if (NOT_FOOTBALL.test(dt) || NEG_TOPIC.test(dt)) continue;        // other sports / sensitive
      if (!detectClub(title) && !FOOTBALL.test(dt)) continue;           // must be football
      seen.add(title);
      items.push({ title, link, ts });
    }
  }
  items.sort((a, b) => b.ts - a.ts);   // newest first
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
async function draftNew(news) {
  // dedupe against anything already queued (any status), by headline
  const existing = await sb('GET', 'post_queue?select=headline&order=created_at.desc&limit=500');
  const seen = new Set((existing || []).map(r => r.headline));
  // only high-traffic-potential stories, best first
  const notable = news.map(item => ({ item, score: storyScore(item.title) }))
    .filter(x => x.score >= MIN_SCORE).sort((a, b) => b.score - a.score);
  let added = 0;
  for (const { item } of notable) {
    if (added >= MAX_NEW_PER_RUN) break;
    if (seen.has(item.title)) continue;
    const d = draft(item);
    const rows = await sb('POST', 'post_queue',
      { headline: item.title, source_url: item.link, draft_text: d.post, comment_text: d.comment, publish_type: 'post', platform: 'facebook' },
      { Prefer: 'return=representation' });
    const id = rows[0].id;
    added++;
    // "comment here" link: FB post-search for the story's subject (player > club)
    const subject = detectPlayers(item.title)[0] || (detectClub(item.title) || {}).name || item.title;
    const fbSearch = 'https://www.facebook.com/search/posts/?q=' + encodeURIComponent(subject);
    await tg('sendMessage', {
      chat_id: TELEGRAM_CHAT_ID,
      text: `📰 ${item.title}\n\n` +
        `💬 תגובה — רק בשבילך (העתק והדבק ידנית על פוסטים של אתרי הספורט). לא מתפרסמת אוטומטית:\n${d.comment}\n\n` +
        `🔎 להגיב על הפוסטים של אתרי הספורט על הסיפור — הכפתור למטה מוצא אותם 👇\n\n` +
        `📄 פוסט לעמוד שלנו — זה מה שהכפתור "פרסם את הפוסט" מפרסם:\n${d.post}\n\n` +
        `✏️ לעריכה: פאנל האדמין ← "📣 תור פוסטים לאישור"`,
      reply_markup: { inline_keyboard: [
        [{ text: '✅ פרסם את הפוסט', callback_data: 'a:' + id }, { text: '🗑️ דחה', callback_data: 'r:' + id }],
        [{ text: '🔎 מצא פוסטים להגיב עליהם', url: fbSearch }],
      ] },
    });
  }
  console.log(`drafted ${added} new post(s) from ${news.length} news item(s)`);
}

// newsjacking SEO: create evergreen player pages — prioritised by who's in the
// news, plus a gated backfill so the library keeps growing on quiet days.
async function generatePlayerPages(news) {
  const hasPage = e => fs.existsSync(path.join(PP.BASE, 'player', PP.slugFor(e.name), 'index.html'));
  const make = e => (e && !hasPage(e) && PP.writePlayer(TEAMS, e).created);
  const created = [];

  // 1. players named in fresh headlines
  const named = new Set();
  news.forEach(item => detectPlayers(item.title).forEach(n => named.add(n)));
  for (const n of named) { if (created.length >= 5) break; if (make(PLAYER_IDX[n])) created.push(n); }

  // 2. backfill top-rated players, at most once every 2h (keeps deploys modest)
  const last = +(await stateGet('last_backfill') || 0);
  if (Date.now() - last > 2 * 3600e3) {
    const pool = Object.values(PLAYER_IDX).filter(e => e.career.length >= 2).sort((a, b) => b.peak - a.peak);
    let n = 0;
    for (const e of pool) { if (n >= 6) break; if (make(e)) { created.push(e.name); n++; } }
    await stateSet('last_backfill', Date.now());
  }

  if (created.length) { PP.writeSitemap(); PP.writeIndex(); }
  console.log(`player pages created: ${created.length}${created.length ? ' — ' + created.join(', ') : ''}`);
}

// true while it's Shabbat — candle-lighting to havdalah, fetched weekly from
// Hebcal (Haifa) so the varying times self-update.
async function isShabbat() {
  try {
    const r = await (await fetchT('https://www.hebcal.com/shabbat?cfg=json&geonameid=294801&b=40&M=on')).json();
    const items = r.items || [];
    const candles = items.find(i => i.category === 'candles');
    const havdalah = items.find(i => i.category === 'havdalah');
    if (!candles || !havdalah) return false;
    const now = Date.now();
    return now >= Date.parse(candles.date) && now <= Date.parse(havdalah.date);
  } catch (e) { return false; }   // on error, don't block the run
}

async function main() {
  // on-demand health check: proves news + DB + Telegram are all wired up
  if (process.env.TEST_PING === 'true') {
    const news = await fetchNews().catch(() => []);
    let dbOk = false;
    try { await sb('GET', 'post_queue?select=id&limit=1'); dbOk = true; } catch (e) {}
    await tg('sendMessage', {
      chat_id: TELEGRAM_CHAT_ID,
      text: `✅ בדיקת מנוע 36-0\n\n📰 חדשות: מצא ${news.length} כתבות רלוונטיות\n` +
        `🗄️ מסד נתונים: ${dbOk ? 'מחובר ✓' : 'שגיאה ✗'}\n💬 טלגרם: עובד (קיבלת את זה ✓)\n\n` +
        `${dbOk && news.length ? 'הכל תקין 🎉' : 'יש בעיה — תגיד לי'}`,
    });
    console.log(`health check: news=${news.length} db=${dbOk}`);
    return;
  }
  if (DRY_RUN) {
    const news = await fetchNews();
    const scored = news.map(i => ({ i, s: storyScore(i.title) })).sort((a, b) => b.s - a.s);
    console.log(`DRY RUN — ${news.length} items; ${scored.filter(x => x.s >= MIN_SCORE).length} pass the traffic bar (>=${MIN_SCORE}):\n`);
    scored.slice(0, 12).forEach(({ i, s }) => console.log(`[${s}]${s >= MIN_SCORE ? ' ✅' : ' ⬜'} ${i.title}`));
    return;
  }
  if (await isShabbat()) { console.log('Shabbat — skipping run'); return; }
  const step = async (name, fn) => { try { await fn(); } catch (e) { console.error(name, 'failed:', e.message); } };
  await step('callbacks', processCallbacks);
  await step('publish', publishApproved);
  let news = [];
  try { news = await fetchNews(); } catch (e) { console.error('fetchNews failed:', e.message); }
  await step('draft', () => draftNew(news));
  await step('pages', () => generatePlayerPages(news));
}
main().catch(e => { console.error(e); process.exit(1); });
