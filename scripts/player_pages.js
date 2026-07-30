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

// name -> { name, career:[{teamId,season,ovr,position}], peak, mainTeam, teams[] }
function buildIndex(SQUADS) {
  const idx = {};
  for (const s of SQUADS) for (const p of s.players) {
    const name = clean(p.name);
    if (!name) continue;
    (idx[name] = idx[name] || { name, career: [] }).career
      .push({ teamId: s.teamId, season: s.season, ovr: p.ovr, position: p.position });
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
  <link rel="canonical" href="${url}" />
  <meta property="og:title" content="${esc(title)}" /><meta property="og:description" content="${esc(desc)}" />
  <meta property="og:type" content="profile" /><meta property="og:url" content="${url}" /><meta property="og:image" content="${SITE}/og-image.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
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
    td.ovr { color: #FFD700; font-weight: 800; }
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

    <h2>${esc(name)} עונה אחר עונה</h2>
    <table>
      <tr><th>עונה</th><th>מועדון</th><th>עמדה</th><th>דירוג</th></tr>
      ${rows}
    </table>

    <h2>המועדונים של ${esc(name)}</h2>
    <div class="chips">${clubLinks}</div>

    <div style="text-align:center;margin-top:28px"><a class="cta" href="/">שחק עכשיו ב-36-0 ←</a></div>

    <div class="foot">
      36-0 — משחק דראפט חינמי לחובבי הכדורגל הישראלי · הנתונים למטרות מידע ובידור בלבד ואינם רשמיים ·
      <a href="/about.html">אודות</a> · <a href="/">משחק</a>
    </div>
  </div>
</body>
</html>`;
}

// write one player's page if it doesn't exist yet. returns {slug, created}
function writePlayer(TEAMS, e) {
  const slug = slugFor(e.name);
  const dir = path.join(BASE, 'player', slug);
  const file = path.join(dir, 'index.html');
  if (fs.existsSync(file)) return { slug, created: false };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, pageHtml(TEAMS, e));
  return { slug, created: true };
}

// rebuild sitemap.xml from what's actually on disk: core + team/* + player/*
function writeSitemap() {
  const u = (loc, freq, pri) => `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>`;
  const dirsIn = d => { try { return fs.readdirSync(path.join(BASE, d), { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name); } catch { return []; } };
  const urls = [
    u(`${SITE}/`, 'daily', '1.0'),
    u(`${SITE}/about.html`, 'monthly', '0.4'),
    u(`${SITE}/privacy.html`, 'yearly', '0.2'),
    u(`${SITE}/contact.html`, 'yearly', '0.2'),
    ...dirsIn('team').map(id => u(`${SITE}/team/${id}/`, 'monthly', '0.7')),
    ...dirsIn('player').map(s => u(`${SITE}/player/${encodeURI(s)}/`, 'monthly', '0.6')),
  ];
  fs.writeFileSync(path.join(BASE, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
}

module.exports = { load, buildIndex, slugFor, pageHtml, writePlayer, writeSitemap, BASE };

// ── CLI ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const { TEAMS, SQUADS } = load();
  const idx = buildIndex(SQUADS);
  const arg = process.argv[2];
  if (arg === '--sitemap') { writeSitemap(); console.log('wrote sitemap.xml'); }
  else if (arg === '--backfill') {
    const n = parseInt(process.argv[3] || '5', 10);
    const missing = Object.values(idx).filter(e => e.career.length >= 2)
      .sort((a, b) => b.peak - a.peak);
    let made = 0;
    for (const e of missing) { if (made >= n) break; if (writePlayer(TEAMS, e).created) made++; }
    writeSitemap();
    console.log(`backfilled ${made} player page(s) + sitemap`);
  } else if (arg) {
    const e = idx[clean(arg)];
    if (!e) { console.error('unknown player:', arg); process.exit(1); }
    const r = writePlayer(TEAMS, e); writeSitemap();
    console.log(`${r.created ? 'wrote' : 'exists'}: player/${r.slug}/index.html`);
  } else {
    console.log(`players: ${Object.keys(idx).length}. usage: <name> | --backfill N | --sitemap`);
  }
}
