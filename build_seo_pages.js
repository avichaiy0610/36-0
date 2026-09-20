// Programmatic SEO pages for 36-0: one rich, indexable page per team built from
// our own data — all-time best XI, honours, a per-SEASON selector (squad + finish
// + top scorer for any year), season-by-season table, and a CTA into the game.
//
// Each page loads admin overrides from Supabase (table seo_overrides) and applies
// them on the fly: a corrected lineup (all-time or any single season), a filled-in
// top scorer, and reworded headings — so the owner can fix inaccuracies from the
// admin panel with no rebuild. Editable texts are marked with data-edit keys.
//
// Output goes to team/<id>/index.html in the repo root and is committed with
// the rest of the site. Run it after any change to js/data.js or
// js/league_tables.js — the club narratives are derived from both.
// Usage: node build_seo_pages.js [teamId]   (no arg = all teams)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE = __dirname;
const OUTROOT = BASE;                // pages deploy at /team/<id>/ (repo root)
const SITE = 'https://www.36-0.co.il';

const cfg = fs.readFileSync(path.join(BASE, 'js/config.js'), 'utf8');
const SUPA = (cfg.match(/SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
const ANON = (cfg.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/) || [])[1];

const { TEAMS, SQUADS } = new Function(
  fs.readFileSync(path.join(BASE, 'js/data.js'), 'utf8') + '\n;return {TEAMS, SQUADS};')();
const { LEAGUE_TABLES, LEAGUE_SCORERS } = new Function(
  fs.readFileSync(path.join(BASE, 'js/league_tables.js'), 'utf8') +
  '\n;return {LEAGUE_TABLES, LEAGUE_SCORERS};')();

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = s => String(s || '').replace(/‎|‏/g, '').trim();

function lineOf(pos) {
  const p = String(pos || '').toUpperCase();
  if (/GK/.test(p)) return 'gk';
  if (/WB|CB|RB|LB/.test(p)) return 'def';
  if (/W|ST|CF|SS/.test(p)) return 'att';
  return 'mid';
}
const SLOTS = { gk: [[50, 90]], def: [[84, 70], [61, 75], [39, 75], [16, 70]], mid: [[74, 49], [50, 46], [26, 49]], att: [[80, 24], [50, 19], [20, 24]] };

function bestXI(players) {
  const used = new Set(), xi = {};
  for (const line of ['gk', 'def', 'mid', 'att']) {
    xi[line] = [];
    const pool = players.filter(p => lineOf(p.position) === line && !used.has(p.name));
    for (let i = 0; i < SLOTS[line].length; i++) {
      const pick = pool[i] || players.find(p => !used.has(p.name));
      if (pick) { xi[line].push({ name: pick.name, o: pick.ovr }); used.add(pick.name); }
    }
  }
  return xi;
}

function teamData(teamId) {
  const team = TEAMS[teamId];
  const squads = SQUADS.filter(s => s.teamId === teamId).sort((a, b) => a.season.localeCompare(b.season));

  const peak = {};
  squads.forEach(s => s.players.forEach(p => {
    const nm = clean(p.name);
    if (!peak[nm] || p.ovr > peak[nm].ovr) peak[nm] = { name: nm, position: p.position, ovr: p.ovr, season: s.season };
  }));
  const allPlayers = Object.values(peak).sort((a, b) => b.ovr - a.ovr);

  const seasonsMeta = [], SEASONS = {};
  squads.forEach(s => {
    const players = s.players.map(p => ({ name: clean(p.name), position: p.position, ovr: p.ovr, season: s.season }))
      .sort((a, b) => b.ovr - a.ovr);
    const table = LEAGUE_TABLES[s.season] || [];
    const row = table.find(r => r.teamId === teamId);
    const scorer = (LEAGUE_SCORERS[s.season] || []).filter(e => e.teamId === teamId).sort((a, b) => a.r - b.r)[0] || null;
    SEASONS[s.season] = {
      xi: bestXI(players),
      pool: players.slice(0, 16).map(p => ({ name: p.name, o: p.ovr, pos: p.position, ssn: s.season })),
      heading: `סגל ${s.season} — ${team.name}`,
      finish: row ? `מיקום ${row.pos}${row.pos === 1 ? ' 🏆' : ''} מתוך ${table.length} · ${row.pts} נק'` : 'ליגת העל',
      scorer: scorer ? `${clean(scorer.name)} (${scorer.n})` : null,
    };
    seasonsMeta.push({ season: s.season, pos: row ? row.pos : null, scorer });
  });

  const titles = seasonsMeta.filter(s => s.pos === 1).map(s => s.season);
  SEASONS.all = {
    xi: bestXI(allPlayers),
    pool: allPlayers.slice(0, 24).map(p => ({ name: p.name, o: p.ovr, pos: p.position, ssn: p.season })),
    heading: 'סגל כל הזמנים — השחקנים המובילים',
    finish: `סגלים אמיתיים מכל עונות ליגת העל, 1999/00–2025/26 · <b>${titles.length} אליפויות</b>` +
      (titles.length ? ' (' + titles.join(', ') + ')' : ''),
    scorer: null,
  };
  return { team, teamId, seasonsMeta, titles, SEASONS };
}

// ── the written half of a club page ─────────────────────────────────────────
// A best XI and a results table are a template with a crest swapped into it,
// which is exactly what Google's scaled-content policy is aimed at — and what
// this site was rejected for. What follows is the opposite end: facts that are
// true of ONE club and of no other, turned into prose.
//
// The rule that keeps it from reading as generated: every sentence is gated on
// the fact existing. A club with no title never gets a titles sentence with a
// zero in it; it gets a different sentence about its best finish. Nine clubs
// out of 31 take a completely different path through this function than the
// other twenty-two.
const ALL_SEASONS = Object.keys(LEAGUE_TABLES).sort();

// Clubs with a long run in the division and no league title. Derived, not typed,
// so it cannot drift away from the data the rest of the page is built from.
const LONG_NO_TITLE = (() => {
  const seen = {}, won = {};
  for (const s of ALL_SEASONS) {
    const t = LEAGUE_TABLES[s] || [];
    t.forEach(r => { seen[r.teamId] = (seen[r.teamId] || 0) + 1; });
    if (t[0]) won[t[0].teamId] = true;
  }
  return Object.keys(seen).filter(id => seen[id] >= 15 && !won[id] && TEAMS[id])
    .sort((a, b) => seen[b] - seen[a]).map(id => TEAMS[id].name);
})();
const ord = n => ({ 1: 'ראשון', 2: 'שני', 3: 'שלישי', 4: 'רביעי', 5: 'חמישי',
                    6: 'שישי', 7: 'שביעי', 8: 'שמיני', 9: 'תשיעי', 10: 'עשירי' }[n] || ('ה-' + n));
// Hebrew spells out the small counts; "2 עונות" is how a spreadsheet writes it,
// not how anyone reads it aloud.
const FEM = { 1: 'עונה אחת', 2: 'שתי עונות', 3: 'שלוש עונות', 4: 'ארבע עונות',
              5: 'חמש עונות', 6: 'שש עונות', 7: 'שבע עונות', 8: 'שמונה עונות',
              9: 'תשע עונות', 10: 'עשר עונות' };
const nSeasons = n => FEM[n] || `${n} עונות`;
// "ב-" + "עונה אחת" gives "ב-עונה אחת". The preposition has to be chosen with
// the number, not glued to it afterwards.
const inSeasons = n => (FEM[n] ? 'ב' + FEM[n] : `ב-${n} עונות`);
// "1 הפסדים" and "1 תיקו" are how a template writes a football result. Singular
// forms are the whole difference between a sentence and a row from a database.
const wins   = n => (n === 1 ? 'ניצחון אחד' : `${n} ניצחונות`);
const draws  = n => (n === 1 ? 'תיקו אחד'  : `${n} תיקו`);
const losses = n => (n === 1 ? 'הפסד אחד'  : `${n} הפסדים`);
// "ו2024/25" is wrong; before a numeral the vav takes a maqaf.
const vav = s => (/^[0-9]/.test(s) ? 'ו-' : 'ו') + s;
const listHe = a => (a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' ' + vav(a[a.length - 1]));

function clubFacts(d) {
  const rowFor = s => (LEAGUE_TABLES[s] || []).find(r => r.teamId === d.teamId) || null;
  const seasons = d.seasonsMeta.map(m => {
    const row = rowFor(m.season);
    return { season: m.season, pos: m.pos, scorer: m.scorer, row,
             of: (LEAGUE_TABLES[m.season] || []).length };
  }).filter(s => s.pos);

  const positions = seasons.map(s => s.pos);
  const avg = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : null;
  const best = seasons.filter(s => s.pos === Math.min(...positions));
  const worst = seasons.filter(s => s.pos === Math.max(...positions));

  // how long a player stayed, from the squads themselves
  const stay = {};
  SQUADS.filter(s => s.teamId === d.teamId).forEach(s =>
    (s.players || []).forEach(p => { const n = clean(p.name); (stay[n] = stay[n] || new Set()).add(s.season); }));
  // and how many clubs he had in total, so we can name the ones who had only this one
  const clubsOf = {};
  SQUADS.forEach(s => (s.players || []).forEach(p => {
    const n = clean(p.name); (clubsOf[n] = clubsOf[n] || new Set()).add(s.teamId); }));

  const longest = Object.entries(stay).map(([n, set]) => ({ name: n, n: set.size, only: clubsOf[n].size === 1 }))
    .sort((a, b) => b.n - a.n).slice(0, 6);

  // seasons this club produced the league's leading scorer
  const boots = [];
  for (const s of ALL_SEASONS) {
    const sc = LEAGUE_SCORERS[s] || []; if (!sc.length) continue;
    const top = Math.max(...sc.map(r => r.n || 0));
    sc.filter(r => (r.n || 0) === top && r.teamId === d.teamId)
      .forEach(r => boots.push({ season: s, name: clean(r.name), n: r.n }));
  }

  // trajectory: average finish over the first third of its seasons vs the last
  let trend = null;
  if (seasons.length >= 9) {
    const k = Math.floor(seasons.length / 3);
    const mean = a => a.reduce((x, y) => x + y.pos, 0) / a.length;
    const early = mean(seasons.slice(0, k)), late = mean(seasons.slice(-k));
    trend = { early, late, k, delta: early - late };
  }

  const missing = ALL_SEASONS.filter(s => !seasons.some(x => x.season === s));
  const topPlayer = d.SEASONS.all.pool[0] || null;

  return { seasons, avg, best, worst, longest, boots, trend, missing,
           topPlayer, everPresent: missing.length === 0 };
}

function clubNarrative(d) {
  const f = clubFacts(d);
  const nm = d.team.name;
  if (!f.seasons.length) return '';
  const P = [];
  const p = s => P.push(`<p>${s}</p>`);

  /* ── presence ───────────────────────────────────────────────────────────── */
  if (f.everPresent) {
    p(`${nm} היא אחת משלוש הקבוצות בלבד שנכחו בכל ${nSeasons(ALL_SEASONS.length)} ליגת העל ` +
      `שמכוסות כאן, מ-${ALL_SEASONS[0]} ועד ${ALL_SEASONS[ALL_SEASONS.length - 1]} — לצד ` +
      `<a href="/articles/shalosh-hanetzahiyot/">שתי האחרות</a>. היא מעולם לא ירדה.`);
  } else if (f.missing.length === 1) {
    p(`${nm} נכחה ב-${f.seasons.length} מתוך ${ALL_SEASONS.length} עונות ליגת העל שמכוסות כאן. ` +
      `העונה היחידה שבה נעדרה היא ${f.missing[0]}.`);
  } else if (f.seasons.length >= ALL_SEASONS.length * 0.6) {
    p(`${nm} נכחה ב-${f.seasons.length} מתוך ${ALL_SEASONS.length} עונות ליגת העל שמכוסות כאן — ` +
      `נוכחות ארוכה, אך לא רצופה: ${nSeasons(f.missing.length)} מחוץ לליגה.`);
  } else if (f.seasons.length <= 2) {
    // Six of the 31 clubs passed through the division and left. Running the full
    // battery on them produces "average finish 12.00, best 12th, worst 12th" —
    // three statistics about one number. They get a short paragraph instead.
    const s0 = f.seasons[0], r0 = s0.row;
    p(`${nm} שיחקה בליגת העל ${inSeasons(f.seasons.length)} בלבד בתקופה שמכוסה כאן` +
      (f.seasons.length === 1 ? `, ב-${s0.season}` : `: ${listHe(f.seasons.map(x => x.season))}`) + `. ` +
      (r0 ? `בעונת ${s0.season} סיימה במקום ${ord(s0.pos)} מתוך ${s0.of}, עם ${wins(r0.w)}, ` +
            `${draws(r0.d)} ו${r0.l === 1 ? '' : '-'}${losses(r0.l)}.` : ''));
    const sq = SQUADS.filter(x => x.teamId === d.teamId).length;
    p(`העמוד הזה קיים כדי שהסגל שלה לא ייעלם: ${nSeasons(sq)} של סגל אמיתי ${sq === 1 ? 'שמורה' : 'שמורות'} במאגר, ` +
      `והשחקנים שלה מוגרלים במשחק בדיוק כמו של כל מועדון אחר.`);
    if (f.topPlayer)
      p(`הדירוג הגבוה ביותר שנרשם אצלנו במדיה שייך ל<b>${esc(f.topPlayer.name)}</b> — ` +
        `${f.topPlayer.o}, בעונת ${f.topPlayer.ssn}.`);
    return `<h2>${esc(nm)} — הרקע</h2>\n${P.join('\n')}`;
  } else {
    p(`${nm} מופיעה במאגר ${inSeasons(f.seasons.length)} של ליגת העל, הראשונה ב-${f.seasons[0].season} ` +
      `והאחרונה ב-${f.seasons[f.seasons.length - 1].season}.`);
  }

  /* ── honours, or the absence of them ────────────────────────────────────── */
  if (d.titles.length > 1) {
    p(`היא זכתה ב-${d.titles.length} אליפויות: ${listHe(d.titles)}. ` +
      (d.titles.length >= 4
        ? `זו אחת השושלות הגדולות בתקופה — <a href="/articles/mi-shalat/">מתוך שש הקבוצות בלבד שזכו אי פעם</a>.`
        : `<a href="/articles/mi-shalat/">רק שש קבוצות זכו באליפות בתקופה הזאת</a>.`));
  } else if (d.titles.length === 1) {
    p(`האליפות היחידה שלה נרשמה בעונת ${d.titles[0]} — ` +
      `<a href="/articles/mi-shalat/">אחת מ-27 האליפויות שהתחלקו בין שש קבוצות בלבד</a>.`);
  } else {
    const b = f.best[0];
    p(`היא מעולם לא סיימה ראשונה בליגת העל בתקופה הזאת. ההישג הגבוה שלה הוא מקום ` +
      `${ord(b.pos)}, ${f.best.length > 1 ? inSeasons(f.best.length) + ': ' + listHe(f.best.map(x => x.season)) : 'בעונת ' + b.season}` +
      (f.seasons.length >= 15 && LONG_NO_TITLE.length > 1
        // the peer list has to drop the club whose page this is, or Ashdod is
        // told it keeps company with Ashdod — and two names make the point that
        // six names turn into a list nobody reads
        ? ` — נוכחות ארוכה בלי גביע ליגה, כמו ` +
          listHe(LONG_NO_TITLE.filter(t => t !== nm).slice(0, 2)) + `.`
        : `.`));
  }

  /* ── the shape of the results ───────────────────────────────────────────── */
  const w = f.worst[0];
  const shape = [];
  shape.push(`המיקום הממוצע שלה לאורך ${nSeasons(f.seasons.length)} הוא ${f.avg.toFixed(2)}`);
  if (!d.titles.length || f.best[0].pos !== 1)
    shape.push(`הטוב ביותר מקום ${ord(f.best[0].pos)} והגרוע ביותר מקום ${ord(w.pos)} (${w.season})`);
  else
    shape.push(`והעונה החלשה ביותר שלה הסתיימה במקום ${ord(w.pos)}, ב-${w.season}`);
  p(shape.join(', ') + '.');

  if (f.trend && Math.abs(f.trend.delta) >= 1.5) {
    p(f.trend.delta > 0
      ? `הכיוון ברור: בשליש הראשון של העונות שלה היא סיימה בממוצע במקום ${f.trend.early.toFixed(1)}, ` +
        `ובשליש האחרון במקום ${f.trend.late.toFixed(1)} — שיפור של ${f.trend.delta.toFixed(1)} מקומות.`
      : `הכיוון הפוך: בשליש הראשון של העונות שלה סיימה בממוצע במקום ${f.trend.early.toFixed(1)}, ` +
        `ובשליש האחרון במקום ${f.trend.late.toFixed(1)}.`);
  }

  /* ── the best season, in its own numbers ────────────────────────────────── */
  // Ten title seasons make "the season it finished highest" meaningless, so the
  // one we describe is the strongest of them on points per game — a measure that
  // survives the format changes the league went through.
  // See /articles/nekudot-lo-mashvot/ for why raw points cannot be used here.
  const peakSeason = f.best.filter(s => s.row)
    .sort((a, b) => (b.row.pts / b.row.mp) - (a.row.pts / a.row.mp))[0];
  if (peakSeason) {
    const r = peakSeason.row;
    p(`העונה החזקה ביותר שלה היא ${peakSeason.season}: ${wins(r.w)}, ${draws(r.d)} ` +
      `ו${r.l === 1 ? '' : '-'}${losses(r.l)}, ${r.gf} שערי זכות מול ${r.ga} חובה, ${r.pts} נקודות ` +
      `מתוך ${r.mp} מחזורים — ${(r.pts / r.mp).toFixed(2)} נקודות למשחק.`);
  }

  /* ── people ─────────────────────────────────────────────────────────────── */
  const who = [];
  if (f.topPlayer)
    who.push(`הדירוג הגבוה ביותר שנרשם אצלנו במדי ${nm} שייך ל<b>${esc(f.topPlayer.name)}</b> — ` +
      `${f.topPlayer.o}, בעונת ${f.topPlayer.ssn}.`);
  const veterans = f.longest.filter(x => x.n >= 6);
  if (veterans.length) {
    const v = veterans[0];
    who.push(`השחקן שהעביר בה הכי הרבה עונות הוא <b>${esc(v.name)}</b> (${nSeasons(v.n)})` +
      (v.only ? `, וכל אחת מהן במדי ${nm} — <a href="/articles/ish-moadon-ehad/">איש מועדון אחד</a>.` : '.'));
    const others = veterans.slice(1, 4);
    if (others.length)
      who.push(`אחריו ${listHe(others.map(x => `${esc(x.name)} (${x.n})`))}.`);
  }
  if (who.length) P.push(`<h3>האנשים</h3>`), p(who.join(' '));

  if (f.boots.length) {
    const lines = f.boots.map(b => `${esc(b.name)} ב-${b.season} (${b.n})`);
    p(`${nm} העמידה את מלך השערים של הליגה ${inSeasons(f.boots.length)}: ` +
      `${listHe(lines)}. <a href="/articles/malchei-shaarim/">הרשימה המלאה של 27 מלכי השערים</a>.`);
  }

  return `<h2>${esc(nm)} — הרקע</h2>\n${P.join('\n')}`;
}

// shared renderers: run server-side for the static all-time view, and shipped
// (via .toString) so a season change / override rebuilds the same markup.
function buildPitch(xi, tc, ts, escc) {
  let h = '';
  const SL = { gk: [[50, 90]], def: [[84, 70], [61, 75], [39, 75], [16, 70]], mid: [[74, 49], [50, 46], [26, 49]], att: [[80, 24], [50, 19], [20, 24]] };
  for (const line of ['gk', 'def', 'mid', 'att']) (xi[line] || []).forEach((p, i) => {
    const s = SL[line][i], last = p.name.split(' ').slice(-1)[0];
    h += `<div class="tok" style="left:${s[0]}%;top:${s[1]}%"><div class="circ" style="background:${tc};border-color:${ts}"><b>${p.o}</b><span>${escc(last)}</span></div><em>${escc(p.name)}</em></div>`;
  });
  return h;
}
function buildPool(arr, escc) {
  return arr.map(p => `<li><b>${p.o}</b> ${escc(p.name)} <span>${escc(p.pos)} · ${escc(p.ssn)}</span></li>`).join('');
}

// client bootstrap (serialized into the page); references globals defined above the call
function clientBoot() {
  const escc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sel = document.getElementById('seasonSel');
  const pitch = document.getElementById('pitch'), pool = document.getElementById('pool');
  const meta = document.getElementById('meta'), phead = document.getElementById('poolHeading');
  function render(key) {
    const d = SEASONS[key]; if (!d) return;
    pitch.innerHTML = BUILD_PITCH(d.xi, TC, TS, escc);
    pool.innerHTML = BUILD_POOL(d.pool, escc);
    meta.innerHTML = d.finish + (d.scorer ? ' · המבקיע המוביל: ' + escc(d.scorer) : '');
    phead.textContent = d.heading;
  }
  sel.addEventListener('change', () => render(sel.value));

  // apply admin overrides from Supabase (corrected lineups, missing scorers, texts)
  fetch(SUPA + '/rest/v1/seo_overrides?team_id=eq.' + encodeURIComponent(TEAM_ID) + '&select=season,lineup,top_scorer,texts',
    { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } })
    .then(r => r.ok ? r.json() : []).then(rows => {
      rows.forEach(row => {
        const key = row.season || 'all';
        if (row.lineup && SEASONS[key]) SEASONS[key].xi = row.lineup;
        if (row.top_scorer && SEASONS[key]) SEASONS[key].scorer = row.top_scorer;
        if (row.top_scorer && row.season) {
          const tr = document.querySelector('tr[data-season="' + row.season + '"] .sc');
          if (tr) tr.textContent = row.top_scorer;
        }
        if (row.texts) Object.keys(row.texts).forEach(k => {
          const el = document.querySelector('[data-edit="' + k + '"]');
          if (el && row.texts[k]) el.textContent = row.texts[k];
        });
      });
      render(sel.value);
    }).catch(function () { });
}

// The AdSense loader is part of THIS template, not something added to the output
// afterwards. It was installed by hand on the 31 emitted pages once, and the next
// run of this script would have silently taken it off every one of them.
// scripts/player_pages.js carries the identical line for the player pages.
function page(teamId) {
  const d = teamData(teamId);
  if (!d.team) throw new Error('unknown team ' + teamId);
  const nm = d.team.name, tc = d.team.primaryColor || '#0a4', ts = d.team.secondaryColor || '#fff';
  const escc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const all = d.SEASONS.all;
  const bestNames = [].concat(all.xi.gk, all.xi.def, all.xi.mid, all.xi.att).map(p => p.name);
  const title = `הרכב כל הזמנים של ${nm} | ליגת העל | 36-0`;
  const desc = `הרכב החלומות של ${nm} מכל תולדות ליגת העל — ${bestNames.slice(0, 4).join(', ')} ועוד. ` +
    `${d.titles.length ? d.titles.length + ' אליפויות, ' : ''}סגלים אמיתיים מ-1999 ועד היום. בנה את ההרכב שלך במשחק 36-0.`;
  const url = `${SITE}/team/${teamId}/`;

  const seasonOpts = ['<option value="all">כל הזמנים</option>']
    .concat(d.seasonsMeta.slice().reverse().map(s => `<option value="${esc(s.season)}">${esc(s.season)}</option>`)).join('');
  const seasonsRows = d.seasonsMeta.slice().reverse().map(s => `<tr data-season="${esc(s.season)}">
      <td>${esc(s.season)}</td><td class="${s.pos === 1 ? 'gold' : ''}">${s.pos ? s.pos + (s.pos === 1 ? ' 🏆' : '') : '—'}</td>
      <td class="sc">${s.scorer ? esc(clean(s.scorer.name)) + ' (' + s.scorer.n + ')' : '—'}</td></tr>`).join('');

  const jsonld = { '@context': 'https://schema.org', '@type': 'SportsTeam', name: nm, sport: 'Football', url, memberOf: { '@type': 'SportsOrganization', name: 'ליגת העל' } };

  const boot = `const SEASONS=${JSON.stringify(d.SEASONS)};const TC=${JSON.stringify(tc)};const TS=${JSON.stringify(ts)};` +
    `const TEAM_ID=${JSON.stringify(teamId)};const SUPA=${JSON.stringify(SUPA)};const ANON=${JSON.stringify(ANON)};` +
    `const BUILD_PITCH=${buildPitch.toString()};const BUILD_POOL=${buildPool.toString()};(${clientBoot.toString()})();`;

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:title" content="${esc(title)}" /><meta property="og:description" content="${esc(desc)}" />
  <meta property="og:type" content="article" /><meta property="og:url" content="${url}" /><meta property="og:image" content="${SITE}/og-image.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;800;900&display=swap" rel="stylesheet">
  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0d1117; color: #e6edf3; font-family: 'Heebo', Arial, sans-serif; direction: rtl; line-height: 1.7; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 28px 18px 80px; }
    .back { display: inline-block; margin-bottom: 14px; color: #8b949e; text-decoration: none; font-size: 14px; }
    .logo { font-size: 30px; font-weight: 900; background: linear-gradient(135deg,#FFD700,#ff9500 55%,#FFD700); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .logo a { text-decoration: none; }
    h1 { font-size: 27px; margin: 18px 0 6px; color: #fff; }
    .sub { color: #8b949e; margin-bottom: 16px; font-size: 15px; }
    .sub b { color: #FFD700; }
    h2 { font-size: 19px; margin: 30px 0 12px; color: #FFD700; }
    .seasonpick { display: flex; align-items: center; gap: 8px; margin: 4px 0 14px; }
    .seasonpick label { color: #8b949e; font-size: 14px; font-weight: 700; }
    .seasonpick select { background: #161b22; color: #e6edf3; border: 1px solid #30363d; border-radius: 8px; padding: 7px 12px; font-family: inherit; font-size: 14px; }
    .cta { display: inline-block; background: linear-gradient(135deg,#FFD700,#f0a500); color: #111; font-weight: 900; font-size: 16px; padding: 13px 30px; border-radius: 50px; text-decoration: none; margin: 8px 0; }
    .pitch { position: relative; width: 100%; max-width: 420px; margin: 0 auto; aspect-ratio: 3/4; background: linear-gradient(#1b6b2e,#155724); border: 2px solid #ffffff22; border-radius: 14px; overflow: hidden; }
    .tok { position: absolute; transform: translate(-50%,-50%); text-align: center; width: 78px; }
    .circ { width: 46px; height: 46px; margin: 0 auto; border-radius: 50%; border: 2.5px solid #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 2px 8px #0007; }
    .circ b { font-size: 11px; color: #FFD700; line-height: 1; } .circ span { font-size: 8px; font-weight: 800; color: #fff; white-space: nowrap; }
    .tok em { font-size: 9px; font-style: normal; color: #fff; background: #000000aa; border-radius: 3px; padding: 1px 4px; white-space: nowrap; display: inline-block; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 7px 10px; border-bottom: 1px solid #21262d; text-align: right; } th { color: #8b949e; font-size: 12px; }
    td.gold { color: #FFD700; font-weight: 800; }
    ul.pool { list-style: none; columns: 2; column-gap: 22px; }
    ul.pool li { font-size: 13.5px; padding: 3px 0; break-inside: avoid; }
    ul.pool b { color: #FFD700; display: inline-block; min-width: 24px; } ul.pool span { color: #6b7684; font-size: 11.5px; }
    .prose { margin-top: 34px; max-width: 700px; }
    .prose h2 { margin-top: 0; }
    .prose h3 { font-size: 16px; margin: 24px 0 8px; color: #e6edf3; font-weight: 800; }
    .prose p { color: #c2cbd6; font-size: 15px; line-height: 1.9; margin-bottom: 14px; }
    .prose a { color: #FFD700; }
    .prose b { color: #fff; }
    .prose .src { font-size: 13px; color: #8b949e; border-top: 1px solid #21262d; padding-top: 14px; margin-top: 22px; line-height: 1.8; }
    .prose .src a { color: #8b949e; }
    .foot { margin-top: 44px; border-top: 1px solid #30363d; padding-top: 16px; font-size: 12px; color: #5a6472; } .foot a { color: #8b949e; }
    @media (max-width:560px){ ul.pool{columns:1;} .prose p{font-size:14.5px;} }
  </style>
</head>
<body>
  <div class="wrap">
    <a class="back" href="/">← המשחק</a>
    <div class="logo"><a href="/"><span dir="ltr">36–0</span></a></div>

    <h1 data-edit="h1">הרכב כל הזמנים של ${esc(nm)}</h1>
    <p class="sub" id="meta">${all.finish}</p>

    <div class="seasonpick">
      <label for="seasonSel">בחר עונה:</label>
      <select id="seasonSel">${seasonOpts}</select>
    </div>

    <div class="pitch" id="pitch">${buildPitch(all.xi, tc, ts, escc)}</div>

    <div style="text-align:center;margin-top:16px">
      <a class="cta" href="/?team=${encodeURIComponent(teamId)}">בנה את הרכב החלומות של ${esc(nm)} ←</a>
    </div>

    <h2 id="poolHeading" data-edit="pool_heading">${esc(all.heading)}</h2>
    <ul class="pool" id="pool">${buildPool(all.pool, escc)}</ul>

    <h2 data-edit="table_heading">${esc(nm)} עונה אחר עונה</h2>
    <table>
      <tr><th>עונה</th><th>מיקום</th><th>המבקיע המוביל של הקבוצה</th></tr>
      ${seasonsRows}
    </table>

    <div class="prose">
      ${clubNarrative(d)}
      <p class="src">
        המיקומים לקוחים מטבלת הסיום המשולבת של כל עונה — זו שמשלבת את העונה הסדירה עם
        פלייאוף האליפות והירידה. הדירוגים הם הערכה ולא מדידה;
        <a href="/methodology.html">המתודולוגיה המלאה כאן</a>, ו<a href="/articles/">ניתוחים
        רחבים יותר על הליגה כאן</a>. מצאתם טעות — <a href="/contact.html">כתבו לנו</a>.
      </p>
    </div>

    <div style="text-align:center;margin-top:28px"><a class="cta" href="/">שחק עכשיו ב-36-0 ←</a></div>

    <div class="foot">
      36-0 — משחק דראפט חינמי לחובבי הכדורגל הישראלי · הנתונים למטרות מידע ובידור בלבד ואינם רשמיים ·
      <a href="/articles/">מאמרים</a> · <a href="/players/">כל השחקנים</a> ·
      <a href="/about.html">אודות</a> · <a href="/">משחק</a>
    </div>
  </div>
  <script>${boot}</script>
</body>
</html>`;
}

function writeTeam(teamId) {
  const dir = path.join(OUTROOT, 'team', teamId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(teamId));
  return `team/${teamId}/index.html`;
}

// One sitemap, one writer.
//
// This script used to build sitemap.xml itself, from core pages plus the team
// ids it had just written — and then overwrite the file. That was correct when
// team pages were the only generated pages. They stopped being the only ones:
// scripts/player_pages.js now emits 1,566 player pages and the /players/ hub,
// and writes them into the SAME sitemap. So every full run of this script
// silently deleted 1,567 URLs — a sitemap of 1,602 came back as 35 — and the
// only sign of it was Google quietly losing the entire long tail.
//
// player_pages.js --sitemap rebuilds the file from what is actually on disk
// (core + team/* + player/*), which is a superset of anything this script
// knows, so it is the one that runs. It refreshes /players/ in the same pass.
function writeSitemap() {
  const gen = path.join(BASE, 'scripts', 'player_pages.js');
  if (!fs.existsSync(gen)) {
    console.error('scripts/player_pages.js is missing — sitemap NOT written.');
    console.error('Write it, or the player URLs stay out of the sitemap.');
    return;
  }
  execFileSync(process.execPath, [gen, '--sitemap'], { stdio: 'inherit' });
}

if (!SUPA || !ANON) { console.error('missing Supabase config in js/config.js'); process.exit(1); }
const arg = process.argv[2];
const ids = arg ? [arg] : Object.keys(TEAMS);
ids.forEach(id => writeTeam(id));
if (!arg) writeSitemap();                     // full run also refreshes the sitemap
console.log(`wrote ${ids.length} team page(s) to team/` + (arg ? '' : ' + sitemap.xml'));
