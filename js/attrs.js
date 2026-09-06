// ─── שש התכונות — הקורא ────────────────────────────────────────────────────────
//
// js/attr-data.js is a wall of packed strings, built offline by
// scripts/build_attrs.js because the tables it derives from (js/league_tables.js,
// 362KB) never reach the browser. This is everything the game is allowed to know
// about that wall: how to unpack a row, what the six numbers mean, how they add
// up to one rating for a given role, and the fact behind each number where the
// tables have one.
//
// The six are the standard football six, in the standard order. Nothing here is
// a private vocabulary, and no attribute is a dead slot for any position: every
// player has all six, so a round always offers six real choices.

const ATTR_KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];   // packed order

const ATTR_NAME = {
  pac: 'מהירות', sho: 'בעיטה', pas: 'מסירה',
  dri: 'כדרור',  def: 'הגנה',  phy: 'פיזיות',
};

const ATTR_SHORT = {
  pac: 'מהי', sho: 'בעי', pas: 'מסי',
  dri: 'כדר', def: 'הגנ', phy: 'פיז',
};

// How the six become one number. The same six attributes, five different games:
// a striker's shooting is a third of his worth and a defender's is a rounding
// error. Every row sums to 100.
const ATTR_ROLE = {
  fw: { name: 'חלוץ', w: { sho: 35, pac: 20, dri: 15, phy: 15, pas: 10, def: 5 } },
  w:  { name: 'כנף',  w: { pac: 30, dri: 25, sho: 20, pas: 15, phy: 5,  def: 5 } },
  cm: { name: 'קשר',  w: { pas: 35, dri: 20, sho: 15, phy: 15, def: 10, pac: 5 } },
  df: { name: 'מגן',  w: { def: 45, phy: 25, pac: 15, pas: 10, dri: 3,  sho: 2 } },
  // A keeper is not a bad outfielder. Counting his shooting and dribbling at any
  // real weight rated a fine goalkeeper at 72 while an average defender made 83,
  // which is not a balance question — those attributes describe a job he does
  // not have. They stay in the row (he can still be drafted for them) but they
  // are worth almost nothing to HIS rating.
  gk: { name: 'שוער', w: { def: 55, phy: 30, pas: 10, pac: 3,  dri: 1,  sho: 1 } },
};

// Every role fills the same six slots. The keeper special-case that the first
// build needed is gone with the attribute that caused it.
function attrSlots() { return ATTR_KEYS.slice(); }

/* ── unpacking ────────────────────────────────────────────────────────────── */
// One split per squad, kept — the builder comes back to the same squads and 366
// small arrays are cheaper than re-splitting a 200KB blob on every lookup.
const _attrCache = {};
function attrSquadRows(squadId) {
  if (_attrCache[squadId]) return _attrCache[squadId];
  const packed = (typeof ATTR_DATA !== 'undefined' && ATTR_DATA[squadId]) || '';
  return (_attrCache[squadId] = packed
    ? packed.split('|').map(r => r.split(',').map(Number))
    : []);
}

// The six for one player, as an object. Returns null rather than zeros when the
// row is missing, so a caller has to decide what to do about it instead of
// quietly showing a player with 0 in everything.
function attrsOf(squadId, index) {
  const row = attrSquadRows(squadId)[index];
  if (!row || row.length < ATTR_KEYS.length) return null;
  const out = {};
  ATTR_KEYS.forEach((k, i) => { out[k] = row[i]; });
  return out;
}

// The rating a set of attributes is worth in a given role.
function attrOvr(attrs, role) {
  const def = ATTR_ROLE[role];
  if (!def || !attrs) return 0;
  let sum = 0, weight = 0;
  for (const k of Object.keys(def.w)) {
    const v = attrs[k];
    if (typeof v !== 'number') continue;
    sum += v * def.w[k];
    weight += def.w[k];
  }
  return weight ? Math.round(sum / weight) : 0;
}

/* ── the fact behind the number ───────────────────────────────────────────── */
// Shown on the result screen, where it reads as a receipt for the build. `null`
// means we have nothing to say and the caller should say nothing — which is the
// honest answer for pace and dribbling, since no table this project owns
// measures either.
function attrWhy(squadId, index, key, season, teamId) {
  const club = (typeof TEAMS !== 'undefined' && TEAMS[teamId] && TEAMS[teamId].name) || '';
  const mine = (typeof ATTR_PLAYER_WHY !== 'undefined' && ATTR_PLAYER_WHY[squadId + '|' + index]) || null;
  const c = (typeof ATTR_CLUB_WHY !== 'undefined' && ATTR_CLUB_WHY[squadId]) || null;
  if (!c) return null;
  const [ga, defRank, gf, atkRank] = c;

  const nth = (r, noun) => r === 1 ? `ה${noun} הטובה בליגה` : `ה${noun} ה-${r} בליגה`;

  switch (key) {
    case 'sho':
      if (mine && mine[0]) return `כבש ${mine[0]} שערים ב-${season}`;
      return `${club} כבשה ${gf} ב-${season} — ${nth(atkRank, 'התקפה')}`;
    case 'pas':
      if (mine && mine[1]) return `${mine[1]} בישולים ב-${season}`;
      return `${club} כבשה ${gf} ב-${season} — ${nth(atkRank, 'התקפה')}`;
    case 'def':
      return `${club} ספגה ${ga} ב-${season} — ${nth(defRank, 'הגנה')}`;
    case 'phy': {
      if (typeof mgIndex !== 'function') return null;
      const sq = (typeof SQUADS !== 'undefined' && SQUADS.find(s => s.id === squadId)) || null;
      const p = sq && sq.players[index];
      if (!p) return null;
      const e = mgIndex().get(mgNorm(p.name));
      return e ? `${e.seasons} עונות בליגת העל` : null;
    }
    default:
      return null;
  }
}
