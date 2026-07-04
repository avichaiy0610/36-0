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
// Which player-positions may fill each formation slot. Kept tight and realistic:
// a player only slots into his own position or a close, same-line relative — no
// winger playing striker, no attacking-mid dropping onto the wing, etc.
const COMPAT = {
  GK:  ['GK'],
  RB:  ['RB','LB'],  CB: ['CB'],  LB: ['LB','RB'],
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

// ─── Simulation opponents: computed from the latest season in the data ─────────
// The 13 strongest clubs of the newest season, each rated by its top-11 average,
// so the sim league always matches the current data (2025/26 today).
const IL_TEAMS_SIM = (() => {
  const latest = Math.max(...SQUADS.map(s => parseInt(s.season)));
  return SQUADS.filter(s => parseInt(s.season) === latest)
    .map(s => {
      const top = [...s.players].sort((a, b) => b.ovr - a.ovr).slice(0, 11);
      return {
        name: (TEAMS[s.teamId] ?? { name: s.teamId }).name,
        ovr: Math.round(top.reduce((sum, p) => sum + p.ovr, 0) / top.length),
      };
    })
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 13);
})();

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

function teamOVR() {
  let total = 0, weight = 0;
  state.picks.forEach((pick, i) => {
    if (!pick) return;
    const slot = state.slots[i];
    const w = POS_WEIGHT[slot.pos] ?? 1;
    const ovr = playerOVR(pick.player);
    const pp = playerPositions(pick.player);
    const inPos = (COMPAT[slot.pos] ?? []).slice(0, 2).includes(pp[0]) || pp.includes(slot.pos);
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
  // on mobile the screens scroll as page flow, so reset the window too
  // (otherwise the results screen opens scrolled to the bottom)
  window.scrollTo(0, 0);
  // pitches built while their screen was hidden couldn't be measured
  requestAnimationFrame(() => fitShortNames());
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
  // clear any leftover strength bars from a previous draft
  const ovrLines = document.getElementById('draft-ovr-lines');
  if (ovrLines) { ovrLines.innerHTML = ''; ovrLines.style.display = 'none'; }

  buildPitch('pitch-slots', true);
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
      difficulty: state.difficulty,
      showRatings: state.showRatings,
      draftMode: state.draftMode,
      peakMode: state.peakMode,
      eraMin: state.eraMin,
      eraMax: state.eraMax,
      currentRound: state.currentRound,
      teamRerollsLeft: state.teamRerollsLeft,
      seasonRerollsLeft: state.seasonRerollsLeft,
      awaitingSlotPick: state.awaitingSlotPick,
      selectedSlotIdx: state.selectedSlotIdx,
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
      matches: season.matches,
      inTopSix: season.inTopSix,
      leagueTable: season.leagueTable,
      playerStats: season.playerStats.map(({ squad, ...rest }) => rest),
    };
    localStorage.setItem(DRAFT_SAVE_KEY, JSON.stringify(d));
  } catch (e) {}
}

// Returns true if a saved draft was found and the UI was rebuilt from it
function restoreDraftState() {
  let d;
  try { d = JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY)); } catch (e) { return false; }
  if (!d || d.v !== 1 || !FORMATIONS[d.formationId]) return false;
  const slots = FORMATIONS[d.formationId].slots;
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
    formationId: d.formationId, slots, picks,
    difficulty: d.difficulty, showRatings: d.showRatings,
    draftMode: d.draftMode, peakMode: d.peakMode,
    eraMin: d.eraMin, eraMax: d.eraMax,
    currentRound: d.currentRound,
    teamRerollsLeft: d.teamRerollsLeft, seasonRerollsLeft: d.seasonRerollsLeft,
    usedSquadIds: new Set(d.usedSquadIds), usedPlayerKeys: new Set(d.usedPlayerKeys),
    currentSquad: bySquadId.get(d.currentSquadId) ?? null,
    selectedPlayer: null, selectedSlotIdx: null,
    isAnimating: false, awaitingSlotPick: false,
    moveMode: false, movingFromIdx: null,
  });

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
  token.style.setProperty('--tx', textColorFor(team.primaryColor));
  token.innerHTML = `
    <div class="slot-circle filled-circle">
      <span class="slot-player-short">${playerShortName(player.name)}</span>
    </div>
    <div class="slot-name-label">${player.name}</div>
  `;
  fitShortNames(token);
}

// Shrink token short-names until they fit their circle (nothing gets cut to
// "אבוק…"); re-run on resize/orientation change so the size always matches.
function fitShortNames(root = document) {
  root.querySelectorAll('.slot-circle').forEach(circle => {
    const span = circle.querySelector('.slot-player-short');
    if (!span) return;
    const max = circle.clientWidth - 6;
    if (max <= 0) return; // hidden screen — fitted again when shown
    span.style.maxWidth = 'none';
    span.style.fontSize = '';
    let size = parseFloat(getComputedStyle(span).fontSize) || 8;
    while (size > 4.5 && span.scrollWidth > max) {
      size -= 0.5;
      span.style.fontSize = size + 'px';
    }
    if (span.scrollWidth > max) span.style.maxWidth = max + 'px';
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
    setHint('בחר עמדה מוארת — לחץ שוב על השחקן לביטול');
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
      token.innerHTML = `
        <div class="slot-circle filled-circle">
          <span class="slot-player-short">${playerShortName(player.name)}</span>
        </div>
        <div class="slot-name-label">${player.name}</div>
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
  fitShortNames();
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
function renderSquadPlayers(squad, filterSlotIdx = null) {
  const list = document.getElementById('players-list');
  list.innerHTML = '';
  const players = [...squad.players].sort((a,b) => playerOVR(b) - playerOVR(a));

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
    // Show the player's OWN positions (primary + secondaries from the data),
    // not every slot he could be squeezed into via the compatibility rules.
    const fits = playerPositions(player);
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
  if (state.currentRound >= state.slots.length) setTimeout(() => showPreseason(teamOVR()), 500);
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
  // A player selected from the OLD squad must not carry over to the new one
  cancelPendingSelection();
  const era = getEraFilteredSquads();

  let pool = era.filter(sq => sq.teamId !== currentTeamId && sq.season === currentSeason && !state.usedSquadIds.has(sq.id));
  if (pool.length === 0) pool = era.filter(sq => sq.teamId !== currentTeamId && sq.season === currentSeason);
  if (pool.length === 0) pool = era.filter(sq => sq.teamId !== currentTeamId && !state.usedSquadIds.has(sq.id));
  if (pool.length === 0) pool = era.filter(sq => sq.teamId !== currentTeamId);
  if (pool.length === 0) pool = SQUADS.filter(sq => sq.teamId !== currentTeamId);
  const newSquad = pool[rand(0, pool.length - 1)];
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
  const newSquad = sameTeam[rand(0, sameTeam.length - 1)];
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
// Win-probability gain per OVR point of difference. Shared by every formula so
// the match sim, the bracket split and the final table stay consistent.
const WINP_SLOPE = 0.031;

function simulateMatch(myOvr, opp, homeOverride = null) {
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

function generateMatches(ovr) {
  // ── שלב הליגה: 26 משחקים (13 יריבים × בית + חוץ) ───────────────────────────
  const regPool    = [...IL_TEAMS_SIM, ...IL_TEAMS_SIM].sort(() => Math.random() - 0.5);
  const regMatches = regPool.map(opp => simulateMatch(ovr, opp));
  const regPts     = regMatches.reduce((s, m) => s + (m.outcome === 'W' ? 3 : m.outcome === 'D' ? 1 : 0), 0);

  // Estimate opponent regular-season pts to determine which playoff bracket we land in
  const avgOppOvr = Math.round(IL_TEAMS_SIM.reduce((s, t) => s + t.ovr, 0) / IL_TEAMS_SIM.length);
  const simTeamPts = IL_TEAMS_SIM.map(t => {
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
    m.scorers = [];  // record who scored (for the per-match results line)
    for (let g = 0; g < m.gf; g++) {
      const si = pickWeightedIdx(players.map(p => GOAL_W[p.slotPos] ?? 0));
      if (si >= 0) {
        players[si].goals++;
        m.scorers.push({ n: playerShortName(players[si].name), min: rand(1, 90) });
      }
      if (Math.random() > 0.15) {
        const ai = pickWeightedIdx(players.map((p,i) => i === si ? 0 : ASSIST_W[p.slotPos] ?? 0));
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
    row.innerHTML = `
      <span class="st-pos-badge ${type}">${p.slotPos}</span>
      <span class="st-name">${playerShortName(p.name)}</span>
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
// tier.name is canonical (achievements on the server match it) — the DISPLAYED
// name/sub go through tierDisplay(), which allows admin overrides per tier id.
function getTier(wins, draws, losses, rank, n, totalGames) {
  const pts = wins * 3 + draws;
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
function calcPreseasonOdds(ovr, simCount = 300) {
  let ranks = [], totalPts = 0;
  for (let i = 0; i < simCount; i++) {
    const { matches, inTopSix, champOpponents, relegOpponents } = generateMatches(ovr);
    const w = matches.filter(m => m.outcome === 'W').length;
    const d = matches.filter(m => m.outcome === 'D').length;
    const l = matches.filter(m => m.outcome === 'L').length;
    const table = generateLeagueTable(w, d, l, inTopSix, champOpponents, relegOpponents);
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
    const odds = calcPreseasonOdds(ovr);
    window._preseasonProjected = odds.projectedFinish;  // reused by the results story
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

function showResults() {
  buildResultsPitch();
  const ovr = teamOVR();
  showScreen('results');
  setTimeout(() => animateResults(ovr), 400);
}

function buildPitchInContainer(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
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
      token.style.setProperty('--tx', textColorFor(team.primaryColor));
      token.innerHTML = `
        <div class="slot-circle filled-circle">
          <span class="slot-player-short">${playerShortName(pick.player.name)}</span>
        </div>
        <div class="slot-name-label">${pick.player.name}</div>
      `;
    } else {
      token.innerHTML = `
        <div class="slot-circle"><span class="slot-pos-label">${slot.pos}</span></div>
        <div class="slot-name-label">${slot.label}</div>
      `;
    }
    container.appendChild(token);
  });
  fitShortNames(container);
}

function buildResultsPitch() { buildPitchInContainer('results-pitch-slots'); }

function animateResults(ovr) {
  // Reuse a season restored from storage; otherwise simulate once and persist,
  // so refreshing cannot re-roll a different outcome for the same squad.
  let season = window._restoredSeason ?? null;
  window._restoredSeason = null;
  const seasonWasRestored = !!season;  // refresh → skip the match-by-match suspense
  if (!season) {
    const g = generateMatches(ovr);
    let w = 0, d = 0;
    g.matches.forEach(m => { if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; });
    const l = g.matches.length - w - d;
    season = {
      ovr,
      matches: g.matches,
      inTopSix: g.inTopSix,
      leagueTable: generateLeagueTable(w, d, l, g.inTopSix, g.champOpponents, g.relegOpponents),
      playerStats: simulatePlayerStats(g.matches),
      projectedFinish: window._preseasonProjected ?? calcPreseasonOdds(ovr).projectedFinish,
    };
    saveSeasonState(season);
    // count every finished season (for the games_N achievements) — once per
    // season: restored seasons skip this block
    if (typeof getCurrentUser === 'function' && getCurrentUser()) {
      _supabase.rpc('increment_games_played').then(() => {}, () => {});
    }
  }
  const { matches, inTopSix, leagueTable, playerStats } = season;
  ovr = season.ovr;
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
  const myRank = leagueTable.findIndex(t => t.us) + 1;

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
    sep.textContent = inTopSix ? '── 🏆 פלייאוף עליון ──' : '── פלייאוף תחתון ──';
    return sep;
  }

  // Fills the summary cards, stats and story once all matches are on screen.
  function finalizeResults() {
    setEl('res-wins', wins); setEl('res-draws', draws); setEl('res-losses', losses);
    setEl('res-points', wins*3+draws); setEl('res-gf', gfTotal); setEl('res-ga', gaTotal);

    const tier = getTier(wins, draws, losses, myRank, leagueTable.length, totalGames);
    const td = tierDisplay(tier);
    setEl('res-tier', td.name, tier.color);
    setEl('res-tier-sub', td.sub);
    document.getElementById('tier-box').classList.add('visible');
    window._lastResult = { wins, draws, losses, gfTotal, gaTotal, matches, ovr, inTopSix };
    window._lastTier   = tier;
    const diffMapR = {
      easy:   siteText('label-diff-easy', 'קל'),
      normal: siteText('label-diff-normal', 'רגיל'),
      hard:   siteText('label-diff-hard', 'קשה'),
    };
    const modeParts = [diffMapR[state.difficulty] ?? state.difficulty];
    if (state.peakMode) modeParts.push(siteText('label-peak-mode', '⚡ מצב שיא'));
    if (!state.showRatings) modeParts.push(siteText('label-hidden-ratings', '🙈 דירוגים מוסתרים'));
    const modeInfoEl = document.getElementById('res-mode-info');
    if (modeInfoEl) modeInfoEl.textContent = modeParts.join(' · ');
    setupSaveSection();

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
    buildLeagueTable(leagueTable);
    renderSeasonStory({ wins, draws, losses, gfTotal, gaTotal, ovr, myRank,
                        projectedFinish: season.projectedFinish, ps: playerStats, tier });
    const sec = document.getElementById('res-stats-section');
    if (sec) sec.classList.add('visible');
    return tier;
  }

  // ── Restored season (page refresh): render everything instantly, no suspense ──
  if (seasonWasRestored) {
    matches.forEach((m, idx) => {
      if (idx === 26) grid.appendChild(separatorRow());
      grid.appendChild(makeMatchRow(m));
    });
    finalizeResults();
    return;
  }

  // ── Fresh simulation: reveal matches one by one with a running tally + skip ──
  let rw = 0, rd = 0, rl = 0;
  document.querySelectorAll('#res-wins,#res-draws,#res-losses').forEach(e => e.textContent = '0');
  const skipBtn = document.getElementById('btn-skip-matches');
  if (skipBtn) skipBtn.style.display = 'block';

  let idx = 0, timer = null;
  function revealOne() {
    if (idx === 26) grid.appendChild(separatorRow());
    const m = matches[idx];
    grid.appendChild(makeMatchRow(m));
    if (m.outcome === 'W') rw++; else if (m.outcome === 'D') rd++; else rl++;
    setEl('res-wins', rw); setEl('res-draws', rd); setEl('res-losses', rl);
    grid.scrollTop = grid.scrollHeight;
    idx++;
    if (idx < matches.length) timer = setTimeout(revealOne, 130);
    else endReveal();
  }
  function endReveal() {
    clearTimeout(timer);
    // append any not-yet-shown matches (skip path)
    for (; idx < matches.length; idx++) {
      if (idx === 26) grid.appendChild(separatorRow());
      grid.appendChild(makeMatchRow(matches[idx]));
    }
    if (skipBtn) skipBtn.style.display = 'none';
    const tier = finalizeResults();
    setTimeout(() => showPlacementPopup(tier, myRank), 400);
  }
  if (skipBtn) skipBtn.onclick = endReveal;
  timer = setTimeout(revealOne, 200);
}

// Popup announcing where the season finished (shown after the reveal)
function showPlacementPopup(tier, rank) {
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
  modal.querySelector('#placement-close').onclick = () => { modal.style.display = 'none'; };
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

function renderSeasonStory(r) {
  const st = typeof siteText === 'function' ? siteText : (_k, d) => d;

  // 1) Projected vs actual
  document.getElementById('res-finish').textContent    = placeLabel(r.myRank);
  document.getElementById('res-projected').textContent = placeLabel(r.projectedFinish);
  const vtile = document.getElementById('res-verdict-tile');
  const vEl   = document.getElementById('res-verdict');
  vtile.classList.remove('over', 'under', 'exact');
  if (r.myRank < r.projectedFinish)      { vtile.classList.add('over');  vEl.textContent = st('verdict-over', 'מעל הציפיות 🔥'); }
  else if (r.myRank > r.projectedFinish) { vtile.classList.add('under'); vEl.textContent = st('verdict-under', 'מתחת לציפיות'); }
  else                                   { vtile.classList.add('exact'); vEl.textContent = st('verdict-exact', 'בדיוק כצפוי'); }

  // 2) Qualitative strength chips
  const cats = [
    { key: 'qual-cat-atk', def: 'התקפה', pos: ATK_POS },
    { key: 'qual-cat-mid', def: 'קישור', pos: MID_POS },
    { key: 'qual-cat-def', def: 'הגנה',  pos: DEF_POS },
    { key: 'qual-cat-gk',  def: 'שוער',  pos: ['GK'] },
  ];
  const rated = cats.map(c => ({ ...c, val: calcGroupOVR(c.pos) })).filter(c => c.val !== null);
  const chipsEl = document.getElementById('res-qual-chips');
  chipsEl.innerHTML = rated.map(c => {
    const t = qualTier(c.val);
    return `<div class="qual-chip"><span class="qc-cat">${st(c.key, c.def)}</span>`
         + `<span class="qc-val" style="color:${t.color}">${st(t.key, t.def)}</span></div>`;
  }).join('');
  // one-line summary: strongest + weakest line
  const best  = rated.reduce((a, b) => b.val > a.val ? b : a);
  const worst = rated.reduce((a, b) => b.val < a.val ? b : a);
  document.getElementById('res-qual-summary').textContent =
    fillTemplate(st('qual-summary-tmpl', 'החוזק הגדול היה ה{best}, והחוליה החלשה — ה{worst}.'),
      { best: st(best.key, best.def), worst: st(worst.key, worst.def) });

  // 3) Narrative recap — template chosen by outcome
  const pts = r.wins * 3 + r.draws;
  const champ = r.myRank === 1;
  const top6  = r.myRank <= 6;
  let titleKey, bodyKey, titleDef, bodyDef;
  if (r.wins === (r.wins + r.draws + r.losses)) { // perfect season
    titleKey = 'story-perfect-title'; titleDef = 'מושלם. בלתי אפשרי הפך למציאות. 🏆';
    bodyKey  = 'story-perfect-body';  bodyDef  = 'עונה בלי ולו נקודה אחת שאבדה. {wins} ניצחונות מתוך {wins}. אין על מה להתווכח — זו האלמותיות.';
  } else if (champ) {
    titleKey = 'story-champ-title'; titleDef = 'אלופים! 🏆';
    bodyKey  = 'story-champ-body';  bodyDef  = 'הם המשיכו לדפוק בדלת, והפעם היא נפתחה. {pts} נקודות בקופה, {wins} ניצחונות, ואליפות שאף אחד לא יכול לקחת.';
  } else if (top6) {
    titleKey = 'story-top6-title'; titleDef = 'עונה גדולה 🥈';
    bodyKey  = 'story-top6-body';  bodyDef  = 'מקום {rank} וכרטיס לפלייאוף האליפות. {pts} נקודות ועונה שכמעט נגעה בזהב — עד כמה זה היה קרוב?';
  } else if (r.myRank <= 12) {
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
  modeParts.push(diffMap[state.difficulty] ?? state.difficulty);
  if (state.peakMode) modeParts.push('⚡ שיא');
  if (!state.showRatings) modeParts.push('🙈 סמוי');
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
  return [
    `🇮🇱 36–0 | ליגת העל`,
    `מערך: ${formation} | דירוג: ${r.ovr}`,
    `${r.wins}נ-${r.draws}ת-${r.losses}ה | ${pts} נקודות`,
    tierDisplay(t).name,
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
  clearDraftState();
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
  // Resume a saved draft if one exists; otherwise start at the welcome screen
  if (!restoreDraftState()) showScreen('welcome');
  initEraSlider();
  window.addEventListener('resize', () => fitShortNames());

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-start-draft').addEventListener('click', beginDraft);
  document.getElementById('btn-reroll-team').addEventListener('click', rerollTeam);
  document.getElementById('btn-reroll-season').addEventListener('click', rerollSeason);
  document.getElementById('btn-share').addEventListener('click', openShareModal);
  document.getElementById('btn-restart').addEventListener('click', restartGame);
  document.getElementById('btn-draft-restart').addEventListener('click', restartGame);
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

  document.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.option-row');
      if (row) selectOption(row.id, btn.dataset.val);
    });
  });
});
