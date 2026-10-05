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

// The series: which rival each game is against (index into DERBY_RIVALS[club],
// 0 = archrival) and whether you are at home. Game 5 against the archrival is
// only ever reached at 2:2.
const DERBY_ORDER = [2, 1, 0, 1, 0];
const DERBY_HOME  = [true, false, true, false, true];

// How the computer drafts. Each round it ranks the players of the drawn season
// who fit an open slot and takes the 1st/2nd/3rd best with these weights; `look`
// is how many seasons it draws per round, keeping the best (its reroll).
// Starting values — Task 4 calibrates them; the engine is never touched.
const DERBY_AI = {
  easy:   { weights: [0.25, 0.30, 0.45], look: 1 },
  normal: { weights: [1, 0, 0],          look: 1 },
  hard:   { weights: [1, 0, 0],          look: 3 },
};

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
