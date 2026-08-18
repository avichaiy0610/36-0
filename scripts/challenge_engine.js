// 36-0 fixture-tied challenge engine.
// Each run it:
//   1. processes Telegram taps (approve / reject) from the previous run,
//   2. pulls the real Ligat ha'Al fixture list + Israel's national-team games,
//   3. finds the notable match of the upcoming day / week / month,
//   4. composes a themed challenge (headline + missions) for that period,
//   5. pings Telegram with ✅/🗑️ buttons; approval writes challenge_overrides.
//
// Two rules this engine must never break:
//   · it only ever writes a period that has NOT started yet — a live challenge
//     must never change under a player mid-run,
//   · it never touches the deterministic generator, only the override table.
//
// Sources, in order of trust:
//   · 365Scores (Israeli, Hebrew club names, publishes rounds ahead) — primary
//   · TheSportsDB free v1 — fallback for the league, and the national team
// API-Football was evaluated and rejected: its free plan excludes the current
// season and blocks the next/last parameters.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, TELEGRAM_CHAL_BOT_TOKEN, TELEGRAM_CHAT_ID.
// DRY_RUN=1 → fetch + compose + print, no DB writes and no Telegram.
const fs = require('fs');
const path = require('path');

const {
  SUPABASE_URL, SUPABASE_SERVICE_KEY,
  TELEGRAM_CHAL_BOT_TOKEN, TELEGRAM_CHAT_ID, DRY_RUN,
} = process.env;

const TSDB = 'https://www.thesportsdb.com/api/v1/json/3';
const S365 = 'https://webws.365scores.com/web/games/fixtures/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&competitions=42';
const LEAGUE_ID = 4644;        // Israeli Premier League
const ISRAEL_NT = 135931;      // Israel national team
const TZ = 'Asia/Jerusalem';

const TEAMS = new Function(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') +
  '\n;return TEAMS;')();
const PP = require('./player_pages.js');
const SQUADS = PP.load().SQUADS;

// How many players each club has in our data — a mission can't ask for more
// than the draft could ever supply.
const CLUB_DEPTH = {};
SQUADS.forEach(s => { CLUB_DEPTH[s.teamId] = (CLUB_DEPTH[s.teamId] || 0) + s.players.length; });

/* ── club name mapping (TheSportsDB writes English) ───────────────────────── */
const CLUB_MAP = {
  'maccabi haifa': 'maccabi-haifa', 'maccabi tel aviv': 'maccabi-tlv',
  'hapoel tel aviv': 'hapoel-tlv', 'beitar jerusalem': 'beitar-jerusalem',
  'hapoel beer sheva': 'hapoel-beersheba', 'hapoel beersheba': 'hapoel-beersheba',
  'hapoel be er sheva': 'hapoel-beersheba', 'hapoel jerusalem': 'hapoel-jerusalem',
  'maccabi netanya': 'maccabi-netanya', 'bnei sakhnin': 'bnei-sakhnin',
  'hapoel haifa': 'hapoel-haifa', 'maccabi petah tikva': 'maccabi-pt',
  'hapoel petah tikva': 'hapoel-pt', 'ironi kiryat shmona': 'ironi-ks',
  'hapoel ironi kiryat shmona': 'ironi-ks', 'ironi tiberias': 'ironi-tiberias',
  'hapoel hadera': 'hapoel-hadera', 'maccabi bnei raina': 'maccabi-bnei-raina',
  'bnei raina': 'maccabi-bnei-raina', 'hapoel ramat gan': 'hapoel-rg',
  'ashdod': 'ms-ashdod', 'fc ashdod': 'ms-ashdod', 'ms ashdod': 'ms-ashdod',
  'maccabi ahi nazareth': 'maccabi-ahi-naz', 'hapoel nof hagalil': 'hapoel-galil',
  'hapoel kfar saba': 'hapoel-kfar-saba', 'hapoel raanana': 'hapoel-raanana',
  'hapoel ra anana': 'hapoel-raanana', 'sekzia nes tziona': 'sakhnina-ns',
  'hapoel nir ramat hasharon': 'hapoel-rhs', 'hapoel acre': 'hapoel-aco',
  'hapoel ironi acre': 'hapoel-aco', 'maccabi kiryat gat': 'maccabi-kg',
};
// Hebrew spelling drifts between sources (תקוה/תקווה, קרית/קריית), so both
// sides are normalised before matching.
const hebNorm = s => String(s || '')
  .replace(/['׳״"]/g, '')
  .replace(/תקוה/g, 'תקווה').replace(/קרית/g, 'קריית')
  .replace(/\s+/g, ' ').trim();
const HEB_TO_ID = (() => {
  const m = {};
  Object.keys(TEAMS).forEach(id => { m[hebNorm(TEAMS[id].name)] = id; });
  m[hebNorm('הפועל ניר רמת השרון')] = 'hapoel-rhs';
  m[hebNorm('סקציה נס ציונה')] = 'sakhnina-ns';
  m[hebNorm('מ.ס. אשדוד')] = 'ms-ashdod';
  m[hebNorm('אשדוד')] = 'ms-ashdod';
  return m;
})();
const clubIdHeb = name => HEB_TO_ID[hebNorm(name)] || null;

const norm = s => String(s || '').toLowerCase()
  .replace(/f\.?c\.?/g, ' ').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
function clubIdOf(name) { return CLUB_MAP[norm(name)] || null; }

// Rivalries worth their own headline. Order-insensitive.
const DERBIES = [
  ['maccabi-tlv', 'hapoel-tlv', 'דרבי תל אביב'],
  ['maccabi-haifa', 'hapoel-haifa', 'דרבי חיפה'],
  ['beitar-jerusalem', 'hapoel-jerusalem', 'דרבי ירושלים'],
  ['maccabi-pt', 'hapoel-pt', 'דרבי פתח תקווה'],
  ['maccabi-haifa', 'maccabi-tlv', 'קלאסיקו'],
  ['hapoel-tlv', 'beitar-jerusalem', 'קלאסיקו הפועל–בית"ר'],
  ['maccabi-tlv', 'beitar-jerusalem', 'משחק ענק'],
  ['maccabi-haifa', 'beitar-jerusalem', 'משחק ענק'],
  ['maccabi-haifa', 'hapoel-tlv', 'משחק ענק'],
  ['maccabi-haifa', 'hapoel-beersheba', 'פסגת הליגה'],
  ['maccabi-tlv', 'hapoel-beersheba', 'פסגת הליגה'],
];
// How big a fixture feels = titles won since 1999 (straight from our own
// LEAGUE_TABLES) + the size of the crowd behind the club. Titles alone would
// under-rate Hapoel TA and Beitar, who fill stadiums without filling a trophy
// cabinet; fanbase alone would ignore what Be'er Sheva did in the last decade.
const TITLES = (() => {
  try {
    const ctx = {};
    new Function('ctx', 'with(ctx){' + fs.readFileSync(path.join(__dirname, '..', 'js', 'league_tables.js'), 'utf8') +
      '; ctx.T = LEAGUE_TABLES;}')(ctx);
    const w = {};
    Object.keys(ctx.T).forEach(season => {
      const champ = ctx.T[season].find(r => r.pos === 1);
      if (champ) w[champ.teamId] = (w[champ.teamId] || 0) + 1;
    });
    return w;
  } catch (e) { console.error('titles load failed:', e.message); return {}; }
})();
const FANBASE = {
  'maccabi-haifa': 12, 'maccabi-tlv': 12, 'hapoel-tlv': 12, 'beitar-jerusalem': 12,
  'hapoel-beersheba': 8, 'hapoel-jerusalem': 5, 'maccabi-netanya': 5, 'bnei-sakhnin': 5,
};
const prestige = id => 2 * (TITLES[id] || 0) + (FANBASE[id] || 0);

/* ── helpers ──────────────────────────────────────────────────────────────── */
function fetchT(url, opts = {}, ms = 20000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
}
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
  const r = await sb('GET', `engine_state?key=eq.${encodeURIComponent(key)}&select=value`);
  return r && r[0] ? r[0].value : null;
}
async function stateSet(key, value) {
  await sb('POST', 'engine_state', { key, value: String(value) }, { Prefer: 'resolution=merge-duplicates' });
}
async function tg(method, payload) {
  const res = await fetchT(`https://api.telegram.org/bot${TELEGRAM_CHAL_BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return res.json();
}

/* ── challenge keys (Israel time — identical to the client and the edge fn) ── */
function ilParts(d) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(d);
  const g = t => p.find(x => x.type === t).value;
  return { y: +g('year'), m: +g('month'), d: +g('day'), wd: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(g('weekday')) };
}
const pad = n => String(n).padStart(2, '0');
function dailyKey(d)   { const p = ilParts(d); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; }
function monthlyKey(d) { const p = ilParts(d); return `${p.y}-${pad(p.m)}`; }
function weeklyKey(d)  {                       // the week's Sunday
  const p = ilParts(d);
  return new Date(Date.UTC(p.y, p.m - 1, p.d) - p.wd * 86400000).toISOString().slice(0, 10);
}
const DAY = 86400000;

/* ── fixtures ─────────────────────────────────────────────────────────────── */
async function fixtures() {
  const out = [];
  try {                                       // primary: 365Scores
    const d = await (await fetchT(S365, { headers: { 'User-Agent': 'Mozilla/5.0' } })).json();
    (d.games || []).forEach(g => {
      const home = (g.homeCompetitor || {}).name, away = (g.awayCompetitor || {}).name;
      const date = String(g.startTime || '').slice(0, 10);
      if (!home || !away || !date) return;
      out.push({
        id: '365-' + g.id, kind: 'league', date, time: String(g.startTime || '').slice(11, 16),
        round: g.roundNum ?? null,
        home, away, homeId: clubIdHeb(home), awayId: clubIdHeb(away), league: 'ליגת העל',
      });
    });
  } catch (e) { console.error('365 fetch failed', e.message); }
  const seasons = [seasonLabel(new Date()), seasonLabel(new Date(Date.now() + 120 * DAY))];
  for (const s of [...new Set(seasons)]) {
    try {
      const r = await (await fetchT(`${TSDB}/eventsseason.php?id=${LEAGUE_ID}&s=${s}`)).json();
      (r.events || []).forEach(e => out.push(mapEvent(e, 'league')));
    } catch (e) { console.error('season fetch failed', s, e.message); }
  }
  try {                                    // whatever is scheduled next, in case
    const r = await (await fetchT(`${TSDB}/eventsnextleague.php?id=${LEAGUE_ID}`)).json();
    (r.events || []).forEach(e => out.push(mapEvent(e, 'league')));
  } catch (e) { console.error('next fetch failed', e.message); }
  try {
    const r = await (await fetchT(`${TSDB}/eventsnext.php?id=${ISRAEL_NT}`)).json();
    (r.events || []).forEach(e => out.push(mapEvent(e, 'nt')));
  } catch (e) { console.error('nt fetch failed', e.message); }

  const seen = new Set();
  return out.filter(f => f && f.date && !seen.has(f.id) && seen.add(f.id));
}
// 2026-08 → "2026-2027"; the Israeli season runs Aug→May
function seasonLabel(d) {
  const p = ilParts(d);
  return p.m >= 7 ? `${p.y}-${p.y + 1}` : `${p.y - 1}-${p.y}`;
}
function mapEvent(e, kind) {
  if (!e || !e.dateEvent) return null;
  const home = e.strHomeTeam, away = e.strAwayTeam;
  return {
    id: e.idEvent, kind, date: e.dateEvent, time: e.strTime || '',
    home, away, homeId: clubIdOf(home), awayId: clubIdOf(away),
    league: e.strLeague || '',
  };
}

/* ── which match matters ──────────────────────────────────────────────────── */
function derbyOf(a, b) {
  const hit = DERBIES.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return hit ? hit[2] : null;
}
// A national-team night is the event of the DAY, but a month-long challenge is
// better hung on a derby than on one evening — so its weight fades by period.
function score(f, period) {
  if (f.kind === 'nt') return period === 'daily' ? 100 : period === 'weekly' ? 60 : 30;
  if (f.kind === 'round' && period === 'daily') return 0;   // no date → can't be today's
  if (!f.homeId || !f.awayId) return 0;          // unmapped club — never guess
  // The size of a fixture is set by its WEAKER side: a giant against a minnow is
  // not a big night, two mid-size rivals can be. So the smaller prestige counts
  // double, and the larger one only once.
  const a = prestige(f.homeId), b = prestige(f.awayId);
  return 10 + Math.max(a, b) + 2 * Math.min(a, b) + (derbyOf(f.homeId, f.awayId) ? 25 : 0);
}
function pickBest(list, period) {
  return list.map(f => ({ f, s: score(f, period) })).filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.f.date.localeCompare(b.f.date))[0]?.f ?? null;
}

/* ── composing the challenge ──────────────────────────────────────────────── */
const heb = id => (TEAMS[id] || {}).name || id;
// n players from a club, but never more than the data can supply
function clubMission(teamId, n) {
  const depth = CLUB_DEPTH[teamId] || 0;
  if (depth < n * 8) return null;               // thin club → don't risk a dead mission
  return { type: 'club_count', teamId, n };
}
function compose(period, f) {
  if (f.kind === 'nt') {
    const n = period === 'daily' ? 6 : period === 'weekly' ? 8 : 11;
    return {
      label: period === 'daily' ? '🇮🇱 ערב נבחרת'
           : period === 'weekly' ? '🇮🇱 שבוע הנבחרת' : '🇮🇱 חודש הנבחרת',
      requirements: [{ type: 'nat_count', nat: 'ישראל', n }],
      note: `${f.home} נגד ${f.away} · ${f.league}`,
    };
  }
  const derby = derbyOf(f.homeId, f.awayId);
  const big = prestige(f.homeId) >= prestige(f.awayId) ? f.homeId : f.awayId;
  const other = big === f.homeId ? f.awayId : f.homeId;
  const n = period === 'daily' ? 2 : 3;
  const reqs = f.undated
    ? [clubMission(f.homeId, 2), clubMission(f.awayId, 2)].filter(Boolean)
    : [clubMission(big, n), period !== 'daily' ? clubMission(other, 1) : null].filter(Boolean);
  if (!reqs.length) return null;
  const when = period === 'daily' ? 'ערב' : period === 'weekly' ? 'שבוע' : 'חודש';
  const rivalry = f.undated ? derbyOf(f.homeId, f.awayId) : null;
  const label = f.undated
    ? (rivalry ? `🔥 ${rivalry}` : `🔥 המשחקים הגדולים של המחזור`)
    : (derby ? `🔥 ${when} ה${derby}` : `⚽ ${heb(f.homeId)} נגד ${heb(f.awayId)}`);
  const note = f.undated
    ? `מחזור ${f.round}: ${heb(f.homeId)} ו${heb(f.awayId)} עדיין בלי שעת פתיחה`
    : `${f.date} ${f.time} · ${f.home} vs ${f.away}`;
  const s = { label, requirements: reqs, note };
  if (period !== 'daily') s.difficulty = 'hard';
  if (period === 'monthly') s.requirements.push({ type: 'max_team_ovr', ovr: 84 });
  return s;
}

// Every club plays every round. So a club with no dated game in the window is
// still playing that round — the kickoff simply hasn't been set (European ties
// hold up the Israeli schedule every August). For the WEEKLY and MONTHLY
// challenge the date is irrelevant, so those clubs are still fair game; only
// the DAILY challenge truly needs a date.
function roundsInWindow(inRange) {
  return [...new Set(inRange.filter(f => f.kind === 'league' && f.round != null).map(f => f.round))];
}
// clubs of a round that have no kickoff yet = every club in the league minus the
// ones already listed in that round's fixtures
function undatedClubs(round, all) {
  const inRound = new Set();
  all.forEach(f => {
    if (f.round !== round) return;
    if (f.homeId) inRound.add(f.homeId);
    if (f.awayId) inRound.add(f.awayId);
  });
  if (!inRound.size) return [];
  const league = new Set();
  all.forEach(f => { if (f.kind === 'league') { if (f.homeId) league.add(f.homeId); if (f.awayId) league.add(f.awayId); } });
  return [...league].filter(id => !inRound.has(id)).sort((a, b) => prestige(b) - prestige(a));
}
// a stand-in "fixture" for the two biggest clubs of this round with no date yet
function undatedPair(inRange, all) {
  for (const r of roundsInWindow(inRange)) {
    const g = undatedClubs(r, all).filter(id => (FANBASE[id] || 0) >= 8);
    if (g.length < 2) continue;
    // Several giants can be unscheduled at once and their prestige often ties.
    // If two of them are known rivals, that is almost certainly the pairing the
    // league held back — so prefer it over an arbitrary top-two.
    let pick = [g[0], g[1]];
    outer: for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++)
        if (derbyOf(g[i], g[j])) { pick = [g[i], g[j]]; break outer; }
    return { kind: 'round', round: r, homeId: pick[0], awayId: pick[1],
             home: heb(pick[0]), away: heb(pick[1]), date: '', time: '', undated: true,
             id: 'round-' + r + '-' + pick[0] + '-' + pick[1] };
  }
  return null;
}

/* ── periods that are still safe to write ─────────────────────────────────── */
// Only ever the NEXT period: the current one may already be in play.
function targets(now) {
  const tomorrow = new Date(now.getTime() + DAY);
  const nextWeek = new Date(now.getTime() + 7 * DAY);
  const nextMonth = new Date(now.getTime() + 31 * DAY);
  const out = [{ period: 'daily', key: dailyKey(tomorrow), from: tomorrow, to: tomorrow }];
  const wk = weeklyKey(nextWeek);
  if (wk !== weeklyKey(now)) out.push({ period: 'weekly', key: wk, from: new Date(wk + 'T00:00:00Z'), to: new Date(new Date(wk + 'T00:00:00Z').getTime() + 6 * DAY) });
  const mk = monthlyKey(nextMonth);
  if (mk !== monthlyKey(now)) out.push({ period: 'monthly', key: mk, from: new Date(mk + '-01T00:00:00Z'), to: new Date(new Date(mk + '-01T00:00:00Z').getTime() + 31 * DAY) });
  return out;
}
const inWindow = (f, t) => f.date >= dailyKey(t.from) && f.date <= dailyKey(t.to);

// Which prominent clubs have no scheduled game in this window. In Israel the
// round is often published in pieces — clubs playing in Europe get their game
// dated late — so a missing giant is a real signal, not a bug.
function unscheduledNote(inRange, all) {
  const notes = [];
  for (const r of roundsInWindow(inRange)) {
    const missing = undatedClubs(r, all);
    if (missing.length) notes.push(`מחזור ${r}: ${missing.map(heb).join(', ')}`);
  }
  return notes.length ? `

📌 עדיין בלי שעת פתיחה — ${notes.join(' · ')}.` : '';
}

/* ── Telegram approvals from the previous run ─────────────────────────────── */
async function processTaps() {
  const offset = await stateGet('chal_tg_offset');
  const u = await tg('getUpdates', { offset: offset ? +offset + 1 : undefined, timeout: 0 });
  if (!u || !u.ok) return;
  for (const up of u.result) {
    await stateSet('chal_tg_offset', up.update_id);
    const cq = up.callback_query;
    if (!cq || !cq.data) continue;
    const [action, period, key] = cq.data.split(':');
    if (action !== 'ca' && action !== 'cr') continue;
    const raw = await stateGet(`chal_pending|${period}|${key}`);
    let msg = 'הצעה לא נמצאה (אולי כבר טופלה)';
    if (raw) {
      if (action === 'ca') {
        const s = JSON.parse(raw);
        delete s.note; delete s.score; delete s.message_id;
        await sb('POST', 'challenge_overrides',
          { period, challenge_key: key, settings: s },
          { Prefer: 'resolution=merge-duplicates' });
        msg = `✅ נשמר: ${period} ${key}`;
      } else {
        msg = `🗑️ נדחה: ${period} ${key}`;
        try { await stateSet(`chal_rejected|${period}|${key}`, JSON.parse(raw).label || ''); } catch (e) {}
      }
      await stateSet(`chal_pending|${period}|${key}`, '');
    }
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: msg });
    await tg('sendMessage', { chat_id: TELEGRAM_CHAT_ID, text: msg });
  }
}

/* ── main ─────────────────────────────────────────────────────────────────── */
(async () => {
  const dry = DRY_RUN === '1';
  const force = process.env.FORCE === '1';   // re-propose even if one is pending
  if (!dry) await processTaps().catch(e => console.error('taps failed:', e.message));

  const all = await fixtures();
  console.log(`fixtures: ${all.length}`);
  const now = new Date();

  for (const t of targets(now)) {
    const inRange = all.filter(f => inWindow(f, t));
    const candidates = [...inRange];
    if (t.period !== 'daily') {
      const pair = undatedPair(inRange, all);
      if (pair) candidates.push(pair);
    }
    const best = pickBest(candidates, t.period);
    if (!best) { console.log(`${t.period} ${t.key}: no notable fixture`); continue; }

    const proposal = compose(t.period, best);
    if (!proposal) { console.log(`${t.period} ${t.key}: fixture found but no safe mission`); continue; }

    if (dry) { console.log(`${t.period} ${t.key}:`, JSON.stringify(proposal, null, 1)); continue; }

    // never overwrite something already decided — by you in admin or by an earlier run
    const existing = await sb('GET',
      `challenge_overrides?period=eq.${t.period}&challenge_key=eq.${encodeURIComponent(t.key)}&select=challenge_key`);
    if (existing && existing.length) { console.log(`${t.period} ${t.key}: already overridden, skipping`); continue; }
    const pendingRaw = await stateGet(`chal_pending|${t.period}|${t.key}`);
    const bestScore = score(best, t.period);
    let prev = null;
    try { prev = pendingRaw ? JSON.parse(pendingRaw) : null; } catch (e) {}

    // Never say the same thing twice. A proposal is only worth a message if its
    // headline or its missions actually changed — force re-evaluates, it does
    // not re-send.
    const rejected = await stateGet(`chal_rejected|${t.period}|${t.key}`);
    if (rejected && rejected === proposal.label) {
      console.log(`${t.period} ${t.key}: you already rejected "${rejected}" — not re-offering`); continue;
    }
    const same = prev && prev.label === proposal.label &&
      JSON.stringify(prev.requirements) === JSON.stringify(proposal.requirements);
    if (same) { console.log(`${t.period} ${t.key}: unchanged — not re-sending`); continue; }
    if (prev && !force && bestScore <= (prev.score || 0)) {
      console.log(`${t.period} ${t.key}: already proposed (score ${prev.score || 0})`); continue;
    }
    if (prev) console.log(`${t.period} ${t.key}: proposal changed (${prev.score || 0} → ${bestScore})`);

    proposal.score = bestScore;
    const periodHe = { daily: 'יומי', weekly: 'שבועי', monthly: 'חודשי' }[t.period];
    const reqLines = proposal.requirements.map(r =>
      r.type === 'club_count' ? `· לפחות ${r.n} מ${heb(r.teamId)}`
      : r.type === 'nat_count' ? `· לפחות ${r.n} שחקנים מישראל`
      : `· דירוג הרכב עד ${r.ovr}`).join('\n');
    const leagueCount = inRange.filter(x => x.kind === 'league').length;
    const body = {
      chat_id: TELEGRAM_CHAT_ID,
      text: (prev ? `🔄 עדכון להצעה · ` : `🎯 אתגר ${periodHe} מוצע · `) + t.key + `\n\n`
          + `${proposal.label}\n${proposal.note}\n\n${reqLines}`
          + (proposal.difficulty ? `\n· קושי: קשה` : '')
          + unscheduledNote(inRange, all)
          + (best.kind === 'league' && leagueCount < 7
              ? `\n\n⚠️ רק ${leagueCount} משחקים פורסמו למחזור — אם יתפרסם משחק גדול יותר, תגיע הצעה מעודכנת.`
              : ''),
      reply_markup: { inline_keyboard: [[
        { text: '✅ אשר', callback_data: `ca:${t.period}:${t.key}` },
        { text: '🗑️ דחה', callback_data: `cr:${t.period}:${t.key}` },
      ]] },
    };
    let sent;
    if (prev && prev.message_id) {                       // replace, don't repeat
      sent = await tg('editMessageText', { ...body, message_id: prev.message_id });
      if (!sent || !sent.ok) sent = await tg('sendMessage', body);
    } else {
      sent = await tg('sendMessage', body);
    }
    proposal.message_id = (sent && sent.result && sent.result.message_id) || (prev && prev.message_id) || null;
    await stateSet(`chal_pending|${t.period}|${t.key}`, JSON.stringify(proposal));
    console.log(`${t.period} ${t.key}: ${prev ? 'updated' : 'proposed'} "${proposal.label}"`);
  }
})().catch(e => { console.error(e); process.exit(1); });
