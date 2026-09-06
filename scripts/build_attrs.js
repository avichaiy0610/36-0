// Six attributes per player-season, derived — never invented.
//
// The squad data carries one number per player: ovr. The builder needs six, and
// the rule that governs every one of them is that a number must have a fact
// behind it that can be shown to the player. What the tables actually hold:
//
//   LEAGUE_TABLES    gf/ga/mp/pos for every club in all 27 seasons.  100%
//   LEAGUE_SCORERS   ~10 rows a season — 152 men out of ~2,700.       5%
//   LEAGUE_ASSISTS   3-5 rows a season before 2016, more after.       4%
//
// So a man's own goal tally exists for one player in twenty. What exists for
// everyone is his CLUB's record in the season he was registered there, and that
// is the bridge: a centre-back in the side that conceded fewest in 2004/05 has
// evidence of a defence, even though no line in any table is his alone.
//
// Everything here is per player-SEASON, because that is what the builder lands
// on. Bunion in 2004/05 is not Bunion in 2010/11 and the tables agree.
//
//   node scripts/build_attrs.js > js/attr-data.js
//
// Re-run it after ANY edit to js/data.js — a corrected rating that is not
// rebuilt here leaves the attributes describing a player who no longer exists.

const PP = require('./player_pages.js');
const fs = require('fs');
const path = require('path');

const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const { SQUADS } = PP.load();
const LT = new Function(R('js/league_tables.js') +
  '\n;return {LEAGUE_TABLES,LEAGUE_SCORERS,LEAGUE_ASSISTS};')();
const { TAG_DATA } = new Function(R('js/tag-data.js') + '\n;return {TAG_DATA};')();

const die = m => { process.stderr.write('build_attrs: ' + m + '\n'); process.exit(1); };

/* ── names ────────────────────────────────────────────────────────────────── */
// Same normalisation the game uses (tagNorm), plus the split suffix our squads
// carry where two men shared a name (רפי כהן השוער / רפי כהן החלוץ). The league
// tables know nothing of that, so a row is matched on the bare name and then on
// club+season, which is what tells the two of them apart.
const norm = s => String(s ?? '')
  .replace(/[‎‏‪-‮⁦-⁩]/g, '')
  .replace(/[׳’`´']/g, "'")
  .replace(/\s+/g, ' ')
  .trim();
const SPLIT_SUFFIX = /\s+(?:השוער|החלוץ|הבלם|הקשר)$/;
const bare = n => norm(n).replace(SPLIT_SUFFIX, '');

/* ── positions ────────────────────────────────────────────────────────────── */
// Thirteen positions, seven buckets. Finer than this is false precision: we have
// no evidence that separates an LB from an RB, so pretending to would be the
// invention this whole file exists to avoid.
const BUCKET = {
  GK: 'GK',
  CB: 'CB',
  LB: 'FB', RB: 'FB',
  CDM: 'DM',
  CM: 'CM', CAM: 'CM',
  LW: 'W', RW: 'W', LM: 'W', RM: 'W',
  ST: 'FW', CF: 'FW',
};

// What a typical 75-rated player in the bucket has, before any evidence.
//                fin  cre  def  pac   gk
const BASE = {
  GK: [30,  40,  62,  45,  75],
  CB: [42,  46,  78,  55,  30],
  FB: [44,  56,  70,  72,  30],
  DM: [46,  58,  72,  58,  30],
  CM: [55,  70,  60,  62,  30],
  W:  [62,  68,  46,  78,  30],
  FW: [74,  56,  40,  68,  30],
};

// Where the rating points go. A striker's fifteen points above average land
// almost entirely in finishing; a centre-back's land in defending. This is the
// one place the shape of a position is asserted rather than measured, and it is
// asserted the same way for everyone.
const SCALE = {
  GK: [0.10, 0.20, 0.50, 0.15, 1.10],
  CB: [0.20, 0.25, 1.00, 0.30, 0.05],
  FB: [0.25, 0.45, 0.85, 0.55, 0.05],
  DM: [0.30, 0.50, 0.90, 0.30, 0.05],
  CM: [0.45, 0.90, 0.55, 0.35, 0.05],
  W:  [0.70, 0.80, 0.25, 0.85, 0.05],
  FW: [1.05, 0.50, 0.15, 0.55, 0.05],
};

const clamp = (v, lo = 30, hi = 99) => Math.max(lo, Math.min(hi, Math.round(v)));

// Evidence moves a player a FRACTION of the distance he has left, never a fixed
// number of points. Added flat, a striker already at 89 on rating alone plus a
// twenty-goal season lands past the ceiling, and so does every other one — the
// first run put eight men on exactly 99 in finishing, eight in defending and
// eight in keeping. A clamp doing that much work is not a scale, it is a wall,
// and it erases the differences precisely where the builder needs them.
//
// The fraction SATURATES rather than scaling linearly. A linear ev/40 is only
// bounded while ev stays under 40, which is a promise the caller has to keep and
// the second run promptly broke: decisiveness reaches 46 and put 68 men on 99.
// ev/(ev+K) cannot reach 1 for any ev, so no future tuning of an evidence term
// can push anyone out of 30-99. Monotonic in ev, and the clamp below goes back
// to being a safety net rather than the mechanism.
const K = 26;
const push = (v, ev) => ev >= 0
  ? v + (99 - v) * (ev / (ev + K))
  : v - (v - 30) * (-ev / (-ev + K));

/* ── the club's season, normalised inside its own year ────────────────────── */
// A 39-round league in 1999/00 and a 36-round one today are not the same scale,
// and the halving years cut every total in half mid-table. So each season is
// measured against itself and never against history.
const SEASON = {};
for (const season of Object.keys(LT.LEAGUE_TABLES)) {
  const rows = (LT.LEAGUE_TABLES[season] || []).filter(r => r.mp > 0);
  if (!rows.length) continue;
  const ga = rows.map(r => r.ga / r.mp);
  const gf = rows.map(r => r.gf / r.mp);
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))) || 1; };
  const gaM = mean(ga), gaS = sd(ga), gfM = mean(gf), gfS = sd(gf);
  const by = {};
  rows.forEach(r => {
    by[r.teamId] = {
      // positive is GOOD in both: conceding below the mean, scoring above it
      defZ: Math.max(-2, Math.min(2, (gaM - r.ga / r.mp) / gaS)),
      gfZ:  Math.max(-2, Math.min(2, (r.gf / r.mp - gfM) / gfS)),
      pos:  r.pos,
      of:   rows.length,
    };
  });
  SEASON[season] = by;
}

/* ── a man's own line, where one exists ───────────────────────────────────── */
const index = map => {
  const out = new Map();
  for (const season of Object.keys(map || {})) {
    for (const r of map[season] || []) {
      const k = bare(r.name);
      out.set(k, (out.get(k) || []).concat([{ season, n: r.n, team: r.teamId }]));
    }
  }
  return out;
};
const SCORERS = index(LT.LEAGUE_SCORERS);
const ASSISTS = index(LT.LEAGUE_ASSISTS);

// His row that season — and only if he was actually at that club. A mid-season
// move must not hand one man another man's tally.
const own = (map, name, season, teamId) =>
  (map.get(bare(name)) || []).find(r => r.season === season && (!r.team || r.team === teamId));

const tagsOf = name => TAG_DATA[norm(bare(name))] || [];
const tagCount = (name, key) => {
  const t = tagsOf(name).find(r => r[0] === key);
  return t ? t[1] : 0;
};

/* ── careers, for the two attributes that are not about one season ────────── */
const CAREER = new Map();
for (const sq of SQUADS) {
  for (const p of sq.players) {
    const k = norm(p.name);
    const e = CAREER.get(k) || { years: new Set() };
    e.years.add(parseInt(sq.season, 10));
    CAREER.set(k, e);
  }
}
CAREER.forEach(e => {
  const ys = [...e.years].sort((a, b) => a - b);
  e.seasons = ys.length;
  let run = 1, best = 1;
  for (let i = 1; i < ys.length; i++) {
    run = ys[i] === ys[i - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  e.longest = best;
});

/* ── the six ──────────────────────────────────────────────────────────────── */
function attrsFor(p, sq) {
  const bucket = BUCKET[p.position];
  if (!bucket) die(`unknown position "${p.position}" (${p.name}, ${sq.id})`);
  const club = (SEASON[sq.season] || {})[sq.teamId];
  if (!club) die(`no league-table row for ${sq.teamId} in ${sq.season}`);

  const base = BASE[bucket], scale = SCALE[bucket], over = p.ovr - 75;
  const at = i => base[i] + over * scale[i];

  // finishing — his own goals where the table names him, the club's output
  // where it does not
  const goals = own(SCORERS, p.name, sq.season, sq.teamId);
  const fin = push(at(0), goals ? Math.min(20, goals.n * 0.8) : 3 * club.gfZ);

  // creativity — same shape. The assist lists are thin before 2016, so the
  // playmaker tag is a second witness rather than a duplicate of the first.
  const asts = own(ASSISTS, p.name, sq.season, sq.teamId);
  const cre = push(at(1),
    (asts ? Math.min(20, asts.n * 1.4) : 3 * club.gfZ)
    + (tagCount(p.name, 'playmaker') ? 5 : 0));

  // defending — what the side he was in actually conceded
  const def = push(at(2), 8 * club.defZ);

  // pace — NO SOURCE. Position and rating only, and no evidence term to push
  // it: this is the one number here that is not a fact.
  const pac = at(3);

  // keeping — the same defensive record, weighted heavier: there is only ever
  // one keeper, and the clean sheets are his more than they are any defender's
  const gk = push(at(4), (bucket === 'GK' ? 16 : 8) * club.defZ);

  // stability — a career attribute, identical in every one of his seasons
  const car = CAREER.get(norm(p.name)) || { seasons: 1, longest: 1 };
  const sta = 40 + Math.min(42, car.seasons * 3) + Math.min(12, Math.max(0, car.longest - 4) * 1.5);

  // decisiveness — where the season ended, plus the honours the tables gave him.
  // The widest evidence term of the six on purpose: on rating alone this one has
  // almost no spread, and an attribute that lands everyone between 45 and 55 is
  // a slot nobody would ever think about.
  const finish = club.pos === 1 ? 26 : club.pos === 2 ? 18 : club.pos === 3 ? 13
    : club.pos <= 6 ? 8 : club.pos > club.of - 3 ? -6 : 0;
  const cls = push(46 + over * 0.45, finish
    + (tagCount(p.name, 'poty') ? 10 : 0)
    + Math.min(10, tagCount(p.name, 'serial_winner') * 2.5));

  const six = [fin, cre, def, pac, sta, cls].map(v => clamp(v));
  return bucket === 'GK' ? six.concat(clamp(gk)) : six;
}

/* ── the evidence, so a number can be defended on screen ──────────────────── */
// The whole claim of this file is that every value has a fact behind it. That
// claim is worth nothing if the fact stays on the build machine: league_tables
// .js is 362KB and never reaches the browser, so the player would be looking at
// six numbers and taking our word for them.
//
// So the facts ship too — but only the ones a screen would ever show, which is
// why this stays small. One line per club-season (366 of them: where the defence
// and the attack finished that year), and one entry per player-season that has a
// goal or assist line of its own (a few hundred). Everything else is the club
// line, already there.
const rankIn = (season, teamId, key, better) => {
  const rows = (LT.LEAGUE_TABLES[season] || []).filter(r => r.mp > 0);
  const sorted = rows.slice().sort((a, b) =>
    better(a[key] / a.mp, b[key] / b.mp) ? -1 : 1);
  return { rank: sorted.findIndex(r => r.teamId === teamId) + 1, of: sorted.length };
};

const clubWhy = [];
for (const sq of SQUADS) {
  const row = (LT.LEAGUE_TABLES[sq.season] || []).find(r => r.teamId === sq.teamId);
  if (!row) die(`no league-table row for ${sq.teamId} in ${sq.season}`);
  const d = rankIn(sq.season, sq.teamId, 'ga', (a, b) => a < b);
  const a = rankIn(sq.season, sq.teamId, 'gf', (a, b) => a > b);
  clubWhy.push(`  '${sq.id}': [${row.ga},${d.rank},${row.gf},${a.rank},${d.of},${row.pos}],`);
}

const playerWhy = [];
for (const sq of SQUADS) {
  sq.players.forEach((p, i) => {
    const g = own(SCORERS, p.name, sq.season, sq.teamId);
    const a = own(ASSISTS, p.name, sq.season, sq.teamId);
    if (g || a) playerWhy.push(`  '${sq.id}|${i}': [${g ? g.n : 0},${a ? a.n : 0}],`);
  });
}

/* ── write ────────────────────────────────────────────────────────────────── */
const rows = [];
let players = 0, withGoals = 0, withAssists = 0;
for (const sq of SQUADS) {
  const packed = sq.players.map(p => {
    players++;
    if (own(SCORERS, p.name, sq.season, sq.teamId)) withGoals++;
    if (own(ASSISTS, p.name, sq.season, sq.teamId)) withAssists++;
    return attrsFor(p, sq).join(',');
  });
  if (packed.length !== sq.players.length) die(`row count mismatch in ${sq.id}`);
  rows.push(`  '${sq.id}': '${packed.join('|')}',`);
}
if (rows.length !== SQUADS.length) die(`wrote ${rows.length} squads, expected ${SQUADS.length}`);

process.stderr.write(
  `build_attrs: ${SQUADS.length} squads · ${players} player-seasons · ` +
  `${withGoals} with a goal line (${(withGoals / players * 100).toFixed(1)}%) · ` +
  `${withAssists} with an assist line (${(withAssists / players * 100).toFixed(1)}%)\n`);

process.stdout.write(
`// GENERATED by scripts/build_attrs.js — do not edit by hand.
//
// Six attributes per player-season, in the order of SQUADS and of the players
// inside each squad, so no name is repeated even once:
//
//   גמר , יצירה , הגנה , מהירות , יציבות , הכרעה
//
// and a seventh — שוער — on goalkeeper rows only.
//
// Five of the six rest on the real tables. מהירות does not: there is no age, no
// minutes and no running data anywhere in this project, so it is derived from
// position and rating alone. js/attrs.js marks it, and every screen that shows
// it must say so.
const ATTR_DATA = {
${rows.join('\n')}
};

// The fact behind the number, per club-season:
//   [ספיגות, דירוג ההגנה בליגה, שערים, דירוג ההתקפה, כמה קבוצות, מיקום סיום]
const ATTR_CLUB_WHY = {
${clubWhy.join('\n')}
};

// And per player-season, only where the league tables name the man himself:
//   'squadId|indexInSquad': [שערים, בישולים]
const ATTR_PLAYER_WHY = {
${playerWhy.join('\n')}
};
`);
