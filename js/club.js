// ─── המועדון שלך ──────────────────────────────────────────────────────────────
// A club that belongs to the player: a name, a city, a crest assembled from
// shapes and colours, and a kit. It is deliberately COSMETIC — it touches no
// rating, no simulation and no leaderboard. What it changes is who the screens
// think they are talking to.
//
// WHY IT LANDS WHERE IT DOES
// `myTeamName()` in js/texts.js was already the single funnel every screen uses
// to ask "what is my side called" — the league table, the cup bracket and the
// European tables all call it. A career answered it; nothing else did, so every
// ordinary season was played by "הקבוצה שלי". This module gives that funnel a
// second thing to consult, and eleven screens learn the player's club name
// without one of them being edited.
//
// PRECEDENCE, and why it is this way round: a career's clubName wins over the
// global club. A dynasty is a named club you committed to for ten seasons, and
// overriding it with a global identity would rename a run halfway through.
//
// STORAGE is localStorage only. No table, no migration, no sign-in — a made-up
// crest is not worth a network round trip, and it must survive being offline.

const CLUB_KEY = '36-0-club';

/* ── the palette ────────────────────────────────────────────────────────────
   Sixteen colours that read as football kits rather than as a colour picker.
   A free picker gives you a beige club with a taupe crest; a fixed shelf gives
   you something that looks like it plays somewhere. */
const CLUB_COLORS = [
  '#c8102e', '#e4572e', '#f0a500', '#ffd700',
  '#1e6f3c', '#2ecc71', '#0b6ba8', '#1e3a8a',
  '#5b2c8d', '#9b1b6b', '#00b3a4', '#7f8c8d',
  '#111418', '#f5f5f5', '#8b5e34', '#d8c9a3',
];

/* Every city and town of any size in Israel, not only the eighteen that have
   ever had a Ligat ha'Al club. The point of the field is the thrill of putting
   your club somewhere real — and a list that offers Tel Aviv, Haifa and
   Jerusalem is just the league again. Somebody from Yeruham should be able to
   pick Yeruham. The field stays free text (a <datalist>, not a <select>), so
   this is a set of suggestions and never a restriction. */
const CLUB_CITIES = [
  // the big ones
  'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד',
  'נתניה', 'באר שבע', 'בני ברק', 'חולון', 'רמת גן', 'אשקלון', 'רחובות',
  'בת ים', 'בית שמש', 'כפר סבא', 'הרצליה', 'חדרה', 'מודיעין', 'נצרת',
  'לוד', 'רמלה', 'רעננה', 'גבעתיים', 'הוד השרון', 'קריית אתא', 'נהריה',
  'קריית גת', 'אום אל-פחם', 'אילת', 'ראש העין', 'עפולה', 'נס ציונה',
  'עכו', 'אלעד', 'רהט', 'טבריה', 'כרמיאל', 'יבנה', 'טייבה', 'שפרעם',
  // the north
  'קריית מוצקין', 'קריית ים', 'קריית ביאליק', 'נשר', 'טירת כרמל',
  'צפת', 'טמרה', 'סכנין', 'נוף הגליל', 'קריית שמונה', 'מעלות-תרשיחא',
  'יקנעם', 'מגדל העמק', 'בית שאן', 'קצרין', 'שלומי', 'מטולה', 'ראש פינה',
  'זכרון יעקב', 'פרדס חנה-כרכור', 'אור עקיבא', 'בנימינה', 'עראבה',
  'כפר יאסיף', 'מג׳ד אל-כרום', 'דיר אל-אסד', 'ג׳דיידה-מכר', 'בועיינה-נוג׳ידאת',
  // the centre
  'אור יהודה', 'יהוד', 'קריית אונו', 'גני תקווה', 'רמת השרון', 'שוהם',
  'אזור', 'סביון', 'כפר יונה', 'טירה', 'קלנסווה', 'ג׳לג׳וליה',
  'כפר קאסם', 'כפר ברא', 'מזכרת בתיה', 'גדרה', 'קריית עקרון',
  'באר יעקב', 'אריאל', 'מודיעין עילית', 'ביתר עילית',
  'מעלה אדומים', 'גבעת זאב', 'אפרת',
  // the south
  'קריית מלאכי', 'גן יבנה', 'ערד', 'דימונה', 'ירוחם', 'מצפה רמון',
  'אופקים', 'נתיבות', 'שדרות', 'שגב-שלום', 'תל שבע', 'כסייפה', 'ערערה בנגב',
  'להבים', 'עומר', 'מיתר',
];

const CLUB_NAME_A = ['הפועל', 'מכבי', 'בני', 'עירוני', 'איתן', 'שמשון', 'הכוח', 'מועדון'];
const CLUB_NAME_B = ['', '', '', 'הצפון', 'הדרום', 'המושבה', 'הנמל', 'ההר'];

/* ── shapes ─────────────────────────────────────────────────────────────────
   All four are drawn in the same 100x120 box so the pattern, the icon and the
   outline can be shared between them. */
const CREST_SHAPES = {
  shield:  { label: 'מגן',   d: 'M7,7 H93 V63 C93,91 74,110 50,116 C26,110 7,91 7,63 Z' },
  circle:  { label: 'עיגול', d: 'M50,11 A49,49 0 1 1 49.9,11 Z' },
  diamond: { label: 'מעוין', d: 'M50,5 L95,60 L50,115 L5,60 Z' },
  banner:  { label: 'דגל',   d: 'M9,8 H91 V96 L50,116 L9,96 Z' },
};

const CREST_PATTERNS = {
  solid:   'מלא',
  half:    'חצוי',
  stripes: 'פסים',
  sash:    'אלכסון',
  hoop:    'חגורה',
};

/* ── icons ──────────────────────────────────────────────────────────────────
   Drawn, not emoji'd. An emoji crest is somebody else's artwork sitting inside
   yours, it renders differently on every platform, and it will not take the
   outline that keeps a glyph legible over a striped field. These are eight
   simple paths in a 0..100 box, scaled into the middle of the shape. */
const CREST_ICONS = {
  ball:      { label: 'כדור',  d: 'M50,6 A44,44 0 1 0 50.1,6 Z M50,22 L74,40 L65,69 H35 L26,40 Z' },
  star:      { label: 'כוכב',  d: 'M50,6 L62,38 H96 L69,58 L79,92 L50,72 L21,92 L31,58 L4,38 H38 Z' },
  crown:     { label: 'כתר',   d: 'M8,80 L17,26 L33,50 L50,18 L67,50 L83,26 L92,80 Z M8,84 H92 V95 H8 Z' },
  // Symmetry is what made the first two attempts read as a water droplet rather
  // than as fire, at every size. What fixes it is the asymmetric licking tip and
  // the notch on the left shoulder; the inner cut-out, subtracted by fill-rule,
  // is what keeps it legible once it is 30px on a setup card.
  flame:     { label: 'להבה',  d: 'M50,2 C52,20 42,28 38,36 C36,28 35,22 36,15 C22,30 16,48 20,64 C25,84 36,96 50,96 C65,96 78,83 79,65 C80,45 64,32 56,18 C53,13 51,8 50,2 Z M50,46 C51,56 43,60 42,68 C41,79 47,88 55,86 C64,83 66,71 61,63 C57,57 52,52 50,46 Z' },
  bolt:      { label: 'ברק',   d: 'M62,4 L24,56 H46 L38,96 L78,42 H54 Z' },
  anchor:    { label: 'עוגן',  d: 'M50,4 A11,11 0 1 1 49.9,4 Z M44,26 H56 V88 H44 Z M22,44 H78 V54 H22 Z M14,60 C14,84 32,96 50,96 C68,96 86,84 86,60 H74 C74,76 63,84 50,84 C37,84 26,76 26,60 Z' },
  tower:     { label: 'מגדל',  d: 'M18,26 H30 V38 H40 V26 H52 V38 H62 V26 H74 V38 H84 V96 H18 Z M40,58 H52 V96 H40 Z' },
  // A leaf sat here and lost: drawn small it is the same teardrop as the flame,
  // and a crest shelf where two of eight choices look identical is a shelf of
  // seven. Chevrons carry no such collision at any size.
  chevron:   { label: 'שברון', d: 'M50,6 L92,34 L92,53 L50,25 L8,53 L8,34 Z M50,43 L92,71 L92,90 L50,62 L8,90 L8,71 Z' },
};

const KIT_PATTERNS = { solid: 'מלא', stripes: 'פסים', sash: 'אלכסון', sleeves: 'שרוולים', hoop: 'חגורה' };

/* ── the badges already in the repo ─────────────────────────────────────────
   /crests/ holds 31 PNGs named by teamId, fetched for the gauntlet map and
   reused by the Europe screens and the grid mini-game. Every filename resolves
   against TEAMS in data.js, so the picker gets its Hebrew labels for free and
   this list never has to carry a name of its own.

   Kept as an explicit list rather than derived from TEAMS: TEAMS has 31 entries
   today and the folder has 31 files, but the two are maintained separately and
   a club added to data.js without a badge would render a broken tile. The list
   is the FILES, and getTeam() only supplies the label. */
const CLUB_CREST_FILES = [
  'beitar-jerusalem', 'bnei-sakhnin', 'bnei-yehuda', 'hakoah-rg', 'hapoel-aco',
  'hapoel-ashkelon', 'hapoel-beersheba', 'hapoel-galil', 'hapoel-hadera',
  'hapoel-haifa', 'hapoel-holon', 'hapoel-jerusalem', 'hapoel-kfar-saba',
  'hapoel-pt', 'hapoel-raanana', 'hapoel-rg', 'hapoel-rhs', 'hapoel-rishonim',
  'hapoel-tlv', 'ironi-ks', 'ironi-tiberias', 'maccabi-ahi-naz',
  'maccabi-bnei-raina', 'maccabi-haifa', 'maccabi-herzliya', 'maccabi-kg',
  'maccabi-netanya', 'maccabi-pt', 'maccabi-tlv', 'ms-ashdod', 'sakhnina-ns',
];

function clubCrestLabel(id) {
  try { if (typeof getTeam === 'function') { const t = getTeam(id); if (t && t.name && t.name !== '?') return t.name; } }
  catch (e) { /* data.js not loaded on this page */ }
  return id;
}

const CLUB_DEFAULT = {
  v: 1,
  name: '',
  city: '',
  // source: 'built' = assembled from shape/pattern/icon/colours below.
  //         'club'  = one of the badges in /crests/, named by clubId.
  // The built crest stays the default: it is the one that is actually the
  // player's own, and it is the one that works with no network and no PNG.
  crest: { source: 'built', clubId: 'maccabi-haifa',
           shape: 'shield', pattern: 'half', icon: 'star', c1: '#1e6f3c', c2: '#f5f5f5' },
  kit:   { pattern: 'stripes', c1: '#1e6f3c', c2: '#f5f5f5' },
};

let _clUid = 0;

function clEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Readable ink for a fill. game.js has textColorFor(), but this module is also
// reached from the mini-games shelf and from pages that never load game.js, so
// it carries its own rather than depending on load order.
function clInk(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return '#fff';
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#111418' : '#ffffff';
}
function clInkOpposite(hex) { return clInk(hex) === '#ffffff' ? '#111418' : '#ffffff'; }

/* ── the store ──────────────────────────────────────────────────────────────── */

function clubGet() {
  try {
    const raw = JSON.parse(localStorage.getItem(CLUB_KEY));
    if (!raw || typeof raw !== 'object') return null;
    // Merge over the default so a save written by an older version — one with no
    // kit, say — reads back complete instead of throwing on raw.kit.pattern.
    return {
      ...CLUB_DEFAULT, ...raw,
      crest: { ...CLUB_DEFAULT.crest, ...(raw.crest || {}) },
      kit:   { ...CLUB_DEFAULT.kit,   ...(raw.kit   || {}) },
    };
  } catch (e) { return null; }
}

function clubSave(c) {
  try { localStorage.setItem(CLUB_KEY, JSON.stringify(c)); } catch (e) { /* full/blocked */ }
}

function clubHas() { const c = clubGet(); return !!(c && String(c.name || '').trim()); }

// The club's name, or whatever the caller wanted to say instead. NOT escaped —
// see myTeamName() in texts.js, which escapes its own return for the same reason.
function clubNameRaw() {
  const c = clubGet();
  const n = c ? String(c.name || '').trim() : '';
  return n || '';
}

function clubRandom() {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const c1 = pick(CLUB_COLORS);
  let c2 = pick(CLUB_COLORS);
  if (c2 === c1) c2 = clInk(c1) === '#ffffff' ? '#f5f5f5' : '#111418';
  const b = pick(CLUB_NAME_B);
  return {
    v: 1,
    name: (pick(CLUB_NAME_A) + ' ' + (b || pick(CLUB_CITIES))).trim(),
    city: pick(CLUB_CITIES),
    // The dice always roll a BUILT crest. Handing somebody a real club's badge
    // at random is not "your club", it is somebody else's.
    crest: { source: 'built', clubId: CLUB_DEFAULT.crest.clubId,
             shape: pick(Object.keys(CREST_SHAPES)), pattern: pick(Object.keys(CREST_PATTERNS)),
             icon: pick(Object.keys(CREST_ICONS)), c1, c2 },
    kit:   { pattern: pick(Object.keys(KIT_PATTERNS)), c1, c2 },
  };
}

/* ── the crest ──────────────────────────────────────────────────────────────
   One <svg>, self-contained: a clipPath of the chosen shape, the pattern drawn
   inside it, the icon over that, and the outline last so it is never covered.
   Returned as a STRING so every caller can drop it into a template literal, the
   way trophy-art.js does. */
function clubCrestSVG(club, px) {
  const c = club || clubGet() || CLUB_DEFAULT;
  const cr = c.crest || CLUB_DEFAULT.crest;

  // A badge from /crests/ is a PNG, not a drawing, so it comes back as an <img>.
  // Every caller injects the return value as HTML rather than parsing it, so the
  // two forms are interchangeable — the box is kept the same 5:6 as the drawn
  // crest, with object-fit so a square badge is never stretched into it.
  if (cr.source === 'club' && cr.clubId) {
    const w = px || 44, h = Math.round(w * 1.2);
    return `<img class="club-crest club-crest-png" src="crests/${clEsc(cr.clubId)}.png"
      width="${w}" height="${h}" alt="${clEsc(clubCrestLabel(cr.clubId))}" loading="lazy"
      style="object-fit:contain" onerror="this.style.visibility='hidden'">`;
  }

  const shape = CREST_SHAPES[cr.shape] || CREST_SHAPES.shield;
  const icon = CREST_ICONS[cr.icon] || CREST_ICONS.star;
  const c1 = cr.c1 || '#1e6f3c', c2 = cr.c2 || '#f5f5f5';
  const uid = 'clc' + (++_clUid);
  const h = Math.round((px || 44) * 1.2);

  let field = '';
  switch (cr.pattern) {
    case 'half':
      field = `<rect x="0" y="0" width="50" height="120" fill="${c1}"/>` +
              `<rect x="50" y="0" width="50" height="120" fill="${c2}"/>`;
      break;
    case 'stripes':
      field = `<rect x="0" y="0" width="100" height="120" fill="${c1}"/>` +
              [10, 30, 50, 70, 90].map(x => `<rect x="${x}" y="0" width="10" height="120" fill="${c2}"/>`).join('');
      break;
    case 'sash':
      field = `<rect x="0" y="0" width="100" height="120" fill="${c1}"/>` +
              `<path d="M-20,90 L70,-20 L110,-20 L20,120 Z" fill="${c2}"/>`;
      break;
    case 'hoop':
      field = `<rect x="0" y="0" width="100" height="120" fill="${c1}"/>` +
              `<rect x="0" y="42" width="100" height="26" fill="${c2}"/>`;
      break;
    default:
      field = `<rect x="0" y="0" width="100" height="120" fill="${c1}"/>`;
  }

  // The icon has to stay legible over BOTH colours, because a striped or halved
  // field puts each of them under half of it. A fill plus the opposite ink as a
  // stroke, painted stroke-first, does that without a backing plate.
  const ink = clInk(c1), edge = clInkOpposite(c1);

  return `<svg class="club-crest" viewBox="0 0 100 120" width="${px || 44}" height="${h}" role="img" aria-label="סמל המועדון">
    <defs><clipPath id="${uid}"><path d="${shape.d}"/></clipPath></defs>
    <g clip-path="url(#${uid})">${field}</g>
    <g clip-path="url(#${uid})" transform="translate(25,32) scale(0.50)">
      <path d="${icon.d}" fill="${ink}" stroke="${edge}" stroke-width="6"
            stroke-linejoin="round" style="paint-order:stroke fill" fill-rule="evenodd"/>
    </g>
    <path d="${shape.d}" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="4"/>
    <path d="${shape.d}" fill="none" stroke="rgba(255,255,255,0.30)" stroke-width="1.5"/>
  </svg>`;
}

/* ── the kit ────────────────────────────────────────────────────────────────
   A shirt seen flat from the front, with a number on it. Same clip-and-fill
   trick as the crest. Used by the team photo and by the back page. */
function clubShirtSVG(club, px, number) {
  const c = club || clubGet() || CLUB_DEFAULT;
  const k = c.kit || CLUB_DEFAULT.kit;
  const c1 = k.c1 || '#1e6f3c', c2 = k.c2 || '#f5f5f5';
  const uid = 'clk' + (++_clUid);
  const body = 'M32,8 L44,4 C46,12 54,12 56,4 L68,8 L92,22 L82,42 L72,37 V96 H28 V37 L18,42 L8,22 Z';
  const w = px || 54, h = Math.round(w);

  let field = '';
  switch (k.pattern) {
    case 'stripes':
      field = `<rect x="0" y="0" width="100" height="100" fill="${c1}"/>` +
              [12, 32, 52, 72].map(x => `<rect x="${x}" y="0" width="10" height="100" fill="${c2}"/>`).join('');
      break;
    case 'sash':
      field = `<rect x="0" y="0" width="100" height="100" fill="${c1}"/>` +
              `<path d="M-10,78 L62,-10 L88,-10 L16,100 Z" fill="${c2}"/>`;
      break;
    case 'sleeves':
      field = `<rect x="0" y="0" width="100" height="100" fill="${c1}"/>` +
              `<rect x="0" y="0" width="28" height="100" fill="${c2}"/>` +
              `<rect x="72" y="0" width="28" height="100" fill="${c2}"/>`;
      break;
    case 'hoop':
      field = `<rect x="0" y="0" width="100" height="100" fill="${c1}"/>` +
              `<rect x="0" y="44" width="100" height="20" fill="${c2}"/>`;
      break;
    default:
      field = `<rect x="0" y="0" width="100" height="100" fill="${c1}"/>`;
  }

  const ink = clInk(c1), edge = clInkOpposite(c1);
  // The torso runs y 37..96, so its middle is 66.5 and a number printed on a
  // shirt sits a touch below that. text-anchor centres it horizontally on the
  // torso's own centre line (x=50); vertically the BASELINE is what y sets, so
  // it carries half a cap-height (~0.72em of 34px ≈ 12) below the optical
  // centre. dominant-baseline would say this more directly and is deliberately
  // avoided — html2canvas re-renders the SVG and does not honour it reliably,
  // which would put the number in a different place in the saved PNG than on
  // screen. An explicit baseline renders identically in both.
  const num = (number === 0 || number) ? `<text x="50" y="82" text-anchor="middle"
      font-family="Arial Black, Arial, sans-serif" font-size="34" font-weight="900"
      fill="${ink}" stroke="${edge}" stroke-width="4" stroke-linejoin="round"
      style="paint-order:stroke fill">${number}</text>` : '';

  return `<svg class="club-shirt" viewBox="0 0 100 100" width="${w}" height="${h}" role="img" aria-label="חולצה">
    <defs><clipPath id="${uid}"><path d="${body}"/></clipPath></defs>
    <g clip-path="url(#${uid})">${field}</g>
    ${num}
    <path d="${body}" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="3"/>
  </svg>`;
}

/* ── shirt numbers ──────────────────────────────────────────────────────────
   The classic 1-11, handed out the way a teamsheet does it rather than by draft
   order. Two rules make it read right: the number belongs to the SLOT, not to
   the player, so the same formation always numbers the same way; and a number
   already taken falls through to the next free one, because 4-4-2 has two
   strikers and only one of them can be the 9.

   The 10 is the one people care about, so it is not left to a lookup: it goes
   to the best attacking player in the XI, and whoever the table would have
   given it to takes the next free number instead. */
const CLUB_NUMS = {
  GK: [1], RB: [2], LB: [3], CB: [4, 5, 6], CDM: [6, 8], CM: [8, 6, 4],
  RM: [7], RW: [7, 11], CAM: [10], ST: [9, 11], CF: [9, 10], LM: [11], LW: [11, 7],
};
const CLUB_ATT_POS = ['ST', 'CF', 'CAM', 'RW', 'LW', 'RM', 'LM'];

function clubNumbersFor(slots, picks) {
  const out = new Array(slots.length).fill(null);
  const taken = new Set();

  // the 10 first, so nothing else can claim it
  let tenIdx = -1, tenOvr = -1;
  picks.forEach((p, i) => {
    if (!p || !p.player) return;
    const pos = (slots[i] && slots[i].pos) || p.player.position;
    if (!CLUB_ATT_POS.includes(pos)) return;
    const ovr = Number(p.player.ovr) || 0;
    if (ovr > tenOvr) { tenOvr = ovr; tenIdx = i; }
  });
  if (tenIdx >= 0) { out[tenIdx] = 10; taken.add(10); }

  // Fill order is by how FEW choices a position has, not by slot order. A right
  // winger has one natural number and a central midfielder has three, so going
  // left to right let the third midfielder take 7 and pushed the winger onto 11.
  // Scarcest claim first, and everyone lands where a teamsheet would put them.
  slots.map((s, i) => i)
    .sort((a, b) => (CLUB_NUMS[slots[a].pos] || []).length - (CLUB_NUMS[slots[b].pos] || []).length)
    .forEach(i => {
      if (out[i] !== null) return;
      const wanted = CLUB_NUMS[slots[i].pos] || [];
      let n = wanted.find(x => !taken.has(x));
      if (!n) { n = 2; while (taken.has(n)) n++; }   // spare squad number, 12 up
      out[i] = n; taken.add(n);
    });
  return out;
}

/* ── the editor ─────────────────────────────────────────────────────────────
   One modal, three tabs, a live preview at the top. The dice matter more than
   they look: an empty form asking a player to invent a club is friction, and a
   club he can roll and then nudge is a club he actually ends up with. */
let _clDraft = null;

function clubRow(name, items, current, cb) {
  return `<div class="cl-row" data-row="${name}">` + items.map(([v, label]) =>
    `<button type="button" class="cl-chip${v === current ? ' sel' : ''}" data-${name}="${clEsc(v)}">${clEsc(label)}</button>`
  ).join('') + '</div>';
}

function clubSwatches(name, current) {
  return `<div class="cl-swatches" data-sw="${name}">` + CLUB_COLORS.map(c =>
    `<button type="button" class="cl-sw${c === current ? ' sel' : ''}" data-color="${c}"
       style="background:${c}" aria-label="${c}"></button>`
  ).join('') + '</div>';
}

function showClubEditor(onSaved) {
  _clDraft = clubGet() || { ...CLUB_DEFAULT, crest: { ...CLUB_DEFAULT.crest }, kit: { ...CLUB_DEFAULT.kit } };

  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay cl-modal';
  wrap.innerHTML = `
    <div class="modal-box cl-box">
      <button class="modal-close" id="cl-x">✕</button>
      <div class="modal-title">המועדון שלי</div>
      <div class="cl-preview" id="cl-preview"></div>
      <div class="cl-tabs">
        <button type="button" class="cl-tab sel" data-tab="crest">סמל</button>
        <button type="button" class="cl-tab" data-tab="kit">חולצה</button>
        <button type="button" class="cl-tab" data-tab="info">פרטים</button>
      </div>
      <div class="cl-pane" id="cl-pane"></div>
      <div class="cl-actions">
        <button type="button" class="btn-secondary cl-dice" id="cl-dice">🎲 אקראי</button>
        <button type="button" class="btn-primary" id="cl-save">שמור</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const close = () => wrap.remove();
  wrap.querySelector('#cl-x').onclick = close;
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });

  let tab = 'crest';

  const drawPreview = () => {
    const c = _clDraft;
    document.getElementById('cl-preview').innerHTML = `
      <div class="cl-pv-art">${clubCrestSVG(c, 62)}${clubShirtSVG(c, 62, 10)}</div>
      <div class="cl-pv-text">
        <div class="cl-pv-name">${clEsc(c.name || 'המועדון שלי')}</div>
        <div class="cl-pv-city">${clEsc(c.city || '—')}</div>
      </div>`;
  };

  const drawPane = () => {
    const c = _clDraft, pane = document.getElementById('cl-pane');
    if (tab === 'crest') {
      // The two sources are exclusive, so only one set of controls is ever on
      // screen: showing a colour picker next to a chosen PNG would offer a
      // change that does nothing.
      const src = c.crest.source === 'club' ? 'club' : 'built';
      pane.innerHTML =
        clubRow('csource', [['built', '✏️ בנה סמל'], ['club', '🛡 מהמאגר']], src) +
        (src === 'club'
          ? `<div class="cl-lbl">סמלי מועדונים מליגת העל והלאומית</div>
             <div class="cl-crests">` + CLUB_CREST_FILES.map(id =>
               `<button type="button" class="cl-crest${id === c.crest.clubId ? ' sel' : ''}" data-cid="${clEsc(id)}"
                  title="${clEsc(clubCrestLabel(id))}">
                  <img src="crests/${clEsc(id)}.png" alt="${clEsc(clubCrestLabel(id))}" loading="lazy"
                       onerror="this.closest('.cl-crest').style.display='none'">
                </button>`).join('') + `</div>
             <p class="cl-note">${clEsc(clubCrestLabel(c.crest.clubId))} — הסמל של המועדון האמיתי. הצבעים והחולצה עדיין שלך.</p>`
          : `<div class="cl-lbl">צורה</div>` +
            clubRow('shape', Object.entries(CREST_SHAPES).map(([k, v]) => [k, v.label]), c.crest.shape) +
            `<div class="cl-lbl">דוגמה</div>` +
            clubRow('pattern', Object.entries(CREST_PATTERNS), c.crest.pattern) +
            `<div class="cl-lbl">סמל</div>` +
            clubRow('icon', Object.entries(CREST_ICONS).map(([k, v]) => [k, v.label]), c.crest.icon) +
            `<div class="cl-lbl">צבע ראשי</div>` + clubSwatches('crest1', c.crest.c1) +
            `<div class="cl-lbl">צבע משני</div>` + clubSwatches('crest2', c.crest.c2));
    } else if (tab === 'kit') {
      pane.innerHTML =
        `<div class="cl-lbl">דוגמה</div>` +
        clubRow('kpattern', Object.entries(KIT_PATTERNS), c.kit.pattern) +
        `<div class="cl-lbl">צבע ראשי</div>` + clubSwatches('kit1', c.kit.c1) +
        `<div class="cl-lbl">צבע משני</div>` + clubSwatches('kit2', c.kit.c2) +
        `<button type="button" class="cl-mini" id="cl-copy-crest">↩ העתק את צבעי הסמל</button>`;
    } else {
      pane.innerHTML =
        `<div class="cl-lbl">שם המועדון</div>
         <input id="cl-name" class="auth-input" maxlength="24" placeholder="המועדון שלי" value="${clEsc(c.name)}">
         <div class="cl-lbl">עיר</div>
         <input id="cl-city" class="auth-input" maxlength="18" placeholder="תל אביב" value="${clEsc(c.city)}" list="cl-cities">
         <datalist id="cl-cities">${CLUB_CITIES.map(x => `<option value="${clEsc(x)}">`).join('')}</datalist>
         <p class="cl-note">השם והסמל מלווים אותך בכל המצבים — בטבלה, בגביע, באירופה ובכרטיס השיתוף.</p>`;
    }
  };

  // One delegated handler for the whole pane: the chips and swatches are redrawn
  // on every change, so binding them individually would rebind on every click.
  wrap.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;

    if (t.classList.contains('cl-tab')) {
      tab = t.dataset.tab;
      wrap.querySelectorAll('.cl-tab').forEach(b => b.classList.toggle('sel', b === t));
      drawPane(); return;
    }
    if (t.id === 'cl-dice')        { _clDraft = clubRandom(); drawPreview(); drawPane(); return; }
    if (t.id === 'cl-copy-crest')  { _clDraft.kit.c1 = _clDraft.crest.c1; _clDraft.kit.c2 = _clDraft.crest.c2; drawPreview(); drawPane(); return; }

    const d = t.dataset;
    if (d.cid) { _clDraft.crest.source = 'club'; _clDraft.crest.clubId = d.cid; }
    else if (d.csource)  _clDraft.crest.source  = d.csource;
    else if (d.shape)    _clDraft.crest.shape   = d.shape;
    else if (d.pattern)  _clDraft.crest.pattern = d.pattern;
    else if (d.icon)     _clDraft.crest.icon    = d.icon;
    else if (d.kpattern) _clDraft.kit.pattern   = d.kpattern;
    else if (d.color) {
      const which = t.closest('.cl-swatches')?.dataset.sw;
      if (which === 'crest1') _clDraft.crest.c1 = d.color;
      if (which === 'crest2') _clDraft.crest.c2 = d.color;
      if (which === 'kit1')   _clDraft.kit.c1   = d.color;
      if (which === 'kit2')   _clDraft.kit.c2   = d.color;
    } else return;

    drawPreview(); drawPane();
  });

  // The two inputs live in a pane that is rebuilt whenever a chip is clicked, so
  // their value is read back into the draft on every keystroke rather than at
  // save time — otherwise switching to the crest tab silently discards the name.
  wrap.addEventListener('input', e => {
    if (e.target.id === 'cl-name') { _clDraft.name = e.target.value; drawPreview(); }
    if (e.target.id === 'cl-city') { _clDraft.city = e.target.value; drawPreview(); }
  });

  wrap.querySelector('#cl-save').onclick = () => {
    _clDraft.name = String(_clDraft.name || '').trim().slice(0, 24);
    _clDraft.city = String(_clDraft.city || '').trim().slice(0, 18);
    if (!_clDraft.name) {
      // No name is the one state that makes the whole feature invisible, so it
      // is the one thing the editor refuses to save. Send them to the tab that
      // fixes it rather than to an error message.
      tab = 'info';
      wrap.querySelectorAll('.cl-tab').forEach(b => b.classList.toggle('sel', b.dataset.tab === 'info'));
      drawPane();
      const el = document.getElementById('cl-name');
      if (el) { el.focus(); el.classList.add('cl-bad'); }
      return;
    }
    _clDraft.v = 1;
    clubSave(_clDraft);
    close();
    if (typeof clubSyncSetupCard === 'function') clubSyncSetupCard();
    if (typeof onSaved === 'function') onSaved(clubGet());
  };

  drawPreview(); drawPane();
}

/* ── the entry on the setup screen ──────────────────────────────────────────── */
function clubSyncSetupCard() {
  const card = document.getElementById('setup-club-card');
  if (!card) return;
  const c = clubGet();
  const art   = card.querySelector('#scc-art');
  const title = card.querySelector('#scc-title');
  const sub   = card.querySelector('#scc-sub');
  if (c && String(c.name || '').trim()) {
    if (art)   art.innerHTML = clubCrestSVG(c, 34);
    if (title) title.textContent = c.name;
    if (sub)   sub.textContent = (c.city ? c.city + ' · ' : '') + 'לחץ כדי לערוך את הסמל והחולצה';
  } else {
    if (art)   art.innerHTML = '<span class="scc-empty">🛡</span>';
    if (title) title.innerHTML = 'המועדון שלי <span class="smc-new">חדש</span>';
    if (sub)   sub.textContent = 'שם, סמל וחולצה — ילוו אותך בכל המצבים';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const card = document.getElementById('setup-club-card');
  if (card) card.addEventListener('click', () => showClubEditor());
  clubSyncSetupCard();
});

/* ═══ מראה של תקופה ═══════════════════════════════════════════════════════════
   When the roulette lands on מכבי חיפה 2001/02, the card should look like 2001.
   The site is built on nostalgia and has so far only ever TALKED about it — the
   card carrying a 1999 squad and the card carrying a 2026 squad were the same
   card in different colours.

   Four skins, one per stretch of the site's 27 seasons. They are deliberately
   thin: a texture, a corner radius, a typographic weight and a border. The
   club's own colours still drive the header gradient, so a skin has to sit ON
   TOP of any of thirty-one palettes without fighting one — which is why none of
   them sets a background colour of its own.

   The class is applied to #squad-card and REMOVED before each new one is added.
   A skin left over from the previous round is exactly the "a field nobody sets
   is a field that carries over" bug this project has now hit three times, and
   here it would be silent: the card would simply keep looking like 2003. */
const ERA_SKINS = [
  { cls: 'era-a', from: 0,    to: 2004, label: '1999–2004' },
  { cls: 'era-b', from: 2005, to: 2011, label: '2005–2011' },
  { cls: 'era-c', from: 2012, to: 2018, label: '2012–2018' },
  // '2019–היום' would be right, and renders as 'היום–2019': the tag is set LTR so
  // the years read in order, and a Hebrew word inside an LTR run gets reordered
  // to the front. A pure-digit label sidesteps bidi entirely.
  { cls: 'era-d', from: 2019, to: 9999, label: '2019+' },
];
const ERA_ALL = ERA_SKINS.map(e => e.cls);

function eraSkinFor(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return null;
  return ERA_SKINS.find(e => y >= e.from && y <= e.to) || null;
}

// season is the raw "2001/02" string the squad carries.
function applyEraSkin(el, season) {
  if (!el) return;
  el.classList.remove(...ERA_ALL);
  el.removeAttribute('data-era');
  if (!season) return;
  const year = parseInt(String(season).split('/')[0], 10);
  const skin = eraSkinFor(year);
  if (!skin) return;
  el.classList.add(skin.cls);
  // The tag is drawn by CSS from this attribute. Without it the skin is a set of
  // subtle CSS differences that a player has no reason to notice, let alone read
  // as a feature — naming the span is what turns a texture into "this is 2001".
  el.setAttribute('data-era', skin.label);
}
