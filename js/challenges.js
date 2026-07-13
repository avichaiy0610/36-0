// ─── Rotating challenges: daily / weekly / monthly ─────────────────────────────
// Every period, everyone gets the SAME conditions (formation, era, difficulty,
// ratings, peak) and the SAME deterministic squad deck — so scores are truly
// comparable. Conditions are DERIVED from the challenge key (zero maintenance),
// unless the admin saved an override in challenge_overrides (editable in
// advance from admin.html). Multiple attempts allowed; the server keeps the
// best run per user per challenge (see submit-result + challenge_results).
//
// This file is self-contained (own rng, no duel.js/league-sim.js dependency)
// so admin.html can load it to preview/derive conditions.

const CHAL_EPOCH = '2026-07-10';   // daily #1; weekly #1 = its week; monthly #1 = its month

const CHAL_PERIODS = {
  daily:   { label: 'האתגר היומי',   short: 'יומי',   icon: '🗓️' },
  weekly:  { label: 'האתגר השבועי', short: 'שבועי', icon: '📅' },
  monthly: { label: 'האתגר החודשי', short: 'חודשי', icon: '🏆' },
};

// Fallbacks let admin.html derive settings without loading the whole game.
const CHAL_FORMATION_KEYS = (typeof FORMATIONS !== 'undefined')
  ? Object.keys(FORMATIONS)
  : ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '3-4-3', '4-1-4-1', '4-5-1', '4-3-2-1'];
function chalYearMin() { return (typeof YEAR_MIN !== 'undefined') ? YEAR_MIN : 1999; }
function chalYearMax() { return (typeof YEAR_MAX !== 'undefined') ? YEAR_MAX : 2024; }

// ── Self-contained deterministic rng (FNV-1a seed + mulberry32) ────────────────
function chalSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(str).length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 1;
}
function chalRng(str) {
  let a = chalSeed(str);
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Challenge keys (boundaries follow Israel time, like the server) ────────────
function chalPad(n) { return String(n).padStart(2, '0'); }

function chalIsraelParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date ?? new Date());
  const get = t => parts.find(p => p.type === t)?.value ?? '';
  return {
    y: +get('year'), m: +get('month'), d: +get('day'),
    wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  };
}

// daily 'YYYY-MM-DD' · weekly the week's Sunday date · monthly 'YYYY-MM'
function challengeKey(period, date) {
  const { y, m, d, wd } = chalIsraelParts(date);
  if (period === 'monthly') return `${y}-${chalPad(m)}`;
  if (period === 'weekly')
    return new Date(Date.UTC(y, m - 1, d) - Math.max(0, wd) * 86400000).toISOString().slice(0, 10);
  return `${y}-${chalPad(m)}-${chalPad(d)}`;
}

function challengeNumber(period, key) {
  const k = key ?? challengeKey(period);
  if (period === 'monthly') {
    const [ey, em] = CHAL_EPOCH.split('-').map(Number);
    const [y, m] = k.split('-').map(Number);
    return (y - ey) * 12 + (m - em) + 1;
  }
  const epochDay = Date.parse(period === 'weekly'
    ? new Date(Date.parse(CHAL_EPOCH) - (new Date(CHAL_EPOCH).getUTCDay()) * 86400000).toISOString().slice(0, 10)
    : CHAL_EPOCH);
  const div = period === 'weekly' ? 7 * 86400000 : 86400000;
  return Math.round((Date.parse(k) - epochDay) / div) + 1;
}

// Editable text lookup (site_texts via admin.html); safe when texts.js isn't
// loaded (admin page) — falls back to the built-in default.
function chalText(key, def) {
  return (typeof siteText === 'function') ? siteText(key, def) : def;
}

function challengeLabel(period) {
  return chalText('chal-label-' + period, CHAL_PERIODS[period]?.label ?? period);
}

// ── Derived conditions (pure function of period + key) ─────────────────────────
function deriveChallengeSettings(period, key) {
  const rng  = chalRng(`chal|${period}|${key}|settings`);
  const pick = arr => arr[Math.floor(rng() * arr.length)];

  const formationId = pick(CHAL_FORMATION_KEYS);

  const yMin = chalYearMin(), yMax = chalYearMax();
  const eraOptions = [
    { label: chalText('chal-era-all', 'כל הזמנים'),        min: yMin,                 max: yMax, w: 3 },
    { label: chalText('chal-era-2003', '2003 והלאה'),      min: Math.max(2003, yMin), max: yMax, w: 2 },
    { label: chalText('chal-era-2010', '2010 והלאה'),      min: Math.max(2010, yMin), max: yMax, w: 2 },
    { label: chalText('chal-era-2016', 'מודרני (2016+)'),  min: Math.max(2016, yMin), max: yMax, w: 2 },
    { label: chalText('chal-era-00s', 'שנות ה-2000'),      min: Math.max(2000, yMin), max: 2009, w: 1 },
    { label: chalText('chal-era-10s', 'העשור של 2010'),    min: Math.max(2010, yMin), max: 2019, w: 1 },
  ];
  const totalW = eraOptions.reduce((s, e) => s + e.w, 0);
  let r = rng() * totalW;
  let era = eraOptions[0];
  for (const e of eraOptions) { r -= e.w; if (r <= 0) { era = e; break; } }

  const dr = rng();
  const difficulty = dr < 0.15 ? 'easy' : dr < 0.75 ? 'normal' : 'hard';
  const ratingsVisible = rng() >= 0.3;
  const peakMode = rng() < 0.15;

  return {
    formationId, difficulty, ratingsVisible, peakMode,
    eraMin: era.min, eraMax: era.max, eraLabel: era.label,
  };
}

// ── Admin overrides (challenge_overrides) — merged over the derived values ─────
let _chalOverrides = {};          // 'period|key' -> settings jsonb
let _chalOverridesReady = null;   // promise; resolves even on fetch failure

function loadChallengeOverrides() {
  if (_chalOverridesReady) return _chalOverridesReady;
  _chalOverridesReady = (async () => {
    try {
      const keys = ['daily', 'weekly', 'monthly'].map(p => challengeKey(p));
      const { data } = await _supabase.from('challenge_overrides')
        .select('period, challenge_key, settings')
        .in('challenge_key', keys);
      (data ?? []).forEach(row => { _chalOverrides[row.period + '|' + row.challenge_key] = row.settings; });
    } catch (e) { /* offline / not deployed yet — derived settings still work */ }
  })();
  return _chalOverridesReady;
}

// Effective conditions: derived, with any admin override fields applied on top.
function challengeSettings(period, key) {
  const k = key ?? challengeKey(period);
  const s = deriveChallengeSettings(period, k);
  const ov = _chalOverrides[period + '|' + k];
  if (ov) {
    if (ov.formation_id && CHAL_FORMATION_KEYS.includes(ov.formation_id)) s.formationId = ov.formation_id;
    if (ov.difficulty) s.difficulty = ov.difficulty;
    if (typeof ov.ratings_visible === 'boolean') s.ratingsVisible = ov.ratings_visible;
    if (typeof ov.peak_mode === 'boolean') s.peakMode = ov.peak_mode;
    if (ov.era_min || ov.era_max) {
      s.eraMin = ov.era_min ?? s.eraMin;
      s.eraMax = ov.era_max ?? s.eraMax;
      // A partial override can invert the derived range (e.g. era_min 2016 over
      // a derived 2000–2009 era) — widen the non-overridden bound instead.
      if (s.eraMin > s.eraMax) {
        if (!ov.era_max) s.eraMax = chalYearMax();
        else if (!ov.era_min) s.eraMin = chalYearMin();
        else [s.eraMin, s.eraMax] = [s.eraMax, s.eraMin];
      }
      s.eraLabel = s.eraMin <= chalYearMin() && s.eraMax >= chalYearMax()
        ? 'כל הזמנים' : `${s.eraMin}–${s.eraMax}`;
    }
  }
  return s;
}

// ── The shared deck: deterministic shuffle of every squad in the era ───────────
// When missions need specific supply (a club, an era slice), the deck is
// deterministically rearranged so enough matching squads appear in the first
// draws — identical for everyone, and the mission is always completable.
function challengeDeckFor(period, key, eraMin, eraMax, reqs) {
  const pool = SQUADS.filter(sq => {
    const y = parseSeasonYear(sq.season);
    return y >= eraMin && y <= eraMax;
  });
  const deck = pool.length ? [...pool] : [...SQUADS];
  const rng = chalRng(`chal|${period}|${key}|deck`);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return chalSeedDeckForReqs(deck, reqs, rng);
}

function chalSeedDeckForReqs(deck, reqs, rng) {
  const preds = [];
  (reqs ?? []).forEach(r => {
    if (r.type === 'club_count')
      preds.push({ need: (r.n ?? 1) + 2, fn: sq => sq.teamId === r.teamId });
    else if (r.type === 'min_era_before')
      preds.push({ need: (r.n ?? 1) + 2, fn: sq => parseSeasonYear(sq.season) < r.year });
    else if (r.type === 'min_era_after')
      preds.push({ need: (r.n ?? 1) + 2, fn: sq => parseSeasonYear(sq.season) >= r.year });
    else if (r.type === 'nat_count')
      preds.push({ need: (r.n ?? 1) + 2, fn: sq => sq.players.some(pl => chalPlayerHasNat(pl.name, r.nat, r.dual)) });
  });
  if (!preds.length) return deck;

  // Rebuild the first WINDOW entries: guaranteed supply first (in deck order),
  // topped up with the earliest remaining squads, then reshuffled so the
  // guaranteed squads aren't clumped at the very start.
  const WINDOW = 16;
  const taken = new Set();
  const head = [];
  preds.forEach(p => {
    let have = 0;
    for (const sq of deck) {
      if (have >= p.need) break;
      if (!taken.has(sq.id) && p.fn(sq)) { head.push(sq); taken.add(sq.id); have++; }
    }
  });
  for (const sq of deck) {
    if (head.length >= WINDOW) break;
    if (!taken.has(sq.id)) { head.push(sq); taken.add(sq.id); }
  }
  const rest = deck.filter(sq => !taken.has(sq.id));
  for (let i = head.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [head[i], head[j]] = [head[j], head[i]];
  }
  return [...head, ...rest];
}

function challengeConditionChips(s) {
  const diffMap = {
    easy:   chalText('label-diff-easy', 'קל'),
    normal: chalText('label-diff-normal', 'רגיל'),
    hard:   chalText('label-diff-hard', 'קשה'),
  };
  const fLabel = (typeof FORMATIONS !== 'undefined' && FORMATIONS[s.formationId]?.label) || s.formationId;
  const chips = [
    '🧩 ' + fLabel,
    '📅 ' + s.eraLabel,
    '🎯 ' + (diffMap[s.difficulty] ?? s.difficulty),
    s.ratingsVisible
      ? '👁️ ' + chalText('chal-chip-ratings-on', 'דירוגים גלויים')
      : '🙈 ' + chalText('chal-chip-ratings-off', 'דירוגים מוסתרים'),
  ];
  if (s.peakMode) chips.push('⚡ ' + chalText('chal-chip-peak', 'מצב שיא'));
  return chips;
}

// ─── Challenge requirements (the "missions" that make a challenge) ─────────────
// Each challenge comes with 1-3 requirements the drafted XI must satisfy, e.g.
// "at least 2 players from Hapoel Be'er Sheva" or "final squad rating 82 max".
// They are derived from the key like everything else; the admin can replace
// them per challenge via challenge_overrides.settings.requirements.
//
// Requirement shapes:
//   { type:'club_count',     teamId, n }   at least n players from that club
//   { type:'max_team_ovr',   x }           final team OVR must be ≤ x
//   { type:'max_player_ovr', x }           every player's OVR must be ≤ x
//   { type:'min_low_ovr',    n, x }        at least n players rated ≤ x
//   { type:'all_diff_clubs' }              all 11 players from different clubs
//   { type:'min_era_before', n, year }     at least n players from seasons < year
//   { type:'min_era_after',  n, year }     at least n players from seasons ≥ year
//   { type:'nat_count',      nat, n, dual? }  at least n players of that nationality.
//       The game treats a player's SECOND citizenship as nonexistent — counting
//       and display use the primary nationality only — unless the admin marks
//       the mission with dual:true (never auto-generated with dual).

const CHAL_REQ_COUNT = { daily: 1, weekly: 2, monthly: 3 };

function chalTeamName(teamId) {
  return (typeof TEAMS !== 'undefined' && TEAMS[teamId]?.name) || teamId;
}

// Escaped mission text + a real flag image for nationality missions.
function challengeReqHTML(req) {
  const flag = (req.type === 'nat_count' && typeof natFlagImg === 'function')
    ? ' ' + natFlagImg(req.nat) : '';
  return lgEsc(challengeReqText(req)) + flag;
}

function chalSeasonLabel(year) { return `${year}/${String(year + 1).slice(-2)}`; }

// Clubs with enough squads inside the era window to make a club mission fair.
function chalEligibleClubs(eraMin, eraMax, minSquads) {
  if (typeof SQUADS === 'undefined') return [];
  const counts = {};
  SQUADS.forEach(sq => {
    const y = parseSeasonYear(sq.season);
    if (y >= eraMin && y <= eraMax) counts[sq.teamId] = (counts[sq.teamId] ?? 0) + 1;
  });
  return Object.keys(counts).filter(t => counts[t] >= minSquads).sort();
}

// Countries with enough supply (by PRIMARY nationality) inside the era window
// to make a nationality mission fair. Israel is excluded — "one Israeli" is
// trivially true in every squad.
let _natSupplyCache = {};
function chalEligibleNats(eraMin, eraMax, minPlayers, minSquads) {
  if (typeof SQUADS === 'undefined' || typeof playerNats !== 'function') return [];
  const ck = eraMin + '|' + eraMax;
  if (!_natSupplyCache[ck]) {
    const players = {}, squads = {};
    SQUADS.forEach(sq => {
      const y = parseSeasonYear(sq.season);
      if (y < eraMin || y > eraMax) return;
      const seen = new Set();
      sq.players.forEach(pl => {
        const n1 = playerNats(pl.name)[0];
        if (!n1) return;
        (players[n1] = players[n1] ?? new Set()).add(natKey(pl.name));
        if (!seen.has(n1)) { seen.add(n1); squads[n1] = (squads[n1] ?? 0) + 1; }
      });
    });
    _natSupplyCache[ck] = { players, squads };
  }
  const { players, squads } = _natSupplyCache[ck];
  return Object.keys(players)
    .filter(c => c !== 'ישראל' && players[c].size >= minPlayers && (squads[c] ?? 0) >= minSquads)
    .sort();
}

// The auto-derived requirement set for a challenge (admin override replaces it).
function challengeRequirements(period, key, settings) {
  const k = key ?? challengeKey(period);
  const ov = _chalOverrides[period + '|' + k];
  if (ov && Array.isArray(ov.requirements)) return ov.requirements;   // [] = no missions

  const s = settings ?? challengeSettings(period, k);
  const rng = chalRng(`chal|${period}|${k}|reqs`);
  const pickOf = arr => arr[Math.floor(rng() * arr.length)];
  const intIn = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

  // era-based missions need room on both sides of the cut year
  const eraYears = [];
  for (let y = s.eraMin + 4; y <= s.eraMax - 4; y++) eraYears.push(y);
  const clubs = chalEligibleClubs(s.eraMin, s.eraMax, 5);
  const natCands = chalEligibleNats(s.eraMin, s.eraMax, 6, 6);

  // build the pool of available templates for THIS challenge
  const pool = [];
  if (clubs.length) pool.push('club_count');
  if (natCands.length) pool.push('nat_count');
  pool.push('all_diff_clubs');
  if (s.ratingsVisible) pool.push('max_team_ovr', 'max_player_ovr', 'min_low_ovr');
  if (eraYears.length) pool.push('min_era_before', 'min_era_after');

  const wanted = Math.min(CHAL_REQ_COUNT[period] ?? 1, pool.length);
  const reqs = [];
  let supplyReqs = 0;   // club/era missions rearrange the deck — cap them at 2
  const ovrCapUsed = () => reqs.some(r => r.type === 'max_team_ovr' || r.type === 'max_player_ovr');

  while (reqs.length < wanted && pool.length) {
    const type = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    if ((type === 'max_team_ovr' || type === 'max_player_ovr') && ovrCapUsed()) continue;
    if ((type === 'club_count' || type === 'nat_count' || type.startsWith('min_era')) && supplyReqs >= 2) continue;

    if (type === 'club_count') {
      reqs.push({ type, teamId: pickOf(clubs), n: rng() < 0.6 ? 1 : 2 });
      supplyReqs++;
    } else if (type === 'nat_count') {
      // auto nat missions use the PRIMARY nationality only (never dual)
      reqs.push({ type, nat: pickOf(natCands), n: rng() < 0.6 ? 1 : 2 });
      supplyReqs++;
    } else if (type === 'max_team_ovr') {
      reqs.push({ type, x: intIn(79, 85) });
    } else if (type === 'max_player_ovr') {
      reqs.push({ type, x: intIn(80, 84) });
    } else if (type === 'min_low_ovr') {
      reqs.push({ type, n: intIn(2, 4), x: intIn(72, 76) });
    } else if (type === 'all_diff_clubs') {
      reqs.push({ type });
    } else if (type === 'min_era_before' || type === 'min_era_after') {
      reqs.push({ type, n: intIn(2, 3), year: pickOf(eraYears) });
      supplyReqs++;
    }
  }
  return reqs;
}

// Every mission-text template is editable in the admin texts panel.
function challengeReqText(req) {
  const t = (key, def, vars) => {
    let s = chalText(key, def);
    Object.entries(vars ?? {}).forEach(([k, v]) => { s = s.replace('{' + k + '}', v); });
    return s;
  };
  switch (req.type) {
    case 'club_count':
      return req.n === 1
        ? t('chal-req-club-one', 'שחקן אחד לפחות מ{club}', { club: chalTeamName(req.teamId) })
        : t('chal-req-club-many', 'לפחות {n} שחקנים מ{club}', { n: req.n, club: chalTeamName(req.teamId) });
    case 'max_team_ovr':   return t('chal-req-max-team-ovr', 'דירוג ההרכב הסופי — עד {x}', { x: req.x });
    case 'max_player_ovr': return t('chal-req-max-player-ovr', 'בלי שחקנים עם דירוג מעל {x}', { x: req.x });
    case 'min_low_ovr':    return t('chal-req-min-low-ovr', 'לפחות {n} שחקנים עם דירוג {x} ומטה', { n: req.n, x: req.x });
    case 'all_diff_clubs': return t('chal-req-all-diff', 'כל השחקנים ממועדונים שונים');
    case 'min_era_before': return t('chal-req-era-before', 'לפחות {n} שחקנים מעונות שלפני {season}', { n: req.n, season: chalSeasonLabel(req.year) });
    case 'min_era_after':  return t('chal-req-era-after', 'לפחות {n} שחקנים מעונת {season} ומעלה', { n: req.n, season: chalSeasonLabel(req.year) });
    case 'nat_count': {
      // plain text only — the flag is added as an IMAGE by challengeReqHTML
      // (Windows browsers can't render flag emoji)
      const base = req.n === 1
        ? t('chal-req-nat-one', 'שחקן אחד לפחות מ{nat}', { nat: req.nat })
        : t('chal-req-nat-many', 'לפחות {n} שחקנים מ{nat}', { n: req.n, nat: req.nat });
      return base + (req.dual ? ' ' + t('chal-req-dual-suffix', '(כולל אזרחות שנייה)') : '');
    }
    default: return '';
  }
}

// Does this player count for a nationality mission? By default only the
// PRIMARY nationality counts — the second citizenship "doesn't exist" for the
// game unless the mission explicitly opts in with dual:true.
function chalPlayerHasNat(name, nat, dual) {
  if (typeof playerNats !== 'function') return false;
  const nats = playerNats(name);
  return dual ? nats.includes(nat) : nats[0] === nat;
}

// Nationalities required by the ACTIVE challenge — the draft UI shows player
// nationalities only when this is non-empty (attributes appear only in the
// challenges they're relevant to).
function challengeActiveNats() {
  if (!state.challenge) return [];
  return (state.challengeReqs ?? [])
    .filter(r => r.type === 'nat_count').map(r => r.nat);
}

// True when an active nat mission opted into second citizenships — only then
// does the UI reveal them.
function challengeDualNatsActive() {
  if (!state.challenge) return false;
  return (state.challengeReqs ?? []).some(r => r.type === 'nat_count' && r.dual);
}

// Live status of one requirement against the current draft picks.
// Returns { met, done, cur, target } — `met` = satisfied right now,
// `done` = can no longer fail (for count-up missions) or squad complete.
function challengeReqStatus(req) {
  const picks = state.picks.filter(Boolean);
  const total = state.slots.length || 11;
  const complete = picks.length >= total;
  const povr = p => (typeof playerOVR === 'function') ? playerOVR(p.player) : p.player.ovr;

  switch (req.type) {
    case 'club_count': {
      const cur = picks.filter(p => p.squad.teamId === req.teamId).length;
      return { met: cur >= req.n, done: cur >= req.n, cur, target: req.n };
    }
    case 'max_team_ovr': {
      const cur = (typeof teamOVR === 'function') ? teamOVR() : 0;
      const okNow = cur <= req.x;
      return { met: okNow && complete, done: complete, cur, target: req.x, softFail: !okNow };
    }
    case 'max_player_ovr': {
      const bad = picks.filter(p => povr(p) > req.x).length;
      return { met: bad === 0 && complete, done: complete, cur: bad, target: 0, softFail: bad > 0 };
    }
    case 'min_low_ovr': {
      const cur = picks.filter(p => povr(p) <= req.x).length;
      return { met: cur >= req.n, done: cur >= req.n, cur, target: req.n };
    }
    case 'all_diff_clubs': {
      const uniq = new Set(picks.map(p => p.squad.teamId)).size;
      const ok = uniq === picks.length;
      return { met: ok && complete, done: complete, cur: uniq, target: total, softFail: !ok };
    }
    case 'min_era_before': {
      const cur = picks.filter(p => parseSeasonYear(p.squad.season) < req.year).length;
      return { met: cur >= req.n, done: cur >= req.n, cur, target: req.n };
    }
    case 'min_era_after': {
      const cur = picks.filter(p => parseSeasonYear(p.squad.season) >= req.year).length;
      return { met: cur >= req.n, done: cur >= req.n, cur, target: req.n };
    }
    case 'nat_count': {
      const cur = picks.filter(p => chalPlayerHasNat(p.player.name, req.nat, req.dual)).length;
      return { met: cur >= req.n, done: cur >= req.n, cur, target: req.n };
    }
    default: return { met: true, done: true, cur: 0, target: 0 };
  }
}

function challengeReqsMet() {
  return (state.challengeReqs ?? []).every(r => challengeReqStatus(r).met);
}

// ── Start playing a challenge (skips the setup screen — everything locked) ─────
async function startChallenge(period) {
  await loadChallengeOverrides();
  const key = challengeKey(period);
  const s = challengeSettings(period, key);

  // leave any league/duel/review context, exactly like startGame() does
  state.leagueCode = null;
  state.duelCode = null;
  window._leagueReviewMode = null;
  window._duelReviewMode = null;
  document.getElementById('league-review-back')?.remove();
  document.getElementById('duel-review-chrome')?.remove();

  state.challenge   = { period, key };
  state.formationId = s.formationId;
  state.difficulty  = s.difficulty;
  state.showRatings = s.ratingsVisible;
  state.draftMode   = 'squad-first';
  state.peakMode    = s.peakMode;
  state.eraMin      = s.eraMin;
  state.eraMax      = s.eraMax;
  state.challengeReqs = challengeRequirements(period, key, s);
  state.challengeDeck = challengeDeckFor(period, key, s.eraMin, s.eraMax, state.challengeReqs);

  beginDraftWithState();
}

// ── Mission checklist UI (draft side-panel + preseason) ────────────────────────
function challengeReqLineHTML(req) {
  const st = challengeReqStatus(req);
  const icon = st.met ? '✅' : st.softFail ? '❌' : '⬜';
  const cls = st.met ? 'met' : st.softFail ? 'fail' : '';
  let progress = '';
  if (req.type === 'max_team_ovr')        progress = `${st.cur || '—'} / עד ${st.target}`;
  else if (req.type === 'max_player_ovr') progress = st.cur > 0 ? `${st.cur} חורגים` : '';
  else if (req.type === 'all_diff_clubs') progress = '';
  else                                    progress = `${st.cur}/${st.target}`;
  return `
    <div class="chalreq-line ${cls}">
      <span class="chalreq-icon">${icon}</span>
      <span class="chalreq-text">${challengeReqHTML(req)}</span>
      ${progress ? `<span class="chalreq-progress" dir="ltr">${lgEsc(progress)}</span>` : ''}
    </div>`;
}

// The compact live checklist in the draft side-panel. Re-rendered on every
// pick/move via updateDraftOVR() → updateChallengeReqsUI().
function updateChallengeReqsUI() {
  const panel = document.getElementById('chal-reqs-panel');
  if (!panel) return;
  const reqs = state.challenge ? (state.challengeReqs ?? []) : [];
  if (!reqs.length) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  panel.innerHTML = `<div class="chalreq-title">${lgEsc(chalText('chal-panel-title', '🎯 משימות האתגר'))}</div>` +
    reqs.map(challengeReqLineHTML).join('');
}

// Mission status card on the preseason screen (before simulating).
function renderChallengeReqsPreseason() {
  const box = document.getElementById('chal-reqs-pre');
  if (!box) return;
  const reqs = state.challenge ? (state.challengeReqs ?? []) : [];
  if (!reqs.length) { box.style.display = 'none'; return; }
  const allMet = challengeReqsMet();
  box.style.display = 'block';
  box.innerHTML = `
    <div class="chalreq-title">${lgEsc(chalText('chal-panel-title', '🎯 משימות האתגר'))}</div>
    ${reqs.map(challengeReqLineHTML).join('')}
    <div class="chalreq-verdict ${allMet ? 'ok' : 'bad'}">
      ${lgEsc(allMet
        ? chalText('chal-pre-ok', '✓ כל המשימות הושלמו — התוצאה תיכנס לטבלת האתגר')
        : chalText('chal-pre-bad', '⚠ המשימות לא הושלמו — העונה תרוץ, אבל התוצאה לא תיכנס לטבלת האתגר'))}
    </div>`;
}

// A stable key for the drafted XI — the challenge season sim is seeded with it,
// so the same lineup always produces the same season (no luck-grinding retries).
function challengeLineupKey() {
  return state.picks
    .map((p, i) => p ? `${state.slots[i].id}:${p.squad.id}:${p.player.name}` : '-')
    .join('|');
}

// ─── Challenges screen (tabs: daily / weekly / monthly) ────────────────────────
let _chalTab = 'daily';
let _chalCountdownTimer = null;

async function showChallenges(period) {
  if (period && CHAL_PERIODS[period]) _chalTab = period;
  showScreen('daily');
  document.getElementById('daily-back').onclick = () => showScreen('welcome');
  document.querySelectorAll('.chal-tab').forEach(tab => {
    tab.classList.toggle('selected', tab.dataset.period === _chalTab);
    tab.onclick = () => { _chalTab = tab.dataset.period; showChallenges(); };
  });
  renderChallengeHome(_chalTab);
}

// Time until this challenge rolls over (Israel midnight boundaries).
function msToNextChallenge(period) {
  const now = new Date();
  const t = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(now);
  const [h, m, s] = t.split(':').map(Number);
  const toMidnight = Math.max(0, ((24 - h) * 3600 - m * 60 - s) * 1000);
  const { y, m: mm, d, wd } = chalIsraelParts(now);
  if (period === 'weekly')  return toMidnight + (6 - Math.max(0, wd)) * 86400000;
  if (period === 'monthly') {
    const daysInMonth = new Date(y, mm, 0).getDate();
    return toMidnight + (daysInMonth - d) * 86400000;
  }
  return toMidnight;
}

function challengeCountdownText(period) {
  const ms = msToNextChallenge(period);
  const days = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const left = days > 0 ? `${days} ימ׳ ${h} שע׳` : `${h} שע׳ ${m} דק׳`;
  return chalText('chal-countdown', 'האתגר הבא בעוד {left}').replace('{left}', left);
}

async function renderChallengeHome(period) {
  const box = document.getElementById('daily-content');
  if (!box) return;
  box.innerHTML = '<div class="page-loading">טוען...</div>';
  await loadChallengeOverrides();
  if (_chalTab !== period) return;   // user switched tab meanwhile

  const key = challengeKey(period);
  const s = challengeSettings(period, key);
  const user = getCurrentUser();
  const P = CHAL_PERIODS[period];

  const chipsHtml = challengeConditionChips(s)
    .map(c => `<span class="daily-chip">${lgEsc(c)}</span>`).join('');

  const reqs = challengeRequirements(period, key, s);
  const reqsHtml = reqs.length ? `
    <div class="chal-missions">
      <div class="chalreq-title">${lgEsc(chalText('chal-missions-title', '🎯 המשימות'))}</div>
      ${reqs.map(r => `<div class="chal-mission">${challengeReqHTML(r)}</div>`).join('')}
      <div class="chal-missions-hint">${lgEsc(chalText('chal-missions-hint', 'רק הרכב שמשלים את כל המשימות נכנס לטבלה'))}</div>
    </div>` : '';

  const boardTitle = chalText('chal-board-title-' + period,
    period === 'daily' ? 'טבלת היום' : period === 'weekly' ? 'טבלת השבוע' : 'טבלת החודש');
  box.innerHTML = `
    <div class="lg-card daily-hero">
      <div class="daily-hero-title">${P.icon} ${lgEsc(challengeLabel(period))} <span dir="ltr">#${challengeNumber(period, key)}</span></div>
      <div class="daily-hero-sub">${lgEsc(chalText('chal-hero-sub', 'כולם מקבלים את אותם תנאים ואת אותן הקבוצות בהגרלה — מי בונה את ההרכב הכי טוב?'))}</div>
      <div class="daily-chips">${chipsHtml}</div>
      ${reqsHtml}
      <div id="daily-mine" class="daily-mine"></div>
      <button class="btn-primary lg-btn daily-play" id="daily-play">${lgEsc(chalText('chal-play', '⚽ שחק את האתגר'))}</button>
      <div class="daily-countdown" id="daily-countdown">${challengeCountdownText(period)}</div>
    </div>
    ${user ? '' : `<p class="page-note">${lgEsc(chalText('chal-login-note', 'אפשר לשחק בלי חשבון — אבל רק מחוברים נכנסים לטבלה.'))}</p>`}
    <div class="section-label" style="margin-top:14px">${lgEsc(boardTitle)}</div>
    <div id="daily-board"><div class="page-loading">טוען...</div></div>`;

  document.getElementById('daily-play').onclick = () => startChallenge(period);

  clearInterval(_chalCountdownTimer);
  _chalCountdownTimer = setInterval(() => {
    const el = document.getElementById('daily-countdown');
    if (!el) { clearInterval(_chalCountdownTimer); return; }
    el.textContent = challengeCountdownText(period);
  }, 30000);

  loadChallengeBoard(period, key, user);
}

async function loadChallengeBoard(period, key, user) {
  const board = document.getElementById('daily-board');
  const { data: rows, error } = await _supabase
    .from('challenge_results')
    .select('user_id, points, ovr, wins, draws, losses, formation, tier, attempts, players, profiles(username)')
    .eq('period', period).eq('challenge_key', key)
    .order('points', { ascending: false })
    .order('ovr', { ascending: false })
    .limit(50);
  if (!board) return;
  if (error) { board.innerHTML = `<div class="page-note">${lgEsc(chalText('chal-board-fail', 'טעינת הטבלה נכשלה'))}</div>`; return; }
  if (!rows?.length) {
    board.innerHTML = `<div class="page-note">${lgEsc(chalText('chal-board-empty', 'עוד אין תוצאות — היה הראשון! 🏁'))}</div>`;
    return;
  }

  // My best (also filled above the play button). A player ranked below the
  // top 50 won't be in `rows` — fetch their own row separately.
  let mine = user ? rows.find(r => r.user_id === user.id) : null;
  if (user && !mine) {
    const { data: own } = await _supabase.from('challenge_results')
      .select('points, ovr, attempts')
      .eq('period', period).eq('challenge_key', key).eq('user_id', user.id).maybeSingle();
    if (own) mine = own;
  }
  const mineEl = document.getElementById('daily-mine');
  if (mineEl && user) {
    if (mine) {
      const rank = rows.indexOf(mine) + 1;
      mineEl.innerHTML = `
        ${rank > 0 ? `<span class="daily-mine-rank">#${rank}</span>` : ''}
        ${lgEsc(chalText('chal-mine-label', 'התוצאה שלך:'))} <b>${mine.points} נק׳</b> · OVR ${mine.ovr}
        <span class="daily-mine-tries">${lgEsc(mine.attempts === 1
          ? chalText('chal-mine-try', '(ניסיון 1)')
          : chalText('chal-mine-tries', '({n} ניסיונות)').replace('{n}', mine.attempts))}</span>`;
      const playBtn = document.getElementById('daily-play');
      if (playBtn) playBtn.textContent = chalText('chal-play-again', '🔁 עוד ניסיון — נשמר הטוב ביותר');
    } else {
      mineEl.textContent = chalText('chal-mine-none', 'עוד לא שיחקת באתגר הזה');
    }
  }

  board.innerHTML = '';
  const table = document.createElement('div');
  table.className = 'lb-table lg-table';
  rows.forEach((r, i) => {
    const isMe = user && r.user_id === user.id;
    const name = r.profiles?.username ?? 'אנונימי';
    const row = document.createElement('div');
    row.className = 'lb-row' + (isMe ? ' lgsim-me' : '');
    row.innerHTML = `
      <span class="lb-rank ${i < 3 ? 'lb-rank-top' : ''}">${i + 1}</span>
      <span class="lb-name">${lgEsc(name)}${isMe ? ' (אתה)' : ''}</span>
      <span class="lb-stat">${r.points} נק׳</span>
      <span class="lb-sub" dir="rtl"><bdi>OVR ${r.ovr}</bdi> · <bdi>${r.wins}נ ${r.draws}ת ${r.losses}ה</bdi></span>
      <button class="lb-view-btn">הרכב</button>`;
    row.querySelector('.lb-view-btn').onclick = () => {
      const players = (r.players ?? []).map(p => ({ pos: p.pos, name: p.name, ovr: p.ovr }));
      showLeagueSquad(players, `ההרכב של ${name}`);
    };
    table.appendChild(row);
  });
  board.appendChild(table);
}

// ─── Results-screen extras for a challenge run ─────────────────────────────────
// Called from fillResults(); adds/removes the challenge buttons above the actions.
function setupChallengeResultsUI() {
  document.getElementById('daily-result-extras')?.remove();
  if (!state.challenge) return;
  const { period } = state.challenge;
  const actions = document.querySelector('#screen-results .results-actions');
  if (!actions) return;

  const reqs = state.challengeReqs ?? [];
  const allMet = challengeReqsMet();
  const reqsHtml = reqs.length ? `
    <div class="chal-reqs-result">
      ${reqs.map(challengeReqLineHTML).join('')}
      ${allMet ? '' : `<div class="chalreq-verdict bad">${lgEsc(chalText('chal-result-unmet', '❌ המשימות לא הושלמו — התוצאה לא נכנסה לטבלת האתגר (נשמרה כמשחק רגיל)'))}</div>`}
    </div>` : '';

  const wrap = document.createElement('div');
  wrap.id = 'daily-result-extras';
  wrap.className = 'daily-result-extras';
  wrap.innerHTML = `
    ${reqsHtml}
    <div class="daily-result-note" id="daily-result-note"></div>
    <button class="btn-primary" id="daily-retry">${lgEsc(chalText('chal-retry-btn', '🔁 עוד ניסיון ב{challenge}').replace('{challenge}', challengeLabel(period)))}</button>
    <button class="btn-secondary" id="daily-to-board">${lgEsc(chalText('chal-to-board-btn', '📊 לטבלת האתגר'))}</button>`;
  actions.parentNode.insertBefore(wrap, actions);
  wrap.querySelector('#daily-retry').onclick = () => { clearDraftState(); startChallenge(period); };
  wrap.querySelector('#daily-to-board').onclick = () => showChallenges(period);
}

// Called by submitResult() with the server's verdict on a challenge submission.
function showChallengeSubmitNote(ch) {
  const el = document.getElementById('daily-result-note');
  if (!el || !ch) return;
  el.textContent = ch.is_best
    ? (ch.attempts > 1
        ? chalText('chal-note-best', '🔥 שיא חדש! התוצאה הטובה שלך נשמרה')
        : chalText('chal-note-first', '✓ התוצאה נשמרה לטבלת האתגר'))
    : chalText('chal-note-nobest', 'לא שיפרת את השיא שלך (ניסיון {n})').replace('{n}', ch.attempts);
  el.classList.add(ch.is_best ? 'ok' : 'meh');
}

// ─── Welcome-screen card + nav wiring ──────────────────────────────────────────
function fillChallengeWelcomeCard() {
  const numEl = document.getElementById('dw-num');
  const condEl = document.getElementById('dw-conditions');
  if (!numEl || !condEl) return;
  const key = challengeKey('daily');
  const s = challengeSettings('daily', key);
  numEl.textContent = '#' + challengeNumber('daily', key);
  const reqs = challengeRequirements('daily', key, s);
  condEl.textContent = reqs.length
    ? '🎯 ' + reqs.map(challengeReqText).join(' · ')
    : 'תנאי היום: ' + challengeConditionChips(s).join(' · ');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-daily')?.addEventListener('click', () => showChallenges());
  document.getElementById('btn-daily')?.addEventListener('click', () => showChallenges('daily'));
  fillChallengeWelcomeCard();
  // overrides may change today's card — refresh it once they're in
  if (typeof _supabase !== 'undefined')
    loadChallengeOverrides().then(fillChallengeWelcomeCard);
});
