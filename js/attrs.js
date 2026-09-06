// ─── שש התכונות — הקורא ────────────────────────────────────────────────────────
//
// js/attr-data.js is a wall of packed strings, built offline by
// scripts/build_attrs.js because the tables it derives from (js/league_tables.js,
// 362KB) never reach the browser. This is everything the game is allowed to know
// about that wall: how to unpack a row, what the six numbers mean, how they add
// up to one rating for a given role, and — the part that matters most — the fact
// behind each number, in a sentence that can be shown to the player.
//
// Rule for anything built on top of this file: מהירות is NOT a fact. It is
// derived from position and rating because the project holds no age, no minutes
// and no running data. `ATTR_EST` says so, and any screen that prints a value
// must print that mark with it. The other five come from the real tables.

const ATTR_KEYS = ['fin', 'cre', 'def', 'pac', 'sta', 'cls'];   // packed order
const ATTR_GK_KEY = 'gk';                                       // seventh, keepers only

const ATTR_NAME = {
  fin: 'גמר', cre: 'יצירה', def: 'הגנה',
  pac: 'מהירות', sta: 'יציבות', cls: 'הכרעה', gk: 'שוער',
};

// The one attribute with no source. Kept as a map rather than a single flag so
// that if another estimated attribute is ever added it cannot be added silently.
const ATTR_EST = { pac: true };

// How the six become one number. The same six attributes, five different games:
// a striker's finishing is nearly half his worth and a defender's is a rounding
// error. Every row sums to 100.
const ATTR_ROLE = {
  fw: { name: 'חלוץ', w: { fin: 40, cre: 15, def: 5,  pac: 20, sta: 10, cls: 10 } },
  w:  { name: 'כנף',  w: { fin: 25, cre: 25, def: 5,  pac: 25, sta: 10, cls: 10 } },
  cm: { name: 'קשר',  w: { fin: 15, cre: 35, def: 15, pac: 10, sta: 15, cls: 10 } },
  df: { name: 'מגן',  w: { fin: 5,  cre: 10, def: 45, pac: 20, sta: 10, cls: 10 } },
  gk: { name: 'שוער', w: { gk:  40, cre: 5,  def: 25, pac: 5,  sta: 15, cls: 10 } },
};

// A keeper build swaps גמר for שוער; everyone else keeps the six as they are.
function attrSlots(role) {
  return role === 'gk'
    ? [ATTR_GK_KEY, 'cre', 'def', 'pac', 'sta', 'cls']
    : ATTR_KEYS.slice();
}

/* ── unpacking ────────────────────────────────────────────────────────────── */
// One split per squad, kept — the builder shows a whole squad at a time and then
// comes back to it, and 366 small arrays are cheaper than re-splitting a 200KB
// blob on every hover.
const _attrCache = {};
function attrSquadRows(squadId) {
  if (_attrCache[squadId]) return _attrCache[squadId];
  const packed = (typeof ATTR_DATA !== 'undefined' && ATTR_DATA[squadId]) || '';
  return (_attrCache[squadId] = packed
    ? packed.split('|').map(r => r.split(',').map(Number))
    : []);
}

// The six (or seven) for one player, as an object. Returns null rather than
// zeros when the row is missing, so a caller has to decide what to do about it
// instead of quietly showing a player with 0 in everything.
function attrsOf(squadId, index) {
  const row = attrSquadRows(squadId)[index];
  if (!row || row.length < ATTR_KEYS.length) return null;
  const out = {};
  ATTR_KEYS.forEach((k, i) => { out[k] = row[i]; });
  if (row.length > ATTR_KEYS.length) out[ATTR_GK_KEY] = row[ATTR_KEYS.length];
  return out;
}

// The rating a set of attributes is worth in a given role.
function attrOvr(attrs, role) {
  const def = ATTR_ROLE[role];
  if (!def || !attrs) return 0;
  let sum = 0, weight = 0;
  for (const k of Object.keys(def.w)) {
    const v = attrs[k];
    if (typeof v !== 'number') continue;      // a keeper slot on an outfield row
    sum += v * def.w[k];
    weight += def.w[k];
  }
  return weight ? Math.round(sum / weight) : 0;
}

/* ── the fact behind the number ───────────────────────────────────────────── */
// Without this the file is six numbers and a promise. `null` means we have
// nothing honest to say, and the caller should say nothing rather than fill the
// space — except for מהירות, which always says what it is.
function attrWhy(squadId, index, key, season, teamId) {
  if (key === 'pac') return 'משוער — לליגה אין נתוני מהירות, וזה נגזר מהעמדה ומהדירוג';

  const club = (typeof TEAMS !== 'undefined' && TEAMS[teamId] && TEAMS[teamId].name) || '';
  const mine = (typeof ATTR_PLAYER_WHY !== 'undefined' && ATTR_PLAYER_WHY[squadId + '|' + index]) || null;
  const c = (typeof ATTR_CLUB_WHY !== 'undefined' && ATTR_CLUB_WHY[squadId]) || null;
  if (!c) return null;
  const [ga, defRank, gf, atkRank, of, pos] = c;

  const nth = (r, noun) => r === 1 ? `ה${noun} הטובה בליגה` : `ה${noun} ה-${r} בליגה`;

  switch (key) {
    case 'fin':
      if (mine && mine[0]) return `כבש ${mine[0]} שערים ב-${season}`;
      return `${club} כבשה ${gf} ב-${season} — ${nth(atkRank, 'התקפה')}`;
    case 'cre':
      if (mine && mine[1]) return `${mine[1]} בישולים ב-${season}`;
      return `${club} כבשה ${gf} ב-${season} — ${nth(atkRank, 'התקפה')}`;
    case 'def':
    case 'gk':
      return `${club} ספגה ${ga} ב-${season} — ${nth(defRank, 'הגנה')}`;
    case 'cls':
      return pos === 1
        ? `אלוף עם ${club} ב-${season}`
        : `סיים ${pos} מתוך ${of} עם ${club} ב-${season}`;
    case 'sta': {
      // The only one that is about the career rather than the season, so it is
      // the only one that reads the squads at runtime — mgIndex already has it.
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
