// ─── אלופי הדרבי — data only ─────────────────────────────────────────────────
// Spec: docs/superpowers/specs/2026-10-05-derby-champions-design.md
//
// You draft the all-time XI of one club, one of its seasons per round, and play
// a best-of-5 against the all-time XIs of its three rivals, which the computer
// drafts by the same rules. Pure data and helpers: loads in Node for the tests
// and the calibrator.

// A club takes part only with this many top-flight seasons in SQUADS — fewer and
// eleven rounds without repeating a season are not possible.
const DERBY_MIN_SEASONS = 15;
// ...and a club can be a RIVAL with this many (see DERBY_RIVALS).
const DERBY_MIN_RIVAL_SEASONS = 7;

// Three rivals per club, ARCHRIVAL FIRST. Approved by the owner 2026-10-05.
// A rival need not take part itself, but it needs DERBY_MIN_RIVAL_SEASONS
// seasons: with fewer, its squads are too thin for the computer to field eleven
// in position. With fewer than eleven seasons the computer's draft repeats
// seasons (never players) — fine for a rival. scripts/sim/derby_test.js checks it.
// Changed by the owner 2026-10-05: Netanya ← Be'er Sheva/Beitar/Hadera,
// Be'er Sheva ← Netanya for Ashdod, Sakhnin ← Beitar for Kiryat Shmona.
const DERBY_RIVALS = {
  'maccabi-haifa':    ['maccabi-tlv',      'hapoel-haifa',     'beitar-jerusalem'],
  'maccabi-tlv':      ['hapoel-tlv',       'maccabi-haifa',    'beitar-jerusalem'],
  'beitar-jerusalem': ['bnei-sakhnin',     'hapoel-tlv',       'maccabi-tlv'],
  'hapoel-tlv':       ['maccabi-tlv',      'beitar-jerusalem', 'bnei-yehuda'],
  'hapoel-haifa':     ['maccabi-haifa',    'hapoel-tlv',       'bnei-sakhnin'],
  'hapoel-beersheba': ['maccabi-haifa',    'maccabi-tlv',      'maccabi-netanya'],
  'ms-ashdod':        ['hapoel-beersheba', 'bnei-yehuda',      'maccabi-pt'],
  'maccabi-netanya':  ['hapoel-beersheba', 'beitar-jerusalem', 'hapoel-hadera'],
  'maccabi-pt':       ['hapoel-pt',        'maccabi-netanya',  'bnei-yehuda'],
  'hapoel-pt':        ['maccabi-pt',       'hapoel-tlv',       'maccabi-netanya'],
  'bnei-yehuda':      ['hapoel-tlv',       'maccabi-tlv',      'maccabi-pt'],
  'bnei-sakhnin':     ['beitar-jerusalem', 'hapoel-haifa',     'maccabi-haifa'],
  'ironi-ks':         ['bnei-sakhnin',     'hapoel-haifa',     'maccabi-haifa'],
};

// v2 (spec §9): three series, a best-of-5 against each rival — rival ג, then ב,
// then the archrival as the final. Every series: home, away, home, away, home.
const DERBY_SERIES_ORDER = [2, 1, 0];
const DERBY_GAME_HOME = [true, false, true, false, true];

// The bench: seven more draft rounds after the XI, any position.
const DERBY_BENCH = 7;
// In a match: five substitutions in three stoppages, as in the real game
// (half-time does not count as a stoppage). Played in 15-minute segments.
const DERBY_SUBS = 5;
const DERBY_SUB_WINDOWS = 3;
const DERBY_CHUNK = 15;
// Energy (spec §11.1), carried through the run: every man of each 18 has 0–100.
// It drains with the minutes he is on the pitch (a keeper at a third of the
// rate) and costs rating only below DERBY_ENERGY_FREE, progressively:
//   penalty(E) = 0.0006 × (75 − E)² + 0.12 × (75 − E)      (E < 75; else 0)
//   E 75 → 0 · 60 → −1.9 · 50 → −3.4 · 40 → −4.9 · 30 → −6.6 · 0 → −12.4
// A fresh man playing 90' ends at 100 − 40.5 = 59.5: −2.0 at the whistle. A man
// starting at 70 ends at 29.5: −6.7 (the spec's "≈ −5" and a progressive curve
// cannot both hold with fresh-90' at −2; the curve wins — see the commit).
// Between games of a series everyone recovers +30 (cap 100) and a man who did
// not play at all is back to 100; between series +60. So a man who ended at 60
// starts the next game at 90 — tired is a matter of playing game after game.
const DERBY_ENERGY_DRAIN = 0.45;          // per minute on the pitch; GK × 1/3
const DERBY_ENERGY_GK = 1 / 3;
const DERBY_ENERGY_FREE = 75;
const DERBY_ENERGY_SQ = 0.0006, DERBY_ENERGY_LIN = 0.12;
const DERBY_RECOVER_GAME = 30;
const DERBY_RECOVER_SERIES = 60;
// The computer rests a starter below this before a game (when the bench has better).
const DERBY_ROTATE_BELOW = 55;
// Shown levels, highest first: [from, word, css key].
const DERBY_ENERGY_LEVELS = [[80, 'רענן', 'fresh'], [60, 'עייף', 'tired'], [40, 'עייף מאוד', 'vtired'], [-Infinity, 'מותש', 'spent']];

function derbyEnergyPenalty(e) {
  const d = DERBY_ENERGY_FREE - e;
  return d > 0 ? DERBY_ENERGY_SQ * d * d + DERBY_ENERGY_LIN * d : 0;
}
function derbyEnergyLevel(e) {
  const L = DERBY_ENERGY_LEVELS.find(l => e >= l[0]);
  return { word: L[1], key: L[2] };
}

// How the computer drafts. Each round it ranks the players of the drawn season
// who fit an open slot and takes the 1st/2nd/3rd best with these weights; `look`
// is how many seasons it draws per round, keeping the best (its reroll).
// Calibrated 2026-10-06 (scripts/sim/derby_calibrate.js); the engine is never touched.
// Re-calibrated for v4 (energy carried through the run — both sides rotate, and
// tiredness cost the player's bot more than it cost the rivals): normal had
// fallen to ~43% with [0.6, 0.25, 0.15]. v4 at 300 runs: easy 65.3 · normal 51.9 ·
// hard 37.2% series wins; title on normal 18.3%; lowest three unchanged.
const DERBY_AI = {
  easy:   { weights: [0, 0.1, 0.9], look: 1 },
  normal: { weights: [0.3, 0.25, 0.45], look: 1 },
  hard:   { weights: [0.6, 0.25, 0.15], look: 2 },
};

// The three hardest clubs on normal, from the v2 calibration (2026-10-06, 1000 runs,
// three best-of-5 series each): bnei-sakhnin 12.8%, hapoel-pt 24.1%, bnei-yehuda 25.2%
// series wins. Drives the dc_underdog achievement.
const DERBY_UNDERDOGS = ['bnei-sakhnin', 'hapoel-pt', 'bnei-yehuda'];

// Season rerolls for the whole draft. The club reroll is hidden: with one club
// in the pool it could only redraw another season of the same club.
const DERBY_REROLLS = 3;

function derbySeasonsOf(teamId) {
  return SQUADS.filter(sq => sq.teamId === teamId);
}

// Computed from the data, not listed: a club that reaches 15 seasons later
// joins on its own — provided it has rivals defined.
function derbyClubs() {
  return Object.keys(DERBY_RIVALS)
    .filter(id => derbySeasonsOf(id).length >= DERBY_MIN_SEASONS)
    .sort((a, b) => derbySeasonsOf(b).length - derbySeasonsOf(a).length);
}

// mulberry32: the run's own seeded stream, so a refresh replays the same draft
// and the same goals.
function derbyRng(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
