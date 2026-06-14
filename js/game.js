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
const COMPAT = {
  GK:  ['GK'],
  RB:  ['RB','LB'],  CB: ['CB'],  LB: ['LB','RB'],
  CDM: ['CDM','CM','CAM'], CM: ['CM','CDM','CAM','RM','LM'],
  CAM: ['CAM','CM','CDM','CF','RW','LW'],
  RM:  ['RM','RW','CM','LM'],  LM: ['LM','LW','CM','RM'],
  RW:  ['RW','RM','CAM','CF','LW'], LW: ['LW','LM','CAM','CF','RW'],
  CF:  ['CF','ST','CAM','RW','LW'], ST: ['ST','CF','CAM'],
};

// ─── Hebrew position names ─────────────────────────────────────────────────────
const POS_HE = {
  GK:'שוער', RB:'מגן ימני', CB:'בלם', LB:'מגן שמאלי',
  CDM:'קשר הגנתי', CM:'קשר', CAM:'קשר התקפי',
  RM:'קשר ימין', LM:'קשר שמאל', RW:'כנף ימני', LW:'כנף שמאלי',
  CF:'חלוץ', ST:'חלוץ',
};

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
const GOAL_W = {
  ST:8, CF:7, RW:4.5, LW:4.5, CAM:3.5,
  RM:2, LM:2, CM:1.5, CDM:0.5,
  CB:0.4, RB:0.3, LB:0.3, GK:0,
};
const ASSIST_W = {
  ST:1, CF:1.5, RW:5, LW:5, CAM:6,
  RM:4, LM:4, CM:3.5, CDM:1.5,
  CB:0.5, RB:2, LB:2, GK:0,
};

// ─── Simulation opponents (OVR = avg top-11 from latest available season) ──────
const IL_TEAMS_SIM = [
  { name:'מכבי חיפה',         ovr: 84 },
  { name:'הפועל באר שבע',     ovr: 82 },
  { name:'מכבי תל אביב',      ovr: 83 },
  { name:'בית״ר ירושלים',     ovr: 80 },
  { name:'הפועל תל אביב',     ovr: 76 },
  { name:'מכבי נתניה',        ovr: 76 },
  { name:'עירוני קרית שמונה', ovr: 75 },
  { name:'בני יהודה',         ovr: 72 },
  { name:'הפועל חיפה',        ovr: 76 },
  { name:'הפועל ירושלים',     ovr: 76 },
  { name:'מ.ס. אשדוד',        ovr: 77 },
  { name:'מכבי פתח תקווה',    ovr: 76 },
  { name:'הפועל חדרה',        ovr: 74 },
];

// ─── Era helpers ──────────────────────────────────────────────────────────────
function parseSeasonYear(s) { return parseInt(s.split('–')[0]); }
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
  formationId: null, slots: [], picks: [], currentRound: 0,
  usedSquadIds: new Set(), usedPlayerKeys: new Set(), currentSquad: null,
  selectedPlayer: null, selectedSlotIdx: null,
  teamRerollsLeft: 1, seasonRerollsLeft: 1,
  isAnimating: false, awaitingSlotPick: false,
  moveMode: false, movingFromIdx: null,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Returns the OVR to use for a player, respecting peak mode.
function playerOVR(player) {
  return state.peakMode ? (player.peak_ovr ?? player.ovr) : player.ovr;
}

function getTeam(teamId) {
  return TEAMS[teamId] || { name:'?', primaryColor:'#333', secondaryColor:'#fff', badge:'⚽' };
}

function emptySlotIndices() {
  return state.slots.map((_,i) => i).filter(i => !state.picks[i]);
}

function compatibleEmptySlots(playerPos) {
  const pos = normalizePos(playerPos);
  return emptySlotIndices().filter(i => (COMPAT[state.slots[i].pos] ?? [state.slots[i].pos]).includes(pos));
}

function teamOVR() {
  let total = 0, weight = 0;
  state.picks.forEach((pick, i) => {
    if (!pick) return;
    const slot = state.slots[i];
    const w = POS_WEIGHT[slot.pos] ?? 1;
    const ovr = playerOVR(pick.player);
    const inPos = (COMPAT[slot.pos] ?? []).slice(0, 2).includes(normalizePos(pick.player.position));
    total += (inPos ? ovr : Math.round(ovr * 0.93)) * w;
    weight += w;
  });
  return weight > 0 ? Math.round(total / weight) : 0;
}

function calcGroupOVR(positions) {
  const ovrs = state.picks
    .map((pick, i) => pick && positions.includes(state.slots[i].pos) ? playerOVR(pick.player) : null)
    .filter(n => n !== null);
  return ovrs.length ? Math.round(ovrs.reduce((a,b) => a+b, 0) / ovrs.length) : null;
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
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + id);
  if (el) { el.classList.add('active'); el.scrollTop = 0; }
}

// ─── Welcome ───────────────────────────────────────────────────────────────────
function startGame() {
  buildFormationCards();
  if (!_selectedFormationKey) setFormationSelection('4-3-3');
  else setFormationSelection(_selectedFormationKey);
  showScreen('setup');
}

// ─── Setup Screen ──────────────────────────────────────────────────────────────
let _selectedFormationKey = null;

function buildFormationCards() {
  const grid = document.getElementById('formation-grid');
  grid.innerHTML = '';
  Object.entries(FORMATIONS).forEach(([key, f]) => {
    const card = document.createElement('div');
    card.className = 'formation-card';
    card.dataset.key = key;
    card.innerHTML = `<div class="f-label">${f.label}</div><div class="f-mini-pitch">${miniPitchHTML(f)}</div>`;
    card.addEventListener('click', () => setFormationSelection(key));
    grid.appendChild(card);
  });
}

function setFormationSelection(key) {
  _selectedFormationKey = key;
  document.querySelectorAll('.formation-card').forEach(c =>
    c.classList.toggle('selected', c.dataset.key === key)
  );
}

function miniPitchHTML(f) {
  const dots = f.slots.map(s =>
    `<div class="mini-dot ${s.pos==='GK'?'gk':''}" style="left:${s.x}%;top:${s.y}%"></div>`
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
  if (fill) { fill.style.left = (100 - maxPct) + '%'; fill.style.width = (maxPct - minPct) + '%'; }
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

  const rerolls = { easy:3, normal:1, hard:0 };
  state.teamRerollsLeft   = rerolls[state.difficulty] ?? 1;
  state.seasonRerollsLeft = rerolls[state.difficulty] ?? 1;
  state.formationId    = _selectedFormationKey;
  state.slots          = FORMATIONS[_selectedFormationKey].slots;
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

  buildPitch('pitch-slots', true);
  showScreen('draft');
  startRound();
}

// ─── Pitch builder ─────────────────────────────────────────────────────────────
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
        <span class="slot-pos-label">${slot.pos}</span>
      </div>
      <div class="slot-name-label">${slot.label}</div>
    `;
    if (clickable) token.addEventListener('click', () => handleSlotClick(idx));
    container.appendChild(token);
  });
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
  token.innerHTML = `
    <div class="slot-circle filled-circle">
      <span class="slot-player-short">${player.name.split(' ').at(-1)}</span>
    </div>
    <div class="slot-name-label">${state.slots[idx]?.label ?? ''}</div>
  `;
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
function toggleMoveMode() {
  if (state.isAnimating) return;
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

function handleMoveClick(slotIdx) {
  if (state.movingFromIdx === null) {
    if (!state.picks[slotIdx]) { setHint('בחר שחקן קיים להזזה'); return; }
    state.movingFromIdx = slotIdx;
    clearAllHighlights();
    setTokenHighlight(slotIdx, 'selected');
    const playerPos  = normalizePos(state.picks[slotIdx].player.position);
    const srcSlotPos = state.slots[slotIdx].pos;
    state.slots.forEach((sl, i) => {
      if (i === slotIdx) return;
      const tgtCompat = COMPAT[sl.pos] ?? [sl.pos];
      if (!tgtCompat.includes(playerPos)) return;
      if (state.picks[i]) {
        const otherPos  = normalizePos(state.picks[i].player.position);
        const srcCompat = COMPAT[srcSlotPos] ?? [srcSlotPos];
        if (srcCompat.includes(otherPos)) setTokenHighlight(i, 'compat');
      } else {
        setTokenHighlight(i, 'compat');
      }
    });
    setHint('בחר עמדה יעד — לחץ שוב על השחקן לביטול');
  } else {
    const fromIdx = state.movingFromIdx;
    state.movingFromIdx = null;
    if (slotIdx === fromIdx) {
      clearAllHighlights();
      setHint('בחר שחקן שברצונך להזיז');
      return;
    }
    const playerPos = normalizePos(state.picks[fromIdx].player.position);
    const tgtCompat = COMPAT[state.slots[slotIdx].pos] ?? [state.slots[slotIdx].pos];
    if (!tgtCompat.includes(playerPos)) {
      clearAllHighlights();
      setHint('⚠ שחקן זה לא יכול לשחק בעמדה זו — בחר מחדש');
      return;
    }
    if (state.picks[slotIdx]) {
      const otherPos  = normalizePos(state.picks[slotIdx].player.position);
      const srcCompat = COMPAT[state.slots[fromIdx].pos] ?? [state.slots[fromIdx].pos];
      if (!srcCompat.includes(otherPos)) {
        clearAllHighlights();
        setHint('⚠ לא ניתן להחליף — שחקן אינו מתאים לעמדה המקורית');
        return;
      }
      [state.picks[fromIdx], state.picks[slotIdx]] = [state.picks[slotIdx], state.picks[fromIdx]];
    } else {
      state.picks[slotIdx] = state.picks[fromIdx];
      state.picks[fromIdx] = null;
    }
    refreshAllTokens();
    clearAllHighlights();
    updateDraftOVR();
    // Re-render the player list so freed/filled slots are reflected in availability
    if (state.currentSquad) {
      const filterSlot = state.draftMode === 'pos-first' ? state.selectedSlotIdx : null;
      renderSquadPlayers(state.currentSquad, filterSlot);
    }
    setHint('בחר שחקן נוסף להזזה, או לחץ ⇄ לסיום');
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
      token.innerHTML = `
        <div class="slot-circle filled-circle">
          <span class="slot-player-short">${player.name.split(' ').at(-1)}</span>
        </div>
        <div class="slot-name-label">${slot.label}</div>
      `;
    } else {
      token.className = 'slot-token empty';
      token.style.removeProperty('--tc');
      token.style.removeProperty('--ts');
      token.innerHTML = `
        <div class="slot-circle"><span class="slot-pos-label">${slot.pos}</span></div>
        <div class="slot-name-label">${slot.label}</div>
      `;
    }
  });
}

// ─── Draft: Round management ───────────────────────────────────────────────────
function getEraFilteredSquads() {
  const filtered = SQUADS.filter(sq => {
    const y = parseSeasonYear(sq.season);
    return y >= state.eraMin && y <= state.eraMax;
  });
  return filtered.length > 0 ? filtered : SQUADS;
}

function pickNextSquad() {
  const pool = getEraFilteredSquads();
  const unused = pool.filter(sq => !state.usedSquadIds.has(sq.id));
  const draw = unused.length > 0 ? unused : pool;
  const sq = draw[rand(0, draw.length - 1)];
  state.usedSquadIds.add(sq.id);
  return sq;
}

function startRound() {
  state.selectedPlayer = null; state.selectedSlotIdx = null;
  clearAllHighlights();
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
  document.getElementById('card-badge').textContent = team.badge;
  document.getElementById('card-team-name').textContent = team.name;
  document.getElementById('card-season').textContent = squad.season;
  document.getElementById('squad-card-header').style.background =
    `linear-gradient(135deg, ${team.primaryColor} 0%, #1a1a2e 100%)`;
}

// ─── Draft: Player rendering ───────────────────────────────────────────────────
function renderSquadPlayers(squad, filterSlotIdx = null) {
  const list = document.getElementById('players-list');
  list.innerHTML = '';
  const players = [...squad.players].sort((a,b) => playerOVR(b) - playerOVR(a));

  // Check if any player in this squad can fill a remaining slot
  const anyAvailable = players.some(player => {
    if (state.usedPlayerKeys.has(player.name)) return false;
    if (filterSlotIdx !== null) {
      const slotCompat = COMPAT[state.slots[filterSlotIdx].pos] ?? [state.slots[filterSlotIdx].pos];
      if (!slotCompat.includes(normalizePos(player.position))) return false;
    }
    return compatibleEmptySlots(player.position).length > 0;
  });

  // Auto-reroll if no one fits — counts as free (don't spend a reroll)
  if (!anyAvailable && !state.isAnimating) {
    setHint('אין שחקן מתאים — מגריל קבוצה חדשה...');
    setTimeout(() => {
      const newSquad = pickNextSquad();
      state.currentSquad = newSquad;
      animateRoulette(newSquad, () => {
        renderSquadPlayers(newSquad, filterSlotIdx);
        if (filterSlotIdx !== null) setHint(`בחר שחקן עבור: ${state.slots[filterSlotIdx].label}`);
        else setHint('בחר שחקן מהרשימה');
      });
    }, 800);
    return;
  }

  players.forEach(player => {
    if (filterSlotIdx !== null) {
      const slotCompat = COMPAT[state.slots[filterSlotIdx].pos] ?? [state.slots[filterSlotIdx].pos];
      if (!slotCompat.includes(normalizePos(player.position))) return;
    }
    const isUsed    = state.usedPlayerKeys.has(player.name);
    const hasSlot   = compatibleEmptySlots(player.position).length > 0;
    const unavailable = isUsed || !hasSlot;

    const card = document.createElement('div');
    card.className = 'player-card' + (unavailable ? ' card-unavailable' : '');
    card.dataset.pos = player.position;
    const dispOVR = playerOVR(player);
    const peakTag = state.peakMode && player.peak_ovr && player.peak_ovr > player.ovr ? '⚡' : '';
    const ovrHTML = state.showRatings ? `<span class="pc-ovr" dir="ltr">${peakTag}${dispOVR}</span>` : '';
    const normPos = normalizePos(player.position);
    const fits = [...(PLAYER_FITS[normPos] ?? [normPos])];
    const posLabel = fits.map(p => POS_HE[p] ?? p).join(' | ');
    const posShort = fits.join(' | ');
    card.innerHTML = `
      <span class="pc-pos-badge" title="${posLabel}">${posShort}</span>
      <span class="pc-name">${player.name}</span>
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
    state.moveMode = false; state.movingFromIdx = null;
    clearAllHighlights(); updateMoveButton();
  }
  if (state.selectedPlayer === player) {
    state.selectedPlayer = null; state.selectedSlotIdx = null;
    clearAllHighlights(); setHint('בחר שחקן מהרשימה'); return;
  }
  state.selectedPlayer = player; state.selectedSlotIdx = null;
  clearAllHighlights(); cardEl.classList.add('card-selected');
  const compatSlots = compatibleEmptySlots(player.position);
  if (compatSlots.length === 0) { setHint('⚠ אין עמדות ריקות מתאימות'); return; }
  compatSlots.forEach(i => setTokenHighlight(i, 'compat'));
  if (compatSlots.length === 1) { assignPlayer(compatSlots[0], player); return; }
  setHint('בחר עמדה במגרש לשים את השחקן');
}

function handleSlotClick(slotIdx) {
  if (state.isAnimating) return;
  if (state.moveMode) { handleMoveClick(slotIdx); return; }
  if (state.picks[slotIdx]) return;

  if (state.draftMode === 'pos-first' && state.awaitingSlotPick) {
    state.awaitingSlotPick = false; state.selectedSlotIdx = slotIdx;
    clearAllHighlights(); setTokenHighlight(slotIdx, 'selected');
    const squad = pickNextSquad();
    state.currentSquad = squad; updateRerollButtons();
    animateRoulette(squad, () => {
      renderSquadPlayers(squad, slotIdx);
      setHint(`בחר שחקן עבור: ${state.slots[slotIdx].label}`);
    });
    return;
  }

  if (state.selectedPlayer) {
    const compat = COMPAT[state.slots[slotIdx].pos] ?? [];
    if (compat.includes(state.selectedPlayer.position)) {
      assignPlayer(slotIdx, state.selectedPlayer);
    } else {
      setHint('⚠ שחקן זה לא יכול לשחק בעמדה זו');
      setTokenHighlight(slotIdx, 'incompat');
      setTimeout(() => setTokenHighlight(slotIdx, 'compat'), 600);
    }
    return;
  }

  state.selectedSlotIdx = slotIdx; clearAllHighlights();
  setTokenHighlight(slotIdx, 'selected');
  const compat = COMPAT[state.slots[slotIdx].pos] ?? [state.slots[slotIdx].pos];
  document.querySelectorAll('.player-card').forEach(card => {
    if (card.classList.contains('card-unavailable')) return;
    card.classList.add(compat.includes(card.dataset.pos) ? 'card-compat' : 'card-incompat');
  });
  setHint(`בחר שחקן עבור: ${state.slots[slotIdx].label}`);
}

function assignPlayer(slotIdx, player) {
  state.picks[slotIdx] = { player, squad: state.currentSquad };
  state.usedPlayerKeys.add(player.name);
  fillToken(slotIdx, player, state.currentSquad);
  clearAllHighlights();
  state.selectedPlayer = null; state.selectedSlotIdx = null;
  state.currentRound++;
  const moveBtn = document.getElementById('btn-move-player');
  if (moveBtn) moveBtn.style.display = '';
  updateDraftOVR();
  if (state.currentRound >= state.slots.length) setTimeout(showResults, 500);
  else setTimeout(startRound, 400);
}

function updateDraftOVR() {
  const picked = state.picks.filter(Boolean).length;
  if (picked === 0) return;
  const ovr = teamOVR();
  const el = document.getElementById('draft-ovr-display');
  if (el) { el.style.display = 'block'; setEl('draft-ovr-val', ovr); }

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
    const val = calcGroupOVR(pos);
    if (val === null) { const row = document.getElementById(id); if (row) row.style.display = 'none'; return; }
    let row = document.getElementById(id);
    if (!row) {
      row = document.createElement('div');
      row.id = id;
      row.className = 'dovr-line';
      container.appendChild(row);
    }
    row.style.display = 'flex';
    const pct = Math.max(8, Math.min(100, ((val - 55) / 42) * 100));
    row.innerHTML = `
      <span class="dovr-label">${label}</span>
      <div class="dovr-bar-wrap"><div class="dovr-bar" style="width:${pct}%;background:${color}"></div></div>
      <span class="dovr-val" style="color:${color}">${val}</span>
    `;
  });
}

// ─── Rerolls ───────────────────────────────────────────────────────────────────
function rerollTeam() {
  if (state.isAnimating || state.teamRerollsLeft <= 0 || state.awaitingSlotPick) return;
  state.teamRerollsLeft--; updateRerollButtons();

  const currentTeamId = state.currentSquad?.teamId;
  const currentSeason = state.currentSquad?.season;
  const era = getEraFilteredSquads();

  let pool = era.filter(sq => sq.teamId !== currentTeamId && sq.season === currentSeason && !state.usedSquadIds.has(sq.id));
  if (pool.length === 0) pool = era.filter(sq => sq.teamId !== currentTeamId && sq.season === currentSeason);
  if (pool.length === 0) pool = era.filter(sq => sq.teamId !== currentTeamId && !state.usedSquadIds.has(sq.id));
  if (pool.length === 0) pool = era.filter(sq => sq.teamId !== currentTeamId);
  if (pool.length === 0) pool = SQUADS.filter(sq => sq.teamId !== currentTeamId);
  const newSquad = pool[rand(0, pool.length - 1)];
  state.usedSquadIds.add(newSquad.id); state.currentSquad = newSquad;

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

  state.seasonRerollsLeft--; updateRerollButtons();
  const newSquad = sameTeam[rand(0, sameTeam.length - 1)];
  state.usedSquadIds.add(newSquad.id); state.currentSquad = newSquad;

  const filterSlot = state.draftMode === 'pos-first' ? state.selectedSlotIdx : null;
  animateRoulette(newSquad, () => {
    renderSquadPlayers(newSquad, filterSlot);
    setHint(filterSlot !== null ? `בחר שחקן עבור: ${state.slots[filterSlot].label}` : 'בחר שחקן מהרשימה');
  });
}

function updateRerollButtons() {
  const noSquad = state.awaitingSlotPick;
  document.getElementById('team-reroll-count').textContent   = state.teamRerollsLeft;
  document.getElementById('season-reroll-count').textContent = state.seasonRerollsLeft;
  document.getElementById('btn-reroll-team').disabled   = state.teamRerollsLeft   <= 0 || noSquad;
  document.getElementById('btn-reroll-season').disabled = state.seasonRerollsLeft <= 0 || noSquad;
}

// ─── Progress & Hint ───────────────────────────────────────────────────────────
function updateProgress() {
  const done = state.currentRound, total = state.slots.length;
  document.getElementById('progress-text').textContent = `שחקן ${done + 1} מתוך ${total}`;
  document.getElementById('progress-fill').style.width = ((done / total) * 100) + '%';
}

function setHint(text) { document.getElementById('pick-hint').textContent = text; }

// ─── Simulation ────────────────────────────────────────────────────────────────
function simulateMatch(myOvr, opp, homeOverride = null) {
  const diff  = myOvr - opp.ovr;
  const home  = homeOverride !== null ? homeOverride : Math.random() > 0.5;
  const bonus = home ? 2 : 0;
  const winP  = Math.max(0.08, Math.min(0.92, 0.47 + (diff + bonus) * 0.018));
  const drawP = Math.max(0.05, 0.22 - Math.abs(diff) * 0.005);
  const r = Math.random();
  const outcome = r < winP ? 'W' : r < winP + drawP ? 'D' : 'L';

  let gf, ga;
  if (outcome === 'W') { gf = rand(1,4); ga = rand(0, Math.max(0, gf-1)); }
  else if (outcome === 'D') { gf = rand(0,2); ga = gf; }
  else { ga = rand(1,3); gf = rand(0, Math.max(0, ga-1)); }

  return { outcome, gf, ga, opponent: opp.name, home };
}

function generateMatches(ovr) {
  // ── שלב הליגה: 26 משחקים (13 יריבים × בית + חוץ) ───────────────────────────
  const regPool    = [...IL_TEAMS_SIM, ...IL_TEAMS_SIM].sort(() => Math.random() - 0.5);
  const regMatches = regPool.map(opp => simulateMatch(ovr, opp));
  const regPts     = regMatches.reduce((s, m) => s + (m.outcome === 'W' ? 3 : m.outcome === 'D' ? 1 : 0), 0);

  // Estimate opponent regular-season pts to determine which playoff bracket we land in
  const avgOppOvr = Math.round(IL_TEAMS_SIM.reduce((s, t) => s + t.ovr, 0) / IL_TEAMS_SIM.length);
  const simTeamPts = IL_TEAMS_SIM.map(t => {
    const diff  = t.ovr - avgOppOvr;
    const winP  = Math.max(0.1, Math.min(0.8, 0.47 + diff * 0.018));
    const drawP = Math.max(0.05, 0.22 - Math.abs(diff) * 0.005);
    const pts   = Math.max(5, Math.round((winP * 3 + drawP) * 26 + rand(-8, 8)));
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
    const pool = [...top5, ...top5].sort(() => Math.random() - 0.5);
    playoffMatches = pool.map(opp => simulateMatch(ovr, opp));
  } else {
    // פלייאוף תחתון: 7 יריבים × משחק אחד  (4 בית + 3 חוץ  או  3 בית + 4 חוץ)
    const bottom7   = sortedTeams.slice(6);
    const homeCount = Math.random() < 0.5 ? 4 : 3;
    const homes     = [...Array(homeCount).fill(true), ...Array(7 - homeCount).fill(false)]
                        .sort(() => Math.random() - 0.5);
    playoffMatches  = bottom7.map((opp, i) => simulateMatch(ovr, opp, homes[i]));
  }

  // Bracket membership — needed for a correctly-split league table
  const champOpponents = inTopSix ? sortedTeams.slice(0, 5) : sortedTeams.slice(0, 6);
  const relegOpponents = inTopSix ? sortedTeams.slice(5)    : sortedTeams.slice(6);

  return { matches: [...regMatches, ...playoffMatches], inTopSix, champOpponents, relegOpponents };
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
    for (let g = 0; g < m.gf; g++) {
      const si = pickWeightedIdx(players.map(p => GOAL_W[p.slotPos] ?? 0));
      if (si >= 0) players[si].goals++;
      if (Math.random() > 0.15) {
        const ai = pickWeightedIdx(players.map((p,i) => i === si ? 0 : ASSIST_W[p.slotPos] ?? 0));
        if (ai >= 0) players[ai].assists++;
      }
    }
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
    const winP = Math.max(0.1, Math.min(0.8, 0.47 + (opp.ovr - 78) * 0.018));
    const base = Math.round(winP * totalGames);
    const w = Math.max(3, rand(base - 4, base + 4));
    const d = rand(3, 9);
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

  // Combine: champ bracket always occupies positions 1–6, releg 7–14
  return [...champRows, ...relegRows];
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
    const val = calcGroupOVR(line.pos);
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
    setEl(nameId, p ? p.name.split(' ').at(-1) : '—');
    setEl(statId, stat ?? '');
  };
  s('aw-boot-name',   'aw-boot-stat',   byGoals[0],   byGoals[0]   ? `${byGoals[0].goals} שערים`      : '');
  s('aw-assist-name', 'aw-assist-stat', byAssists[0], byAssists[0] ? `${byAssists[0].assists} בישולים` : '');
  s('aw-glove-name',  'aw-glove-stat',  gk,           gk           ? `${gk.cs} שערים נקיים`           : '');
  s('aw-pots-name',   'aw-pots-stat',   pots,         pots         ? `${pots.goals} שע + ${pots.assists} ביש` : '');
}

function buildPlayerStatsTable(ps) {
  const body = document.getElementById('player-stats-body');
  if (!body) return;
  body.innerHTML = '';
  [...ps].sort((a,b) => (b.goals+b.assists) - (a.goals+a.assists)).forEach(p => {
    const type = POS_TYPE(p.slotPos);
    const row = document.createElement('div');
    row.className = 'stats-row';
    row.innerHTML = `
      <span class="st-pos-badge ${type}">${p.slotPos}</span>
      <span class="st-name">${p.name.split(' ').at(-1)}</span>
      <span class="st-num ${p.goals  > 0 ? 'green'  : ''}">${p.goals  > 0 ? p.goals  : '·'}</span>
      <span class="st-num ${p.assists> 0 ? 'yellow' : ''}">${p.assists> 0 ? p.assists: '·'}</span>
      <span class="st-num ${p.cs     > 0 ? 'cyan'   : ''}">${p.cs     > 0 ? p.cs     : '·'}</span>
    `;
    body.appendChild(row);
  });
}

function buildLeagueTable(table) {
  const container = document.getElementById('league-table');
  if (!container) return;
  container.innerHTML = '';
  table.forEach((t, idx) => {
    // Separator between championship (1–6) and relegation (7–14) brackets
    if (idx === 6) {
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
function getTier(wins, draws, losses, rank, n, totalGames) {
  const pts = wins * 3 + draws;
  if (losses===0 && draws===0 && totalGames===36) return { name:'36–0 🏆',            sub:'הבלתי אפשרי הפך למציאות',         color:'#FFD700' };
  if (losses===0 && draws===0 && totalGames===33) return { name:'33–0 🏆',            sub:'עונה מושלמת בפלייאוף התחתון',     color:'#FFD700' };
  if (losses===0)              return { name:'בלתי מנוצחים ✨',    sub:'עונה שלמה ללא תבוסה',              color:'#C8A800' };
  if (rank === 1 && pts >= 90) return { name:'אלופים בפער 🥇',     sub:'שיא הליגה — תיתכן שושלת',          color:'#FFD700' };
  if (rank === 1)              return { name:'אלופים 🏆',           sub:'זוכי ליגת העל',                   color:'#d4af37' };
  if (rank === 2)              return { name:'מקום שני 🥈',         sub:'עונה מבריקה — עד כמה היה קרוב?',  color:'#C0C0C0' };
  if (rank === 3)              return { name:'מקום שלישי 🥉',       sub:'פלייאוף האליפות — הישג ראוי',     color:'#cd7f32' };
  if (rank <= 6)               return { name:'שישייה עליונה',       sub:'פלייאוף האליפות',                 color:'#4CAF50' };
  if (rank <= n - 3)           return { name:'פלייאוף תחתון',       sub:'פלייאוף ההישרדות',               color:'#2196F3' };
  if (rank <= n - 1)           return { name:'שורדים בליגה ⚠',     sub:'מאבק הישרדות — ניצחון בשניות',    color:'#FF9800' };
  return                              { name:'ירידת ליגה ⬇',        sub:'ירידה לליגה הלאומית',             color:'#F44336' };
}

// ─── Results screen ────────────────────────────────────────────────────────────
function showResults() {
  buildResultsPitch();
  const ovr = teamOVR();
  showScreen('results');
  setTimeout(() => animateResults(ovr), 400);
}

function buildResultsPitch() {
  const container = document.getElementById('results-pitch-slots');
  container.innerHTML = '';
  state.slots.forEach((slot, idx) => {
    const pick = state.picks[idx];
    const token = document.createElement('div');
    token.className = 'slot-token ' + (pick ? 'filled' : 'empty');
    token.style.left = slot.x + '%';
    token.style.top  = slot.y + '%';
    if (pick) {
      const team = getTeam(pick.squad.teamId);
      token.style.setProperty('--tc', team.primaryColor);
      token.style.setProperty('--ts', team.secondaryColor);
      token.innerHTML = `
        <div class="slot-circle filled-circle">
          <span class="slot-player-short">${pick.player.name.split(' ').at(-1)}</span>
        </div>
        <div class="slot-name-label">${slot.label}</div>
      `;
    } else {
      token.innerHTML = `
        <div class="slot-circle"><span class="slot-pos-label">${slot.pos}</span></div>
        <div class="slot-name-label">${slot.label}</div>
      `;
    }
    container.appendChild(token);
  });
}

function animateResults(ovr) {
  const { matches, inTopSix, champOpponents, relegOpponents } = generateMatches(ovr);
  const totalGames = matches.length;
  const grid = document.getElementById('matches-grid');
  grid.innerHTML = '';

  let wins = 0, draws = 0, losses = 0, gfTotal = 0, gaTotal = 0;
  matches.forEach(m => {
    if (m.outcome==='W') wins++;
    else if (m.outcome==='D') draws++;
    else losses++;
    gfTotal += m.gf; gaTotal += m.ga;
  });

  matches.forEach((m, idx) => {
    if (idx === 26) {
      const sep = document.createElement('div');
      sep.className = 'playoff-separator';
      sep.textContent = inTopSix ? '── 🏆 פלייאוף עליון ──' : '── פלייאוף תחתון ──';
      grid.appendChild(sep);
    }
    const rc = m.outcome==='W' ? 'win' : m.outcome==='D' ? 'draw' : 'loss';
    const rl = m.outcome==='W' ? 'נ' : m.outcome==='D' ? 'ת' : 'ה';
    const row = document.createElement('div');
    row.className = `match-row ${rc}`;
    row.style.animationDelay = `${idx * 30}ms`;
    row.innerHTML = `
      <span class="mr-badge ${rc}">${rl}</span>
      <span class="mr-opponent">${m.opponent} <span class="mr-venue">${m.home?'(ב)':'(ח)'}</span></span>
      <span class="mr-score" dir="ltr">${m.gf}–${m.ga}</span>
    `;
    grid.appendChild(row);
  });

  countUp('res-wins',   wins,   200);
  countUp('res-draws',  draws,  600);
  countUp('res-losses', losses, 1000);

  setTimeout(() => {
    setEl('res-points', wins*3+draws);
    setEl('res-gf', gfTotal);
    setEl('res-ga', gaTotal);
  }, 1200);

  const leagueTable = generateLeagueTable(wins, draws, losses, inTopSix, champOpponents, relegOpponents);
  const myRank = leagueTable.findIndex(t => t.us) + 1;

  setTimeout(() => {
    const tier = getTier(wins, draws, losses, myRank, leagueTable.length, totalGames);
    setEl('res-tier', tier.name, tier.color);
    setEl('res-tier-sub', tier.sub);
    document.getElementById('tier-box').classList.add('visible');
    window._lastResult = { wins, draws, losses, gfTotal, gaTotal, matches, ovr, inTopSix };
    window._lastTier   = tier;
    setupSaveSection();
  }, 1600);

  // Build detailed stats after animations settle
  setTimeout(() => {
    buildOVRCard(ovr);
    const ps = simulatePlayerStats(matches);
    window._lastPlayerStats = ps;
    buildAwards(ps);
    buildPlayerStatsTable(ps);
    const hi = calcHighlights(matches);
    setEl('hl-streak', hi.maxStreak);
    setEl('hl-cs', hi.cs);
    setEl('hl-bigwin', hi.bigWin ? `${hi.bigWin.gf}–${hi.bigWin.ga} נגד ${hi.bigWin.opponent}` : '—');
    buildLeagueTable(leagueTable);
    const sec = document.getElementById('res-stats-section');
    if (sec) sec.classList.add('visible');
  }, 2200);
}

// ─── Share modal ───────────────────────────────────────────────────────────────
function openShareModal() {
  const r = window._lastResult;
  if (!r) return;
  populateShareCard();
  document.getElementById('share-modal').style.display = 'flex';
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
  document.getElementById('sc-w').textContent = r.wins;
  document.getElementById('sc-d').textContent = r.draws;
  document.getElementById('sc-l').textContent = r.losses;
  document.getElementById('sc-pts-text').textContent = `${pts} נקודות`;
  const tierEl = document.getElementById('sc-tier-text');
  tierEl.textContent = t.name;
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
    const lastName = pick.player.name.split(' ').at(-1);
    const row = document.createElement('div');
    row.className = 'sc-player-row';
    row.innerHTML = `
      <span class="sc-p-pos" style="color:${c};background:${c}18;border-color:${c}50">${slot.pos}</span>
      <span class="sc-p-name">${lastName}</span>
      ${state.showRatings ? `<span class="sc-p-ovr" style="color:${c}">${ovr}</span>` : ''}
    `;
    lineup.appendChild(row);
  });

  // Awards
  const awardsEl = document.getElementById('sc-share-awards');
  awardsEl.innerHTML = '';
  if (window._lastPlayerStats) {
    const ps = window._lastPlayerStats;
    const top = [...ps].sort((a, b) => b.goals - a.goals)[0];
    const pots = [...ps].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))[0];
    if (top) awardsEl.innerHTML += `<div class="sc-award-line">⚽ <b>מלך השערים:</b> ${top.name.split(' ').at(-1)} (${top.goals} שע׳)</div>`;
    if (pots) awardsEl.innerHTML += `<div class="sc-award-line">🏅 <b>שחקן העונה:</b> ${pots.name.split(' ').at(-1)} (${pots.goals}+${pots.assists})</div>`;
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
  return [
    `🇮🇱 36–0 | ליגת העל`,
    `מערך: ${formation} | דירוג: ${r.ovr}`,
    `${r.wins}נ–${r.draws}ת–${r.losses}ה | ${pts} נקודות`,
    t.name,
    grid,
    `36-0.app`,
  ].join('\n');
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
      await navigator.share({ files: [file], text });
      if (btn) { btn.textContent = '✓ שותף!'; setTimeout(() => btn.textContent = orig, 2000); }
      return;
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
  const { difficulty, showRatings, draftMode, peakMode, formationId } = state;
  const rerolls = { easy:3, normal:1, hard:0 };
  Object.assign(state, {
    difficulty, showRatings, draftMode, peakMode, formationId,
    slots:[], picks:[], currentRound:0,
    usedSquadIds:new Set(), usedPlayerKeys:new Set(), currentSquad:null,
    selectedPlayer:null, selectedSlotIdx:null,
    teamRerollsLeft: rerolls[difficulty] ?? 1,
    seasonRerollsLeft: rerolls[difficulty] ?? 1,
    isAnimating:false, awaitingSlotPick:false,
  });
  window._lastResult = null; window._lastTier = null; window._lastPlayerStats = null;
  const moveBtn = document.getElementById('btn-move-player');
  if (moveBtn) { moveBtn.style.display = 'none'; moveBtn.classList.remove('move-active'); moveBtn.textContent = '⇄ הזז שחקן'; }
  showScreen('setup');
}

// ─── Leaderboard integration ───────────────────────────────────────────────────
async function submitResult() {
  const user = getCurrentUser();
  if (!user) return;
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) return;

  const r = window._lastResult;
  const t = window._lastTier;
  if (!r || !t) return;

  const isPublic = document.getElementById('share-squad-checkbox')?.checked ?? false;

  const payload = {
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
      era_min:         state.eraMin,
      era_max:         state.eraMax,
      peak_mode:       state.peakMode,
      ratings_visible: state.showRatings,
    },
    players: state.picks.flatMap((pick, i) => {
      if (!pick) return [];
      return [{
        teamId: pick.squad.teamId,
        season: pick.squad.season,
        name:   pick.player.name,
        pos:    state.slots[i].pos,
        ovr:    playerOVR(pick.player),
        slotId: state.slots[i].id,
      }];
    }),
    matches:   r.matches.map(m => ({ gf: m.gf, ga: m.ga, venue: m.home ? 'home' : 'away' })),
    is_public: isPublic,
  };

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
    const json = await res.json();
    if (json.new_achievements?.length) await showAchievementToasts(json.new_achievements);
  } catch (err) {
    console.error('Failed to submit result:', err);
  }
}

function setupSaveSection() {
  const user        = getCurrentUser();
  const saveSection = document.getElementById('save-result-section');
  const loginPrompt = document.getElementById('save-login-prompt');
  if (!saveSection || !loginPrompt) return;

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
    await submitResult();
    saveBtn.textContent = '✓ נשמר!';
  };
}

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showScreen('welcome');
  initEraSlider();

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-start-draft').addEventListener('click', beginDraft);
  document.getElementById('btn-reroll-team').addEventListener('click', rerollTeam);
  document.getElementById('btn-reroll-season').addEventListener('click', rerollSeason);
  document.getElementById('btn-share').addEventListener('click', openShareModal);
  document.getElementById('btn-restart').addEventListener('click', restartGame);
  document.getElementById('btn-draft-restart').addEventListener('click', restartGame);
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

  document.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.option-row');
      if (row) selectOption(row.id, btn.dataset.val);
    });
  });
});
