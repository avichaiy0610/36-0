// ─── Formations ───────────────────────────────────────────────────────────────
const FORMATIONS = {
  '4-3-3': {
    label: '4-3-3',
    slots: [
      { id: 'gk',  label: 'שוער',          pos: 'GK',  x: 50, y: 87 },
      { id: 'rb',  label: 'מגן ימני',      pos: 'RB',  x: 80, y: 70 },
      { id: 'cb1', label: 'בלם',     pos: 'CB',  x: 62, y: 72 },
      { id: 'cb2', label: 'בלם',     pos: 'CB',  x: 38, y: 72 },
      { id: 'lb',  label: 'מגן שמאלי',      pos: 'LB',  x: 20, y: 70 },
      { id: 'cm1', label: 'קשר',           pos: 'CM',  x: 65, y: 50 },
      { id: 'cm2', label: 'קשר',           pos: 'CM',  x: 50, y: 48 },
      { id: 'cm3', label: 'קשר',           pos: 'CM',  x: 35, y: 50 },
      { id: 'rw',  label: 'כנף ימני',      pos: 'RW',  x: 78, y: 24 },
      { id: 'st',  label: 'חלוץ',          pos: 'ST',  x: 50, y: 16 },
      { id: 'lw',  label: 'כנף שמאלי',     pos: 'LW',  x: 22, y: 24 },
    ],
  },
  '4-4-2': {
    label: '4-4-2',
    slots: [
      { id: 'gk',  label: 'שוער',          pos: 'GK',  x: 50, y: 87 },
      { id: 'rb',  label: 'מגן ימני',      pos: 'RB',  x: 80, y: 70 },
      { id: 'cb1', label: 'בלם',     pos: 'CB',  x: 62, y: 72 },
      { id: 'cb2', label: 'בלם',     pos: 'CB',  x: 38, y: 72 },
      { id: 'lb',  label: 'מגן שמאלי',      pos: 'LB',  x: 20, y: 70 },
      { id: 'rm',  label: 'קשר ימין',      pos: 'RM',  x: 78, y: 48 },
      { id: 'cm1', label: 'קשר',           pos: 'CM',  x: 60, y: 50 },
      { id: 'cm2', label: 'קשר',           pos: 'CM',  x: 40, y: 50 },
      { id: 'lm',  label: 'קשר שמאל',     pos: 'LM',  x: 22, y: 48 },
      { id: 'st1', label: 'חלוץ',          pos: 'ST',  x: 62, y: 20 },
      { id: 'st2', label: 'חלוץ',          pos: 'ST',  x: 38, y: 20 },
    ],
  },
  '4-2-3-1': {
    label: '4-2-3-1',
    slots: [
      { id: 'gk',   label: 'שוער',         pos: 'GK',  x: 50, y: 87 },
      { id: 'rb',   label: 'מגן ימני',     pos: 'RB',  x: 80, y: 70 },
      { id: 'cb1',  label: 'בלם',    pos: 'CB',  x: 62, y: 72 },
      { id: 'cb2',  label: 'בלם',    pos: 'CB',  x: 38, y: 72 },
      { id: 'lb',   label: 'מגן שמאלי',     pos: 'LB',  x: 20, y: 70 },
      { id: 'cdm1', label: 'קשר הגנתי',    pos: 'CDM', x: 60, y: 56 },
      { id: 'cdm2', label: 'קשר הגנתי',    pos: 'CDM', x: 40, y: 56 },
      { id: 'rm',   label: 'קשר ימין',     pos: 'RM',  x: 76, y: 36 },
      { id: 'cam',  label: 'קשר התקפי',    pos: 'CAM', x: 50, y: 34 },
      { id: 'lm',   label: 'קשר שמאל',    pos: 'LM',  x: 24, y: 36 },
      { id: 'st',   label: 'חלוץ',         pos: 'ST',  x: 50, y: 14 },
    ],
  },
  '3-5-2': {
    label: '3-5-2',
    slots: [
      { id: 'gk',  label: 'שוער',          pos: 'GK',  x: 50, y: 87 },
      { id: 'cb1', label: 'בלם',     pos: 'CB',  x: 70, y: 70 },
      { id: 'cb2', label: 'בלם',     pos: 'CB',  x: 50, y: 72 },
      { id: 'cb3', label: 'בלם',     pos: 'CB',  x: 30, y: 70 },
      { id: 'rm',  label: 'קשר ימין',      pos: 'RM',  x: 84, y: 50 },
      { id: 'cm1', label: 'קשר',           pos: 'CM',  x: 65, y: 50 },
      { id: 'cm2', label: 'קשר',           pos: 'CM',  x: 50, y: 50 },
      { id: 'cm3', label: 'קשר',           pos: 'CM',  x: 35, y: 50 },
      { id: 'lm',  label: 'קשר שמאל',     pos: 'LM',  x: 16, y: 50 },
      { id: 'st1', label: 'חלוץ',          pos: 'ST',  x: 62, y: 20 },
      { id: 'st2', label: 'חלוץ',          pos: 'ST',  x: 38, y: 20 },
    ],
  },
  '5-3-2': {
    label: '5-3-2',
    slots: [
      { id: 'gk',  label: 'שוער',           pos: 'GK',  x: 50, y: 87 },
      { id: 'rwb', label: 'כנף הגנה ימני',  pos: 'RB',  x: 86, y: 66 },
      { id: 'cb1', label: 'בלם',      pos: 'CB',  x: 70, y: 71 },
      { id: 'cb2', label: 'בלם',      pos: 'CB',  x: 50, y: 73 },
      { id: 'cb3', label: 'בלם',      pos: 'CB',  x: 30, y: 71 },
      { id: 'lwb', label: 'כנף הגנה שמאלי',  pos: 'LB',  x: 14, y: 66 },
      { id: 'cm1', label: 'קשר',            pos: 'CM',  x: 65, y: 48 },
      { id: 'cm2', label: 'קשר',            pos: 'CM',  x: 50, y: 48 },
      { id: 'cm3', label: 'קשר',            pos: 'CM',  x: 35, y: 48 },
      { id: 'st1', label: 'חלוץ',           pos: 'ST',  x: 62, y: 20 },
      { id: 'st2', label: 'חלוץ',           pos: 'ST',  x: 38, y: 20 },
    ],
  },
  '3-4-3': {
    label: '3-4-3',
    slots: [
      { id: 'gk',  label: 'שוער',          pos: 'GK',  x: 50, y: 87 },
      { id: 'cb1', label: 'בלם',     pos: 'CB',  x: 68, y: 70 },
      { id: 'cb2', label: 'בלם',     pos: 'CB',  x: 50, y: 72 },
      { id: 'cb3', label: 'בלם',     pos: 'CB',  x: 32, y: 70 },
      { id: 'rm',  label: 'קשר ימין',      pos: 'RM',  x: 78, y: 50 },
      { id: 'cm1', label: 'קשר',           pos: 'CM',  x: 60, y: 50 },
      { id: 'cm2', label: 'קשר',           pos: 'CM',  x: 40, y: 50 },
      { id: 'lm',  label: 'קשר שמאל',     pos: 'LM',  x: 22, y: 50 },
      { id: 'rw',  label: 'כנף ימני',      pos: 'RW',  x: 76, y: 22 },
      { id: 'st',  label: 'חלוץ',          pos: 'ST',  x: 50, y: 14 },
      { id: 'lw',  label: 'כנף שמאלי',     pos: 'LW',  x: 24, y: 22 },
    ],
  },
  '4-1-4-1': {
    label: '4-1-4-1',
    slots: [
      { id: 'gk',  label: 'שוער',          pos: 'GK',  x: 50, y: 87 },
      { id: 'rb',  label: 'מגן ימני',      pos: 'RB',  x: 80, y: 70 },
      { id: 'cb1', label: 'בלם',           pos: 'CB',  x: 62, y: 72 },
      { id: 'cb2', label: 'בלם',           pos: 'CB',  x: 38, y: 72 },
      { id: 'lb',  label: 'מגן שמאלי',     pos: 'LB',  x: 20, y: 70 },
      { id: 'cdm', label: 'קשר הגנתי',     pos: 'CDM', x: 50, y: 58 },
      { id: 'rm',  label: 'קשר ימין',      pos: 'RM',  x: 80, y: 40 },
      { id: 'cm1', label: 'קשר',           pos: 'CM',  x: 60, y: 42 },
      { id: 'cm2', label: 'קשר',           pos: 'CM',  x: 40, y: 42 },
      { id: 'lm',  label: 'קשר שמאל',     pos: 'LM',  x: 20, y: 40 },
      { id: 'st',  label: 'חלוץ',          pos: 'ST',  x: 50, y: 15 },
    ],
  },
  '4-5-1': {
    label: '4-5-1',
    slots: [
      { id: 'gk',  label: 'שוער',          pos: 'GK',  x: 50, y: 87 },
      { id: 'rb',  label: 'מגן ימני',      pos: 'RB',  x: 80, y: 70 },
      { id: 'cb1', label: 'בלם',           pos: 'CB',  x: 62, y: 72 },
      { id: 'cb2', label: 'בלם',           pos: 'CB',  x: 38, y: 72 },
      { id: 'lb',  label: 'מגן שמאלי',     pos: 'LB',  x: 20, y: 70 },
      { id: 'rm',  label: 'קשר ימין',      pos: 'RM',  x: 82, y: 46 },
      { id: 'cm1', label: 'קשר',           pos: 'CM',  x: 63, y: 48 },
      { id: 'cam', label: 'קשר התקפי',     pos: 'CAM', x: 50, y: 42 },
      { id: 'cm2', label: 'קשר',           pos: 'CM',  x: 37, y: 48 },
      { id: 'lm',  label: 'קשר שמאל',     pos: 'LM',  x: 18, y: 46 },
      { id: 'st',  label: 'חלוץ',          pos: 'ST',  x: 50, y: 15 },
    ],
  },
  '4-3-2-1': {
    label: '4-3-2-1',
    slots: [
      { id: 'gk',  label: 'שוער',          pos: 'GK',  x: 50, y: 87 },
      { id: 'rb',  label: 'מגן ימני',      pos: 'RB',  x: 80, y: 70 },
      { id: 'cb1', label: 'בלם',           pos: 'CB',  x: 62, y: 72 },
      { id: 'cb2', label: 'בלם',           pos: 'CB',  x: 38, y: 72 },
      { id: 'lb',  label: 'מגן שמאלי',     pos: 'LB',  x: 20, y: 70 },
      { id: 'cdm', label: 'קשר הגנתי',     pos: 'CDM', x: 50, y: 58 },
      { id: 'cm1', label: 'קשר',           pos: 'CM',  x: 64, y: 50 },
      { id: 'cm2', label: 'קשר',           pos: 'CM',  x: 36, y: 50 },
      { id: 'cam1',label: 'קשר התקפי',     pos: 'CAM', x: 62, y: 32 },
      { id: 'cam2',label: 'קשר התקפי',     pos: 'CAM', x: 38, y: 32 },
      { id: 'st',  label: 'חלוץ',          pos: 'ST',  x: 50, y: 14 },
    ],
  },
};

// ─── Position normalisation (raw Transfermarkt → standard codes) ───────────────
const POS_NORMALIZE = {
  'Goalkeeper':'GK',
  'Defender':'CB', 'Centre-Back':'CB', 'Left-Back':'LB', 'Right-Back':'RB',
  'Midfielder':'CM', 'Central Midfield':'CM', 'Defensive Midfield':'CDM',
  'Attacking Midfield':'CAM', 'Right Midfield':'RM', 'Left Midfield':'LM',
  'Winger':'RW', 'Right Winger':'RW', 'Left Winger':'LW',
  'Striker':'CF', 'Forward':'CF', 'Centre-Forward':'CF', 'Second Striker':'CF',
};
function normalizePos(pos) { return POS_NORMALIZE[pos] ?? pos; }

// ─── Compatibility ─────────────────────────────────────────────────────────────
// Which player-positions may fill each formation slot. Kept tight and realistic:
// a player only slots into his own position or a close, same-line relative — no
// winger playing striker, no attacking-mid dropping onto the wing, etc.
const COMPAT = {
  GK:  ['GK'],
  RB:  ['RB'],  CB: ['CB'],  LB: ['LB'],
  // The centre is one job with two ends, and CM is the bridge between them: a
  // holding player and a playmaker both slot into midfield, and a midfielder
  // covers either end. But the two ends do not swap with each other — asking a
  // playmaker to sit in front of the back four, or a holder to play between the
  // lines, is not a near-enough move, it is a different footballer.
  CDM: ['CDM','CM'], CM: ['CM','CDM','CAM'], CAM: ['CAM','CM'],
  RM:  ['RM','RW'],  LM: ['LM','LW'],
  RW:  ['RW','RM'],  LW: ['LW','LM'],
  CF:  ['CF','ST'],  ST: ['ST','CF'],
};

// ─── Hebrew position names ─────────────────────────────────────────────────────
const POS_HE = {
  GK:'שוער', RB:'מגן ימני', CB:'בלם', LB:'מגן שמאלי',
  CDM:'קשר הגנתי', CM:'קשר', CAM:'קשר התקפי',
  RM:'קשר ימין', LM:'קשר שמאל', RW:'כנף ימני', LW:'כנף שמאלי',
  CF:'חלוץ', ST:'חלוץ',
};

// ─── Classic ───────────────────────────────────────────────────────────────────
//
// The game as it was before chemistry, tags and tactics: eleven ratings and the
// simulation, nothing else. It is not a nostalgia setting — it is the honest
// answer to "am I winning because I drafted well, or because I stacked bonuses",
// and it keeps the older way of playing available to anyone who preferred it.
//
// Bug fixes are NOT rolled back by it. A centre-back who could not be placed
// next to a holding midfielder, or a CAM docked 7% for standing in midfield,
// were mistakes rather than features, and classic should be the old GAME, not
// the old bugs.
function classicMode() {
  return typeof state !== 'undefined' && state.classic === true;
}

// ─── Tactics ───────────────────────────────────────────────────────────────────
//
// A shape like 4-3-3 says how many men are in each band, not what they are asked
// to do. The tactic takes the most central midfielder and pushes him forward or
// drops him back, which is a real trade in the simulation: CAM is scored in the
// attacking line, CDM in the defensive one, so a third of your midfield moves to
// one end of the pitch and the middle gets thinner either way.
//
// Deliberately NOT new FORMATIONS keys: the daily challenge draws its formation
// from that list, and adding to it would rewrite challenges people already
// played. A tactic is a separate field that defaults to balanced, so every save,
// league and challenge that predates it keeps meaning exactly what it meant.
// Why a modifier and not simply a CAM slot: the lines are AVERAGES, so moving a
// midfielder into the attack just drags that average toward his own rating. It
// was measured over 400 XIs — attack moved +0.15 and the defensive shape made the
// defence 0.15 WORSE, the opposite of what it promises. So the shape is what you
// see and the trade is explicit.
//
// The numbers are lopsided on purpose. The engine weights the defensive rating
// about 2.8x the attacking one (KD 0.125 against KA 0.045), so ±3 attack against
// ∓1 defence is what makes the two directions an even trade rather than one
// obviously correct answer: roughly +14% of your own goals against +13% of
// theirs, and the mirror of that going the other way.
const TACTICS = {
  att: { label: 'התקפית', note: 'עם קשר התקפי',  role: 'CAM', dy: -9, atk: +3, def: -1 },
  bal: { label: 'מאוזנת', note: 'שלושה קשרים',   role: null,  dy: 0,  atk: 0,  def: 0 },
  def: { label: 'הגנתית', note: 'עם קשר הגנתי',  role: 'CDM', dy: +9, atk: -3, def: +1 },
};
// how the trade reads on the chip, under the shape
function tacticTrade(k) {
  const t = TACTICS[k];
  if (!t || (!t.atk && !t.def)) return '';
  // the sign has to stay glued to its number, or RTL renders "+3" as "3+"
  const bit = (n, name) => n ? `<span dir="ltr">${n > 0 ? '+' : ''}${n}</span> ${name}` : '';
  return [bit(t.atk, 'התקפה'), bit(t.def, 'הגנה')].filter(Boolean).join(' · ');
}
const TACTIC_KEYS = ['att', 'bal', 'def'];

// Only shapes that field a plain central pair or trio get the choice. The four
// that already declare a CAM or a CDM have made it themselves.
function formationTactical(formationId) {
  const f = FORMATIONS[formationId];
  if (!f) return false;
  const cms = f.slots.filter(s => s.pos === 'CM').length;
  const fixed = f.slots.some(s => s.pos === 'CAM' || s.pos === 'CDM');
  return cms >= 2 && !fixed;
}

// The man who moves: the most central midfielder, and of those the deepest when
// he is dropping back and the highest when he is pushing on. Ties broken by slot
// order so the same formation always reshapes the same way.
function tacticSlotIdx(slots, tactic) {
  let best = -1, bestKey = null;
  slots.forEach((s, i) => {
    if (s.pos !== 'CM') return;
    const centrality = Math.abs(s.x - 50);
    const depth = tactic === 'def' ? -s.y : s.y;
    const key = [centrality, depth];
    if (bestKey === null || key[0] < bestKey[0] ||
        (key[0] === bestKey[0] && key[1] < bestKey[1])) { best = i; bestKey = key; }
  });
  return best;
}

// The slots a formation actually fields under a tactic. Everything that builds a
// pitch goes through here so the preview, the draft and the results all agree.
function formationSlots(formationId, tactic) {
  const f = FORMATIONS[formationId];
  if (!f) return [];
  const t = TACTICS[tactic];
  if (!t || !t.role || !formationTactical(formationId)) return f.slots;
  const idx = tacticSlotIdx(f.slots, tactic);
  if (idx < 0) return f.slots;
  // `pos` stays CM — every compatibility and rating rule treats the centre as one
  // position anyway, so changing it here would only double-count the tactic.
  return f.slots.map((s, i) => i !== idx ? s : {
    ...s,
    role: t.role,
    label: POS_HE[t.role] ?? s.label,
    y: Math.max(6, Math.min(92, s.y + t.dy)),
  });
}

function tacticOf(id) { return TACTIC_KEYS.includes(id) ? id : 'bal'; }

// Reverse COMPAT: playerPos -> slot types they fit
const PLAYER_FITS = (() => {
  const map = {};
  Object.entries(COMPAT).forEach(([slot, players]) => {
    players.forEach(pp => { (map[pp] = map[pp] || new Set()).add(slot); });
  });
  return map;
})();

const POS_SHORT_HE = {
  GK:'שוע', RB:'מ״י', CB:'בלם', LB:'מ״ש',
  CDM:'קה״ג', CM:'קשר', CAM:'קה״ת',
  RM:'ק״י', LM:'ק״ש', RW:'כ״י', LW:'כ״ש',
  CF:'חלוץ', ST:'חלוץ',
};

// ─── Position groupings for stats ─────────────────────────────────────────────
const ATK_POS = ['ST','CF','RW','LW','CAM'];
const MID_POS = ['CM','CDM','RM','LM'];
const DEF_POS = ['CB','RB','LB'];

const POS_TYPE = pos =>
  ATK_POS.includes(pos) ? 'atk' : MID_POS.includes(pos) ? 'mid' : DEF_POS.includes(pos) ? 'def' : 'gk';

// ─── Position weights ──────────────────────────────────────────────────────────
const POS_WEIGHT = {
  GK:1.3, RB:0.95, CB:1.05, LB:0.95, CDM:1.1, CM:1.0, CAM:1.1,
  RM:0.95, LM:0.95, RW:1.0, LW:1.0, CF:1.1, ST:1.2,
};

// ─── Goal / Assist simulation weights ─────────────────────────────────────────
// These only split a season's goals between the XI — they never affect a result.
//
// The spread used to be far too top-heavy: ST at 8 against 1.5 for a central
// midfielder handed the striker 35% of everything his team scored, so a squad on
// 92 goals produced a 28-goal top scorer, 40% of seasons cleared 30, and 9% beat
// Eran Zahavi's all-time league record of 35. Flattening it puts a 92-goal season
// on a ~24-goal top scorer with the record falling about once in a hundred
// seasons, which is roughly what the real league does.
const GOAL_W = {
  ST:4.5, CF:4.4, RW:3.2, LW:3.2, CAM:2.9,
  RM:2.2, LM:2.2, CM:1.8, CDM:1.0,
  CB:0.6, RB:0.5, LB:0.5, GK:0,
};

// Goals and assists also lean on who the player actually is, not only where he
// stands: weights get multiplied by exp(GOAL_QUALITY_K * (ovr - 80)).
//
// This was 0.015, which was too shy by half. At that value a 95 was worth 1.25x
// an 80 while the position alone was worth 2.5x, so where a man stood mattered
// twice as much as who he was — and a modest striker took the golden boot off a
// pitch full of better men 76% of the time. Measured on one real XI over 4,000
// seasons: Dean David 85 finishing ahead of Zahavi 95 and his four tags, every
// time, because he was the one in the middle.
//
// At 0.045 the striker still leads more often than not — he is the striker —
// but only 54% of the time, and a great winger takes it one season in four. The
// tallies barely move (25.4 goals to 23.0), so this spreads the honour without
// inflating it: it is about WHO tops the table, not by how much.
const GOAL_QUALITY_K = 0.045;
// Tags tilt who scores, never whether you win: the scoreline is settled by the
// line ratings before these are consulted.
const goalWeight   = p => (GOAL_W[p.slotPos]   ?? 0) * Math.exp(GOAL_QUALITY_K * (p.ovr - 80))
  * (!classicMode() && typeof tagGoalMult   === 'function' ? tagGoalMult(p.name, p.slotPos)   : 1);
const assistWeight = p => (ASSIST_W[p.slotPos] ?? 0) * Math.exp(GOAL_QUALITY_K * (p.ovr - 80))
  * (!classicMode() && typeof tagAssistMult === 'function' ? tagAssistMult(p.name, p.slotPos) : 1);
const ASSIST_W = {
  ST:1, CF:1.5, RW:5, LW:5, CAM:6,
  RM:4, LM:4, CM:3.5, CDM:1.5,
  CB:0.5, RB:2, LB:2, GK:0,
};

// ─── Simulation opponents ("era opponents") ────────────────────────────────────
// The sim league can be any season's real clubs, each rated by its top-11
// average. The format is always today's — exactly 13 opponents → 26 regular +
// playoff = 36/33 games — so tiers, tables and the server validator hold for
// every era. Seasons with fewer clubs in the data (12 in 2000-2008) are topped
// up with the strongest not-already-present clubs of the nearest seasons.
const LATEST_SEASON_YEAR = Math.max(...SQUADS.map(s => parseInt(s.season)));
const _simTeamsCache = {};
function simTeamsForSeason(year, count = 13) {
  const y = year ?? LATEST_SEASON_YEAR;
  const ck = y + '|' + count;
  if (_simTeamsCache[ck]) return _simTeamsCache[ck];
  const clubOf = sq => {
    const top = [...sq.players].sort((a, b) => b.ovr - a.ovr).slice(0, 11);
    const ovr = Math.round(top.reduce((sum, p) => sum + p.ovr, 0) / top.length);
    return {
      teamId: sq.teamId,
      name: (TEAMS[sq.teamId] ?? { name: sq.teamId }).name,
      ovr,
      // V2 line ratings, from the club's real squad. V1 ignores these entirely,
      // so adding them cannot change any existing result.
      ...simLineRatingsForSquad(sq.players, ovr),
    };
  };
  const clubs = SQUADS.filter(s => parseInt(s.season) === y).map(clubOf)
    .sort((a, b) => b.ovr - a.ovr);
  const have = new Set(clubs.map(c => c.teamId));
  for (let d = 1; clubs.length < count && d < 30; d++) {
    for (const ny of [y + d, y - d]) {
      const extra = SQUADS.filter(s => parseInt(s.season) === ny && !have.has(s.teamId))
        .map(clubOf).sort((a, b) => b.ovr - a.ovr);
      for (const c of extra) {
        if (clubs.length >= count) break;
        clubs.push(c); have.add(c.teamId);
      }
    }
  }
  return (_simTeamsCache[ck] = clubs.slice(0, count));
}
const IL_TEAMS_SIM = simTeamsForSeason(LATEST_SEASON_YEAR);

// ─── Authentic league formats, season by season ───────────────────────────────
// Israel changed its league format six times since 1999, and picking a season
// now plays it as it really was:
//   games = (teams-1)*rounds + (groupSize-1)*playoffRounds
// Verified against Wikipedia — 1999/00: 39 · 2000/01: 38 · 2001-2008: 33 ·
// 2009/10-2010/11: 35/33/35 with the regular-season points halved ·
// 2011/12: 37 · 2012/13-today: 36/33.
const SEASON_FORMATS = [
  { from: 1999, to: 1999, teams: 14, rounds: 3, groups: null },
  { from: 2000, to: 2000, teams: 12, rounds: 3, groups: [6, 6],    poRounds: [1, 1] },
  { from: 2001, to: 2008, teams: 12, rounds: 3, groups: null },
  { from: 2009, to: 2010, teams: 16, rounds: 2, groups: [6, 4, 6], poRounds: [1, 1, 1], halve: true },
  { from: 2011, to: 2011, teams: 16, rounds: 2, groups: [8, 8],    poRounds: [1, 1] },
  { from: 2012, to: 9999, teams: 14, rounds: 2, groups: [6, 8],    poRounds: [2, 1], modern: true },
];
const MODERN_FORMAT = SEASON_FORMATS[SEASON_FORMATS.length - 1];

function seasonFormat(year) {
  const y = year ?? LATEST_SEASON_YEAR;
  return SEASON_FORMATS.find(f => y >= f.from && y <= f.to) ?? MODERN_FORMAT;
}
// 'authentic' = that season's real format · 'modern' = today's 26+playoff (36/33)
function formatOf(mode) { return mode === 'modern' ? 'modern' : 'authentic'; }
function formatSpecFor(mode, year) {
  return formatOf(mode) === 'modern' ? MODERN_FORMAT : seasonFormat(year);
}
function specForState() { return formatSpecFor(state.leagueFormat, state.oppSeason); }
function isModernSpec(spec) { return !!spec && !!spec.modern; }
function regularGames(spec) { return (spec.teams - 1) * spec.rounds; }
// total games a team plays, by playoff group index (groups=null → no playoff)
function totalGamesFor(spec, groupIdx = 0) {
  if (!spec.groups) return regularGames(spec);
  return regularGames(spec) + (spec.groups[groupIdx] - 1) * spec.poRounds[groupIdx];
}
function groupNames(spec) {
  if (!spec.groups) return [];
  return spec.groups.length === 3
    ? ['פלייאוף עליון', 'פלייאוף אמצעי', 'פלייאוף תחתון']
    : ['פלייאוף עליון', 'פלייאוף תחתון'];
}
function formatLabel(spec) {
  const games = spec.groups
    ? [...new Set(spec.groups.map((_, i) => totalGamesFor(spec, i)))].join('/')
    : regularGames(spec);
  const po = !spec.groups ? 'בלי פלייאוף' : `פלייאוף ${spec.groups.join('/')}`;
  const halve = spec.halve ? ' · נקודות נחצות' : '';
  return `${spec.teams} קבוצות · ${spec.rounds} סיבובים · ${po}${halve} · ${games} משחקים`;
}

// The opponents for the CURRENT run. null oppSeason = latest, so squad-data
// updates roll the default league forward automatically.
function oppTeamsForState() {
  return simTeamsForSeason(state.oppSeason ?? LATEST_SEASON_YEAR, specForState().teams - 1);
}

// ─── Era helpers ──────────────────────────────────────────────────────────────
function parseSeasonYear(s) { return parseInt(s.split('/')[0]); }
function yearToSeason(y) { return `${y}/${String(y + 1).slice(-2).padStart(2, '0')}`; }
const ALL_SEASON_YEARS = (() => {
  const s = new Set(SQUADS.map(sq => parseSeasonYear(sq.season)));
  return [...s].sort((a, b) => a - b);
})();
const YEAR_MIN = ALL_SEASON_YEARS[0];
const YEAR_MAX  = ALL_SEASON_YEARS[ALL_SEASON_YEARS.length - 1];

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  difficulty: 'normal', showRatings: true, draftMode: 'squad-first',
  peakMode: false,
  eraMin: YEAR_MIN, eraMax: YEAR_MAX,
  oppSeason: null, oppSeasonChoice: 'latest',   // null = the latest season's league
  leagueFormat: 'authentic',                    // 'authentic' = the chosen season's real format · 'modern' = today's
  formationId: null, tactic: 'bal', classic: false, slots: [], picks: [], currentRound: 0,
  usedSquadIds: new Set(), usedPlayerKeys: new Set(), currentSquad: null,
  selectedPlayer: null, selectedSlotIdx: null,
  teamRerollsLeft: 1, seasonRerollsLeft: 1,
  isAnimating: false, awaitingSlotPick: false,
  moveMode: false, movingFromIdx: null,
  leagueCode: null,
  duelCode: null,
  career: null,                                                // { year, seasonIdx } while a career season is being played
  deck: null, mgw: null,                                       // a fixed squad deck (כדורדל) + which daily it belongs to
  challenge: null, challengeDeck: null, challengeReqs: null,   // { period, key } + missions for challenge runs
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// In-place Fisher–Yates. Never use sort(() => Math.random() - 0.5) for shuffling:
// V8 calls an inconsistent comparator a JIT-tier-dependent number of times, which
// breaks every seeded (deterministic) simulation — league reveals and dailies.
function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Returns the OVR to use for a player, respecting peak mode.
function playerOVR(player) {
  return state.peakMode ? (player.peak_ovr ?? player.ovr) : player.ovr;
}

function getTeam(teamId) {
  return TEAMS[teamId] || { name:'?', primaryColor:'#333', secondaryColor:'#fff', badge:'⚽' };
}

// Short display name: everything after the first word is the family name
// (e.g. "טל בן חיים" → "בן חיים").
function playerShortName(name) {
  const w = name.trim().split(/\s+/);
  return w.length > 1 ? w.slice(1).join(' ') : w[0];
}

// Readable text color for a given background hex (dark text on light colors)
function textColorFor(hex) {
  const h = (hex || '').replace('#', '');
  if (h.length < 6) return '#fff';
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#111' : '#fff';
}

function emptySlotIndices() {
  return state.slots.map((_,i) => i).filter(i => !state.picks[i]);
}

// All positions a player can play (primary + secondary), normalized, primary first
function playerPositions(player) {
  const all = [normalizePos(player.position), ...(player.altPos ?? []).map(normalizePos)];
  return [...new Set(all)];
}

function playerFitsSlot(player, slotPos) {
  const compat = COMPAT[slotPos] ?? [slotPos];
  return playerPositions(player).some(p => compat.includes(p));
}

function compatibleEmptySlots(player) {
  return emptySlotIndices().filter(i => playerFitsSlot(player, state.slots[i].pos));
}

// `ovrAt` lets a caller price the same XI on its own terms — the gauntlet passes
// one that folds in shop upgrades and relics. Left out, it is plain playerOVR
// and nothing about the league game changes.
// Every rating in the game goes through here or through calcGroupOVR, so
// chemistry is added in both rather than threaded through a dozen call sites.
// It also stacks on top of a caller's own ovrAt (the gauntlet's relics), which
// is right: a relic and a real partnership are different things.
function chemAt(i) {
  if (classicMode()) return 0;
  return (typeof chemBonusAt === 'function') ? chemBonusAt(i) : 0;
}

// Is this his position, or is he really out of it?
//
// A player is in position whenever the slot suits ANY position he plays — his
// main one or a secondary. A striker who also plays as an attacking midfielder
// IS an attacking midfielder when he stands there; docking him for it was the
// game arguing with its own data, and it read absurdly on the pitch ("חלוץ
// בעמדת קשר — נספר כ-76" for a man whose own card lists CAM).
//
// The 7% survives for one case only, and it is a real one: a career run whose
// formation changes between seasons re-slots the XI by index, so a man can end
// up somewhere he genuinely cannot play. Nothing in a normal draft can reach
// this branch, because the draft will not let you place him there to begin with.
function inNaturalPos(player, slotPos) {
  return playerFitsSlot(player, slotPos);
}
const OUT_OF_POS = 0.93;

function teamOVR(ovrAt) {
  let total = 0, weight = 0;
  state.picks.forEach((pick, i) => {
    if (!pick) return;
    const slot = state.slots[i];
    const w = POS_WEIGHT[slot.pos] ?? 1;
    const ovr = (ovrAt ? ovrAt(pick, i) : playerOVR(pick.player)) + chemAt(i);
    const inPos = inNaturalPos(pick.player, slot.pos);
    total += (inPos ? ovr : Math.round(ovr * OUT_OF_POS)) * w;
    weight += w;
  });
  return weight > 0 ? Math.round(total / weight) : 0;
}

// A line's rating, on exactly the same terms as teamOVR: a player fielded out of
// his natural position counts at 93%, because that is what he is actually worth
// there. Without the penalty these bars ran about 1.6 points above the headline
// OVR — a quarter of drafted players end up out of position — so the simulation
// saw a squad meaningfully stronger than the number on screen, and a real draft
// outperformed the rating it was indexed by.
function calcGroupOVR(positions, ovrAt) {
  const ovrs = state.picks
    .map((pick, i) => {
      if (!pick || !positions.includes(state.slots[i].pos)) return null;
      const ovr = (ovrAt ? ovrAt(pick, i) : playerOVR(pick.player)) + chemAt(i);
      return inNaturalPos(pick.player, state.slots[i].pos)
        ? ovr : Math.round(ovr * OUT_OF_POS);
    })
    .filter(n => n !== null);
  return ovrs.length ? Math.round(ovrs.reduce((a,b) => a+b, 0) / ovrs.length) : null;
}

// The player's XI as the V2 engine wants it. Lines come from the same helper
// that draws the four bars on the results card, so what the player sees is
// literally what the simulation uses. An unfilled line falls back to the
// overall rating.
// What a squad full of finishers is worth to the SCOREBOARD.
//
// Tag effects were attribution only: they decided whose name went next to a
// goal the team was always going to score. That is backwards for a man who
// scored 35 in a season — he should make the team score more, not take the
// same goals off his team-mates. So the finishers in the XI also lift the
// attacking line, which is what the simulation turns into chances.
//
// Weighted by how much the man actually shoots from where he stands: a golden
// boot at centre-back keeps his tag and his share of whatever the team scores,
// but he is not the reason the team scores more — the striker is. GOAL_W already
// ranks that, so the same table does the work here.
//
// Scaled against the tag ceilings, not fixed to them: the multipliers were cut
// roughly sixfold, so the same PER would have made this invisible.
//
// Halved again after the first day of live seasons, which is the only place a
// number like this can really be set. At PER 7.5 / CAP 2 the top of the rating
// range came back +10 goals a season and the share of seasons past 100 goals
// went from 26% to 44% — a tag was rewriting the record book rather than
// colouring a year. Peak mode is what exposed it: an XI of career-best cards is
// full of tagged men, so the ceiling was reached every time instead of
// approached. The greatest finisher in the data is now worth about +0.54 attack
// up front, and no XI can buy more than +0.6 however it is stacked — a tight
// ceiling on purpose, because the failure mode was a squad of famous names all
// contributing at once, not any single one of them.
const TAG_ATK_PER = 4;
const TAG_ATK_CAP = 0.6;
function tagAtkBoost() {
  if (classicMode()) return 0;
  if (typeof tagGoalMult !== 'function' || typeof state === 'undefined') return 0;
  let excess = 0;
  (state.picks || []).forEach((pick, i) => {
    if (!pick || !pick.player) return;
    const pos = state.slots[i] && state.slots[i].pos;
    const share = (GOAL_W[pos] ?? 0) / GOAL_W.ST;      // how much he shoots at all
    excess += Math.max(0, tagGoalMult(pick.player.name, pos) - 1) * share;
  });
  return Math.min(TAG_ATK_CAP, TAG_ATK_PER * excess);
}

// What the four bars must show. They used to read calcGroupOVR straight, which
// stopped being the truth the moment a tactic or a finisher's bonus could move a
// line: the bar said 85 while the season was played at 88. Everything that draws
// a line rating goes through here now — the same warning sim-engine.js already
// carries about keeping the card and the simulation on the same numbers.
function shownLineOVR(positions) {
  const L = myLineRatings();
  const same = a => Array.isArray(positions) && Array.isArray(a) &&
    a.length === positions.length && a.every((p, i) => p === positions[i]);
  if (same(ATK_POS)) return Math.round(L.atk);
  if (same(MID_POS)) return Math.round(L.mid);
  if (same(DEF_POS)) return Math.round(L.def);
  if (same(['GK']))  return Math.round(L.gk);
  return calcGroupOVR(positions);
}

// The XI's chance of a clean sheet, multiplied. Every defender and keeper who
// spent a season in the league's meanest defence brings a little of it with him,
// and they compound — eleven men who never conceded are a wall, not a rota.
function tagCleanBoost() {
  if (classicMode() || typeof tagCleanMult !== 'function' || typeof state === 'undefined') return 1;
  let m = 1;
  (state.picks || []).forEach(pick => {
    if (!pick || !pick.player) return;
    m *= tagCleanMult(pick.player.name);
  });
  return Math.min(m, TAG_CLEAN_CAP);
}
const TAG_CLEAN_CAP = 1.25;      // no XI buys more than a quarter again

// What a room full of winners is worth. Applied to the four lines the season is
// played with, and deliberately NOT to the headline rating: the number on the
// card and on the leaderboard stays the squad you actually drafted.
const TAG_WINNER_EACH = 0.05;
const TAG_WINNER_CAP  = 0.5;
function tagWinnerBoost() {
  if (classicMode() || typeof tagsOf !== 'function' || typeof state === 'undefined') return 0;
  let n = 0;
  (state.picks || []).forEach(p => {
    if (p && p.player && tagsOf(p.player.name).some(t => t.key === 'serial_winner')) n++;
  });
  return Math.min(TAG_WINNER_CAP, n * TAG_WINNER_EACH);
}

function myLineRatings(ovrAt) {
  const ovr = teamOVR(ovrAt);
  const line = (positions) => calcGroupOVR(positions, ovrAt) ?? ovr;
  const t = TACTICS[tacticOf(typeof state !== 'undefined' ? state.tactic : 'bal')] || TACTICS.bal;
  const win = tagWinnerBoost();
  return {
    ovr,
    atk: line(SIM2_LINES.atk.pos) + t.atk + tagAtkBoost() + win,
    mid: line(SIM2_LINES.mid.pos) + win,
    def: line(SIM2_LINES.def.pos) + t.def + win,
    gk:  line(SIM2_LINES.gk.pos) + win,
    cs:  tagCleanBoost(),
  };
}

function pickWeightedIdx(weights) {
  const total = weights.reduce((a,b) => a+b, 0);
  if (total <= 0) return -1;
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
  return weights.length - 1;
}

function setEl(id, text, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (color) el.style.color = color;
}

function countUp(elId, target, delay) {
  setTimeout(() => {
    const el = document.getElementById(elId);
    if (!el) return;
    let cur = 0;
    const step = Math.ceil(target / 20) || 1;
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = cur;
      if (cur >= target) clearInterval(iv);
    }, 50);
  }, delay);
}

// ─── Screen navigation ─────────────────────────────────────────────────────────
// Reset every possible scroll container to the top (mobile scrolls the window/
// body; desktop scrolls the fixed screen element).
function scrollPageTop() {
  window.scrollTo(0, 0);
  if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.querySelectorAll('.screen, .side-panel, .results-side')
    .forEach(el => { el.scrollTop = 0; });
}

// The screens that ARE a mode: opening one is the only signal some of them
// (career, the mini-games, Europe) leave anywhere. See js/track.js.
const TRACK_SCREENS = {
  career: 'career', minigames: 'minigame', europe: 'europe',
  gauntlet: 'gauntlet', duel: 'duel', leagues: 'league', daily: 'challenge',
};

// Which mode the draft on screen belongs to. One definition, used both when a
// draft starts and when its season ends, so the two can never disagree.
// A career season returns null: it records itself in js/career.js, where the
// run's own numbers are known.
// Set by the salary-cap card on the setup screen and cleared by a plain
// "start", so the mode can never leak into the next draft.
let _salaryCapPick = false;

function trackDraftMode() {
  if (state.career) return null;
  return state.challenge ? 'challenge'
       : state.leagueCode ? 'league'
       : state.duelCode ? 'duel' : 'draft';
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + id);
  if (el) { el.classList.add('active'); el.scrollTop = 0; }
  if (TRACK_SCREENS[id] && typeof track === 'function') {
    // the two screens that are a menu rather than the thing itself: the games
    // inside them report their own open, with their own name
    track('open', TRACK_SCREENS[id], (id === 'minigames' || id === 'daily') ? 'hub' : null);
  }
  // refresh the daily card whenever the welcome screen shows: the streak and the
  // "played today" state change while the player is elsewhere on the site
  if (id === 'welcome') {
    if (typeof fillChallengeWelcomeCard === 'function') fillChallengeWelcomeCard();
    if (typeof updateChallengeAvailability === 'function') updateChallengeAvailability();
  }
  // on mobile the screens scroll as page flow, so reset the window too
  // (otherwise the results screen opens scrolled to the bottom)
  scrollPageTop();
  requestAnimationFrame(scrollPageTop);
  // pitches built while their screen was hidden couldn't be measured
  requestAnimationFrame(() => fitShortNames());
}

// ─── Welcome ───────────────────────────────────────────────────────────────────
function startGame() {
  state.leagueCode = null;   // a normal game from the welcome screen isn't for a league
  state.duelCode = null;
  state.career = null;       // ...nor for a career: leaving one mid-run must not record this season into it
  state.deck = null; state.mgw = null;   // ...nor for the fixed daily deck
  state.challenge = null; state.challengeDeck = null; state.challengeReqs = null;
  window._leagueReviewMode = null;
  window._duelReviewMode = null;
  document.getElementById('league-review-back')?.remove();
  document.getElementById('duel-review-chrome')?.remove();
  document.getElementById('screen-setup').classList.remove('league-locked');
  const note = document.getElementById('lg-setup-note'); if (note) note.style.display = 'none';
  if (typeof track === 'function') track('open', 'draft');
  prepareSetupScreen();
  showScreen('setup');
}

// Fill in the setup screen. Every path that opens it has to run this, not just
// the one from the welcome card: a challenge goes straight to the draft and
// never opens setup, so restarting out of one used to land on a screen with no
// formation chips and an empty season list.
function prepareSetupScreen() {
  if (typeof saAttach === 'function') setTimeout(saAttach, 0);
  if (typeof crSyncSetupCard === 'function') crSyncSetupCard();
  buildFormationCards();
  initOppSeasonSelect();
  syncEraSliderToState();
  const key = [_selectedFormationKey, state.formationId, '4-3-3'].find(k => k && FORMATIONS[k]);
  setFormationSelection(key);
}

// The era range lives only in `state` — beginDraft never re-reads it from the
// DOM — and a challenge overwrites it. The slider is wired up once at load, so
// after a challenge the screen went on showing 1999-2025 while the draft was
// really still restricted to the challenge's years.
function syncEraSliderToState() {
  const minR = document.getElementById('era-min-r');
  const maxR = document.getElementById('era-max-r');
  if (minR) minR.value = state.eraMin;
  if (maxR) maxR.value = state.eraMax;
  updateEraPresetHighlight();
  updateEraUI();
}

// Start a draft recorded for a league, with the league's shared settings locked in.
function startLeagueDraft(code, settings) {
  startGame();
  state.leagueCode = code;
  const s = settings || {};
  const pick = (rowId, val) => document.querySelectorAll('#' + rowId + ' .opt-btn')
    .forEach(b => b.classList.toggle('selected', b.dataset.val === val));
  pick('diff-row', s.difficulty || 'normal');
  pick('ratings-row', s.ratings_visible === false ? 'off' : 'on');
  pick('peakmode-row', s.peak_mode ? 'on' : 'off');
  pick('draftmode-row', s.draft_mode || 'squad-first');
  pick('mode-row', 'full');          // a league is one contest — same style for all
  const oppSel = document.getElementById('opp-season-sel');
  if (oppSel) { oppSel.value = 'latest'; updateOppSeasonNote(); }
  document.getElementById('screen-setup').classList.add('league-locked');
  const note = document.getElementById('lg-setup-note'); if (note) note.style.display = 'block';
}

// ─── Setup Screen ──────────────────────────────────────────────────────────────
let _selectedFormationKey = null;

function buildFormationCards() {
  const chips = document.getElementById('formation-chips');
  chips.innerHTML = '';
  Object.entries(FORMATIONS).forEach(([key, f]) => {
    const btn = document.createElement('button');
    btn.className = 'formation-chip';
    btn.dataset.key = key;
    btn.textContent = f.label;
    btn.addEventListener('click', () => setFormationSelection(key));
    chips.appendChild(btn);
  });
}

let _selectedTactic = 'bal';

function setFormationSelection(key) {
  _selectedFormationKey = key;
  document.querySelectorAll('.formation-chip').forEach(c =>
    c.classList.toggle('selected', c.dataset.key === key)
  );
  buildTacticCards();
  refreshFormationPreview();
}

// The three shapes a plain midfield can take, each saying plainly what it is.
// Shown only where the choice exists — 4-2-3-1 has already made it.
function buildTacticCards() {
  const row = document.getElementById('tactic-row');
  if (!row) return;
  const classicPicked = (document.querySelector('#mode-row .opt-btn.selected')?.dataset.val) === 'classic';
  if (classicPicked || !formationTactical(_selectedFormationKey)) {
    row.style.display = 'none';
    row.innerHTML = '';
    _selectedTactic = 'bal';
    return;
  }
  row.style.display = '';
  row.innerHTML = TACTIC_KEYS.map(k => `
    <button class="tactic-chip${k === _selectedTactic ? ' selected' : ''}" data-tactic="${k}">
      <span class="tactic-name">${TACTICS[k].label}</span>
      <span class="tactic-note">${TACTICS[k].note}</span>
      ${tacticTrade(k) ? `<span class="tactic-trade">${tacticTrade(k)}</span>` : ''}
    </button>`).join('');
  row.querySelectorAll('.tactic-chip').forEach(btn =>
    btn.addEventListener('click', () => setTacticSelection(btn.dataset.tactic)));
}

function setTacticSelection(key) {
  _selectedTactic = tacticOf(key);
  document.querySelectorAll('.tactic-chip').forEach(c =>
    c.classList.toggle('selected', c.dataset.tactic === _selectedTactic));
  refreshFormationPreview();
}

function refreshFormationPreview() {
  const preview = document.getElementById('formation-preview');
  if (preview) preview.innerHTML = miniPitchHTML(formationSlots(_selectedFormationKey, _selectedTactic));
}

// The dot for the man the tactic moved is marked, so the choice is visible on
// the preview and not just in the label.
function miniPitchHTML(slots) {
  const list = Array.isArray(slots) ? slots : (slots && slots.slots) || [];
  const dots = list.map(s =>
    `<div class="mini-dot ${s.pos === 'GK' ? 'gk' : ''}${
      s.role ? ' mini-role' : ''}" style="left:${s.x}%;top:${s.y}%"></div>`
  ).join('');
  return `<div class="mini-pitch-inner">${dots}</div>`;
}

// ─── Era Slider UI ─────────────────────────────────────────────────────────────
function initEraSlider() {
  const minR = document.getElementById('era-min-r');
  const maxR = document.getElementById('era-max-r');
  if (!minR || !maxR) return;
  minR.min = YEAR_MIN; minR.max = YEAR_MAX; minR.value = state.eraMin;
  maxR.min = YEAR_MIN; maxR.max = YEAR_MAX; maxR.value = state.eraMax;

  minR.addEventListener('input', () => {
    if (+minR.value > +maxR.value) minR.value = maxR.value;
    state.eraMin = +minR.value;
    updateEraPresetHighlight();
    updateEraUI();
  });
  maxR.addEventListener('input', () => {
    if (+maxR.value < +minR.value) maxR.value = minR.value;
    state.eraMax = +maxR.value;
    updateEraPresetHighlight();
    updateEraUI();
  });
  minR.addEventListener('mousedown',  () => { minR.style.zIndex = 3; maxR.style.zIndex = 2; });
  maxR.addEventListener('mousedown',  () => { maxR.style.zIndex = 3; minR.style.zIndex = 2; });
  minR.addEventListener('touchstart', () => { minR.style.zIndex = 3; maxR.style.zIndex = 2; }, { passive: true });
  maxR.addEventListener('touchstart', () => { maxR.style.zIndex = 3; minR.style.zIndex = 2; }, { passive: true });
  updateEraUI();
}

function updateEraUI() {
  const minV = state.eraMin, maxV = state.eraMax;
  const range = YEAR_MAX - YEAR_MIN || 1;
  const minPct = (minV - YEAR_MIN) / range * 100;
  const maxPct = (maxV - YEAR_MIN) / range * 100;
  const fill = document.getElementById('era-fill');
  if (fill) { fill.style.left = minPct + '%'; fill.style.width = (maxPct - minPct) + '%'; }
  const count = ALL_SEASON_YEARS.filter(y => y >= minV && y <= maxV).length;
  const countEl = document.getElementById('era-lbl-count');
  if (countEl) countEl.textContent = `${count} עונות`;
  const minLbl = document.getElementById('era-lbl-min');
  const maxLbl = document.getElementById('era-lbl-max');
  if (minLbl) minLbl.textContent = yearToSeason(minV);
  if (maxLbl) maxLbl.textContent = yearToSeason(maxV);
}

function setEraPreset(era) {
  const presets = {
    all:    { min: YEAR_MIN,                    max: YEAR_MAX },
    '2000s':{ min: Math.max(2003, YEAR_MIN),    max: YEAR_MAX },
    '2010s':{ min: Math.max(2010, YEAR_MIN),    max: YEAR_MAX },
    modern: { min: Math.max(2016, YEAR_MIN),    max: YEAR_MAX },
  };
  const p = presets[era] ?? presets.all;
  state.eraMin = p.min; state.eraMax = p.max;
  const minR = document.getElementById('era-min-r');
  const maxR = document.getElementById('era-max-r');
  if (minR) minR.value = p.min;
  if (maxR) maxR.value = p.max;
  document.querySelectorAll('.era-btn').forEach(b => b.classList.toggle('selected', b.dataset.era === era));
  updateEraUI();
}

function updateEraPresetHighlight() {
  const presets = {
    all:    { min: YEAR_MIN,                 max: YEAR_MAX },
    '2000s':{ min: Math.max(2003, YEAR_MIN), max: YEAR_MAX },
    '2010s':{ min: Math.max(2010, YEAR_MIN), max: YEAR_MAX },
    modern: { min: Math.max(2016, YEAR_MIN), max: YEAR_MAX },
  };
  let matched = null;
  Object.entries(presets).forEach(([era, p]) => {
    if (state.eraMin === p.min && state.eraMax === p.max) matched = era;
  });
  document.querySelectorAll('.era-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.era === matched)
  );
}

function selectOption(rowId, val) {
  document.querySelectorAll(`#${rowId} .opt-btn`).forEach(btn =>
    btn.classList.toggle('selected', btn.dataset.val === val)
  );
}

// ─── Opponents-league selector ("era opponents") ───────────────────────────────
function resolveOppSeason(choice) {
  if (choice === 'random') return ALL_SEASON_YEARS[Math.floor(Math.random() * ALL_SEASON_YEARS.length)];
  const y = parseInt(choice);
  return Number.isFinite(y) && ALL_SEASON_YEARS.includes(y) && y !== LATEST_SEASON_YEAR ? y : null;
}

function oppLeagueStrength(year) {
  const teams = simTeamsForSeason(year);
  return teams.reduce((s, t) => s + t.ovr, 0) / teams.length;
}

// tercile tag of a season's league strength across all seasons
function oppStrengthTag(year) {
  const all = ALL_SEASON_YEARS.map(y => oppLeagueStrength(y)).sort((a, b) => a - b);
  const v = oppLeagueStrength(year);
  const t = (typeof siteText === 'function') ? siteText : (_k, d) => d;
  if (v >= all[Math.ceil(all.length * 2 / 3)]) return t('opp-tag-hard', '🔥 מהקשות בהיסטוריה');
  if (v <= all[Math.floor(all.length / 3) - 1]) return t('opp-tag-soft', '🌱 מהנוחות בהיסטוריה');
  return t('opp-tag-mid', 'עוצמה ממוצעת');
}

function initOppSeasonSelect() {
  const sel = document.getElementById('opp-season-sel');
  if (!sel) return;
  if (!sel.options.length) {
    const add = (v, label) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = label;
      sel.appendChild(o);
    };
    add('latest', `עדכנית — ${yearToSeason(LATEST_SEASON_YEAR)}`);
    add('random', '🎲 עונה אקראית');
    [...ALL_SEASON_YEARS].reverse().forEach(y => {
      if (y !== LATEST_SEASON_YEAR) add(String(y), `ליגת ${yearToSeason(y)}`);
    });
    sel.onchange = () => { updateOppSeasonNote(); updateLeagueFormatNote(); };
  }
  updateOppSeasonNote();
  initLeagueFormatSelect();
}

function updateOppSeasonNote() {
  const sel = document.getElementById('opp-season-sel');
  const note = document.getElementById('opp-season-note');
  if (!sel || !note) return;
  const t = (typeof siteText === 'function') ? siteText : (_k, d) => d;
  if (sel.value === 'random') { note.textContent = t('opp-note-random', 'כל עונה חדשה מגרילה ליגת יריבות אחרת'); return; }
  const y = sel.value === 'latest' ? LATEST_SEASON_YEAR : parseInt(sel.value);
  note.textContent = `${t('opp-note-strength', 'עוצמת הליגה')}: ${oppLeagueStrength(y).toFixed(1)} · ${oppStrengthTag(y)}`;
}

// ─── League-format selector ───────────────────────────────────────────────────
function initLeagueFormatSelect() {
  const sel = document.getElementById('league-format-sel');
  if (!sel) return;
  if (!sel.onchange) sel.onchange = updateLeagueFormatNote;
  updateLeagueFormatNote();
}

function updateLeagueFormatNote() {
  const sel  = document.getElementById('league-format-sel');
  const note = document.getElementById('league-format-note');
  if (!sel || !note) return;
  const oppSel = document.getElementById('opp-season-sel');
  const raw = oppSel ? oppSel.value : 'latest';
  const parsed = parseInt(raw);
  const y = Number.isFinite(parsed) ? parsed : null;   // 'latest'/'random'/empty → current season
  const spec = formatSpecFor(sel.value, y ?? LATEST_SEASON_YEAR);
  if (raw === 'random' && sel.value !== 'modern') {
    note.textContent = 'כל עונה שתוגרל תשוחק בפורמט שהיה בה באמת';
    return;
  }
  const season = yearToSeason(y ?? LATEST_SEASON_YEAR);
  note.textContent = (sel.value === 'modern' ? 'הפורמט של היום: ' : `הפורמט של ${season}: `) + formatLabel(spec);
}

function beginDraft() {
  if (!_selectedFormationKey) setFormationSelection('4-3-3');

  const diffEl      = document.querySelector('#diff-row .opt-btn.selected');
  const ratingsEl   = document.querySelector('#ratings-row .opt-btn.selected');
  const draftModeEl = document.querySelector('#draftmode-row .opt-btn.selected');
  const peakModeEl  = document.querySelector('#peakmode-row .opt-btn.selected');

  state.difficulty  = diffEl?.dataset.val ?? 'normal';
  state.showRatings = (ratingsEl?.dataset.val ?? 'on') === 'on';
  state.draftMode   = draftModeEl?.dataset.val ?? 'squad-first';
  state.peakMode    = (peakModeEl?.dataset.val ?? 'off') === 'on';
  // set by the salary-cap card on the setup screen; a plain draft clears it
  state.salaryCap   = !!_salaryCapPick;
  const classicPick = (document.querySelector('#mode-row .opt-btn.selected')?.dataset.val ?? 'full') === 'classic';
  state.formationId = _selectedFormationKey;
  const tacticPick  = (!classicPick && formationTactical(_selectedFormationKey)) ? _selectedTactic : 'bal';
  state.challenge   = null; state.challengeDeck = null; state.challengeReqs = null;   // the setup screen never starts a challenge run

  // Opponents league — league drafts always face the latest season (shared fairness)
  const oppChoice = state.leagueCode ? 'latest'
    : (document.getElementById('opp-season-sel')?.value ?? 'latest');
  state.oppSeasonChoice = oppChoice;
  state.oppSeason = resolveOppSeason(oppChoice);
  // League/duel drafts stay on the modern format so every member plays the same
  // 36-game season; free play may pick the classic 33.
  state.leagueFormat = (state.leagueCode || state.duelCode) ? 'modern'
    : formatOf(document.getElementById('league-format-sel')?.value);

  beginDraftWithState({ classic: classicPick, tactic: tacticPick });
}

// Starts the draft from whatever is already in `state` (formation, difficulty,
// era, ratings, peak, challenge/deck) — used by beginDraft after reading the
// setup screen, and directly by the challenges which lock everything.
function beginDraftWithState(style) {
  // `state` is shared by every mode, so a field nobody sets is a field that
  // carries over. The challenge, the gauntlet and the daily deck each set every
  // other setting by hand for exactly that reason — and a style left behind
  // would have been worse than a stale toggle: a daily challenge played in
  // classic is a different simulation from everyone else's, scored on the same
  // board. So the style is an ARGUMENT with a safe default, and a caller that
  // wants something else has to say so.
  state.classic = !!(style && style.classic);
  state.tactic  = tacticOf(style && style.tactic);

  const rerolls = { easy:3, normal:1, hard:0 };
  state.teamRerollsLeft   = rerolls[state.difficulty] ?? 1;
  state.seasonRerollsLeft = rerolls[state.difficulty] ?? 1;
  state.slots          = formationSlots(state.formationId, state.tactic);
  state.picks          = new Array(state.slots.length).fill(null);
  state.currentRound   = 0;
  state.usedSquadIds   = new Set();
  state.usedPlayerKeys = new Set();
  state.selectedPlayer = null; state.selectedSlotIdx = null;
  state.isAnimating = false; state.awaitingSlotPick = false;
  state.moveMode = false; state.movingFromIdx = null;
  const moveBtn = document.getElementById('btn-move-player');
  if (moveBtn) { moveBtn.style.display = 'none'; moveBtn.classList.remove('move-active'); moveBtn.textContent = '⇄ הזז שחקן'; }

  const banner = document.getElementById('peak-mode-banner');
  if (banner) banner.style.display = state.peakMode ? 'block' : 'none';
  const ovrDisp = document.getElementById('draft-ovr-display');
  if (ovrDisp) ovrDisp.style.display = 'none';
  // clear any leftover strength bars from a previous draft
  const ovrLines = document.getElementById('draft-ovr-lines');
  if (ovrLines) { ovrLines.innerHTML = ''; ovrLines.style.display = 'none'; }

  buildPitch('pitch-slots', true);
  if (typeof updateChallengeReqsUI === 'function') updateChallengeReqsUI();
  showScreen('draft');
  startRound();
}

// ─── Draft persistence: survives refresh, cleared only by the reset buttons ────
const DRAFT_SAVE_KEY = '36-0-draft';

function saveDraftState() {
  if (!state.slots.length) return;
  try {
    localStorage.setItem(DRAFT_SAVE_KEY, JSON.stringify({
      v: 1,
      formationId: state.formationId,
      tactic: state.tactic || 'bal',
      classic: !!state.classic,
      leagueCode: state.leagueCode || null,
      career: state.career || null,
      mgw: state.mgw || null,
      deckIds: state.deck ? state.deck.map(sq => sq.id) : null,
      challenge: state.challenge || null,
      challengeReqs: state.challengeReqs || null,
      difficulty: state.difficulty,
      showRatings: state.showRatings,
      draftMode: state.draftMode,
      peakMode: state.peakMode,
      eraMin: state.eraMin,
      eraMax: state.eraMax,
      oppSeason: state.oppSeason,
      oppSeasonChoice: state.oppSeasonChoice,
      leagueFormat: state.leagueFormat,
      currentRound: state.currentRound,
      teamRerollsLeft: state.teamRerollsLeft,
      seasonRerollsLeft: state.seasonRerollsLeft,
      awaitingSlotPick: state.awaitingSlotPick,
      selectedSlotIdx: state.selectedSlotIdx,
      // The challenge deck is drawn fresh per attempt, so it can no longer be
      // rebuilt from the key — it has to be stored, or a refresh mid-draft would
      // deal a different remaining eleven.
      challengeDeckIds: state.challengeDeck ? state.challengeDeck.map(sq => sq.id) : null,
      usedSquadIds: [...state.usedSquadIds],
      usedPlayerKeys: [...state.usedPlayerKeys],
      currentSquadId: state.currentSquad?.id ?? null,
      picks: state.picks.map(p => p ? { squadId: p.squad.id, name: p.player.name } : null),
    }));
  } catch (e) { /* storage blocked/full — persistence is best-effort */ }
}

function clearDraftState() {
  try { localStorage.removeItem(DRAFT_SAVE_KEY); } catch (e) {}
}

// Attach the simulated season to the saved draft, so a refresh replays the
// exact same result instead of allowing a fresh simulation.
function saveSeasonState(season) {
  try {
    const raw = localStorage.getItem(DRAFT_SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    d.season = {
      ovr: season.ovr,
      engine: season.engine ?? 1,   // seasons saved before the V2 cutover have none
      matches: season.matches,
      inTopSix: season.inTopSix,
      format: season.format ?? 'modern',
      formatSpec: season.formatSpec ?? null,   // {year, mode} — replays in the right format
      groupIdx: season.groupIdx ?? null,
      // Without this a refreshed season renders "מקום undefined" in the projected
      // tile, and the verdict silently falls through to "בדיוק כצפוי" because both
      // comparisons against undefined are false.
      projectedFinish: season.projectedFinish ?? null,
      projectedPoints: season.projectedPoints ?? null,
      leagueTable: season.leagueTable,
      playerStats: season.playerStats.map(({ squad, ...rest }) => rest),
    };
    // A new season means last season's European campaign is void — it belonged
    // to a squad and a finishing position that no longer exist.
    delete d.europe;
    if (typeof _euCampaign !== 'undefined') _euCampaign = null;
    localStorage.setItem(DRAFT_SAVE_KEY, JSON.stringify(d));
  } catch (e) {}
}

// Returns true if a saved draft was found and the UI was rebuilt from it
function restoreDraftState() {
  let d;
  try { d = JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY)); } catch (e) { return false; }
  if (!d || d.v !== 1 || !FORMATIONS[d.formationId]) return false;
  // A challenge draft whose period rolled over is void — the challenge changed.
  // An archive run is the exception: its key is a past day on purpose, so it
  // must survive a refresh like any other draft.
  if (d.challenge && !d.challenge.archive && typeof challengeKey === 'function' &&
      d.challenge.key !== challengeKey(d.challenge.period)) {
    clearDraftState();
    return false;
  }
  const tactic = tacticOf(d.tactic);
  const classic = d.classic === true;
  const slots = formationSlots(d.formationId, tactic);
  if (!Array.isArray(d.picks) || d.picks.length !== slots.length) return false;

  const bySquadId = new Map(SQUADS.map(s => [s.id, s]));
  const picks = d.picks.map(p => {
    if (!p) return null;
    const squad = bySquadId.get(p.squadId);
    const player = squad?.players.find(x => x.name === p.name);
    return squad && player ? { player, squad } : null;
  });
  // a referenced squad/player no longer exists (data updated since the save)
  if (d.picks.some((p, i) => p && !picks[i])) return false;

  Object.assign(state, {
    formationId: d.formationId, tactic, classic, slots, picks,
    leagueCode: d.leagueCode ?? null,
    career: d.career ?? null,
    mgw: d.mgw ?? null,
    deck: Array.isArray(d.deckIds) ? d.deckIds.map(id => bySquadId.get(id)).filter(Boolean) : null,
    challenge: d.challenge ?? null,
    difficulty: d.difficulty, showRatings: d.showRatings,
    draftMode: d.draftMode, peakMode: d.peakMode,
    eraMin: d.eraMin, eraMax: d.eraMax,
    oppSeason: d.oppSeason ?? null, oppSeasonChoice: d.oppSeasonChoice ?? 'latest',
    leagueFormat: formatOf(d.leagueFormat ?? 'modern'),   // saves from before formats existed were all modern
    currentRound: d.currentRound,
    teamRerollsLeft: d.teamRerollsLeft, seasonRerollsLeft: d.seasonRerollsLeft,
    usedSquadIds: new Set(d.usedSquadIds), usedPlayerKeys: new Set(d.usedPlayerKeys),
    currentSquad: bySquadId.get(d.currentSquadId) ?? null,
    selectedPlayer: null, selectedSlotIdx: null,
    isAnimating: false, awaitingSlotPick: false,
    moveMode: false, movingFromIdx: null,
  });
  // Resume the exact deck this attempt was dealt. Drafts saved before the deck
  // was stored carry no ids, so those fall back to rebuilding it from the key —
  // which is what dealt them in the first place, so they resume correctly too.
  state.challengeReqs = d.challengeReqs ?? null;
  if (!state.challenge || typeof challengeDeckFor !== 'function') {
    state.challengeDeck = null;
  } else if (Array.isArray(d.challengeDeckIds)) {
    const byId = new Map(SQUADS.map(sq => [sq.id, sq]));
    state.challengeDeck = d.challengeDeckIds.map(id => byId.get(id)).filter(Boolean);
  } else {
    state.challengeDeck = challengeDeckFor(
      state.challenge.period, state.challenge.key, state.eraMin, state.eraMax,
      state.challengeReqs, chalRng(`chal|${state.challenge.period}|${state.challenge.key}|deck`));
  }

  // a draft resumed from storage is a mode being played, even though nobody
  // clicked a start button this visit
  if (typeof track === 'function') track('open', trackDraftMode());

  const banner = document.getElementById('peak-mode-banner');
  if (banner) banner.style.display = state.peakMode ? 'block' : 'none';
  const moveBtn = document.getElementById('btn-move-player');
  if (moveBtn) moveBtn.style.display = picks.some(Boolean) ? '' : 'none';

  buildPitch('pitch-slots', true);
  refreshAllTokens();
  updateProgress(); updateRerollButtons(); updateDraftOVR();

  // Draft finished — resume at the results (same season, no re-roll) or preseason
  if (state.currentRound >= slots.length) {
    if (d.season) {
      window._restoredSeason = d.season;
      showResults();
    } else {
      showPreseason(teamOVR());
    }
    return true;
  }

  showScreen('draft');
  if (state.draftMode === 'pos-first' && state.currentSquad &&
      d.selectedSlotIdx != null && !state.picks[d.selectedSlotIdx]) {
    // mid pos-first round: slot already chosen, squad already drawn
    state.selectedSlotIdx = d.selectedSlotIdx;
    setTokenHighlight(d.selectedSlotIdx, 'selected');
    showSquadCardData(state.currentSquad);
    renderSquadPlayers(state.currentSquad, d.selectedSlotIdx);
    setHint(`בחר שחקן עבור: ${slots[d.selectedSlotIdx].label}`);
  } else if (state.draftMode !== 'pos-first' && state.currentSquad) {
    showSquadCardData(state.currentSquad);
    renderSquadPlayers(state.currentSquad);
    setHint('בחר שחקן מהרשימה');
  } else {
    startRound();
  }
  return true;
}

// ─── Pitch builder ─────────────────────────────────────────────────────────────
// Markup shared by every filled token (draft pitch, pre-season, results) so the
// three surfaces can't drift apart. showOvr is false wherever hiding ratings is
// the point of the run.
function filledTokenHTML(player, squad, showOvr, slotPos) {
  const team    = getTeam(squad.teamId);
  const peakTag = state.peakMode && player.peak_ovr && player.peak_ovr > player.ovr ? '⚡' : '';
  const ovrHTML = showOvr ? `<span class="slot-ovr">${peakTag}${playerOVR(player)}</span>` : '';
  // A man covering out of his position is worth 7% less to the team, and until
  // now nothing on screen said so — the circle read 88 while the line bar used
  // 82, and the arithmetic looked broken to anyone who checked it.
  let oopHTML = '';
  if (slotPos != null && !inNaturalPos(player, slotPos)) {
    const own = (POS_HE[playerPositions(player)[0]] ?? playerPositions(player)[0]);
    const here = (POS_HE[slotPos] ?? slotPos);
    const eff = Math.round(playerOVR(player) * OUT_OF_POS);
    const why = showOvr
      ? `${own} בעמדת ${here} — נספר כ-${eff}`
      : `${own} בעמדת ${here} — לא בעמדה הטבעית שלו`;
    oopHTML = `<span class="slot-oop" title="${why}">⇄</span>`;
  }
  // No ⓘ here, deliberately. The whole token — 73x63 on a phone, with the next
  // one 14px away — is the target for moving a man, so any button placed on it
  // is stolen from that. The card is reached by holding the token instead; see
  // js/player-card.js.
  return `
    <div class="slot-circle filled-circle${oopHTML ? ' circle-oop' : ''}">
      ${ovrHTML}${oopHTML}
      <span class="slot-player-short">${playerShortName(player.name)}</span>
    </div>
    <div class="slot-name-label">${player.name}</div>
    <div class="slot-meta"><span class="slot-meta-season">${squad.season}</span> · ${clubShortName(team.name)}</div>
  `;
}

function buildPitch(containerId, clickable) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  state.slots.forEach((slot, idx) => {
    const token = document.createElement('div');
    token.className = 'slot-token empty';
    token.id = `token-${containerId}-${idx}`;
    token.style.left = slot.x + '%';
    token.style.top  = slot.y + '%';
    token.dataset.idx = idx;
    token.innerHTML = `
      <div class="slot-circle">
        <span class="slot-pos-label">${slot.role ?? slot.pos}</span>
      </div>
      <div class="slot-name-label">${slot.label}</div>
    `;
    if (clickable) token.addEventListener('click', () => handleSlotClick(idx));
    container.appendChild(token);
  });
  // Rebuilding the pitch wipes it, so whatever chemistry was drawn under the old
  // XI has to go with it. Doing this here rather than at each call site is the
  // point: a fresh draft forgot to, and the line still read "5 צמדים בהרכב"
  // over eleven empty circles.
  if (containerId === 'pitch-slots') chemPaint();
}

function getToken(idx) {
  return document.getElementById(`token-pitch-slots-${idx}`);
}

function fillToken(idx, player, squad) {
  const token = getToken(idx);
  if (!token) return;
  const team = getTeam(squad.teamId);
  token.className = 'slot-token filled';
  token.style.setProperty('--tc', team.primaryColor);
  token.style.setProperty('--ts', team.secondaryColor);
  token.style.setProperty('--tx', textColorFor(team.primaryColor));
  token.innerHTML = filledTokenHTML(player, squad, state.showRatings, state.slots[idx] && state.slots[idx].pos);
  chemPaint();                     // a new man can complete a pair with anyone
  fitShortNames(token);
}

// Fit token short-names inside their circle. First try a single line at a
// readable size; if the name is still too long (small mobile circles), WRAP
// it to up to two lines instead of shrinking into unreadable territory or
// cutting it to "אבוק…" — no ellipsis, ever.
function fitShortNames(root = document) {
  root.querySelectorAll('.slot-circle').forEach(circle => {
    const span = circle.querySelector('.slot-player-short');
    if (!span) return;
    const max  = circle.clientWidth - 6;
    const maxH = circle.clientHeight - 4;
    if (max <= 0) return; // hidden screen — fitted again when shown
    // reset to a single line at the CSS font size
    span.style.maxWidth = 'none';
    span.style.fontSize = '';
    span.style.whiteSpace = 'nowrap';
    span.style.wordBreak = '';
    span.style.lineHeight = '';
    span.style.textAlign = '';
    let size = parseFloat(getComputedStyle(span).fontSize) || 8;
    while (size > 7 && span.scrollWidth > max) {
      size -= 0.5;
      span.style.fontSize = size + 'px';
    }
    if (span.scrollWidth <= max) return;
    // A single word has nowhere to break, so break-word splits it mid-name:
    // "שטראובר" came out as "שטרא / ובר". Shrink it further instead — smaller is
    // always better than a name cut in half.
    if (!/\s/.test(span.textContent.trim())) {
      while (size > 5 && span.scrollWidth > max) {
        size -= 0.5;
        span.style.fontSize = size + 'px';
      }
      return;
    }
    // more than one word — a line break can fall in a space
    span.style.whiteSpace = 'normal';
    span.style.wordBreak = 'keep-all';
    span.style.lineHeight = '1.05';
    span.style.textAlign = 'center';
    span.style.maxWidth = max + 'px';
    while (size > 4.5 && (span.scrollHeight > maxH || span.scrollWidth > max)) {
      size -= 0.5;
      span.style.fontSize = size + 'px';
    }
  });
}

function setTokenHighlight(idx, type) {
  const token = getToken(idx);
  if (!token) return;
  token.classList.remove('highlight-compat','highlight-selected','highlight-incompat');
  if (type) token.classList.add(`highlight-${type}`);
}

function clearAllHighlights() {
  state.slots.forEach((_,i) => setTokenHighlight(i, null));
  document.querySelectorAll('.player-card').forEach(c =>
    c.classList.remove('card-selected','card-compat','card-incompat')
  );
}

// ─── Move mode ─────────────────────────────────────────────────────────────────
// Move mode only touches pitch tokens, so it stays usable during the roulette animation
function toggleMoveMode() {
  state.moveMode = !state.moveMode;
  state.movingFromIdx = null;
  if (state.moveMode) {
    state.selectedPlayer = null;
    clearAllHighlights();
    setHint('בחר שחקן שברצונך להזיז');
  } else {
    clearAllHighlights();
    const hint = state.awaitingSlotPick ? 'בחר עמדה במגרש'
               : state.currentSquad    ? 'בחר שחקן מהרשימה'
                                       : 'ממתין להגרלה...';
    setHint(hint);
  }
  updateMoveButton();
}

function updateMoveButton() {
  const btn = document.getElementById('btn-move-player');
  if (!btn) return;
  btn.classList.toggle('move-active', state.moveMode);
  btn.textContent = state.moveMode ? '✕ בטל הזזה' : '⇄ הזז שחקן';
}

// Restore the default hint (and pos-first slot highlights) after a move ends
function restoreAfterMove() {
  if (state.awaitingSlotPick) {
    emptySlotIndices().forEach(i => setTokenHighlight(i, 'compat'));
    setHint('בחר עמדה במגרש');
  } else if (state.moveMode) {
    setHint('בחר שחקן נוסף להזזה, או לחץ ⇄ לסיום');
  } else {
    setHint(state.currentSquad ? 'בחר שחקן מהרשימה' : 'ממתין להגרלה...');
  }
}

// Highlight the source token and every slot the player at fromIdx can move to
function highlightMoveTargets(fromIdx) {
  setTokenHighlight(fromIdx, 'selected');
  const movingPlayer = state.picks[fromIdx].player;
  const srcSlotPos = state.slots[fromIdx].pos;
  state.slots.forEach((sl, i) => {
    if (i === fromIdx) return;
    if (!playerFitsSlot(movingPlayer, sl.pos)) return;
    if (state.picks[i]) {
      if (playerFitsSlot(state.picks[i].player, srcSlotPos)) setTokenHighlight(i, 'compat');
    } else {
      setTokenHighlight(i, 'compat');
    }
  });
}

function handleMoveClick(slotIdx) {
  if (state.movingFromIdx === null) {
    if (!state.picks[slotIdx]) { setHint('בחר שחקן קיים להזזה'); return; }
    state.movingFromIdx = slotIdx;
    state.selectedPlayer = null;
    clearAllHighlights();
    highlightMoveTargets(slotIdx);
    // The hold gesture is invisible until someone is told about it, and this is
    // the moment they are looking at a placed player anyway.
    const holdTip = (typeof pcHasHover === 'function' && !pcHasHover() && !classicMode())
      ? ' · לחיצה ארוכה = הכרטיס שלו' : '';
    setHint('בחר עמדה מוארת — לחץ שוב על השחקן לביטול' + holdTip);
  } else {
    const fromIdx = state.movingFromIdx;
    state.movingFromIdx = null;
    if (slotIdx === fromIdx) {
      clearAllHighlights();
      restoreAfterMove();
      return;
    }
    const validTarget = playerFitsSlot(state.picks[fromIdx].player, state.slots[slotIdx].pos);
    const validSwap = !state.picks[slotIdx] ||
      playerFitsSlot(state.picks[slotIdx].player, state.slots[fromIdx].pos);
    if (!validTarget || !validSwap) {
      if (state.picks[slotIdx]) { handleMoveClick(slotIdx); return; } // switch selection to the clicked player
      clearAllHighlights();
      setHint('⚠ שחקן זה לא יכול לשחק בעמדה זו — בחר מחדש');
      return;
    }
    if (state.picks[slotIdx]) {
      [state.picks[fromIdx], state.picks[slotIdx]] = [state.picks[slotIdx], state.picks[fromIdx]];
    } else {
      state.picks[slotIdx] = state.picks[fromIdx];
      state.picks[fromIdx] = null;
    }
    refreshAllTokens();
    clearAllHighlights();
    updateDraftOVR();
    saveDraftState();
    // Re-render the player list so freed/filled slots are reflected in availability
    // (skip mid-animation — the roulette's onDone re-renders anyway)
    if (state.currentSquad && !state.isAnimating) {
      const filterSlot = state.draftMode === 'pos-first' ? state.selectedSlotIdx : null;
      renderSquadPlayers(state.currentSquad, filterSlot);
    }
    restoreAfterMove();
  }
}

function refreshAllTokens() {
  state.slots.forEach((slot, idx) => {
    const token = getToken(idx);
    if (!token) return;
    if (state.picks[idx]) {
      const { player, squad } = state.picks[idx];
      const team = getTeam(squad.teamId);
      token.className = 'slot-token filled';
      token.style.setProperty('--tc', team.primaryColor);
      token.style.setProperty('--ts', team.secondaryColor);
      token.style.setProperty('--tx', textColorFor(team.primaryColor));
      token.innerHTML = filledTokenHTML(player, squad, state.showRatings, slot.pos);
    } else {
      token.className = 'slot-token empty';
      token.style.removeProperty('--tc');
      token.style.removeProperty('--ts');
      token.innerHTML = `
        <div class="slot-circle"><span class="slot-pos-label">${slot.role ?? slot.pos}</span></div>
        <div class="slot-name-label">${slot.label}</div>
      `;
    }
  });
  chemPaint();
  fitShortNames();
}

// One entry point for everything chemistry draws on the draft screen: the rings,
// the +N on each rating, and the line under the pitch.
function chemPaint() {
  if (classicMode()) {
    const el = document.getElementById('chem-summary');
    if (el) el.innerHTML = '';
    return;
  }
  if (typeof chemPaintTokens !== 'function') return;
  chemPaintTokens('pitch-slots');
  if (typeof chemRenderSummary === 'function') chemRenderSummary('chem-summary');
}

// ─── Draft: Round management ───────────────────────────────────────────────────
function getEraFilteredSquads() {
  const filtered = SQUADS.filter(sq => {
    const y = parseSeasonYear(sq.season);
    return y >= state.eraMin && y <= state.eraMax;
  });
  return filtered.length > 0 ? filtered : SQUADS;
}

// Challenge mode: draw the first deck squad that isn't used yet (and matches
// the optional filter). The deck order is the same for everyone, and
// usedSquadIds is persisted — a refresh resumes at the same point in the deck.
function challengeDrawNext(filter) {
  const deck = state.challengeDeck ?? [];
  let sq = deck.find(s => !state.usedSquadIds.has(s.id) && (!filter || filter(s)));
  if (!sq) sq = deck.find(s => !filter || filter(s));   // deck exhausted — allow reuse
  if (!sq) return null;
  state.usedSquadIds.add(sq.id);
  return sq;
}

function pickNextSquad() {
  // A fixed deck (כדורדל): everyone is dealt the same clubs in the same order,
  // so the only thing that separates two players is who they took out of them.
  if (state.deck && state.deck.length) {
    const sq = state.deck[Math.min(state.currentRound, state.deck.length - 1)];
    if (sq) { state.usedSquadIds.add(sq.id); return sq; }
  }
  if (state.challenge && state.challengeDeck) {
    const sq = challengeDrawNext();
    if (sq) return sq;
  }
  const pool = getEraFilteredSquads();
  let unused = pool.filter(sq => !state.usedSquadIds.has(sq.id));
  // A career season drafts out of ONE season's clubs — twelve to sixteen of
  // them. Barring repeats there would leave the last rounds with a single club
  // and no choice at all, so once the market thins out the clubs come back.
  if (state.career && unused.length < 4) { state.usedSquadIds.clear(); unused = pool; }
  const draw = unused.length > 0 ? unused : pool;
  const sq = draw[rand(0, draw.length - 1)];
  state.usedSquadIds.add(sq.id);
  return sq;
}

function startRound() {
  state.selectedPlayer = null; state.selectedSlotIdx = null;
  clearAllHighlights();
  // A move started while the previous pick was settling — keep it alive
  if (state.movingFromIdx !== null && state.picks[state.movingFromIdx]) {
    highlightMoveTargets(state.movingFromIdx);
  } else {
    state.movingFromIdx = null;
  }
  updateProgress(); updateRerollButtons();

  if (state.draftMode === 'pos-first') {
    state.awaitingSlotPick = true;
    state.currentSquad = null;
    document.getElementById('players-list').innerHTML = '';
    document.getElementById('card-badge').textContent = '⚽';
    document.getElementById('card-team-name').textContent = 'בחר עמדה...';
    document.getElementById('card-season').textContent = '';
    document.getElementById('squad-card-header').style.background = '#1a1a2e';
    emptySlotIndices().forEach(i => setTokenHighlight(i, 'compat'));
    setHint('בחר עמדה במגרש');
  } else {
    state.awaitingSlotPick = false;
    const squad = pickNextSquad();
    state.currentSquad = squad;
    document.getElementById('players-list').innerHTML = '';
    animateRoulette(squad, () => {
      renderSquadPlayers(squad);
      setHint('בחר שחקן מהרשימה');
    });
  }
  saveDraftState();
}

function animateRoulette(finalSquad, onDone) {
  state.isAnimating = true;
  document.getElementById('players-list').innerHTML = '';
  const card = document.getElementById('squad-card');
  card.classList.add('spinning');

  const delays = [
    ...Array(14).fill(55), ...Array(6).fill(110),
    ...Array(4).fill(200), ...Array(2).fill(350), 400,
  ];
  let i = 0;

  function tick() {
    if (i >= delays.length) {
      showSquadCardData(finalSquad);
      card.classList.remove('spinning');
      card.classList.add('landed');
      setTimeout(() => card.classList.remove('landed'), 500);
      state.isAnimating = false;
      onDone();
      return;
    }
    showSquadCardData(SQUADS[rand(0, SQUADS.length - 1)]);
    setTimeout(tick, delays[i++]);
  }
  tick();
}

function showSquadCardData(squad) {
  const team = getTeam(squad.teamId);
  const tx = textColorFor(team.primaryColor);
  document.getElementById('card-badge').textContent = team.badge;
  const nameEl = document.getElementById('card-team-name');
  nameEl.textContent = team.name;
  nameEl.style.color = tx;
  const seasonEl = document.getElementById('card-season');
  seasonEl.textContent = squad.season;
  seasonEl.style.color = tx === '#111' ? '#000000b0' : '#ffffffaa';
  document.getElementById('squad-card-header').style.background =
    `linear-gradient(135deg, ${team.primaryColor} 0%, #1a1a2e 100%)`;
}

// ─── Draft: Player rendering ───────────────────────────────────────────────────
const POS_ORDER = ['GK','RB','CB','LB','CDM','CM','CAM','RM','LM','RW','LW','CF','ST'];

function renderSquadPlayers(squad, filterSlotIdx = null) {
  const list = document.getElementById('players-list');
  list.innerHTML = '';
  const players = [...squad.players];
  if (state.showRatings) {
    players.sort((a,b) => playerOVR(b) - playerOVR(a));
  } else {
    // Hidden ratings: group by position, random order within — so the list
    // order never leaks a player's OVR.
    const rnd = new Map(players.map(p => [p, Math.random()]));
    const rank = p => { const i = POS_ORDER.indexOf(normalizePos(p.position)); return i < 0 ? 99 : i; };
    players.sort((a,b) => (rank(a) - rank(b)) || (rnd.get(a) - rnd.get(b)));
  }

  // Attribute badges are contextual: nationality shows ONLY when the active
  // challenge has a nationality mission (never in regular play or other
  // challenges). The second citizenship "doesn't exist" for the game — it's
  // shown and counted only when the mission explicitly opted in (dual).
  const activeNats = (typeof challengeActiveNats === 'function') ? challengeActiveNats() : [];
  const dualNats = (typeof challengeDualNatsActive === 'function') && challengeDualNatsActive();

  // Check if any player in this squad can fill a remaining slot
  const anyAvailable = players.some(player => {
    if (state.usedPlayerKeys.has(player.name)) return false;
    if (filterSlotIdx !== null && !playerFitsSlot(player, state.slots[filterSlotIdx].pos)) return false;
    return compatibleEmptySlots(player).length > 0;
  });

  // Auto-reroll if no one fits — counts as free (don't spend a reroll)
  if (!anyAvailable && !state.isAnimating) {
    setHint('אין שחקן מתאים — מגריל קבוצה חדשה...');
    setTimeout(() => {
      const newSquad = pickNextSquad();
      state.currentSquad = newSquad;
      saveDraftState();
      animateRoulette(newSquad, () => {
        renderSquadPlayers(newSquad, filterSlotIdx);
        if (filterSlotIdx !== null) setHint(`בחר שחקן עבור: ${state.slots[filterSlotIdx].label}`);
        else setHint('בחר שחקן מהרשימה');
      });
    }, 800);
    return;
  }

  players.forEach(player => {
    if (filterSlotIdx !== null && !playerFitsSlot(player, state.slots[filterSlotIdx].pos)) return;
    const isUsed    = state.usedPlayerKeys.has(player.name);
    const hasSlot   = compatibleEmptySlots(player).length > 0;
    const unavailable = isUsed || !hasSlot;

    const card = document.createElement('div');
    card.className = 'player-card' + (unavailable ? ' card-unavailable' : '');
    card.dataset.pos = playerPositions(player).join(',');
    const dispOVR = playerOVR(player);
    const peakTag = state.peakMode && player.peak_ovr && player.peak_ovr > player.ovr ? '⚡' : '';
    const ovrHTML = state.showRatings ? `<span class="pc-ovr" dir="ltr">${peakTag}${dispOVR}</span>` : '';
    // salary cap: the price rides beside the rating, so the trade is visible
    // BEFORE the pick rather than after it
    const salHTML = (typeof salChip === 'function') ? salChip(player) : '';
    // Show the player's OWN positions (primary + secondaries from the data),
    // not every slot he could be squeezed into via the compatibility rules.
    const fits = playerPositions(player);
    const posLabel = fits.map(p => POS_HE[p] ?? p).join(' | ');
    const posShort = fits.join(' | ');
    let natHTML = '';
    if (activeNats.length && typeof playerNats === 'function') {
      const nats = dualNats ? playerNats(player.name) : playerNats(player.name).slice(0, 1);
      if (nats.length) {
        const hit = nats.some(n => activeNats.includes(n));
        // real flag images — Windows browsers can't render flag emoji
        const flag = typeof natFlagImg === 'function' ? natFlagImg : () => '';
        const label = nats.map(n => `${flag(n)} ${n}`.trim()).join(' · ');
        natHTML = `<span class="pc-nats${hit ? ' pc-nats-hit' : ''}">${hit ? '🎯 ' : ''}${label}</span>`;
      }
    }
    // A link has to be visible BEFORE the choice, or it is not a decision.
    let chemHTML = '';
    if (!classicMode() && typeof chemPreview === 'function') {
      const link = chemPreview(player, state.picks);
      if (link) {
        const who = typeof playerShortName === 'function' ? playerShortName(link.with) : link.with;
        const plus = state.showRatings === false ? '' : ` +${chemFmt(chemBonusOf(link.tier))}`;
        chemHTML = `<span class="pc-chem chem-t${link.tier}" title="${chemWhy(link)}">🔗 צמד עם ${who}${plus}</span>`;
      }
    }
    // Only the tags that would actually DO something for him, in his own
    // position — the honours and the long-service badges are on his card, and
    // putting them here as well buries the two icons a pick turns on.
    // With a slot already chosen, judge the tags against that slot; otherwise
    // against every position he plays, or a striker filed under CM|ST would show
    // an empty row while his golden boots sit one slot away.
    const tagWhere = filterSlotIdx !== null ? state.slots[filterSlotIdx].pos : fits;
    const tagHTML = (!classicMode() && typeof tagStripHTML === 'function')
      ? tagStripHTML(player.name, tagWhere, 3, true)
      : '';
    // A 7% cut belongs where the decision is made, not on the pitch afterwards.
    // With a slot already chosen we know exactly what he would cost; picking the
    // player first, we only warn when EVERY open slot he fits would dock him,
    // because otherwise it is still his own choice to place him properly.
    let oopHTML = '';
    if (!unavailable) {
      const targets = filterSlotIdx !== null
        ? [state.slots[filterSlotIdx].pos]
        : compatibleEmptySlots(player).map(i => state.slots[i].pos);
      if (targets.length && targets.every(pos => !inNaturalPos(player, pos))) {
        const eff  = Math.round(playerOVR(player) * OUT_OF_POS);
        const cost = state.showRatings === false ? '' : ` ${eff}`;
        const where = filterSlotIdx !== null
          ? `בעמדת ${POS_HE[targets[0]] ?? targets[0]}`
          : 'בכל עמדה פנויה שמתאימה לו';
        const num = state.showRatings === false ? '' : ` — נספר כ-${eff} במקום ${playerOVR(player)}`;
        oopHTML = `<span class="pc-oop" title="${player.name} משחק ${posLabel} · ${where}${num}">⇄${cost}</span>`;
      }
    }
    // On a mouse the whole card is the trigger; on a touch screen there is no
    // hover, so the ⓘ is the way in (and CSS hides it where hover exists).
    const infoHTML = classicMode() ? ''
      : `<button class="pc-info" aria-label="הכרטיס של ${player.name}">ⓘ</button>`;
    card.innerHTML = `
      <span class="pc-pos-badge" title="${posLabel}">${posShort}</span>
      <span class="pc-name">${player.name}${infoHTML}${natHTML}${oopHTML}${tagHTML}${chemHTML}${salHTML}</span>
      ${ovrHTML}
    `;
    if (!unavailable) card.addEventListener('click', () => handlePlayerClick(player, card));
    list.appendChild(card);
  });
}

// ─── Draft: Selection logic ────────────────────────────────────────────────────
function handlePlayerClick(player, cardEl) {
  if (state.isAnimating) return;
  if (state.moveMode) {
    state.moveMode = false;
    clearAllHighlights(); updateMoveButton();
  }
  state.movingFromIdx = null; // clicking a list player cancels a pending move
  if (state.selectedPlayer === player) {
    state.selectedPlayer = null; state.selectedSlotIdx = null;
    clearAllHighlights(); setHint('בחר שחקן מהרשימה'); return;
  }
  state.selectedPlayer = player; state.selectedSlotIdx = null;
  clearAllHighlights(); cardEl.classList.add('card-selected');
  const compatSlots = compatibleEmptySlots(player);
  if (compatSlots.length === 0) { setHint('⚠ אין עמדות ריקות מתאימות'); return; }
  compatSlots.forEach(i => setTokenHighlight(i, 'compat'));
  if (compatSlots.length === 1) { assignPlayer(compatSlots[0], player); return; }
  setHint('בחר עמדה במגרש לשים את השחקן');
}

function handleSlotClick(slotIdx) {
  // A move in progress, move mode, or a click on a placed player → move flow.
  // Clicking a placed player directly highlights the slots he can move to.
  if (state.moveMode || state.movingFromIdx !== null || state.picks[slotIdx]) {
    handleMoveClick(slotIdx);
    return;
  }
  if (state.isAnimating) return;

  if (state.draftMode === 'pos-first' && state.awaitingSlotPick) {
    state.awaitingSlotPick = false; state.selectedSlotIdx = slotIdx;
    clearAllHighlights(); setTokenHighlight(slotIdx, 'selected');
    const squad = pickNextSquad();
    state.currentSquad = squad; updateRerollButtons();
    saveDraftState();
    animateRoulette(squad, () => {
      renderSquadPlayers(squad, slotIdx);
      setHint(`בחר שחקן עבור: ${state.slots[slotIdx].label}`);
    });
    return;
  }

  if (state.selectedPlayer) {
    if (playerFitsSlot(state.selectedPlayer, state.slots[slotIdx].pos)) {
      assignPlayer(slotIdx, state.selectedPlayer);
    } else {
      setHint('⚠ שחקן זה לא יכול לשחק בעמדה זו');
      setTokenHighlight(slotIdx, 'incompat');
      setTimeout(() => setTokenHighlight(slotIdx, 'compat'), 600);
    }
    return;
  }

  // Second click on the same slot deselects it
  if (state.selectedSlotIdx === slotIdx) {
    state.selectedSlotIdx = null;
    clearAllHighlights();
    setHint('בחר שחקן מהרשימה');
    return;
  }

  state.selectedSlotIdx = slotIdx; clearAllHighlights();
  setTokenHighlight(slotIdx, 'selected');
  const compat = COMPAT[state.slots[slotIdx].pos] ?? [state.slots[slotIdx].pos];
  document.querySelectorAll('.player-card').forEach(card => {
    if (card.classList.contains('card-unavailable')) return;
    const fits = card.dataset.pos.split(',').some(p => compat.includes(p));
    card.classList.add(fits ? 'card-compat' : 'card-incompat');
  });
  setHint(`בחר שחקן עבור: ${state.slots[slotIdx].label}`);
}

function assignPlayer(slotIdx, player) {
  // The round is over the moment a player is taken, but the previous squad's
  // list stays on screen for the 400ms before the next roulette starts. Without
  // this the player could take a SECOND player from the same squad, which queues
  // a second startRound: two roulettes then overlap, the first one renders its
  // list while state.currentSquad already holds the second squad, and the next
  // pick gets stamped with the wrong club and season — on the pitch, on the share
  // card, and in the submitted payload. isAnimating already gates picks, slot
  // clicks and both rerolls; animateRoulette re-raises and clears it from here.
  state.isAnimating = true;
  state.picks[slotIdx] = { player, squad: state.currentSquad };
  state.usedPlayerKeys.add(player.name);
  fillToken(slotIdx, player, state.currentSquad);
  clearAllHighlights();
  state.selectedPlayer = null; state.selectedSlotIdx = null;
  state.currentRound++;
  saveDraftState();
  const moveBtn = document.getElementById('btn-move-player');
  if (moveBtn) moveBtn.style.display = '';
  updateDraftOVR();
  if (state.currentRound >= state.slots.length) {
    // Squad complete — no further roulette will run, so release the gate here.
    state.isAnimating = false;
    // A duel draft skips the solo preseason — it submits the squad and waits.
    if (state.duelCode && typeof submitDuelSquad === 'function') setTimeout(() => submitDuelSquad(), 500);
    // a gauntlet draft skips the pre-season too — the XI goes straight into a fight
    else if (state.gauntlet && typeof gtFight === 'function') setTimeout(() => gtFight(), 500);
    else setTimeout(() => showPreseason(teamOVR()), 500);
  } else setTimeout(startRound, 400);
}

function updateDraftOVR() {
  if (typeof updateChallengeReqsUI === 'function') updateChallengeReqsUI();
  if (typeof salSyncBar === 'function') salSyncBar();
  const picked = state.picks.filter(Boolean).length;
  if (picked === 0) return;
  const hidden = !state.showRatings;   // hide numbers until the season is simulated
  const ovr = teamOVR();
  const el = document.getElementById('draft-ovr-display');
  if (el) { el.style.display = 'block'; setEl('draft-ovr-val', hidden ? '???' : ovr); }

  const lines = [
    { id:'dovr-atk', label:'🎯 התקפה', pos: ATK_POS, color:'#f97316' },
    { id:'dovr-mid', label:'⚡ קישור',  pos: MID_POS, color:'#22c55e' },
    { id:'dovr-def', label:'🛡️ הגנה',   pos: DEF_POS, color:'#3b82f6' },
    { id:'dovr-gk',  label:'🧤 שוער',   pos: ['GK'],  color:'#eab308' },
  ];
  const container = document.getElementById('draft-ovr-lines');
  if (!container) return;
  container.style.display = 'block';
  lines.forEach(({ id, label, pos, color }) => {
    const val = calcGroupOVR(pos) === null ? null : shownLineOVR(pos);
    if (val === null) { const row = document.getElementById(id); if (row) row.style.display = 'none'; return; }
    let row = document.getElementById(id);
    if (!row) {
      row = document.createElement('div');
      row.id = id;
      row.className = 'dovr-line';
      container.appendChild(row);
    }
    row.style.display = 'flex';
    const pct      = hidden ? 100 : Math.max(8, Math.min(100, ((val - 55) / 42) * 100));
    const barBg    = hidden ? '#3a3f4b' : color;
    const valText  = hidden ? '???' : val;
    const valColor = hidden ? 'var(--dim)' : color;
    row.innerHTML = `
      <span class="dovr-label">${label}</span>
      <div class="dovr-bar-wrap"><div class="dovr-bar" style="width:${pct}%;background:${barBg}"></div></div>
      <span class="dovr-val" style="color:${valColor}">${valText}</span>
    `;
  });
}

// ─── Rerolls ───────────────────────────────────────────────────────────────────
function rerollTeam() {
  if (state.isAnimating || state.teamRerollsLeft <= 0 || state.awaitingSlotPick) return;
  state.teamRerollsLeft--; updateRerollButtons();
  // In a career the allowance belongs to the dynasty, so it is banked as it is
  // spent rather than reset next season.
  if (state.career && typeof crOnRerollUsed === 'function') crOnRerollUsed(state.teamRerollsLeft);

  const currentTeamId = state.currentSquad?.teamId;
  const currentSeason = state.currentSquad?.season;
  // A player selected from the OLD squad must not carry over to the new one
  cancelPendingSelection();

  let newSquad = null;
  if (state.challenge && state.challengeDeck) {
    // deterministic: the next deck squad from a different team
    newSquad = challengeDrawNext(sq => sq.teamId !== currentTeamId);
  }
  if (!newSquad) {
    const era = getEraFilteredSquads();
    let pool = era.filter(sq => sq.teamId !== currentTeamId && sq.season === currentSeason && !state.usedSquadIds.has(sq.id));
    if (pool.length === 0) pool = era.filter(sq => sq.teamId !== currentTeamId && sq.season === currentSeason);
    if (pool.length === 0) pool = era.filter(sq => sq.teamId !== currentTeamId && !state.usedSquadIds.has(sq.id));
    if (pool.length === 0) pool = era.filter(sq => sq.teamId !== currentTeamId);
    if (pool.length === 0) pool = SQUADS.filter(sq => sq.teamId !== currentTeamId);
    newSquad = pool[rand(0, pool.length - 1)];
  }
  state.usedSquadIds.add(newSquad.id); state.currentSquad = newSquad;
  saveDraftState();

  const filterSlot = state.draftMode === 'pos-first' ? state.selectedSlotIdx : null;
  animateRoulette(newSquad, () => {
    renderSquadPlayers(newSquad, filterSlot);
    setHint(filterSlot !== null ? `בחר שחקן עבור: ${state.slots[filterSlot].label}` : 'בחר שחקן מהרשימה');
  });
}

function rerollSeason() {
  if (state.isAnimating || state.seasonRerollsLeft <= 0 || state.awaitingSlotPick) return;
  const currentTeamId = state.currentSquad?.teamId;
  const era = getEraFilteredSquads();
  const sameTeam = era.filter(sq => sq.teamId === currentTeamId && sq.id !== state.currentSquad?.id);
  if (sameTeam.length === 0) { setHint('⚠ אין עונות נוספות לקבוצה זו בטווח הנבחר'); return; }

  // A player selected from the OLD season must not carry over to the new one
  cancelPendingSelection();
  state.seasonRerollsLeft--; updateRerollButtons();
  let newSquad = null;
  if (state.challenge && state.challengeDeck) {
    // deterministic: the next deck season of the SAME team
    newSquad = challengeDrawNext(sq => sq.teamId === currentTeamId && sq.id !== state.currentSquad?.id);
  }
  if (!newSquad) newSquad = sameTeam[rand(0, sameTeam.length - 1)];
  state.usedSquadIds.add(newSquad.id); state.currentSquad = newSquad;
  saveDraftState();

  const filterSlot = state.draftMode === 'pos-first' ? state.selectedSlotIdx : null;
  animateRoulette(newSquad, () => {
    renderSquadPlayers(newSquad, filterSlot);
    setHint(filterSlot !== null ? `בחר שחקן עבור: ${state.slots[filterSlot].label}` : 'בחר שחקן מהרשימה');
  });
}

// Drop a half-made pick (player selected but not yet placed) and clear its UI —
// used before a reroll so a player from the old squad can't be assigned to the new one.
function cancelPendingSelection() {
  if (state.moveMode) { state.moveMode = false; updateMoveButton(); }
  state.selectedPlayer = null;
  state.movingFromIdx = null;
  if (state.draftMode !== 'pos-first') state.selectedSlotIdx = null;
  clearAllHighlights();
}

function updateRerollButtons() {
  const noSquad = state.awaitingSlotPick;
  document.getElementById('team-reroll-count').textContent   = state.teamRerollsLeft;
  document.getElementById('season-reroll-count').textContent = state.seasonRerollsLeft;
  document.getElementById('btn-reroll-team').disabled   = state.teamRerollsLeft   <= 0 || noSquad;
  // A draft locked to a single season — a career year — has no other season to
  // swap to: the button could only ever redraw the same one.
  const seasonBtn = document.getElementById('btn-reroll-season');
  seasonBtn.style.display = state.eraMin === state.eraMax ? 'none' : '';
  seasonBtn.disabled = state.seasonRerollsLeft <= 0 || noSquad;
}

// ─── Progress & Hint ───────────────────────────────────────────────────────────
function updateProgress() {
  const done = state.currentRound, total = state.slots.length;
  document.getElementById('progress-text').textContent = `שחקן ${done + 1} מתוך ${total}`;
  document.getElementById('progress-fill').style.width = ((done / total) * 100) + '%';
  // The budget belongs here rather than in updateDraftOVR, which returns early
  // while nothing is picked — exactly when the budget is most worth reading.
  if (typeof salSyncBar === 'function') salSyncBar();
}

function setHint(text) { document.getElementById('pick-hint').textContent = text; }

// ─── Simulation ────────────────────────────────────────────────────────────────
// Win-probability gain per OVR point of difference. Shared by every formula so
// the match sim, the bracket split and the final table stay consistent.
const WINP_SLOPE = 0.031;

function simulateMatchV1(myOvr, opp, homeOverride = null) {
  const diff  = myOvr - opp.ovr;
  const home  = homeOverride !== null ? homeOverride : Math.random() > 0.5;
  const bonus = home ? 2 : 0;
  const winP  = Math.max(0.08, Math.min(0.92, 0.47 + (diff + bonus) * WINP_SLOPE));
  const drawP = Math.max(0.05, 0.22 - Math.abs(diff) * 0.005);
  const r = Math.random();
  const outcome = r < winP ? 'W' : r < winP + drawP ? 'D' : 'L';

  let gf, ga;
  if (outcome === 'W') { gf = rand(1,4); ga = rand(0, Math.max(0, gf-1)); }
  else if (outcome === 'D') { gf = rand(0,2); ga = gf; }
  else { ga = rand(1,3); gf = rand(0, Math.max(0, ga-1)); }

  return { outcome, gf, ga, opponent: opp.name, home };
}

// Engine dispatch. `me` is a number for V1 and a { ovr, atk, mid, def, gk }
// object for V2; V1 accepts either so a V2 call site can fall back cleanly.
// Anything recorded before the cutover keeps passing engine 1 and replays
// byte-identically — see the compatibility table in the design spec.
function simulateMatch(me, opp, homeOverride = null, engine = 1) {
  if (engine >= 2 && typeof me === 'object' && me !== null) {
    return simulateMatchV2(me, opp, homeOverride);
  }
  return simulateMatchV1(typeof me === 'number' ? me : me.ovr, opp, homeOverride);
}

function generateMatches(me, oppTeams = IL_TEAMS_SIM, spec = MODERN_FORMAT, engine = 1) {
  const ovr = typeof me === 'number' ? me : me.ovr;
  // One form swing for the whole campaign, drawn before any match. V1 never had
  // this and is left alone; its results are frozen.
  if (engine >= 2 && typeof me === 'object' && me !== null) me = simApplySeasonForm(me);
  if (!isModernSpec(spec)) return generateAuthenticMatches(me, oppTeams, spec, engine);
  // ── שלב הליגה: 26 משחקים (13 יריבים × בית + חוץ) ───────────────────────────
  const regPool    = shuffleArr([...oppTeams, ...oppTeams]);
  const regMatches = regPool.map(opp => simulateMatch(me, opp, null, engine));
  const regPts     = regMatches.reduce((s, m) => s + (m.outcome === 'W' ? 3 : m.outcome === 'D' ? 1 : 0), 0);

  // Estimate opponent regular-season pts to determine which playoff bracket we land in
  const avgOppOvr = Math.round(oppTeams.reduce((s, t) => s + t.ovr, 0) / oppTeams.length);
  const v2pts = engine >= 2 ? simTableEstimateV2(oppTeams, 26) : null;
  const simTeamPts = oppTeams.map((t, i) => {
    if (v2pts) return { ...t, pts: v2pts[i] };
    const diff  = t.ovr - avgOppOvr;
    const winP  = Math.max(0.1, Math.min(0.85, 0.47 + diff * WINP_SLOPE));
    const drawP = Math.max(0.05, 0.22 - Math.abs(diff) * 0.005);
    const pts   = Math.max(5, Math.round((winP * 3 + drawP) * 26 + rand(-4, 4)));
    return { ...t, pts };
  });

  // Rank = opponents with strictly more pts + 1  (ties always favour the player)
  const myRegRank   = simTeamPts.filter(t => t.pts > regPts).length + 1;
  const inTopSix    = myRegRank <= 6;
  const sortedTeams = [...simTeamPts].sort((a, b) => b.pts - a.pts);

  // ── Playoff ──────────────────────────────────────────────────────────────────
  let playoffMatches;
  if (inTopSix) {
    // פלייאוף עליון: 5 יריבים מהשישייה × בית + חוץ = 10 משחקים
    const top5 = sortedTeams.slice(0, 5);
    const pool = shuffleArr([...top5, ...top5]);
    playoffMatches = pool.map(opp => simulateMatch(me, opp, null, engine));
  } else {
    // פלייאוף תחתון: 7 יריבים × משחק אחד  (4 בית + 3 חוץ  או  3 בית + 4 חוץ)
    const bottom7   = sortedTeams.slice(6);
    const homeCount = Math.random() < 0.5 ? 4 : 3;
    const homes     = shuffleArr([...Array(homeCount).fill(true), ...Array(7 - homeCount).fill(false)]);
    playoffMatches  = bottom7.map((opp, i) => simulateMatch(me, opp, homes[i], engine));
  }

  // Bracket membership — needed for a correctly-split league table
  const champOpponents = inTopSix ? sortedTeams.slice(0, 5) : sortedTeams.slice(0, 6);
  const relegOpponents = inTopSix ? sortedTeams.slice(5)    : sortedTeams.slice(6);

  return { matches: [...regMatches, ...playoffMatches], inTopSix, champOpponents, relegOpponents, format: 'modern' };
}

// ─── Authentic historical formats ─────────────────────────────────────────────
// One generic engine for every pre-2012 format: N-1 opponents met `rounds`
// times, then (if the season had one) a playoff inside the group the regular
// season put you in. 2009/10–2010/11 also halve the regular-season points.
function generateAuthenticMatches(me, oppTeams, spec, engine = 1) {
  const ovr     = typeof me === 'number' ? me : me.ovr;
  const teams   = oppTeams.slice(0, spec.teams - 1);
  const regG    = regularGames(spec);

  // Regular season — home/away as even as the round count allows. An odd number
  // of meetings can't split evenly, so about half the rivals give an extra home
  // game (drawn per season, like the real fixture list).
  const fixtures = [];
  const baseHome = Math.floor(spec.rounds / 2);
  const extraCnt = spec.rounds % 2 === 0 ? 0
    : (Math.random() < 0.5 ? Math.floor(teams.length / 2) : Math.ceil(teams.length / 2));
  const extraH = shuffleArr(teams.map((_, i) => i < extraCnt));
  teams.forEach((opp, i) => {
    const homeCount = baseHome + (extraH[i] ? 1 : 0);
    for (let r = 0; r < spec.rounds; r++) fixtures.push({ opp, home: r < homeCount });
  });
  const regMatches = shuffleArr(fixtures).map(f => simulateMatch(me, f.opp, f.home, engine));
  const regPts = regMatches.reduce((s, m) => s + (m.outcome === 'W' ? 3 : m.outcome === 'D' ? 1 : 0), 0);

  // Opponents' regular season, scaled to this format's number of games
  const avgOppOvr = Math.round(teams.reduce((s, t) => s + t.ovr, 0) / teams.length);
  const v2pts = engine >= 2 ? simTableEstimateV2(teams, regG) : null;
  const simTeamPts = teams.map((t, i) => {
    if (v2pts) return { ...t, pts: v2pts[i] };
    const diff  = t.ovr - avgOppOvr;
    const winP  = Math.max(0.1, Math.min(0.85, 0.47 + diff * WINP_SLOPE));
    const drawP = Math.max(0.05, 0.22 - Math.abs(diff) * 0.005);
    const pts   = Math.max(3, Math.round((winP * 3 + drawP) * regG + rand(-4, 4)));
    return { ...t, pts };
  });
  const myRegRank = simTeamPts.filter(t => t.pts > regPts).length + 1;   // ties favour the player
  const sorted    = [...simTeamPts].sort((a, b) => b.pts - a.pts);

  // The full standings order, with the player slotted in at his rank
  const ordered = [...sorted];
  ordered.splice(myRegRank - 1, 0, { us: true, pts: regPts, name: 'הקבוצה שלי' });

  // No playoff → the regular table IS the final table
  if (!spec.groups) {
    return { matches: regMatches, inTopSix: null, groupIdx: 0, myRegRank,
             groups: [ordered], myRegPts: regPts, regGames: regG, spec, format: 'authentic' };
  }

  // Split into the season's playoff groups
  const groups = [];
  let cut = 0;
  spec.groups.forEach(size => { groups.push(ordered.slice(cut, cut + size)); cut += size; });
  const groupIdx = groups.findIndex(g => g.some(t => t.us));
  const poRounds = spec.poRounds[groupIdx];
  const rivals   = groups[groupIdx].filter(t => !t.us);

  const poFixtures = [];
  if (poRounds % 2 === 0) {
    rivals.forEach(opp => { for (let r = 0; r < poRounds / 2; r++) { poFixtures.push({ opp, home: true }); poFixtures.push({ opp, home: false }); } });
  } else {
    const half  = Math.random() < 0.5 ? Math.floor(rivals.length / 2) : Math.ceil(rivals.length / 2);
    const homes = shuffleArr(rivals.map((_, i) => i < half));
    rivals.forEach((opp, i) => { for (let r = 0; r < poRounds; r++) poFixtures.push({ opp, home: r === 0 ? homes[i] : !homes[i] }); });
  }
  const poMatches = shuffleArr(poFixtures).map(f => simulateMatch(me, f.opp, f.home, engine));

  return { matches: [...regMatches, ...poMatches], inTopSix: groupIdx === 0, groupIdx, myRegRank,
           groups, myRegPts: regPts, regGames: regG, spec, format: 'authentic' };
}

// ─── Player stats simulation ───────────────────────────────────────────────────
function simulatePlayerStats(matches) {
  const players = state.picks
    .map((pick, i) => pick ? {
      name:      pick.player.name,
      playerPos: pick.player.position,
      slotPos:   state.slots[i].pos,
      ovr:       playerOVR(pick.player),
      squad:     pick.squad,
      goals: 0, assists: 0, cs: 0,
    } : null)
    .filter(Boolean);

  matches.forEach(m => {
    m.scorers = [];  // record who scored (for the per-match results line)
    for (let g = 0; g < m.gf; g++) {
      const si = pickWeightedIdx(players.map(goalWeight));
      if (si >= 0) {
        players[si].goals++;
        m.scorers.push({ n: playerShortName(players[si].name), min: rand(1, 90) });
      }
      if (Math.random() > 0.15) {
        const ai = pickWeightedIdx(players.map((p,i) => i === si ? 0 : assistWeight(p)));
        if (ai >= 0) players[ai].assists++;
      }
    }
    m.scorers.sort((a, b) => a.min - b.min);
    if (m.ga === 0) {
      players.forEach(p => { if (['GK','CB','RB','LB'].includes(p.slotPos)) p.cs++; });
    }
  });
  return players;
}

// ─── Season highlights ─────────────────────────────────────────────────────────
function calcHighlights(matches) {
  let cur = 0, maxStreak = 0, cs = 0, bigWin = null, bigMargin = 0;
  matches.forEach(m => {
    if (m.outcome === 'W') {
      cur++; maxStreak = Math.max(maxStreak, cur);
      if (m.gf - m.ga > bigMargin) { bigMargin = m.gf - m.ga; bigWin = m; }
    } else cur = 0;
    if (m.ga === 0) cs++;
  });
  return { maxStreak, cs, bigWin };
}

// ─── League table generator ────────────────────────────────────────────────────
function generateLeagueTable(wins, draws, losses, inTopSix, champOpponents, relegOpponents) {
  const fakeRow = (opp, totalGames) => {
    // Extrapolate the opponent's simulated regular-season points to the full
    // season so the final table stays consistent with the bracket split.
    const regPts = opp.pts ??
      Math.round((Math.max(0.1, Math.min(0.85, 0.47 + (opp.ovr - 78) * WINP_SLOPE)) * 3 + 0.15) * 26);
    const estPts = Math.max(3, Math.round(regPts * totalGames / 26) + rand(-3, 3));
    const d = rand(3, 8);
    const w = Math.max(0, Math.min(totalGames - d, Math.round((estPts - d) / 3)));
    const l = Math.max(0, totalGames - w - d);
    return { name: opp.name, w, d, l, gf: w*2+d+rand(0,10), ga: l*2+d+rand(0,8), us: false };
  };
  const playerRow = { name: 'הקבוצה שלי', w: wins, d: draws, l: losses,
                      gf: wins*2+draws+rand(0,8), ga: losses*2+draws+rand(0,6), us: true };
  const addPts = r => ({ ...r, pts: r.w*3+r.d });
  const sort   = rows => rows.map(addPts).sort((a,b) => b.pts-a.pts || b.w-a.w);

  // Championship playoff (6 teams, 36 games) — sorted independently
  const champRows = sort([
    ...(inTopSix ? [playerRow] : []),
    ...champOpponents.map(opp => fakeRow(opp, 36)),
  ]);

  // Relegation playoff (8 teams, 33 games) — sorted independently
  const relegRows = sort([
    ...(!inTopSix ? [playerRow] : []),
    ...relegOpponents.map(opp => fakeRow(opp, 33)),
  ]);

  // No cross-bracket paradoxes: every championship-bracket row must show more
  // points than every bottom-bracket row (only fake rows are adjusted — the
  // player's own record is never touched).
  const playerPts = playerRow.w * 3 + playerRow.d;
  const resort = rows => rows.sort((a, b) => b.pts - a.pts || b.w - a.w);
  if (!inTopSix) {
    champRows.forEach(r => {
      if (r.pts <= playerPts) { r.pts = playerPts + rand(1, 3); r.w = Math.ceil((r.pts - r.d) / 3); }
    });
    resort(champRows);
  }
  const minChamp = Math.min(...champRows.map(r => r.pts));
  relegRows.forEach(r => {
    if (!r.us && r.pts >= minChamp) {
      r.pts = Math.max(3, minChamp - rand(1, 3));
      r.w = Math.max(0, Math.ceil((r.pts - r.d) / 3));
    }
  });
  resort(relegRows);

  // Combine: champ bracket always occupies positions 1–6, releg 7–14
  return [...champRows, ...relegRows];
}

// ─── Authentic-format league table ────────────────────────────────────────────
// Rows carry only a name and points on screen, so the table needs points only:
// each club's regular-season points (halved in 2009/10–2010/11, as the real
// league did) plus its playoff points, group by group.
function generateAuthenticTable(wins, draws, losses, g) {
  const spec  = g.spec;
  const regG  = g.regGames ?? regularGames(spec);
  const halve = !!spec.halve;
  const base  = pts => halve ? Math.ceil(pts / 2) : pts;

  // the player's own regular/playoff split — his record is never invented
  const myMatches = g.matches;
  const ptsOf = arr => arr.reduce((s, m) => s + (m.outcome === 'W' ? 3 : m.outcome === 'D' ? 1 : 0), 0);
  const myRegPts = g.myRegPts ?? ptsOf(myMatches.slice(0, regG));
  const myPoPts  = ptsOf(myMatches.slice(regG));

  const rowsFor = (group, gi) => {
    const poGames = spec.groups ? (spec.groups[gi] - 1) * spec.poRounds[gi] : 0;
    // Most points this group can actually finish on, halving included. These rows
    // print their points straight to the screen, unlike the modern table which
    // derives them from a clamped win count, so the ceiling has to be enforced.
    const maxPts = base(regG * 3) + poGames * 3;
    return group.map(t => {
      if (t.us) return { name: 'הקבוצה שלי', us: true, pts: base(myRegPts) + myPoPts };
      const rate  = t.pts / regG;
      const poPts = poGames ? Math.max(0, Math.round(rate * poGames + rand(-2, 2))) : 0;
      return { name: t.name, us: false, pts: Math.min(maxPts, base(t.pts) + poPts) };
    }).sort((a, b) => b.pts - a.pts);
  };

  const groupRows = g.groups.map(rowsFor);

  // Groups are listed in order (that's how the real tables looked). For the
  // formats WITHOUT halved points, a lower group must not out-point a higher
  // one — only invented rows are nudged, never the player's.
  if (!halve && groupRows.length > 1) {
    for (let i = 1; i < groupRows.length; i++) {
      const floor = Math.min(...groupRows[i - 1].map(r => r.pts));
      groupRows[i].forEach(r => { if (!r.us && r.pts >= floor) r.pts = Math.max(1, floor - rand(1, 3)); });
      const myPts = groupRows[i].find(r => r.us)?.pts;
      if (myPts != null && myPts >= floor) {
        groupRows[i - 1].forEach(r => { if (!r.us && r.pts <= myPts) r.pts = myPts + rand(1, 3); });
        groupRows[i - 1].sort((a, b) => b.pts - a.pts);
      }
      groupRows[i].sort((a, b) => b.pts - a.pts);
    }
  }
  return groupRows.flat();
}

// ─── Results: builders ────────────────────────────────────────────────────────
function buildOVRCard(overall) {
  setEl('res-ovr-total', overall);
  const lines = [
    { label:'🎯 התקפה', pos: ATK_POS, color:'#f97316' },
    { label:'⚡ קישור',  pos: MID_POS, color:'#22c55e' },
    { label:'🛡️ הגנה',   pos: DEF_POS, color:'#3b82f6' },
    { label:'🧤 שוער',   pos: ['GK'],  color:'#eab308' },
  ];
  const container = document.getElementById('ovr-lines');
  if (!container) return;
  container.innerHTML = '';
  lines.forEach(line => {
    const val = calcGroupOVR(line.pos) === null ? null : shownLineOVR(line.pos);
    if (val === null) return;
    const pct = Math.max(8, Math.min(100, ((val - 55) / 42) * 100));
    const row = document.createElement('div');
    row.className = 'ovr-line';
    row.innerHTML = `
      <span class="ovr-line-label">${line.label}</span>
      <div class="ovr-bar-wrap"><div class="ovr-bar" style="width:0%;background:${line.color}" data-w="${pct}"></div></div>
      <span class="ovr-line-val" style="color:${line.color}">${val}</span>
    `;
    container.appendChild(row);
  });
  // Animate bars in
  requestAnimationFrame(() => {
    container.querySelectorAll('.ovr-bar').forEach((bar, i) => {
      setTimeout(() => { bar.style.width = bar.dataset.w + '%'; }, i * 120);
    });
  });
}

function buildAwards(ps) {
  const byGoals   = [...ps].sort((a,b) => b.goals - a.goals);
  const byAssists = [...ps].sort((a,b) => b.assists - a.assists);
  const gk        = ps.find(p => p.slotPos === 'GK');
  const pots      = [...ps].sort((a,b) => (b.goals+b.assists) - (a.goals+a.assists))[0];

  const s = (nameId, statId, p, stat) => {
    setEl(nameId, p ? playerShortName(p.name) : '—');
    setEl(statId, stat ?? '');
  };
  s('aw-boot-name',   'aw-boot-stat',   byGoals[0],   byGoals[0]   ? `${byGoals[0].goals} שערים`      : '');
  s('aw-assist-name', 'aw-assist-stat', byAssists[0], byAssists[0] ? `${byAssists[0].assists} בישולים` : '');
  s('aw-glove-name',  'aw-glove-stat',  gk,           gk           ? `${gk.cs} שערים נקיים`           : '');
  s('aw-pots-name',   'aw-pots-stat',   pots,         pots         ? `${pots.goals} שערים + ${pots.assists} בישולים` : '');
}

function buildPlayerStatsTable(ps) {
  const body = document.getElementById('player-stats-body');
  if (!body) return;
  body.innerHTML = '';
  [...ps].sort((a,b) => (b.goals+b.assists) - (a.goals+a.assists)).forEach(p => {
    const type = POS_TYPE(p.slotPos);
    const row = document.createElement('div');
    row.className = 'stats-row';
    // the season just told a story; the tags say why he was the one telling it —
    // and in a classic season they did not, so they are not offered as a reason
    const tags = (!classicMode() && typeof tagStripHTML === 'function')
      ? tagStripHTML(p.name, p.slotPos, 3) : '';
    row.innerHTML = `
      <span class="st-pos-badge ${type}">${p.slotPos}</span>
      <span class="st-name">${playerShortName(p.name)}${tags}</span>
      <span class="st-num ${p.goals  > 0 ? 'green'  : ''}">${p.goals  > 0 ? p.goals  : '·'}</span>
      <span class="st-num ${p.assists> 0 ? 'yellow' : ''}">${p.assists> 0 ? p.assists: '·'}</span>
      <span class="st-num ${p.cs     > 0 ? 'cyan'   : ''}">${p.cs     > 0 ? p.cs     : '·'}</span>
    `;
    body.appendChild(row);
  });
}

function buildLeagueTable(table, spec = MODERN_FORMAT) {
  const container = document.getElementById('league-table');
  if (!container) return;
  container.innerHTML = '';
  // Separator wherever a playoff group ends (none at all in a season without one)
  const bounds = new Set();
  if (spec.groups) spec.groups.slice(0, -1).reduce((acc, size) => { bounds.add(acc + size); return acc + size; }, 0);
  table.forEach((t, idx) => {
    // Separator between championship (1–6) and relegation (7–14) brackets
    if (bounds.has(idx)) {
      const sep = document.createElement('div');
      sep.className = 'lt-bracket-sep';
      container.appendChild(sep);
    }
    const row = document.createElement('div');
    row.className = 'lt-row' + (t.us ? ' lt-us' : '');
    const nameHTML = t.us
      ? `<span class="lt-name">הקבוצה שלי <span class="lt-us-badge">#${idx+1}</span></span>`
      : `<span class="lt-name">${t.name}</span>`;
    row.innerHTML = `
      <span class="lt-pos">${idx+1}</span>
      ${nameHTML}
      <span class="lt-pts" dir="ltr">${t.pts}</span>
    `;
    container.appendChild(row);
  });
}

// ─── Tier ─────────────────────────────────────────────────────────────────────
// tier.name is canonical (achievements on the server match it) — the DISPLAYED
// name/sub go through tierDisplay(), which allows admin overrides per tier id.
function getTier(wins, draws, losses, rank, n, totalGames, spec = MODERN_FORMAT) {
  const pts = wins * 3 + draws;
  // Historical formats: no 36-game season, and often no playoff at all — so the
  // bracket-named tiers are replaced by ones that fit the league as it was.
  if (spec && !isModernSpec(spec)) {
    const groups   = spec.groups;
    const gNames   = groupNames(spec);
    // which playoff group the finishing rank falls in
    let gi = 0, cut = 0;
    if (groups) { for (let i = 0; i < groups.length; i++) { cut += groups[i]; if (rank <= cut) { gi = i; break; } } }
    const gapPts = Math.round(90 * totalGames / 36);
    if (losses === 0 && draws === 0) return { id: 'perfect' + totalGames, name: totalGames + '–0 🏛', sub: 'עונה מושלמת בפורמט של אז', color: '#FFD700' };
    if (losses === 0)                return { id: 'unbeaten',  name: 'בלתי מנוצחים ✨', sub: 'עונה שלמה ללא תבוסה',            color: '#C8A800' };
    if (rank === 1 && pts >= gapPts) return { id: 'champ-gap', name: 'אלופים בפער 🥇',  sub: 'שיא הליגה — תיתכן שושלת',       color: '#FFD700' };
    if (rank === 1)                  return { id: 'champ',     name: 'אלופים 🏆',        sub: 'זוכי ליגת העל',                color: '#d4af37' };
    if (rank === 2)                  return { id: 'runner-up', name: 'מקום שני 🥈',      sub: 'עונה מבריקה — עד כמה היה קרוב?', color: '#C0C0C0' };
    if (rank === 3)                  return { id: 'third',     name: 'מקום שלישי 🥉',    sub: 'על הפודיום',                   color: '#cd7f32' };
    if (rank >= n)                   return { id: 'relegated', name: 'ירידת ליגה ⬇',     sub: 'ירידה לליגה הלאומית',           color: '#F44336' };
    if (rank >= n - 1)               return { id: 'survivor',  name: 'שורדים בליגה ⚠',  sub: 'מאבק הישרדות — ניצחון בשניות',  color: '#FF9800' };
    if (!groups) {
      if (rank <= Math.ceil(n / 2))  return { id: 'top-half',  name: 'מחצית עליונה',     sub: 'עונה מכובדת',                  color: '#4CAF50' };
      return                                { id: 'mid-table', name: 'אמצע הטבלה',       sub: 'עונה שקטה',                    color: '#2196F3' };
    }
    return { id: 'group-' + gi, name: gNames[gi] ?? 'אמצע הטבלה',
             sub: gi === 0 ? 'סיימת בפלייאוף האליפות' : 'כך נראתה הליגה באותה עונה',
             color: gi === 0 ? '#4CAF50' : '#2196F3' };
  }
  if (losses===0 && draws===0 && totalGames===36) return { id:'perfect36', name:'36–0 🏆',   sub:'הבלתי אפשרי הפך למציאות',         color:'#FFD700' };
  if (losses===0)              return { id:'unbeaten',  name:'בלתי מנוצחים ✨',    sub:'עונה שלמה ללא תבוסה',              color:'#C8A800' };
  if (rank === 1 && pts >= 90) return { id:'champ-gap', name:'אלופים בפער 🥇',     sub:'שיא הליגה — תיתכן שושלת',          color:'#FFD700' };
  if (rank === 1)              return { id:'champ',     name:'אלופים 🏆',           sub:'זוכי ליגת העל',                   color:'#d4af37' };
  if (rank === 2)              return { id:'runner-up', name:'מקום שני 🥈',         sub:'עונה מבריקה — עד כמה היה קרוב?',  color:'#C0C0C0' };
  if (rank === 3)              return { id:'third',     name:'מקום שלישי 🥉',       sub:'פלייאוף האליפות — הישג ראוי',     color:'#cd7f32' };
  if (rank <= 6)               return { id:'top6',      name:'שישייה עליונה',       sub:'פלייאוף האליפות',                 color:'#4CAF50' };
  if (rank <= n - 3)           return { id:'bottom',    name:'פלייאוף תחתון',       sub:'פלייאוף ההישרדות',               color:'#2196F3' };
  if (rank <= n - 1)           return { id:'survivor',  name:'שורדים בליגה ⚠',     sub:'מאבק הישרדות — ניצחון בשניות',    color:'#FF9800' };
  return                              { id:'relegated', name:'ירידת ליגה ⬇',        sub:'ירידה לליגה הלאומית',             color:'#F44336' };
}

function tierDisplay(tier) {
  const st = typeof siteText === 'function' ? siteText : () => undefined;
  return {
    name: st('tier-' + tier.id + '-name', tier.name) ?? tier.name,
    sub:  st('tier-' + tier.id + '-sub', tier.sub) ?? tier.sub,
  };
}

// ─── Results screen ────────────────────────────────────────────────────────────
// The engine this run should use: challenges whose key predates the cutoff stay
// on V1 so a run already in progress keeps producing the season it produced
// yesterday. Lives in game.js but reads chalSimEngine from challenges.js, which
// loads AFTER this file — safe only because nothing calls it before a draft.
function currentSimEngine() {
  return state.challenge
    ? chalSimEngine(state.challenge.period, state.challenge.key)
    : SIM_ENGINE_CURRENT;
}

// `engine` defaults to 1 because the callers outside this file (the league
// reveal and the duel card) go on to generate a V1 season, and the card has to
// predict the season the player is actually about to get.
function calcPreseasonOdds(ovr, simCount = 300, engine = 1) {
  const me = engine >= 2 ? myLineRatings() : ovr;
  let ranks = [], totalPts = 0;
  for (let i = 0; i < simCount; i++) {
    const spec = specForState();
    const g0 = generateMatches(me, oppTeamsForState(), spec, engine);
    const { matches, inTopSix, champOpponents, relegOpponents } = g0;
    const w = matches.filter(m => m.outcome === 'W').length;
    const d = matches.filter(m => m.outcome === 'D').length;
    const l = matches.filter(m => m.outcome === 'L').length;
    const table = isModernSpec(spec)
      ? generateLeagueTable(w, d, l, inTopSix, champOpponents, relegOpponents)
      : generateAuthenticTable(w, d, l, g0);
    ranks.push(table.findIndex(t => t.us) + 1);
    totalPts += w * 3 + d;
  }
  ranks.sort((a, b) => a - b);
  const pct = n => Math.round(n / simCount * 1000) / 10;
  return {
    projectedFinish: ranks[Math.floor(simCount / 2)],
    expectedPoints:  Math.round(totalPts / simCount),
    winLeague: pct(ranks.filter(r => r === 1).length),
    topFour:   pct(ranks.filter(r => r <= 4).length),
    topSix:    pct(ranks.filter(r => r <= 6).length),
    relegation: pct(ranks.filter(r => r >= 12).length),
  };
}

function showPreseason(ovr) {
  buildPitchInContainer('preseason-pitch-slots');
  if (typeof renderChallengeReqsPreseason === 'function') renderChallengeReqsPreseason();
  showScreen('preseason');

  const signinPrompt = document.getElementById('pre-signin-prompt');
  if (signinPrompt) {
    signinPrompt.style.display = getCurrentUser() ? 'none' : 'flex';
    document.getElementById('pre-signin-btn').onclick = () => {
      document.getElementById('auth-modal').style.display = 'flex';
    };
  }

  document.getElementById('btn-simulate').onclick = showResults;


  setTimeout(() => {
    const odds = calcPreseasonOdds(ovr, 300, currentSimEngine());
    window._preseasonProjected = odds.projectedFinish;
    window._preseasonPoints    = odds.expectedPoints;  // reused by the results story
    document.getElementById('pre-finish').textContent = `מקום ${odds.projectedFinish}`;
    document.getElementById('pre-pts').textContent    = odds.expectedPoints;

    const bars = [
      { label: 'ניצחון בליגה', pct: odds.winLeague,  color: '#f59e0b' },
      { label: 'Top 4',        pct: odds.topFour,     color: '#22c55e' },
      { label: 'Top 6',        pct: odds.topSix,      color: '#3b82f6' },
      { label: 'סכנת הורדה',   pct: odds.relegation,  color: '#ef4444' },
    ];
    const barsEl = document.getElementById('pre-bars');
    barsEl.innerHTML = '';
    bars.forEach(b => {
      const row = document.createElement('div');
      row.className = 'pre-bar-row';
      row.innerHTML = `
        <span class="pre-bar-label">${b.label}</span>
        <div class="pre-bar-wrap">
          <div class="pre-bar-fill" style="width:${Math.min(b.pct,100)}%;background:${b.color}"></div>
        </div>
        <span class="pre-bar-pct" style="color:${b.color}">${b.pct}%</span>
      `;
      barsEl.appendChild(row);
    });
  }, 50);
}

// After a season the XI has nowhere to go. This sends it to Europe — the same
// four qualifying ties the gauntlet ends with, played on a run that is never
// saved, so a season cannot disturb gauntlet progress.
// Only the champion goes to Europe. That is both the real rule and the point:
// winning the league has to buy something the tier name alone doesn't. Everyone
// else still sees the button, so they know what finishing first is worth.
// Called with the finishing rank, which is only known once the season is built —
// until then there is nothing to show.
function wireEuropeButton(rank) {
  const btn = document.getElementById('btn-europe');
  if (!btn) return;
  if (typeof euStart !== 'function' || typeof rank !== 'number') {
    btn.style.display = 'none';
    return;
  }
  const champ = rank === 1;
  btn.style.display = '';
  btn.classList.toggle('locked', !champ);
  btn.disabled = !champ;
  btn.textContent = champ ? '🇪🇺 המשך למוקדמות אירופה' : '🇪🇺 אירופה - רק לאלופה';
  btn.onclick = champ ? () => euStart() : null;

  // The admin's way in from any finishing position is a small link under the
  // row, not a third button in it: as a button it wrapped its own label down
  // seven lines and ate a third of the actions row.
  const old = document.getElementById('eu-admin-link');
  if (old) old.remove();
  if (!champ && typeof euIsAdmin === 'function' && euIsAdmin()) {
    const a = document.createElement('button');
    a.id = 'eu-admin-link';
    a.className = 'eu-admin-link';
    a.textContent = '🧪 סנדבוקס: פתח את אירופה בכל זאת';
    a.onclick = () => euStart();
    btn.parentNode.appendChild(a);
  }
}

function showResults() {
  const ovr = teamOVR();
  // League draft: no personal reveal. Simulate silently, record the season to
  // the league, and send the player back to the (still-locked) league table —
  // the standings are only unveiled once every member has played.
  if (state.leagueCode && typeof getCurrentUser === 'function' && getCurrentUser()) {
    submitLeagueDraft(ovr);
    return;
  }
  buildResultsPitch();
  showScreen('results');
  wireEuropeButton(null);   // hidden until animateResults knows where we finished
  setTimeout(() => animateResults(ovr), 400);
}

// Club names on the pitch have ~80px to live in. Long ones are abbreviated the
// way fans write them, so the SEASON — the thing that shows the era mix — never
// gets clipped away.
const CLUB_SHORT_FIXES = [
  ['הפועל פתח תקווה', 'הפועל פ"ת'], ['מכבי פתח תקווה', 'מכבי פ"ת'],
  ['הפועל תל אביב', 'הפועל ת"א'],   ['מכבי תל אביב', 'מכבי ת"א'],
  ['בית"ר ירושלים', 'בית"ר י-ם'],   ['הפועל ירושלים', 'הפועל י-ם'],
  ['הכח עמידר רמת גן', 'הכח ר"ג'],   ['הפועל רמת גן', 'הפועל ר"ג'],
  ['הפועל באר שבע', 'הפועל ב"ש'],   ['הפועל כפר סבא', 'הפועל כ"ס'],
  ['עירוני קריית שמונה', 'עירוני ק"ש'], ['מכבי אחי נצרת', 'מכבי נצרת'],
  ['הפועל ראשון לציון', 'הפועל ראשל"צ'], ['מכבי בני ריינה', 'מכבי בני ריינה'],
  ['הפועל רמת השרון', 'הפועל רמה"ש'], ['הפועל ניר רמת השרון', 'הפועל רמה"ש'],
];
function clubShortName(name) {
  const hit = CLUB_SHORT_FIXES.find(([full]) => full === name);
  return hit ? hit[1] : name;
}

function buildPitchInContainer(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  // The OVR badge is hidden wherever hiding ratings IS the challenge — the draft
  // and the pre-season screen. On the results screen the season is over, and the
  // squad's OVR is on display anyway, so every player shows his rating.
  const showOvr = state.showRatings || containerId === 'results-pitch-slots';
  state.slots.forEach((slot, idx) => {
    const pick = state.picks[idx];
    const token = document.createElement('div');
    token.className = 'slot-token ' + (pick ? 'filled' : 'empty');
    token.dataset.idx = idx;
    token.style.left = slot.x + '%';
    token.style.top  = slot.y + '%';
    if (pick) {
      const team = getTeam(pick.squad.teamId);
      token.style.setProperty('--tc', team.primaryColor);
      token.style.setProperty('--ts', team.secondaryColor);
      token.style.setProperty('--tx', textColorFor(team.primaryColor));
      token.innerHTML = filledTokenHTML(pick.player, pick.squad, showOvr, slot.pos);
    } else {
      token.innerHTML = `
        <div class="slot-circle"><span class="slot-pos-label">${slot.role ?? slot.pos}</span></div>
        <div class="slot-name-label">${slot.label}</div>
      `;
    }
    container.appendChild(token);
  });
  if (typeof chemPaintTokens === 'function') chemPaintTokens(container);
  if (typeof chemRenderSummary === 'function' && containerId === 'preseason-pitch-slots') {
    chemRenderSummary('chem-summary-pre');
  }
  fitShortNames(container);
}

function buildResultsPitch() { buildPitchInContainer('results-pitch-slots'); }

function animateResults(ovr) {
  // Reuse a season restored from storage; otherwise simulate once and persist,
  // so refreshing cannot re-roll a different outcome for the same squad.
  // _restoredSeason → replay instantly (page refresh). _presetSeason → a season
  // computed elsewhere (e.g. a league reveal) that still plays the full reveal.
  let season = window._restoredSeason ?? window._presetSeason ?? null;
  const seasonWasRestored = !!window._restoredSeason;
  window._restoredSeason = null; window._presetSeason = null;
  if (!season) {
    // Both halves of the pre-season forecast: the finish for the tile, and the
    // points the verdict falls back on when the finish cannot separate them.
    const odds = (window._preseasonProjected != null && window._preseasonPoints != null)
      ? { projectedFinish: window._preseasonProjected, expectedPoints: window._preseasonPoints }
      : calcPreseasonOdds(ovr, 300, currentSimEngine());
    const projected = odds.projectedFinish;
    const projectedPts = odds.expectedPoints;
    const simulate = () => {
      const spec = specForState();
      // A challenge already in progress must keep the engine it started on, or
      // its scores stop being comparable — chalSimEngine gates that by key.
      const engine = currentSimEngine();
      const g = generateMatches(myLineRatings(), oppTeamsForState(), spec, engine);
      let w = 0, d = 0;
      g.matches.forEach(m => { if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; });
      const l = g.matches.length - w - d;
      return {
        ovr,
        engine,
        matches: g.matches,
        inTopSix: g.inTopSix,
        format: isModernSpec(spec) ? 'modern' : 'authentic',
        formatSpec: { year: state.oppSeason ?? LATEST_SEASON_YEAR, mode: formatOf(state.leagueFormat) },
        groupIdx: g.groupIdx ?? (g.inTopSix ? 0 : 1),
        leagueTable: isModernSpec(spec)
          ? generateLeagueTable(w, d, l, g.inTopSix, g.champOpponents, g.relegOpponents)
          : generateAuthenticTable(w, d, l, g),
        playerStats: simulatePlayerStats(g.matches),
        projectedFinish: projected,
        projectedPoints: projectedPts,
      };
    };
    // Challenge run: the season is a pure function of (challenge, lineup) — the
    // same XI always produces the same result, so retries can't grind luck.
    season = state.challenge
      ? withSeededRandom(chalSeed(`chal|${state.challenge.period}|${state.challenge.key}|sim|` + challengeLineupKey()), simulate)
      : simulate();
    saveSeasonState(season);
    // stamp the engine so the submitted payload can mark which scale this
    // score is on (V2 outscores V1 at the same squad rating)
    window._resultSubmitted = false;   // a new season may be saved again
    // count every finished season (for the games_N achievements) — once per
    // season: restored seasons skip this block
    if (typeof getCurrentUser === 'function' && getCurrentUser()) {
      _supabase.rpc('increment_games_played').then(() => {}, () => {});
    }
    if (typeof track === 'function') track('finish', trackDraftMode());
    // the daily streak — the reason to come back tomorrow. An archive run counts
    // for the day it belongs to, which is the whole point of making one up.
    if (state.challenge && state.challenge.period === 'daily' && typeof chalRecordDaily === 'function') {
      chalRecordDaily(state.challenge.key);
    }
  }
  const { matches, inTopSix, leagueTable, playerStats } = season;
  ovr = season.ovr;
  const totalGames = matches.length;
  // A restored/preset season carries its own format — never re-read state, or a
  // refresh after changing the setting would re-label an already-played season.
  // A restored/preset season carries its own format — never re-read the setting,
  // or a refresh after changing it would re-label an already-played season.
  const seasonSpec = season.formatSpec
    ? formatSpecFor(season.formatSpec.mode, season.formatSpec.year)
    : MODERN_FORMAT;
  const seasonGroupIdx = season.groupIdx ?? (inTopSix ? 0 : 1);
  const grid = document.getElementById('matches-grid');
  grid.innerHTML = '';

  let wins = 0, draws = 0, losses = 0, gfTotal = 0, gaTotal = 0;
  matches.forEach(m => {
    if (m.outcome==='W') wins++;
    else if (m.outcome==='D') draws++;
    else losses++;
    gfTotal += m.gf; gaTotal += m.ga;
  });
  const myRank = leagueTable.findIndex(t => t.us) + 1;
  wireEuropeButton(myRank);
  // A career season is an ordinary season plus a consequence. This runs for
  // restored seasons too (a refresh must not lose the result), so recording it
  // is idempotent on the career's side.
  if (typeof crOnSeasonEnd === 'function') {
    crOnSeasonEnd({ rank: myRank, n: leagueTable.length, ovr,
                    wins, draws, losses, gf: gfTotal, ga: gaTotal });
  }
  if (typeof mgwOnSeasonEnd === 'function') {
    mgwOnSeasonEnd({ rank: myRank, n: leagueTable.length, ovr,
                     wins, draws, losses, gf: gfTotal, ga: gaTotal });
  }

  function makeMatchRow(m) {
    const rc = m.outcome==='W' ? 'win' : m.outcome==='D' ? 'draw' : 'loss';
    const rl = m.outcome==='W' ? 'נ' : m.outcome==='D' ? 'ת' : 'ה';
    const row = document.createElement('div');
    row.className = `match-row ${rc}`;
    const scorers = (m.scorers?.length)
      ? `<div class="mr-scorers">⚽ ${m.scorers.map(s => `${s.n} ${s.min}'`).join(' · ')}</div>`
      : '';
    row.innerHTML = `
      <div class="mr-main">
        <span class="mr-badge ${rc}">${rl}</span>
        <span class="mr-opponent">${m.opponent} <span class="mr-venue">${m.home?'(ב)':'(ח)'}</span></span>
        <span class="mr-score" dir="ltr">${m.gf}-${m.ga}</span>
      </div>
      ${scorers}
    `;
    return row;
  }
  function separatorRow() {
    const sep = document.createElement('div');
    sep.className = 'playoff-separator';
    const names = groupNames(seasonSpec);
    const label = isModernSpec(seasonSpec)
      ? (inTopSix ? '🏆 פלייאוף עליון' : 'פלייאוף תחתון')
      : (seasonGroupIdx === 0 ? '🏆 ' : '') + (names[seasonGroupIdx] ?? 'פלייאוף');
    sep.textContent = '── ' + label + ' ──';
    return sep;
  }
  // Seasons without a playoff (1999/00, 2001-2009) get no separator at all.
  const splitAt = seasonSpec.groups ? regularGames(seasonSpec) : -1;

  // Fills the summary cards, stats and story — WITHOUT revealing the tier/finish
  // (those stay hidden until revealSummary(), so the reveal isn't spoiled).
  function fillResults() {
    setEl('res-wins', wins); setEl('res-draws', draws); setEl('res-losses', losses);
    setEl('res-points', wins*3+draws); setEl('res-gf', gfTotal); setEl('res-ga', gaTotal);

    const tier = getTier(wins, draws, losses, myRank, leagueTable.length, totalGames, seasonSpec);
    const td = tierDisplay(tier);
    setEl('res-tier', td.name, tier.color);
    setEl('res-tier-sub', td.sub);
    // engine comes from the season itself (restored/preset seasons carry their
    // own; league/duel presets have none → 1), so this rebuild can't lose it.
    window._lastResult = { wins, draws, losses, gfTotal, gaTotal, matches, ovr, inTopSix, spec: seasonSpec,
                           engine: season.engine ?? 1 };
    window._lastTier   = tier;
    const diffMapR = {
      easy:   siteText('label-diff-easy', 'קל'),
      normal: siteText('label-diff-normal', 'רגיל'),
      hard:   siteText('label-diff-hard', 'קשה'),
    };
    const modeParts = [diffMapR[state.difficulty] ?? state.difficulty];
    if (state.peakMode) modeParts.push(siteText('label-peak-mode', '⚡ מצב שיא'));
    if (!state.showRatings) modeParts.push(siteText('label-hidden-ratings', '🙈 דירוגים מוסתרים'));
    if (state.oppSeason)
      modeParts.push(siteText('label-opp-league', '🆚 ליגת {season}').replace('{season}', yearToSeason(state.oppSeason)));
    if (!isModernSpec(seasonSpec))
      modeParts.push('🏛 ' + siteText('label-format-authentic', 'פורמט {games} מחזורים').replace('{games}', totalGames));
    if (state.challenge && typeof challengeLabel === 'function')
      modeParts.unshift(`${CHAL_PERIODS[state.challenge.period]?.icon ?? '🗓️'} ${challengeLabel(state.challenge.period, state.challenge.key)} #${challengeNumber(state.challenge.period, state.challenge.key)}`);
    const modeInfoEl = document.getElementById('res-mode-info');
    if (modeInfoEl) modeInfoEl.textContent = modeParts.join(' · ');
    setupSaveSection();
    if (typeof setupChallengeResultsUI === 'function') setupChallengeResultsUI();

    buildOVRCard(ovr);
    window._lastPlayerStats = playerStats;
    buildAwards(playerStats);
    buildPlayerStatsTable(playerStats);
    const hi = calcHighlights(matches);
    setEl('hl-streak', hi.maxStreak);
    setEl('hl-cs', hi.cs);
    const bigwinEl = document.getElementById('hl-bigwin');
    if (bigwinEl) {
      bigwinEl.innerHTML = hi.bigWin
        ? `<span dir="ltr">${hi.bigWin.gf}-${hi.bigWin.ga}</span> נגד ${hi.bigWin.opponent}`
        : '—';
    }
    buildLeagueTable(leagueTable, seasonSpec);
    renderSeasonStory({ wins, draws, losses, gfTotal, gaTotal, ovr, myRank,
                        n: leagueTable.length, spec: seasonSpec,
                        projectedFinish: season.projectedFinish,
                        projectedPoints: season.projectedPoints, ps: playerStats, tier });
    return tier;
  }

  // Reveals the tier box + full stats (called after the placement popup closes)
  function revealSummary() {
    document.getElementById('tier-box').classList.add('visible');
    const sec = document.getElementById('res-stats-section');
    if (sec) sec.classList.add('visible');
    scrollPageTop();
  }

  // ── Restored season (page refresh): render everything instantly, no suspense ──
  if (seasonWasRestored) {
    matches.forEach((m, idx) => {
      if (idx === splitAt) grid.appendChild(separatorRow());
      grid.appendChild(makeMatchRow(m));
    });
    fillResults();
    revealSummary();
    return;
  }

  // ── Fresh simulation: reveal matches one by one with a running tally + skip ──
  // keep the finish hidden until the popup
  document.getElementById('tier-box').classList.remove('visible');
  document.getElementById('res-stats-section')?.classList.remove('visible');
  let rw = 0, rd = 0, rl = 0;
  document.querySelectorAll('#res-wins,#res-draws,#res-losses').forEach(e => e.textContent = '0');
  const skipBtn = document.getElementById('btn-skip-matches');
  if (skipBtn) skipBtn.style.display = 'block';

  let idx = 0, timer = null;
  function revealOne() {
    if (idx === splitAt) grid.appendChild(separatorRow());
    const m = matches[idx];
    grid.appendChild(makeMatchRow(m));
    if (m.outcome === 'W') rw++; else if (m.outcome === 'D') rd++; else rl++;
    setEl('res-wins', rw); setEl('res-draws', rd); setEl('res-losses', rl);
    idx++;
    if (idx < matches.length) timer = setTimeout(revealOne, 130);
    else endReveal();
  }
  function endReveal() {
    clearTimeout(timer);
    // append any not-yet-shown matches (skip path)
    for (; idx < matches.length; idx++) {
      if (idx === splitAt) grid.appendChild(separatorRow());
      grid.appendChild(makeMatchRow(matches[idx]));
    }
    if (skipBtn) skipBtn.style.display = 'none';
    const tier = fillResults();
    // League draft: record the result to the league automatically.
    if (state.leagueCode && typeof getCurrentUser === 'function' && getCurrentUser()) {
      submitResult().then(() => {
        const sb = document.getElementById('btn-save-result');
        if (sb) { sb.disabled = true; sb.textContent = '✓ נשמר לליגה'; }
      });
    }
    // Challenge run: submit automatically — the server keeps the best per challenge.
    if (state.challenge && typeof getCurrentUser === 'function' && getCurrentUser()) {
      submitResult().then(ok => {
        const sb = document.getElementById('btn-save-result');
        if (sb && ok) { sb.disabled = true; sb.textContent = '✓ נשמר לאתגר'; }
      });
    }
    // Show the placement popup first; only reveal the finish/stats once it's closed.
    setTimeout(() => showPlacementPopup(tier, myRank, () => {
      revealSummary();
      // a beat after the summary appears, so it is a follow-up and not a wall
      setTimeout(maybeSeasonSharePrompt, 1200);
    }), 350);
  }
  if (skipBtn) skipBtn.onclick = endReveal;
  timer = setTimeout(revealOne, 200);
}

// Popup announcing where the season finished (shown after the reveal). onClose
// runs when the user dismisses it (used to reveal the detailed results).
function showPlacementPopup(tier, rank, onClose) {
  // This is scheduled 350ms after the last match is revealed, but the buttons
  // that leave the results screen (Europe, and now the career's next season)
  // are live throughout the reveal. If the player already left, the popup would
  // open on top of whatever screen he moved to — so reveal the summary behind
  // him and skip it.
  if (!document.getElementById('screen-results')?.classList.contains('active')) {
    if (typeof onClose === 'function') onClose();
    return;
  }
  const td = tierDisplay(tier);
  let modal = document.getElementById('placement-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'placement-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box placement-box">
        <div class="placement-tier" id="placement-tier"></div>
        <div class="placement-sub" id="placement-sub"></div>
        <div class="placement-rank" id="placement-rank"></div>
        <button class="btn-primary btn-full" id="placement-close">${siteText('placement-close', 'לצפייה בתוצאות ←')}</button>
      </div>`;
    document.body.appendChild(modal);
  }
  const tEl = modal.querySelector('#placement-tier');
  tEl.textContent = td.name; tEl.style.color = tier.color;
  modal.querySelector('#placement-sub').textContent = td.sub;
  modal.querySelector('#placement-rank').textContent = placeLabel(rank);
  modal.querySelector('#placement-close').onclick = () => {
    modal.style.display = 'none';
    if (typeof onClose === 'function') onClose();
  };
  modal.style.display = 'flex';
}

// ── League draft: silent submission (no personal reveal) ─────────────────────
// The whole point of a league is suspense — nobody sees anything until every
// member has played. So a league season is simulated in the background, the
// result is recorded, and the player only gets a "submitted" confirmation.
async function submitLeagueDraft(ovr) {
  const code = state.leagueCode;
  const g = generateMatches(ovr);
  let wins = 0, draws = 0, losses = 0, gfTotal = 0, gaTotal = 0;
  g.matches.forEach(m => {
    if (m.outcome === 'W') wins++; else if (m.outcome === 'D') draws++; else losses++;
    gfTotal += m.gf; gaTotal += m.ga;
  });
  const leagueTable = generateLeagueTable(wins, draws, losses, g.inTopSix, g.champOpponents, g.relegOpponents);
  const myRank = leagueTable.findIndex(t => t.us) + 1;
  const tier = getTier(wins, draws, losses, myRank, leagueTable.length, g.matches.length);
  window._lastResult = { wins, draws, losses, gfTotal, gaTotal, matches: g.matches, ovr, inTopSix: g.inTopSix };
  window._lastTier = tier;
  window._resultSubmitted = false;

  showLeagueSubmitModal('sending');
  if (typeof getCurrentUser === 'function' && getCurrentUser())
    _supabase.rpc('increment_games_played').then(() => {}, () => {});
  if (typeof track === 'function') track('finish', 'league');
  const ok = await submitResult();      // payload carries state.leagueCode
  if (!ok) { showLeagueSubmitModal('error', code); return; }  // keep the draft to retry
  clearDraftState();                    // one-shot: nothing to resume, no results screen
  state.leagueCode = null;
  showLeagueSubmitModal('done', code);
}

function showLeagueSubmitModal(phase, code) {
  let modal = document.getElementById('league-submit-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'league-submit-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }
  if (phase === 'sending') {
    modal.innerHTML = `
      <div class="modal-box placement-box">
        <div class="placement-tier" style="color:#22c55e">⚽</div>
        <div class="placement-sub">שולח את ההרכב לליגה…</div>
      </div>`;
    modal.style.display = 'flex';
    return;
  }
  if (phase === 'error') {
    modal.innerHTML = `
      <div class="modal-box placement-box">
        <div class="placement-tier" style="color:#f85149">שליחה נכשלה</div>
        <div class="placement-sub">רגע של תקלת רשת. ההרכב שלך נשמר — אפשר לנסות לשלוח שוב.</div>
        <button class="btn-primary btn-full" id="league-submit-retry">נסה שוב</button>
      </div>`;
    modal.querySelector('#league-submit-retry').onclick = async () => {
      showLeagueSubmitModal('sending');
      const ok = await submitResult();
      if (!ok) { showLeagueSubmitModal('error', code); return; }
      clearDraftState();
      state.leagueCode = null;
      showLeagueSubmitModal('done', code);
    };
    modal.style.display = 'flex';
    return;
  }
  modal.innerHTML = `
    <div class="modal-box placement-box">
      <div class="placement-tier" style="color:#22c55e">✓ ההרכב נשלח!</div>
      <div class="placement-sub">בלי הצצות 🤫 — טבלת הליגה תיחשף רק כשכל השחקנים יסיימו את הדראפט שלהם.</div>
      <button class="btn-primary btn-full" id="league-submit-close">${siteText('league-submit-close', 'לטבלת הליגה ←')}</button>
    </div>`;
  modal.querySelector('#league-submit-close').onclick = () => {
    modal.style.display = 'none';
    if (typeof showScreen === 'function') showScreen('leagues');
    if (code && typeof openLeague === 'function') openLeague(code);
    else if (typeof showLeagues === 'function') showLeagues();
  };
  modal.style.display = 'flex';
}

// ─── Season story: qualitative summary, projected-vs-actual, narrative recap ────
// Ordinal place in Hebrew, e.g. 1 → "מקום 1"
function placeLabel(n) { return `מקום ${n}`; }

// Map a group OVR to an editable qualitative tier label + color
function qualTier(val) {
  if (val >= 88) return { key: 'qual-elite',   def: 'מעולה',  color: '#22c55e' };
  if (val >= 84) return { key: 'qual-strong',  def: 'חזק',    color: '#4ade80' };
  if (val >= 80) return { key: 'qual-good',    def: 'טוב',    color: '#eab308' };
  if (val >= 76) return { key: 'qual-average', def: 'בינוני', color: '#f59e0b' };
  return              { key: 'qual-weak',    def: 'חלש',    color: '#ef4444' };
}

// Fill {placeholders} in an editable template string
function fillTemplate(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : '{' + k + '}'));
}

// How far off the forecast a season has to land before the verdict calls it.
// A season's points swing about five either way on their own, so anything
// inside this is the forecast being right, not the squad over- or underdoing it.
const VERDICT_PTS_BAND = 5;

function renderSeasonStory(r) {
  const st = typeof siteText === 'function' ? siteText : (_k, d) => d;

  // 1) Projected vs actual
  document.getElementById('res-finish').textContent    = placeLabel(r.myRank);
  // Seasons stored before projectedFinish was persisted restore without it. Fall
  // back to the actual finish so the tile reads sensibly and the verdict says
  // "as expected" rather than comparing against undefined — where both < and >
  // are false, which silently produced "as expected" for every season anyway.
  const projected = r.projectedFinish ?? r.myRank;
  document.getElementById('res-projected').textContent = placeLabel(projected);
  const vtile = document.getElementById('res-verdict-tile');
  const vEl   = document.getElementById('res-verdict');
  vtile.classList.remove('over', 'under', 'exact');
  // Finishing position first, points as the tie-break. Rank alone cannot say a
  // squad beat its billing once it is projected to win the league — there is
  // nothing above first — so a favourite could only ever disappoint. Comparing
  // points when the position lands exactly where it was projected gives the
  // good seasons somewhere to show up. The band keeps a normal season "as
  // expected" rather than calling every point either way a verdict.
  const seasonPts = r.wins * 3 + r.draws;
  const expPts = r.projectedPoints ?? null;
  const verdict =
    r.myRank < projected ? 'over' :
    r.myRank > projected ? 'under' :
    expPts === null ? 'exact' :
    seasonPts >= expPts + VERDICT_PTS_BAND ? 'over' :
    seasonPts <= expPts - VERDICT_PTS_BAND ? 'under' : 'exact';
  vtile.classList.add(verdict);
  vEl.textContent =
    verdict === 'over'  ? st('verdict-over',  'מעל הציפיות 🔥') :
    verdict === 'under' ? st('verdict-under', 'מתחת לציפיות')   :
                          st('verdict-exact', 'בדיוק כצפוי');

  // 2) Qualitative strength chips
  const cats = [
    { key: 'qual-cat-atk', def: 'התקפה', pos: ATK_POS },
    { key: 'qual-cat-mid', def: 'קישור', pos: MID_POS },
    { key: 'qual-cat-def', def: 'הגנה',  pos: DEF_POS },
    { key: 'qual-cat-gk',  def: 'שוער',  pos: ['GK'] },
  ];
  const rated = cats.map(c => ({ ...c, val: calcGroupOVR(c.pos) === null ? null : shownLineOVR(c.pos) }))
    .filter(c => c.val !== null);
  const chipsEl = document.getElementById('res-qual-chips');
  chipsEl.innerHTML = rated.map(c => {
    const t = qualTier(c.val);
    return `<div class="qual-chip"><span class="qc-cat">${st(c.key, c.def)}</span>`
         + `<span class="qc-val" style="color:${t.color}">${st(t.key, t.def)}</span></div>`;
  }).join('');
  // one-line summary: strongest + weakest line.
  // Guarded because the reveal is animated: start a new draft while the results
  // are still coming in and the XI is already gone, at which point every line is
  // null, the reduce throws on an empty array, and everything after it on the
  // screen — the strength bars included — never renders.
  const summaryEl = document.getElementById('res-qual-summary');
  if (summaryEl) {
    if (!rated.length) summaryEl.textContent = '';
    else {
      const best  = rated.reduce((a, b) => b.val > a.val ? b : a);
      const worst = rated.reduce((a, b) => b.val < a.val ? b : a);
      summaryEl.textContent =
        fillTemplate(st('qual-summary-tmpl', 'החוזק הגדול היה ה{best}, והחוליה החלשה — ה{worst}.'),
          { best: st(best.key, best.def), worst: st(worst.key, worst.def) });
    }
  }

  // 3) Narrative recap — template chosen by outcome
  const pts = r.wins * 3 + r.draws;
  const champ = r.myRank === 1;
  // Table size and playoff shape change with the season's format: "top six" and
  // "bottom of the table" mean different ranks in a 12/14/16-club league.
  const n      = r.n ?? 14;
  const spec   = r.spec ?? MODERN_FORMAT;
  const topCut = spec.groups ? spec.groups[0] : Math.ceil(n / 2);
  const top6   = r.myRank <= topCut;
  let titleKey, bodyKey, titleDef, bodyDef;
  if (r.wins === (r.wins + r.draws + r.losses)) { // perfect season
    titleKey = 'story-perfect-title'; titleDef = 'מושלם. בלתי אפשרי הפך למציאות. 🏆';
    bodyKey  = 'story-perfect-body';  bodyDef  = 'עונה בלי ולו נקודה אחת שאבדה. {wins} ניצחונות מתוך {wins}. אין על מה להתווכח — זו האלמותיות.';
  } else if (champ) {
    titleKey = 'story-champ-title'; titleDef = 'אלופים! 🏆';
    bodyKey  = 'story-champ-body';  bodyDef  = 'הם המשיכו לדפוק בדלת, והפעם היא נפתחה. {pts} נקודות בקופה, {wins} ניצחונות, ואליפות שאף אחד לא יכול לקחת.';
  } else if (top6) {
    // Separate keys, not just a different default: 'story-top6-body' may carry an
    // admin override that mentions a playoff the old formats never had.
    if (spec.groups) {
      titleKey = 'story-top6-title'; titleDef = 'עונה גדולה 🥈';
      bodyKey  = 'story-top6-body';  bodyDef  = 'מקום {rank} וכרטיס לפלייאוף האליפות. {pts} נקודות ועונה שכמעט נגעה בזהב — עד כמה זה היה קרוב?';
    } else {
      titleKey = 'story-tophalf-title'; titleDef = 'עונה גדולה 🥈';
      bodyKey  = 'story-tophalf-body';  bodyDef  = 'מקום {rank} בצמרת הטבלה. {pts} נקודות ועונה שכמעט נגעה בזהב — עד כמה זה היה קרוב?';
    }
  } else if (r.myRank <= n - 2) {
    titleKey = 'story-mid-title'; titleDef = 'עונה של ביסוס';
    bodyKey  = 'story-mid-body';  bodyDef  = 'מקום {rank}. לא הכל הלך חלק, אבל {wins} ניצחונות ו-{pts} נקודות מספרים על קבוצה עם אופי. יש על מה לבנות.';
  } else {
    titleKey = 'story-releg-title'; titleDef = 'עונה למחוק';
    bodyKey  = 'story-releg-body';  bodyDef  = 'מקום {rank} וקרב הישרדות עד הסוף. {losses} הפסדים כואבים, אבל מכאן אפשר רק לעלות.';
  }
  const vars = { pts, wins: r.wins, draws: r.draws, losses: r.losses, rank: r.myRank, ovr: r.ovr };
  document.getElementById('res-narrative-title').textContent = fillTemplate(st(titleKey, titleDef), vars);
  document.getElementById('res-narrative-body').textContent  = fillTemplate(st(bodyKey, bodyDef), vars);

  // player callouts: top scorer + top assister
  const byGoals   = [...r.ps].sort((a, b) => b.goals - a.goals)[0];
  const byAssists = [...r.ps].sort((a, b) => b.assists - a.assists)[0];
  const callouts = [];
  if (byGoals && byGoals.goals > 0) {
    callouts.push(fillTemplate(st('story-scorer-tmpl', '⚽ {name} הוביל את המתקפה עם {goals} שערים — פשוט לא הפסיק לכבוש.'),
      { name: byGoals.name, goals: byGoals.goals }));
  }
  if (byAssists && byAssists.assists > 0 && byAssists.name !== byGoals?.name) {
    callouts.push(fillTemplate(st('story-assist-tmpl', '🎯 {name} חילק את המשחק עם {assists} בישולים.'),
      { name: byAssists.name, assists: byAssists.assists }));
  }
  const coEl = document.getElementById('res-narrative-callouts');
  coEl.innerHTML = '';
  callouts.forEach(c => {
    const div = document.createElement('div');
    div.className = 'narrative-callout';
    div.textContent = c;  // safe: no HTML injection from templates/data
    coEl.appendChild(div);
  });
}

/* ── the one nudge, at the end of a season ────────────────────────────────── */
// The career learned this first: people share what they are proud of, but only
// if they are asked at the moment they feel it — and only once. This is the
// same offer for an ordinary season, after the placement popup has been read,
// with a box that turns it off for good.
const SEASON_SHARE_KEY = '36-0-share-noprompt';

function seasonPromptMuted() {
  try { return localStorage.getItem(SEASON_SHARE_KEY) === '1'; } catch (e) { return false; }
}

function maybeSeasonSharePrompt() {
  const r = window._lastResult, t = window._lastTier;
  if (!r || !t || seasonPromptMuted()) return;
  if (state.career) return;                 // a dynasty has its own, better, prompt
  if (document.querySelector('.season-share-modal')) return;
  // only while the player is still looking at the season they just played
  if (!document.getElementById('screen-results')?.classList.contains('active')) return;

  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay season-share-modal';
  wrap.innerHTML = `
    <div class="modal-box sp-box">
      <button class="modal-close" id="sp-close" aria-label="סגירה">✕</button>
      <div class="modal-title">🏁 ${typeof esc === 'function' ? esc(tierDisplay(t).name) : tierDisplay(t).name}</div>
      <div class="sp-line" dir="rtl">
        <b dir="ltr">${r.wins}-${r.draws}-${r.losses}</b> · ${r.wins * 3 + r.draws} נקודות · דירוג ${r.ovr}
      </div>
      <div class="sp-warn">אל תאבד את ההרכב שלך — שתף אותו כדי לשמור אותו.</div>
      <button class="btn-primary btn-full" id="sp-share">📤 שתף את ההרכב</button>
      <button class="sp-later" id="sp-later">אחר כך</button>
      <label class="sp-mute"><input type="checkbox" id="sp-mute"> אל תציע לי יותר</label>
    </div>`;
  document.body.appendChild(wrap);

  const close = () => {
    if (wrap.querySelector('#sp-mute').checked) {
      try { localStorage.setItem(SEASON_SHARE_KEY, '1'); } catch (e) {}
    }
    wrap.remove();
  };
  wrap.querySelector('#sp-close').onclick = close;
  wrap.querySelector('#sp-later').onclick = close;
  wrap.onclick = e => { if (e.target === wrap) close(); };
  wrap.querySelector('#sp-share').onclick = () => { close(); openShareModal(); };
}

// ─── Share modal ───────────────────────────────────────────────────────────────
function openShareModal() {
  const r = window._lastResult;
  if (!r) return;
  populateShareCard();
  document.getElementById('share-modal').style.display = 'flex';
  // Pre-render the share image now, so the share buttons act instantly.
  // iOS only allows navigator.share() close to the tap — rendering the image
  // during the tap took too long and Safari rejected the share.
  getShareBlob().catch(() => {});
}

function closeShareModal() {
  document.getElementById('share-modal').style.display = 'none';
}

function populateShareCard() {
  _cachedShareBlob = null; // invalidate cached image — card content is about to change
  const r = window._lastResult;
  const t = window._lastTier;
  if (!r || !t) return;

  const formation = FORMATIONS[state.formationId]?.label ?? '';
  const pts = r.wins * 3 + r.draws;

  document.getElementById('sc-p-formation').textContent = formation;
  document.getElementById('sc-p-ovr').textContent = `OVR ${r.ovr}`;
  const modeParts = [];
  const diffMap = { easy: 'קל', normal: 'רגיל', hard: 'קשה' };
  if (state.challenge && typeof challengeNumber === 'function')
    modeParts.push(`${CHAL_PERIODS[state.challenge.period]?.icon ?? '🗓️'} ${CHAL_PERIODS[state.challenge.period]?.short ?? ''} #${challengeNumber(state.challenge.period, state.challenge.key)}`);
  modeParts.push(diffMap[state.difficulty] ?? state.difficulty);
  if (state.peakMode) modeParts.push('⚡ שיא');
  if (!state.showRatings) modeParts.push('🙈 סמוי');
  if (state.oppSeason) modeParts.push('🆚 ליגת ' + yearToSeason(state.oppSeason));
  if (r.spec && !isModernSpec(r.spec)) modeParts.push('🏛 ' + (r.wins + r.draws + r.losses) + ' מחזורים');
  const modeEl = document.getElementById('sc-p-mode');
  modeEl.textContent = modeParts.join(' · ');
  modeEl.style.display = 'inline-block';
  document.getElementById('sc-w').textContent = r.wins;
  document.getElementById('sc-d').textContent = r.draws;
  document.getElementById('sc-l').textContent = r.losses;
  document.getElementById('sc-pts-text').textContent = `${pts} נקודות`;
  const tierEl = document.getElementById('sc-tier-text');
  tierEl.textContent = tierDisplay(t).name;
  tierEl.style.color = t.color;

  // Player lineup (2-column grid)
  const lineup = document.getElementById('sc-lineup');
  lineup.innerHTML = '';
  state.picks.forEach((pick, i) => {
    if (!pick) return;
    const slot = state.slots[i];
    const type = POS_TYPE(slot.pos);
    const colors = { atk: '#f97316', mid: '#22c55e', def: '#3b82f6', gk: '#eab308' };
    const c = colors[type] || '#888';
    const ovr = playerOVR(pick.player);
    const lastName = playerShortName(pick.player.name);
    const row = document.createElement('div');
    row.className = 'sc-player-row';
    const team = getTeam(pick.squad.teamId);
    row.innerHTML = `
      <span class="sc-p-pos" style="color:${c};background:${c}18;border-color:${c}50">${slot.pos}</span>
      <span class="sc-p-name">${lastName}<span class="sc-p-meta">${team.name} · ${pick.squad.season}</span></span>
      ${state.showRatings ? `<span class="sc-p-ovr" style="color:${c}">${ovr}</span>` : ''}
    `;
    lineup.appendChild(row);
  });

  // The line that makes the concept visible: how many years this XI spans
  const years = state.picks.filter(Boolean).map(pk => parseSeasonYear(pk.squad.season));
  if (years.length) {
    const lo = Math.min(...years), hi = Math.max(...years);
    if (hi > lo) {
      const span = document.createElement('div');
      span.className = 'sc-span-line';
      span.textContent = `⏳ הרכב שחוצה ${hi - lo + 1} שנים · ${yearToSeason(lo)}–${yearToSeason(hi)}`;
      lineup.appendChild(span);
    }
  }

  // Awards
  const awardsEl = document.getElementById('sc-share-awards');
  awardsEl.innerHTML = '';
  if (window._lastPlayerStats) {
    const ps = window._lastPlayerStats;
    const top = [...ps].sort((a, b) => b.goals - a.goals)[0];
    const pots = [...ps].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))[0];
    if (top) awardsEl.innerHTML += `<div class="sc-award-line">⚽ <b>מלך השערים:</b> ${playerShortName(top.name)} (${top.goals} שע׳)</div>`;
    if (pots) awardsEl.innerHTML += `<div class="sc-award-line">🏅 <b>שחקן העונה:</b> ${playerShortName(pots.name)} (${pots.goals}+${pots.assists})</div>`;
  }

  // Match emoji grid
  document.getElementById('sc-emoji').textContent =
    r.matches.map(m => m.outcome === 'W' ? '🟩' : m.outcome === 'D' ? '🟨' : '🟥').join('');
}

function generateShareText() {
  const r = window._lastResult;
  const t = window._lastTier;
  if (!r || !t) return '';
  const formation = FORMATIONS[state.formationId]?.label ?? '';
  const pts = r.wins * 3 + r.draws;
  const grid = r.matches.map(m => m.outcome === 'W' ? '🟩' : m.outcome === 'D' ? '🟨' : '🟥').join('');
  const st = typeof siteText === 'function' ? siteText : (_k, d) => d;
  const vars = { formation, ovr: r.ovr, wins: r.wins, draws: r.draws, losses: r.losses,
                 points: pts, tier: tierDisplay(t).name };
  const title = state.challenge && typeof challengeLabel === 'function'
    ? `${CHAL_PERIODS[state.challenge.period]?.icon ?? '🗓️'} 36–0 | ${challengeLabel(state.challenge.period, state.challenge.key)} #${challengeNumber(state.challenge.period, state.challenge.key)}`
    : fillTemplate(st('share-title', '🇮🇱 36–0 | ליגת העל'), vars);
  return [
    title,
    fillTemplate(st('share-line-formation', 'מערך: {formation} | דירוג: {ovr}'), vars),
    state.oppSeason
      ? fillTemplate(st('share-line-opp', '🆚 מול ליגת {opp}'), { ...vars, opp: yearToSeason(state.oppSeason) })
      : null,
    (r.spec && !isModernSpec(r.spec))
      ? fillTemplate(st('share-line-format', '🏛 פורמט אותנטי — {games} מחזורים'), { ...vars, games: r.wins + r.draws + r.losses })
      : null,
    (() => {
      const ys = state.picks.filter(Boolean).map(pk => parseSeasonYear(pk.squad.season));
      if (!ys.length) return null;
      const lo = Math.min(...ys), hi = Math.max(...ys);
      return hi > lo
        ? fillTemplate(st('share-line-span', '⏳ הרכב שחוצה {years} שנים: {from}–{to}'),
            { ...vars, years: hi - lo + 1, from: yearToSeason(lo), to: yearToSeason(hi) })
        : null;
    })(),
    fillTemplate(st('share-line-record', '{wins}נ-{draws}ת-{losses}ה | {points} נקודות'), vars),
    // in a challenge everyone gets the same eleven squads, so the interesting
    // brag is not the score — it is who you saw that nobody else did
    (state.challenge && window._chalRarity && window._chalRarity.rarest)
      ? fillTemplate(st(window._chalRarity.rarest.pct > 0 ? 'share-line-rarity' : 'share-line-rarity-solo',
            window._chalRarity.rarest.pct > 0
              ? '🔎 נדירות {score} · {name} — רק {pct}% לקחו אותו'
              : '🔎 נדירות {score} · {name} — אף אחד אחר לא לקח אותו'),
          { ...vars, score: window._chalRarity.score,
            name: window._chalRarity.rarest.name, pct: window._chalRarity.rarest.pct })
      : null,
    tierDisplay(t).name,
    grid,
    fillTemplate(st('share-footer', 'https://www.36-0.co.il/'), vars),
  ].filter(Boolean).join('\n');
}

async function loadHtml2Canvas() {
  if (typeof html2canvas !== 'undefined') return true;
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

let _cachedShareBlob = null;

async function getShareBlob() {
  if (_cachedShareBlob) return _cachedShareBlob;
  const ok = await loadHtml2Canvas();
  if (!ok) return null;
  const card = document.getElementById('share-card-el');
  const canvas = await html2canvas(card, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#0d1117' });
  _cachedShareBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  return _cachedShareBlob;
}

function downloadBlobAs(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareWithImage(platform) {
  const ids = { wa: 'sh-wa', x: 'sh-x', copy: 'sh-copy', save: 'sh-save' };
  const btn = document.getElementById(ids[platform]);
  const orig = btn?.textContent;
  if (btn) btn.textContent = '...מכין';

  try {
    const blob = await getShareBlob();
    const text = generateShareText();

    if (!blob) {
      // html2canvas failed — text-only fallback
      if (platform === 'wa')   window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
      else if (platform === 'x') window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
      else if (platform === 'copy') { await navigator.clipboard?.writeText(text); if (btn) btn.textContent = '✓ הועתק!'; setTimeout(() => btn && (btn.textContent = orig), 2000); }
      else if (platform === 'save') { if (btn) btn.textContent = '⚠ שגיאה'; setTimeout(() => btn && (btn.textContent = orig), 2000); }
      return;
    }

    const file = new File([blob], '36-0-season.png', { type: 'image/png' });

    // Try native Web Share API (supported on mobile — shares image + text together)
    if (platform !== 'save' && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        if (btn) { btn.textContent = '✓ שותף!'; setTimeout(() => btn.textContent = orig, 2000); }
        return;
      } catch (e) {
        if (e?.name === 'AbortError') { // user closed the share sheet — not an error
          if (btn) btn.textContent = orig;
          return;
        }
        // NotAllowedError etc. (e.g. iOS gesture expired) — fall through to the
        // download/URL fallback below instead of failing silently
      }
    }

    // Platform-specific fallback (download image + open share URL)
    if (platform === 'wa') {
      downloadBlobAs(blob, '36-0-season.png');
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
      if (btn) { btn.textContent = '✓ הורד + WhatsApp'; setTimeout(() => btn.textContent = orig, 2500); }
    } else if (platform === 'x') {
      downloadBlobAs(blob, '36-0-season.png');
      window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
      if (btn) { btn.textContent = '✓ הורד + X'; setTimeout(() => btn.textContent = orig, 2500); }
    } else if (platform === 'copy') {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        if (btn) { btn.textContent = '✓ תמונה הועתקה!'; setTimeout(() => btn.textContent = orig, 2000); }
      } catch {
        await navigator.clipboard?.writeText(text);
        if (btn) { btn.textContent = '✓ טקסט הועתק'; setTimeout(() => btn.textContent = orig, 2000); }
      }
    } else if (platform === 'save') {
      downloadBlobAs(blob, '36-0-season.png');
      if (btn) { btn.textContent = '✓ נשמר!'; setTimeout(() => btn.textContent = orig, 2000); }
    }
  } catch(e) {
    console.error(e);
    if (btn) { btn.textContent = '⚠ שגיאה'; setTimeout(() => btn && (btn.textContent = orig), 2000); }
  }
}

async function downloadShareImage() {
  return shareWithImage('save');
}

// ─── Restart ───────────────────────────────────────────────────────────────────
function restartGame() {
  const { difficulty, showRatings, draftMode, peakMode, formationId, oppSeason, oppSeasonChoice } = state;
  const rerolls = { easy:3, normal:1, hard:0 };
  Object.assign(state, {
    difficulty, showRatings, draftMode, peakMode, formationId,
    oppSeasonChoice,
    oppSeason: oppSeasonChoice === 'random' ? resolveOppSeason('random') : oppSeason,
    challenge: null, challengeDeck: null, challengeReqs: null,
    career: null,          // "new game" leaves the career; the run itself stays in storage
    deck: null, mgw: null,
    slots:[], picks:[], currentRound:0,
    usedSquadIds:new Set(), usedPlayerKeys:new Set(), currentSquad:null,
    selectedPlayer:null, selectedSlotIdx:null,
    teamRerollsLeft: rerolls[difficulty] ?? 1,
    seasonRerollsLeft: rerolls[difficulty] ?? 1,
    isAnimating:false, awaitingSlotPick:false,
  });
  window._lastResult = null; window._lastTier = null; window._lastPlayerStats = null;
  // Leaving a league or duel reveal. Without this, setupSaveSection() keeps
  // seeing review mode and hides the save block and the sign-in prompt for every
  // season the player runs afterwards, and the reveal's back button stays parked
  // on the results screen linking to the old league.
  window._leagueReviewMode = null;
  window._duelReviewMode = null;
  document.getElementById('league-review-back')?.remove();
  document.getElementById('duel-review-chrome')?.remove();
  clearDraftState();
  const moveBtn = document.getElementById('btn-move-player');
  if (moveBtn) { moveBtn.style.display = 'none'; moveBtn.classList.remove('move-active'); moveBtn.textContent = '⇄ הזז שחקן'; }
  // "משחק חדש" is a draft that never passes through startGame(), which is why
  // the board used to show more finished seasons than opened drafts
  if (typeof track === 'function') track('open', trackDraftMode());
  prepareSetupScreen();
  showScreen('setup');
}

// ─── Leaderboard integration ───────────────────────────────────────────────────
async function submitResult() {
  const user = getCurrentUser();
  if (!user) return false;
  if (window._resultSubmitted) return true;   // already saved this season
  if (window._submitting) return false;        // a submit is already in flight
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) return false;

  const r = window._lastResult;
  const t = window._lastTier;
  if (!r || !t) return false;
  window._submitting = true;

  const isPublic = document.getElementById('share-squad-checkbox')?.checked ?? false;

  // a challenge run only counts for the challenge board if every mission was met
  // — and an archive run (a missed day, made up later) never counts at all: that
  // board closed at midnight and must stay closed
  const challengeDone = state.challenge && !state.challenge.archive &&
    (typeof challengeReqsMet !== 'function' || challengeReqsMet());
  const payload = {
    league_code: state.leagueCode || undefined,
    challenge:  challengeDone ? state.challenge : undefined,
    ovr:       r.ovr,
    wins:      r.wins,
    draws:     r.draws,
    losses:    r.losses,
    points:    r.wins * 3 + r.draws,
    gf:        r.gfTotal,
    ga:        r.gaTotal,
    formation: FORMATIONS[state.formationId]?.label ?? state.formationId,
    tier:      t.name,
    settings: {
      difficulty:      state.difficulty,
      engine:          window._lastResult?.engine ?? 1,
      era_min:         state.eraMin,
      era_max:         state.eraMax,
      peak_mode:       state.peakMode,
      ratings_visible: state.showRatings,
      ...(state.oppSeason ? { opp_season: state.oppSeason } : {}),
      league_format: (r.spec && !isModernSpec(r.spec)) ? 'authentic' : 'modern',
      ...(state.challenge ? { challenge: state.challenge.period + '|' + state.challenge.key } : {}),
    },
    // Per-player goals ride along so the server can award the golden boot without
    // taking the client's word for it: the same payload carries gf, and the two
    // have to agree. A squad never repeats a player, so matching by name is safe.
    players: state.picks.flatMap((pick, i) => {
      if (!pick) return [];
      const stat = (window._lastPlayerStats ?? []).find(s => s.name === pick.player.name);
      return [{
        teamId: pick.squad.teamId,
        season: pick.squad.season,
        name:   pick.player.name,
        pos:    state.slots[i].pos,
        ovr:    playerOVR(pick.player),
        slotId: state.slots[i].id,
        goals:   stat?.goals   ?? 0,
        assists: stat?.assists ?? 0,
      }];
    }),
    matches:   r.matches.map(m => ({ gf: m.gf, ga: m.ga, venue: m.home ? 'home' : 'away' })),
    is_public: isPublic,
  };

  // Retry transient failures (edge-function cold starts return a 502 without CORS
  // headers, which the browser surfaces as a fetch error) so a season isn't lost.
  const sleep = ms => new Promise(res => setTimeout(res, ms));
  let ok = false;
  window._lastSubmitError = null;
  try {
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-result`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.challenge && typeof showChallengeSubmitNote === 'function') showChallengeSubmitNote(json.challenge);
          if (json.new_achievements?.length) await showAchievementToasts(json.new_achievements);
          ok = true;
        } else if (res.status >= 500) {
          await sleep(700 * (attempt + 1));    // cold start — back off and retry
        } else {
          // 4xx — client error, don't retry. Keep the reason so the results
          // screen can say what went wrong instead of a bare "try again".
          let reason = 'שגיאה ' + res.status;
          try { const j = await res.json(); if (j?.error) reason = j.error; } catch (e) {}
          window._lastSubmitError = reason;
          console.error('submit-result rejected:', res.status, reason);
          break;
        }
      } catch (err) {
        await sleep(700 * (attempt + 1));        // network/CORS-on-crash — retry
      }
    }
  } finally {
    window._submitting = false;
  }
  if (ok) window._resultSubmitted = true;
  return ok;
}

function setupSaveSection() {
  const user        = getCurrentUser();
  const saveSection = document.getElementById('save-result-section');
  const loginPrompt = document.getElementById('save-login-prompt');
  if (!saveSection || !loginPrompt) return;

  // Reviewing a league/duel season — nothing to save (it isn't a fresh single-player draft).
  if (window._leagueReviewMode || window._duelReviewMode) { saveSection.style.display = 'none'; loginPrompt.style.display = 'none'; return; }

  // A historical-format season is saved to ITS OWN board (the season's table),
  // never to the general one — the general board only compares modern seasons.
  const r = window._lastResult;
  const retro = !!(r && r.spec && !isModernSpec(r.spec));
  const loginBtn = document.getElementById('save-login-btn');
  if (loginBtn) loginBtn.style.display = '';
  const loginMsg = document.getElementById('save-login-msg');
  if (loginMsg) loginMsg.textContent = siteText('save-login-msg', 'התחבר כדי לשמור את התוצאה');
  const retroNote = document.getElementById('save-retro-note');
  if (retroNote) {
    retroNote.style.display = retro ? 'block' : 'none';
    if (retro && state.oppSeason) {
      retroNote.textContent = fillTemplate(
        siteText('save-retro-note', '🏛 עונה בפורמט המקורי — התוצאה נשמרת בטבלה של {season}, לא בטבלה הכללית.'),
        { season: yearToSeason(state.oppSeason) });
    }
  }

  if (user) {
    saveSection.style.display = 'flex';
    loginPrompt.style.display = 'none';
  } else {
    saveSection.style.display = 'none';
    loginPrompt.style.display = 'flex';
    document.getElementById('save-login-btn').onclick = () => {
      document.getElementById('auth-modal').style.display = 'flex';
    };
  }

  const saveBtn = document.getElementById('btn-save-result');
  saveBtn.disabled = false;
  saveBtn.textContent = 'שמור ב-Leaderboard';
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'שומר...';
    const ok = await submitResult();
    if (ok) { saveBtn.textContent = '✓ נשמר!'; }
    else {
      saveBtn.textContent = 'נסה שוב';
      saveBtn.disabled = false;
      const note = document.getElementById('save-retro-note');
      if (note && window._lastSubmitError) {
        note.style.display = 'block';
        note.textContent = 'השמירה נכשלה: ' + window._lastSubmitError;
      }
    }
  };
}

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Loaded on a page without the game UI (e.g. admin.html uses this file for
  // FORMATIONS/era data) — skip all game wiring.
  if (!document.getElementById('btn-start')) return;
  // Resume a saved draft if one exists; otherwise start at the welcome screen
  if (!restoreDraftState()) showScreen('welcome');
  initEraSlider();
  window.addEventListener('resize', () => fitShortNames());

  document.getElementById('btn-start').addEventListener('click', startGame);
  // A plain start always clears the mode; the salary card sets it and starts
  // the same draft, so the two entries cannot disagree about which is on.
  document.getElementById('btn-start-draft').addEventListener('click', () => {
    _salaryCapPick = false;
    beginDraft();
  });
  document.getElementById('setup-salary-card')?.addEventListener('click', () => {
    _salaryCapPick = true;
    if (typeof track === 'function') track('open', 'salarycap');
    beginDraft();
  });
  document.getElementById('btn-reroll-team').addEventListener('click', rerollTeam);
  document.getElementById('btn-reroll-season').addEventListener('click', rerollSeason);
  document.getElementById('btn-share').addEventListener('click', openShareModal);
  document.getElementById('btn-restart').addEventListener('click', restartGame);
  document.getElementById('btn-draft-restart').addEventListener('click', restartGame);
  document.getElementById('btn-draft-exit')?.addEventListener('click', () => {
    if (state.currentRound > 0 && !confirm('לצאת מהדראפט? ההתקדמות לא תישמר.')) return;
    clearDraftState();
    if (state.duelCode) { state.duelCode = null; if (typeof closeDuelRealtime === 'function') closeDuelRealtime(); }
    state.challenge = null; state.challengeDeck = null; state.challengeReqs = null;
    showScreen('welcome');
  });
  document.getElementById('btn-preseason-restart')?.addEventListener('click', restartGame);
  document.getElementById('btn-move-player').addEventListener('click', toggleMoveMode);

  // Era preset buttons
  document.querySelectorAll('.era-btn').forEach(btn => {
    btn.addEventListener('click', () => setEraPreset(btn.dataset.era));
  });

  // Share modal — all buttons include image
  document.getElementById('sh-wa').addEventListener('click',   () => shareWithImage('wa'));
  document.getElementById('sh-x').addEventListener('click',    () => shareWithImage('x'));
  document.getElementById('sh-copy').addEventListener('click', () => shareWithImage('copy'));
  document.getElementById('sh-save').addEventListener('click', () => shareWithImage('save'));
  document.getElementById('sh-close').addEventListener('click', closeShareModal);
  document.getElementById('share-modal').addEventListener('click', e => {
    if (e.target.id === 'share-modal') closeShareModal();
  });

  // The squad viewer is opened from the leaderboard, from a league AND from the
  // profile, so its close button is wired once here — wiring it inside each
  // screen left the ✕ dead for whoever reached it another way.
  const squadModal = document.getElementById('squad-modal');
  if (squadModal) {
    const closeSquad = () => { squadModal.style.display = 'none'; };
    document.getElementById('squad-modal-close')?.addEventListener('click', closeSquad);
    squadModal.addEventListener('click', e => { if (e.target.id === 'squad-modal') closeSquad(); });
  }

  document.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.option-row');
      if (!row) return;
      selectOption(row.id, btn.dataset.val);
      if (row.id === 'mode-row') buildTacticCards();   // classic has no tactics
    });
  });
});
