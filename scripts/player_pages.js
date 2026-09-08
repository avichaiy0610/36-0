// Player SEO pages for 36-0 (growth plan: newsjacking SEO). Evergreen page per
// Ligat ha'Al player, built from our own data (every season's club, position,
// rating). Generated on demand — prioritised by who's in the news — so the page
// exists right when people google that player, and compounds into a large
// long-tail library that Google distributes to strangers for free.
//
// Committed (not gitignored): the GitHub Action imports this at runtime.
// Also runnable as a CLI:  node scripts/player_pages.js "יוסי אבוקסיס"
//                          node scripts/player_pages.js --backfill 5
//                          node scripts/player_pages.js --sitemap
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');          // repo root
const SITE = 'https://www.36-0.co.il';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = s => String(s || '').replace(/‎|‏/g, '').trim();
const POS_HE = { GK: 'שוער', CB: 'בלם', RB: 'מגן ימני', LB: 'מגן שמאלי', RWB: 'מגן ימני', LWB: 'מגן שמאלי',
  CDM: 'קשר הגנתי', CM: 'קשר', CAM: 'קשר התקפי', RM: 'קשר ימני', LM: 'קשר שמאלי',
  RW: 'כנף ימני', LW: 'כנף שמאלי', ST: 'חלוץ', CF: 'חלוץ', SS: 'חלוץ' };

function load() {
  return new Function(fs.readFileSync(path.join(BASE, 'js', 'data.js'), 'utf8') +
    '\n;return {TEAMS, SQUADS};')();
}

// What the player CARD in the game already knows and these pages did not.
// A page of nothing but a four-row ratings table is a template with a name
// swapped into it, which is what Google's scaled-content policy is aimed at —
// and ours came to a median of 102 words. Everything added below is a fact
// about THIS player that no other page repeats: the titles he was in the squad
// for, the seasons he finished top of the scorers' table, the year he peaked.
let _facts = null;
function factsData() {
  if (_facts) return _facts;
  try {
    _facts = new Function(fs.readFileSync(path.join(BASE, 'js', 'tag-data.js'), 'utf8') +
      '\n;return { PLAYER_REAL: typeof PLAYER_REAL !== "undefined" ? PLAYER_REAL : {},' +
      '           SEASON_FACTS: typeof SEASON_FACTS !== "undefined" ? SEASON_FACTS : {},' +
      '           TAG_DATA: typeof TAG_DATA !== "undefined" ? TAG_DATA : {} };')();
  } catch (e) { _facts = { PLAYER_REAL: {}, SEASON_FACTS: {}, TAG_DATA: {} }; }
  return _facts;
}

// The rest of what the game knows about a man and these pages threw away. The
// six attributes are the important one: js/attr-data.js carries a row for every
// player in every squad — 366 of 366, no gaps — so unlike the scorers' table
// (177 players) or the duos (131) it has something to say about EVERY page,
// including the ones with nothing but a name and two seasons.
function loadJs(file, names) {
  try {
    return new Function(fs.readFileSync(path.join(BASE, 'js', file), 'utf8') + '\n;return {' +
      names.map(n => `${n}: typeof ${n} !== "undefined" ? ${n} : undefined`).join(',') + '};')();
  } catch (e) { return {}; }
}
let _extra = null;
function extraData() {
  if (_extra) return _extra;
  const a = loadJs('attr-data.js', ['ATTR_DATA', 'ATTR_PLAYER_WHY', 'ATTR_CLUB_WHY']);
  _extra = {
    ATTR_DATA:       a.ATTR_DATA       || {},
    ATTR_PLAYER_WHY: a.ATTR_PLAYER_WHY || {},
    ATTR_CLUB_WHY:   a.ATTR_CLUB_WHY   || {},
    CHEM_PAIRS:  loadJs('chem-data.js',   ['CHEM_PAIRS']).CHEM_PAIRS   || {},
    EU_CAPS:     loadJs('eu-caps-data.js', ['EU_CAPS']).EU_CAPS        || {},
    PLAYER_NATS: loadJs('player_nats.js', ['PLAYER_NATS']).PLAYER_NATS || {},
    // TAG_DATA stores the key ('golden_boot'), the count and the evidence, but
    // not the words — those live with the game's tag rules.
    TAG_DEFS:    loadJs('tags.js',        ['TAG_DEFS']).TAG_DEFS       || {},
  };
  return _extra;
}

// The six, in the packed order of js/attrs.js. Kept in step with it by hand:
// this script runs in node and that file is a browser global.
const ATTR_KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
const ATTR_NAME = { pac: 'מהירות', sho: 'בעיטה', pas: 'מסירה', dri: 'כדרור', def: 'הגנה', phy: 'פיזיות' };

function attrsFor(squadId, i) {
  const packed = extraData().ATTR_DATA[squadId];
  if (!packed) return null;
  const row = String(packed).split('|')[i];
  if (!row) return null;
  const n = row.split(',').map(Number);
  if (n.length < ATTR_KEYS.length || n.some(x => !isFinite(x))) return null;
  const out = {};
  ATTR_KEYS.forEach((k, j) => { out[k] = n[j]; });
  return out;
}

// season → the club that won it / kept the tightest defence, matched against
// the seasons he was actually registered there. A mid-season move must not hand
// him two titles for one championship, so a season counts once.
function playerFacts(e) {
  const { PLAYER_REAL, SEASON_FACTS } = factsData();
  const real = PLAYER_REAL[clean(e.name)] || { g: [], a: [] };
  const titles = [], walls = [];
  const seen = new Set();
  for (const c of e.career) {
    const f = SEASON_FACTS[c.season];
    if (!f || seen.has(c.season)) continue;
    if (f[0] === c.teamId) { titles.push(c.season); seen.add(c.season); }
    if (f[1] === c.teamId) walls.push({ season: c.season, ga: f[2] });
  }
  const peakRow = e.career.filter(c => c.ovr === e.peak)
    .sort((a, b) => a.season.localeCompare(b.season))[0];
  const byClub = {};
  e.career.forEach(c => { (byClub[c.teamId] = byClub[c.teamId] || new Set()).add(c.season); });
  const home = Object.entries(byClub).map(([id, s]) => ({ id, n: s.size }))
    .sort((a, b) => b.n - a.n)[0];
  // The six, averaged over his whole career rather than read off the peak year:
  // one good season is a fluke, the average is the player. Rounded once, at the
  // end, so the printed numbers still add up the way the game's do.
  const rows = e.career.map(c => attrsFor(c.squadId, c.row)).filter(Boolean);
  let attrs = null, attrTop = null, attrLow = null;
  if (rows.length) {
    attrs = {};
    for (const k of ATTR_KEYS) attrs[k] = Math.round(rows.reduce((s, r) => s + r[k], 0) / rows.length);
    const ranked = ATTR_KEYS.slice().sort((a, b) => attrs[b] - attrs[a]);
    attrTop = ranked[0]; attrLow = ranked[ranked.length - 1];
  }

  return {
    titles, walls, home, peakRow,
    goals:   (real.g || []).slice().sort((a, b) => b[1] - a[1]),
    assists: (real.a || []).slice().sort((a, b) => b[1] - a[1]),
    seasons: new Set(e.career.map(c => c.season)).size,
    attrs, attrTop, attrLow,
    tags:    (factsData().TAG_DATA[clean(e.name)] || []),
    nats:    (extraData().PLAYER_NATS[clean(e.name)] || []),
    europe:  extraData().EU_CAPS[clean(e.name)] || null,
    duos:    duosFor(e.name),
  };
}

// name -> partners, strongest link first. CHEM_PAIRS is keyed by the sorted
// pair, so the only way to ask "who did HE play with" is to invert it once.
let _duoIdx = null;
function duosFor(name) {
  if (!_duoIdx) {
    _duoIdx = {};
    const norm = s => String(s ?? '').replace(/[‎‏]/g, '').replace(/[׳’`´']/g, "'").replace(/\s+/g, ' ').trim();
    for (const [key, v] of Object.entries(extraData().CHEM_PAIRS)) {
      const [a, b] = key.split('|');
      (_duoIdx[norm(a)] = _duoIdx[norm(a)] || []).push({ who: b, tier: v[0], seasons: v[1], titles: v[2] });
      (_duoIdx[norm(b)] = _duoIdx[norm(b)] || []).push({ who: a, tier: v[0], seasons: v[1], titles: v[2] });
    }
    for (const k in _duoIdx) _duoIdx[k].sort((x, y) => y.tier - x.tier || y.seasons - x.seasons);
  }
  const norm = s => String(s ?? '').replace(/[‎‏]/g, '').replace(/[׳’`´']/g, "'").replace(/\s+/g, ' ').trim();
  return _duoIdx[norm(name)] || [];
}

// name -> { name, career:[{teamId,season,ovr,position}], peak, mainTeam, teams[] }
function buildIndex(SQUADS) {
  const idx = {};
  for (const s of SQUADS) for (let i = 0; i < s.players.length; i++) {
    const p = s.players[i];
    const name = clean(p.name);
    if (!name) continue;
    // squadId + the player's position INSIDE the squad: that pair is the key
    // into js/attr-data.js, which stores rows positionally and never by name.
    (idx[name] = idx[name] || { name, career: [] }).career
      .push({ teamId: s.teamId, season: s.season, ovr: p.ovr, position: p.position,
              squadId: s.id, row: i });
  }
  for (const name in idx) {
    const c = idx[name].career.sort((a, b) => a.season.localeCompare(b.season));
    idx[name].peak = Math.max(...c.map(x => x.ovr));
    const cnt = {}; c.forEach(x => cnt[x.teamId] = (cnt[x.teamId] || 0) + 1);
    idx[name].teams = [...new Set(c.map(x => x.teamId))];
    idx[name].mainTeam = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  }
  return idx;
}

// URL/dir slug — keep it readable Hebrew (Google indexes Hebrew URLs fine)
function slugFor(name) {
  return clean(name).replace(/["'׳״.()]/g, '').replace(/\s+/g, '-');
}

function pageHtml(TEAMS, e) {
  const name = e.name, mt = TEAMS[e.mainTeam], mtName = mt ? mt.name : e.mainTeam;
  const seasons = e.career.map(c => c.season);
  const years = seasons[0] === seasons[seasons.length - 1] ? seasons[0] : `${seasons[0]}–${seasons[seasons.length - 1]}`;
  const positions = [...new Set(e.career.map(c => POS_HE[c.position] || c.position))];
  const url = `${SITE}/player/${slugFor(name)}/`;
  const title = `${name} — הקריירה בליגת העל | 36-0`;
  const desc = `${name}: כל העונות, המועדונים והדירוגים בליגת העל (${years}). דירוג שיא ${e.peak}, ` +
    `${e.teams.length > 1 ? e.teams.length + ' מועדונים' : mtName}. בנה את הרכב החלומות במשחק 36-0.`;

  const rows = e.career.slice().reverse().map(c => {
    const t = TEAMS[c.teamId];
    return `<tr><td>${esc(c.season)}</td>` +
      `<td>${t ? `<a href="/team/${c.teamId}/">${esc(t.name)}</a>` : esc(c.teamId)}</td>` +
      `<td>${esc(POS_HE[c.position] || c.position)}</td><td class="ovr">${c.ovr}</td></tr>`;
  }).join('');
  const clubLinks = e.teams.map(id => TEAMS[id]
    ? `<a class="chip" href="/team/${id}/">${esc(TEAMS[id].name)}</a>` : '').join('');

  /* ── what actually happened to him, in prose and in numbers ─────────────── */
  const F = playerFacts(e);
  const nm = n => (TEAMS[n] ? TEAMS[n].name : n);

  // A page we would not defend to a human. Not "few seasons" on its own — three
  // seasons with a title and a golden boot is a real story — but few seasons AND
  // nothing on record beyond a rating: no title, no goal in the scorers' table,
  // no tag, no European night, no partner worth naming. Those get noindex and no
  // ad slot. They stay online and linked (a reader who searches the name still
  // finds him) and they keep passing link equity to the pages that earned it,
  // which is what `follow` is for.
  const thin = F.seasons <= 3 && !F.titles.length && !F.goals.length && !F.assists.length
    && !F.tags.length && !F.europe && !F.duos.length && !F.walls.length;
  // Hebrew, not a template: "ב-1 עונות" and a list joined by repeated "ו" are
  // exactly what makes generated prose read as generated.
  const inS  = n => (n === 1 ? 'בעונה אחת' : `ב-${n} עונות`);
  const nS   = n => (n === 1 ? 'עונה אחת' : `${n} עונות`);
  // "ו2024/25" is wrong; before a numeral the vav takes a maqaf.
  const vav = s => (/^[0-9]/.test(s) ? 'ו-' : 'ו') + s;
  const list = a => (a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' ' + vav(a[a.length - 1]));
  const sentences = [];
  sentences.push(`${name} רשום אצלנו ${inS(F.seasons)} של ליגת העל` +
    (F.home ? (e.teams.length > 1
      ? `, רובן ב${esc(nm(F.home.id))} (${nS(F.home.n)})`
      : (F.seasons > 1 ? `, כולן ב${esc(nm(F.home.id))}` : `, ב${esc(nm(F.home.id))}`)) : '') + '.');
  if (F.peakRow) sentences.push(`הדירוג הגבוה ביותר שלו, ${e.peak}, נרשם בעונת ${esc(F.peakRow.season)} ב${esc(nm(F.peakRow.teamId))}.`);
  if (F.titles.length) sentences.push(`הוא היה בסגל האלוף ${inS(F.titles.length)}: ${list(F.titles.map(esc))}.`);
  if (F.goals.length) {
    const tot = F.goals.reduce((s, r) => s + r[1], 0);
    const boots = F.goals.filter(r => r[2] === 1).length;
    sentences.push(`בטבלת המבקיעים הוא נרשם עם ${tot} שערים ${inS(F.goals.length)}` +
      (boots ? `, ${boots === 1 ? 'ובאחת מהן סיים מלך שערים' : `וב-${boots} מהן סיים מלך שערים`}` : '') + '.');
  }
  if (F.assists.length) {
    const tot = F.assists.reduce((s, r) => s + r[1], 0);
    const kings = F.assists.filter(r => r[2] === 1).length;
    sentences.push(`בטבלת הבישולים נרשמו לו ${tot} בישולים ${inS(F.assists.length)}` +
      (kings ? `, ${kings === 1 ? 'ובאחת מהן היה ראשון' : `וב-${kings} מהן היה ראשון`}` : '') + '.');
  }
  if (F.walls.length) sentences.push(
    `הקבוצה שבה שיחק סיימה עם ההגנה הטובה בליגה ${list(F.walls.map(w => `ב-${esc(w.season)} (${w.ga} ספיגות)`))}.`);
  if (F.europe) sentences.push(F.europe.k === 'abroad'
    ? `הוא שיחק בליגת האלופות מחוץ לישראל, ב${esc(F.europe.c)} בעונת ${esc(F.europe.s)}.`
    : `הוא היה בסגל ש${esc(nm(F.europe.c) || F.europe.c)} העלתה לשלב הבתים של ליגת האלופות ב-${esc(F.europe.s)}.`);
  if (F.attrs) sentences.push(
    `בשש התכונות שהמשחק גוזר מהנתונים הוא חזק במיוחד ב${ATTR_NAME[F.attrTop]} (${F.attrs[F.attrTop]}) ` +
    `וחלש יחסית ב${ATTR_NAME[F.attrLow]} (${F.attrs[F.attrLow]}).`);
  if (F.duos.length) {
    // "הצמד ... היה עם X, Y ו-Z" is three men in a word that means two. One
    // sentence names the longest partnership; a second, only when there is more
    // than one, names who else he lined up with.
    const d0 = F.duos[0], rest = F.duos.slice(1, 3);
    sentences.push(`השותף הקבוע ביותר שלו על המגרש היה ${esc(d0.who)} — ` +
      `${d0.seasons === 1 ? 'עונה אחת יחד' : `${d0.seasons} עונות יחד`}` +
      (d0.titles ? `, ${d0.titles === 1 ? 'ואליפות משותפת אחת' : `ו-${d0.titles} אליפויות משותפות`}` : '') + '.');
    if (rest.length) sentences.push(`הוא שיחק גם לצד ${list(rest.map(d => esc(d.who)))}.`);
  }
  const intro = `<p class="lede">${sentences.join(' ')}</p>`;

  /* ── the six attributes, as the game computes them ──────────────────────── */
  // Bars, not a bare row of numbers: the shape of a player is the point, and a
  // reader takes it in at a glance instead of comparing six two-digit numbers.
  const attrHtml = !F.attrs ? '' :
    `<h2>שש התכונות של ${esc(name)}</h2>
    <p class="note">ממוצע כל עונותיו בליגה. התכונות נגזרות מהנתונים עצמם — בעיטה מטבלת המבקיעים, מסירה מטבלת הבישולים, הגנה ממה שספגה קבוצתו ופיזיות מאורך הקריירה. <a href="/methodology.html">איך זה מחושב</a>.</p>
    <table class="attrs">${ATTR_KEYS.map(k =>
      `<tr><td class="ak">${ATTR_NAME[k]}</td><td class="av">${F.attrs[k]}</td>` +
      `<td class="ab"><i style="width:${Math.max(2, Math.min(100, F.attrs[k]))}%"></i></td></tr>`).join('')}</table>`;

  // key, how many times, and the seasons it happened in — the evidence is the
  // reason the row is worth printing at all.
  const TD = extraData().TAG_DEFS;
  const tagHtml = !F.tags.length ? '' :
    `<h2>התארים של ${esc(name)}</h2><table class="facts">${F.tags.map(t => {
      const d = TD[t[0]]; if (!d) return '';
      const times = (t[1] > 1 && t[0] !== 'prime90') ? ` ×${t[1]}` : '';
      return `<tr><td class="fk">${esc(d.icon || '')} ${esc(d.name)}${times}</td><td>${esc(t[2] || '')}</td></tr>`;
    }).join('')}</table>`;

  const duoHtml = !F.duos.length ? '' :
    `<h2>שיחק לצד</h2><table class="facts">${F.duos.slice(0, 6).map(d =>
      `<tr><td class="fk">${esc(d.who)}</td><td>${d.seasons === 1 ? 'עונה אחת' : `${d.seasons} עונות`} יחד` +
      `${d.titles ? ` · ${d.titles === 1 ? 'אליפות אחת' : `${d.titles} אליפויות`}` : ''}</td></tr>`).join('')}</table>`;

  const factRow = (label, value) => `<tr><td class="fk">${label}</td><td>${value}</td></tr>`;
  const factRows = [
    factRow('עונות בליגה', F.seasons),
    factRow('עמדה', esc(positions.join(', '))),
    F.nats.length ? factRow(F.nats.length > 1 ? 'אזרחויות' : 'לאום', F.nats.map(esc).join(' · ')) : '',
    F.europe ? factRow('ליגת האלופות', F.europe.k === 'abroad'
      ? `${esc(F.europe.c)} · ${esc(F.europe.s)}` : `${esc(nm(F.europe.c) || F.europe.c)} · ${esc(F.europe.s)}`) : '',
    factRow('דירוג שיא', `<b class="ovr">${e.peak}</b>${F.peakRow ? ` · ${esc(F.peakRow.season)} · ${esc(nm(F.peakRow.teamId))}` : ''}`),
    F.home ? factRow('הכי הרבה עונות', `${esc(nm(F.home.id))} · ${F.home.n}`) : '',
    F.titles.length ? factRow('אליפויות בסגל', `${F.titles.length} · ${F.titles.map(esc).join(', ')}`) : '',
    F.goals.length ? factRow('שערים בטבלת המבקיעים',
      `${F.goals.reduce((s, r) => s + r[1], 0)} · ${F.goals.map(r => `${esc(r[0])} (${r[1]}${r[2] === 1 ? ' 👑' : ''})`).join(' · ')}`) : '',
    F.assists.length ? factRow('בישולים בטבלת הבישולים',
      `${F.assists.reduce((s, r) => s + r[1], 0)} · ${F.assists.map(r => `${esc(r[0])} (${r[1]}${r[2] === 1 ? ' 👑' : ''})`).join(' · ')}`) : '',
  ].filter(Boolean).join('');
  const factsHtml = `<h2>העובדות על ${esc(name)}</h2><table class="facts">${factRows}</table>`;

  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Person', name,
    jobTitle: 'שחקן כדורגל', nationality: 'IL', url,
    affiliation: e.teams.filter(id => TEAMS[id]).map(id => ({ '@type': 'SportsTeam', name: TEAMS[id].name })),
  };

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${url}" />${thin ? `
  <meta name="robots" content="noindex,follow" />` : ''}
  <meta property="og:title" content="${esc(title)}" /><meta property="og:description" content="${esc(desc)}" />
  <meta property="og:type" content="profile" /><meta property="og:url" content="${url}" /><meta property="og:image" content="${SITE}/og-image.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />${thin ? '' : `
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2000268715013437" crossorigin="anonymous"></script>`}
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;800;900&display=swap" rel="stylesheet">
  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0d1117; color: #e6edf3; font-family: 'Heebo', Arial, sans-serif; direction: rtl; line-height: 1.7; }
    .wrap { max-width: 780px; margin: 0 auto; padding: 28px 18px 80px; }
    .back { display: inline-block; margin-bottom: 14px; color: #8b949e; text-decoration: none; font-size: 14px; }
    .logo { font-size: 30px; font-weight: 900; background: linear-gradient(135deg,#FFD700,#ff9500 55%,#FFD700); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .logo a { text-decoration: none; }
    h1 { font-size: 28px; margin: 18px 0 6px; color: #fff; }
    .sub { color: #8b949e; margin-bottom: 18px; font-size: 15px; }
    .sub b { color: #FFD700; }
    h2 { font-size: 19px; margin: 28px 0 12px; color: #FFD700; }
    .cta { display: inline-block; background: linear-gradient(135deg,#FFD700,#f0a500); color: #111; font-weight: 900; font-size: 16px; padding: 13px 30px; border-radius: 50px; text-decoration: none; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 14.5px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #21262d; text-align: right; } th { color: #8b949e; font-size: 12px; }
    td a { color: #58a6ff; text-decoration: none; }
    td.ovr, .ovr { color: #FFD700; font-weight: 800; }
    .lede { color: #c9d1d9; font-size: 15.5px; margin: 18px 0 4px; }
    .note { color: #8b949e; font-size: 13px; margin: -4px 0 12px; } .note a { color: #58a6ff; }
    table.facts td { vertical-align: top; }
    table.facts td.fk { color: #8b949e; font-size: 13px; white-space: nowrap; width: 1%; }
    table.attrs td.ak { color: #8b949e; font-size: 13px; white-space: nowrap; width: 1%; }
    table.attrs td.av { color: #FFD700; font-weight: 800; width: 1%; }
    table.attrs td.ab { padding-left: 0; }
    table.attrs td.ab i { display: block; height: 7px; border-radius: 4px; background: linear-gradient(90deg,#f0a500,#FFD700); }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { background: #161b22; border: 1px solid #30363d; border-radius: 50px; padding: 6px 14px; font-size: 13.5px; color: #e6edf3; text-decoration: none; }
    .foot { margin-top: 44px; border-top: 1px solid #30363d; padding-top: 16px; font-size: 12px; color: #5a6472; } .foot a { color: #8b949e; }
  </style>
</head>
<body>
  <div class="wrap">
    <a class="back" href="/">← המשחק</a>
    <div class="logo"><a href="/"><span dir="ltr">36–0</span></a></div>

    <h1>${esc(name)}</h1>
    <p class="sub">הקריירה בליגת העל · <b>דירוג שיא ${e.peak}</b> · ${esc(years)} · ${esc(positions.join(', '))}</p>

    <div style="text-align:center;margin:6px 0 8px">
      <a class="cta" href="/team/${esc(e.mainTeam)}/">בנה את הרכב כל הזמנים של ${esc(mtName)} ←</a>
    </div>

    ${intro}
    ${factsHtml}
    ${attrHtml}
    ${tagHtml}

    <h2>${esc(name)} עונה אחר עונה</h2>
    <table>
      <tr><th>עונה</th><th>מועדון</th><th>עמדה</th><th>דירוג</th></tr>
      ${rows}
    </table>

    ${duoHtml}

    <h2>המועדונים של ${esc(name)}</h2>
    <div class="chips">${clubLinks}</div>

    <div style="text-align:center;margin-top:28px"><a class="cta" href="/">שחק עכשיו ב-36-0 ←</a></div>

    <div class="foot">
      36-0 — משחק דראפט חינמי לחובבי הכדורגל הישראלי · הנתונים למטרות מידע ובידור בלבד ואינם רשמיים ·
      <a href="/players/">כל השחקנים</a> · <a href="/methodology.html">מתודולוגיה</a> ·
      <a href="/how-to-play.html">איך משחקים</a> · <a href="/about.html">אודות</a> · <a href="/">משחק</a>
    </div>
  </div>
</body>
</html>`;
}

// write one player's page if it doesn't exist yet. returns {slug, created}
function writePlayer(TEAMS, e, force) {
  const slug = slugFor(e.name);
  const dir = path.join(BASE, 'player', slug);
  const file = path.join(dir, 'index.html');
  // Normally a page is written once and left alone — the Action calls this for
  // players in the news and must not rewrite the library every run. `force` is
  // for the times the TEMPLATE changed and every existing page is now stale.
  if (fs.existsSync(file) && !force) return { slug, created: false };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, pageHtml(TEAMS, e));
  return { slug, created: true };
}

// rebuild sitemap.xml from what's actually on disk: core + team/* + player/*
function writeSitemap() {
  const u = (loc, freq, pri) => `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>`;
  const dirsIn = d => { try { return fs.readdirSync(path.join(BASE, d), { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name); } catch { return []; } };
  // A sitemap is a list of pages we are ASKING to be indexed, so a page carrying
  // noindex must not appear in it — submitting one and then refusing it is a
  // contradiction Search Console reports as an error.
  const indexable = (d, s) => {
    try { return !/<meta\s+name="robots"[^>]*noindex/i.test(fs.readFileSync(path.join(BASE, d, s, 'index.html'), 'utf8')); }
    catch { return false; }
  };
  const urls = [
    u(`${SITE}/`, 'daily', '1.0'),
    u(`${SITE}/how-to-play.html`, 'monthly', '0.8'),
    u(`${SITE}/methodology.html`, 'monthly', '0.8'),
    u(`${SITE}/about.html`, 'monthly', '0.4'),
    u(`${SITE}/privacy.html`, 'yearly', '0.2'),
    u(`${SITE}/contact.html`, 'yearly', '0.2'),
    u(`${SITE}/players/`, 'weekly', '0.5'),
    ...dirsIn('team').map(id => u(`${SITE}/team/${id}/`, 'monthly', '0.7')),
    ...dirsIn('player').filter(s => indexable('player', s))
      .map(s => u(`${SITE}/player/${encodeURI(s)}/`, 'monthly', '0.6')),
  ];
  fs.writeFileSync(path.join(BASE, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
}

// browsable hub at /players/ — lists every player that has a page (best-rated
// first) + links to every team page. Human-browsable AND an internal-link boost
// that helps Google discover and rank the player pages faster.
function writeIndex() {
  const { TEAMS, SQUADS } = load();
  const idx = buildIndex(SQUADS);
  const onDisk = new Set();
  try { for (const d of fs.readdirSync(path.join(BASE, 'player'), { withFileTypes: true })) if (d.isDirectory()) onDisk.add(d.name); } catch {}
  const players = Object.values(idx).filter(e => onDisk.has(slugFor(e.name))).sort((a, b) => b.peak - a.peak);
  const teams = Object.keys(TEAMS).filter(id => fs.existsSync(path.join(BASE, 'team', id, 'index.html')))
    .sort((a, b) => TEAMS[a].name.localeCompare(TEAMS[b].name, 'he'));
  const url = `${SITE}/players/`;
  const title = 'כל שחקני ליגת העל — אינדקס | 36-0';
  const desc = `אינדקס שחקני ליגת העל בכדורגל (1999–2025): ${players.length} שחקנים עם הקריירה, המועדונים והדירוגים. בנה את הרכב החלומות במשחק 36-0.`;
  const list = players.map(e =>
    `<li><a href="/player/${slugFor(e.name)}/">${esc(e.name)}</a> <span>${e.peak} · ${TEAMS[e.mainTeam] ? esc(TEAMS[e.mainTeam].name) : ''}</span></li>`).join('');
  const chips = teams.map(id => `<a class="chip" href="/team/${id}/">${esc(TEAMS[id].name)}</a>`).join('');

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:title" content="${esc(title)}" /><meta property="og:description" content="${esc(desc)}" />
  <meta property="og:type" content="website" /><meta property="og:url" content="${url}" /><meta property="og:image" content="${SITE}/og-image.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2000268715013437" crossorigin="anonymous"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0d1117; color: #e6edf3; font-family: 'Heebo', Arial, sans-serif; direction: rtl; line-height: 1.7; }
    .wrap { max-width: 900px; margin: 0 auto; padding: 28px 18px 80px; }
    .back { display: inline-block; margin-bottom: 14px; color: #8b949e; text-decoration: none; font-size: 14px; }
    .logo { font-size: 30px; font-weight: 900; background: linear-gradient(135deg,#FFD700,#ff9500 55%,#FFD700); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .logo a { text-decoration: none; }
    h1 { font-size: 27px; margin: 18px 0 6px; color: #fff; }
    .sub { color: #8b949e; margin-bottom: 18px; font-size: 15px; }
    h2 { font-size: 19px; margin: 26px 0 12px; color: #FFD700; }
    ul.players { list-style: none; columns: 3; column-gap: 20px; }
    ul.players li { font-size: 14px; padding: 3px 0; break-inside: avoid; }
    ul.players a { color: #58a6ff; text-decoration: none; font-weight: 700; }
    ul.players span { color: #6b7684; font-size: 11.5px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { background: #161b22; border: 1px solid #30363d; border-radius: 50px; padding: 6px 14px; font-size: 13.5px; color: #e6edf3; text-decoration: none; }
    .cta { display: inline-block; background: linear-gradient(135deg,#FFD700,#f0a500); color: #111; font-weight: 900; font-size: 16px; padding: 13px 30px; border-radius: 50px; text-decoration: none; margin: 18px 0; }
    .foot { margin-top: 40px; border-top: 1px solid #30363d; padding-top: 16px; font-size: 12px; color: #5a6472; } .foot a { color: #8b949e; }
    @media (max-width:720px){ ul.players{columns:2;} } @media (max-width:460px){ ul.players{columns:1;} }
  </style>
</head>
<body>
  <div class="wrap">
    <a class="back" href="/">← המשחק</a>
    <div class="logo"><a href="/"><span dir="ltr">36–0</span></a></div>
    <h1>כל שחקני ליגת העל</h1>
    <p class="sub">${players.length} שחקנים מכל תולדות ליגת העל (1999–2025) — הקריירה, המועדונים והדירוגים.</p>
    <div style="text-align:center"><a class="cta" href="/">בנה את הרכב החלומות שלך ←</a></div>
    <h2>הקבוצות</h2>
    <div class="chips">${chips}</div>
    <h2>שחקנים (לפי דירוג שיא)</h2>
    <ul class="players">${list}</ul>
    <div class="foot">36-0 — משחק דראפט חינמי לחובבי הכדורגל הישראלי · הנתונים למטרות מידע ובידור בלבד · <a href="/how-to-play.html">איך משחקים</a> · <a href="/methodology.html">מתודולוגיה</a> · <a href="/about.html">אודות</a> · <a href="/contact.html">צור קשר</a> · <a href="/">משחק</a></div>
  </div>
</body>
</html>`;
  fs.mkdirSync(path.join(BASE, 'players'), { recursive: true });
  fs.writeFileSync(path.join(BASE, 'players', 'index.html'), html);
}

module.exports = { load, buildIndex, slugFor, pageHtml, writePlayer, writeSitemap, writeIndex, BASE };

// ── CLI ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const { TEAMS, SQUADS } = load();
  const idx = buildIndex(SQUADS);
  const arg = process.argv[2];
  if (arg === '--sitemap' || arg === '--index') { writeSitemap(); writeIndex(); console.log('wrote sitemap.xml + players/'); }
  else if (arg === '--rebuild') {
    // rewrite every page that already exists, with the current template
    const onDisk = new Set(fs.readdirSync(path.join(BASE, 'player'), { withFileTypes: true })
      .filter(x => x.isDirectory()).map(x => x.name));
    let n = 0;
    for (const e of Object.values(idx)) {
      if (!onDisk.has(slugFor(e.name))) continue;
      writePlayer(TEAMS, e, true); n++;
    }
    writeSitemap(); writeIndex();
    console.log(`rebuilt ${n} of ${onDisk.size} player page(s)`);
  }
  else if (arg === '--backfill') {
    const n = parseInt(process.argv[3] || '5', 10);
    const missing = Object.values(idx).filter(e => e.career.length >= 2)
      .sort((a, b) => b.peak - a.peak);
    let made = 0;
    for (const e of missing) { if (made >= n) break; if (writePlayer(TEAMS, e).created) made++; }
    writeSitemap(); writeIndex();
    console.log(`backfilled ${made} player page(s) + sitemap + index`);
  } else if (arg) {
    const e = idx[clean(arg)];
    if (!e) { console.error('unknown player:', arg); process.exit(1); }
    const r = writePlayer(TEAMS, e); writeSitemap(); writeIndex();
    console.log(`${r.created ? 'wrote' : 'exists'}: player/${r.slug}/index.html`);
  } else {
    console.log(`players: ${Object.keys(idx).length}. usage: <name> | --backfill N | --index`);
  }
}
