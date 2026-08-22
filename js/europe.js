// The European campaign — what a title-winning season is actually worth.
//
// This is NOT the gauntlet. The gauntlet is a roguelike: one life, relics, coins,
// a map. This is the season's own continuation, so it is built in the season's
// idiom — the whole campaign is simulated up front and revealed as rows, a tie is
// two legs and an aggregate, and the league phase ends in a table read exactly
// like the league table on the results screen.
//
// ── Ratings, which are the whole design ──────────────────────────────────────
// A PERFECT draft — the best legal player at every slot, across every season in
// the data — rates 91 (92 in peak mode). A normal good draft lands at 85-88.
// The pots are set against that number, not against it being close:
//
//   pot 1  96-99   pot 2  93-99   pot 3  89-90   pot 4  84-91
//
// Eleven clubs sit at 99 — eight clear of anything Israeli football has ever
// assembled. That gap is the design, not an accident of tuning: see
// docs/EUROPE.md for what it costs a squad at each rating.
//
// The pots are the DRAW (two clubs from each), not a difficulty ladder: the
// ratings were set club by club, so pot 2 holds three 99s and pot 4 holds a 91.
// Nothing in the code assumes pot number tracks strength.

/* ── the clubs ────────────────────────────────────────────────────────────────
   The four qualifying opponents are not invented. docs/EUROPE_OPPONENTS.md counts
   every tie Israeli champions played from 2000/01 to 2026/27, and these are the
   clubs that keep turning up in each round — Salzburg most of all, three times in
   the play-off, more than anyone. They also exist in js/gauntlet-europe.js as
   GM_EU with the same ratings; the gauntlet keeps its own copy because it stores
   line ratings inside a run. Change a rating in one place, change it in both. */

// Three candidates per round, one drawn per campaign, so the same season is not
// the same summer twice. Each round holds one club easier and one harder than
// the anchor, which is what makes the draw worth caring about: a 79 in the first
// round can end a run that a 75 would have waved through.
//
// `round` is the chip on the tie header, where space is short. `roundLong` is
// the form a sentence needs: "נעצרת בסיבוב המוקדמות השלישי", not "נעצרת במוקדמות 3".
const EU_ROUNDS = [
  { round: 'מוקדמות 1', roundLong: 'סיבוב המוקדמות הראשון', clubs: [
    { id: 'eu-kalju',  name: 'נומה קאליו',   country: 'אסטוניה', flag: '🇪🇪', ovr: 77,
      desc: 'אלופת אסטוניה. הסיבוב שישראלית מגיעה אליו רק כשהמקדם נמוך - ובכל ארבע הפעמים היריבה הייתה אחרת.' },
    { id: 'eu-flora',  name: 'פלורה טאלין',  country: 'אסטוניה', flag: '🇪🇪', ovr: 75,
      desc: 'הפועל באר שבע עברה אותה ב-2018/19. הסיבוב הראשון שלה, וגם שלך.' },
    { id: 'eu-kairat', name: 'קייראט אלמאטי', country: 'קזחסטן', flag: '🇰🇿', ovr: 79,
      desc: 'אלופת קזחסטן שהדיחה את מכבי חיפה ב-2021/22. הסיבוב הראשון לא תמיד קל.' },
  ]},
  { round: 'מוקדמות 2', roundLong: 'סיבוב המוקדמות השני', clubs: [
    { id: 'eu-sheriff', name: 'שריף טירספול', country: 'מולדובה', flag: '🇲🇩', ovr: 84,
      desc: 'היריבה החוזרת ביותר של הסיבוב השני: פעמיים מול ישראליות, ושתי הפעמים הן עברו.' },
    { id: 'eu-zilina',  name: 'ז\'ילינה',      country: 'סלובקיה', flag: '🇸🇰', ovr: 81,
      desc: 'נפגשה פעמיים בסיבוב הזה - מכבי ת"א ב-2003/04 ועירוני קריית שמונה ב-2012/13.' },
    { id: 'eu-copenhagen', name: 'קופנהגן',   country: 'דנמרק',  flag: '🇩🇰', ovr: 87,
      desc: 'בית"ר ירושלים נתקלה בה ב-2007/08. גדולה מדי לסיבוב השני, וזה בדיוק העניין.' },
  ]},
  { round: 'מוקדמות 3', roundLong: 'סיבוב המוקדמות השלישי', clubs: [
    { id: 'eu-zvezda',  name: 'הכוכב האדום בלגרד', country: 'סרביה',   flag: '🇷🇸', ovr: 87,
      desc: 'מכבי חיפה הדיחה אותה ב-2022/23 ועלתה לשלב הבתים. מרקאנה הסרבית לא מוחלת פעמיים.' },
    { id: 'eu-maribor', name: 'מריבור',            country: 'סלובניה', flag: '🇸🇮', ovr: 85,
      desc: 'שלושה מפגשים מול ישראליות - יותר מכל מועדון חוץ מזלצבורג.' },
    { id: 'eu-basel',   name: 'באזל',              country: 'שווייץ',  flag: '🇨🇭', ovr: 89,
      desc: 'מכבי ת"א עברה אותה ב-2015/16 בשערי חוץ. הסיבוב השלישי במיטבו הקשה.' },
  ]},
  { round: 'פלייאוף', roundLong: 'שלב הפלייאוף', clubs: [
    { id: 'eu-salzburg', name: 'רד בול זלצבורג', country: 'אוסטריה', flag: '🇦🇹', ovr: 89,
      desc: 'הקיר של הפלייאוף: שלושה מפגשים מול ישראליות, יותר מכל מועדון אחר. מי שעובר אותה - בשלב הליגה.' },
    { id: 'eu-bate',     name: 'באט"ה בוריסוב',  country: 'בלארוס',  flag: '🇧🇾', ovr: 86,
      desc: 'עצרה את עירוני קריית שמונה ב-2012/13, במסע האירופי היחיד של המועדון.' },
    { id: 'eu-celtic',   name: 'סלטיק',          country: 'סקוטלנד', flag: '🏴', ovr: 91,
      desc: 'הפועל באר שבע נפלה מולה ב-2016/17. סלטיק פארק הוא לא מקום להתחיל בו קיץ.' },
  ]},
];

// 35 clubs in four pots. The 36th seat in the table is yours, and it is in pot 4
// — which is where an Israeli champion actually lands.
const EU_POTS = [
  [ // pot 1 — 96-99. The clubs you are not supposed to take a point off.
    { name: 'ריאל מדריד', flag: '🇪🇸', ovr: 99 },
    { name: 'ברצלונה', flag: '🇪🇸', ovr: 99 },
    { name: "מנצ'סטר סיטי", flag: '🏴', ovr: 99 },
    { name: 'באיירן מינכן', flag: '🇩🇪', ovr: 99 },
    { name: 'ליברפול', flag: '🏴', ovr: 99 },
    { name: "פריז סן ז'רמן", flag: '🇫🇷', ovr: 99 },
    { name: 'אינטר', flag: '🇮🇹', ovr: 99 },
    { name: 'בורוסיה דורטמונד', flag: '🇩🇪', ovr: 99 },
    { name: 'לייפציג', flag: '🇩🇪', ovr: 96 },
  ],
  [ // pot 2 — 93-99. Arsenal, Atlético and Juventus are rated with pot 1.
    { name: 'ארסנל', flag: '🏴', ovr: 99 },
    { name: 'אתלטיקו מדריד', flag: '🇪🇸', ovr: 99 },
    { name: 'באייר לוורקוזן', flag: '🇩🇪', ovr: 94 },
    { name: 'יובנטוס', flag: '🇮🇹', ovr: 99 },
    { name: 'מילאן', flag: '🇮🇹', ovr: 94 },
    { name: 'אטלנטה', flag: '🇮🇹', ovr: 93 },
    { name: 'בנפיקה', flag: '🇵🇹', ovr: 93 },
    { name: 'פורטו', flag: '🇵🇹', ovr: 93 },
    { name: 'אתלטיק בילבאו', flag: '🇪🇸', ovr: 93 },
  ],
  [ // pot 3 — 89-90. Olympiacos and Young Boys are here for a reason: both
    // knocked on Israeli doors in the real qualifying rounds.
    { name: 'ספורטינג ליסבון', flag: '🇵🇹', ovr: 90 },
    { name: 'פיינורד', flag: '🇳🇱', ovr: 90 },
    { name: 'PSV איינדהובן', flag: '🇳🇱', ovr: 90 },
    { name: 'ליל', flag: '🇫🇷', ovr: 90 },
    { name: 'סלטיק', flag: '🏴', ovr: 89 },
    { name: 'שחטאר דונייצק', flag: '🇺🇦', ovr: 89 },
    { name: 'דינמו זאגרב', flag: '🇭🇷', ovr: 89 },
    { name: 'יאנג בויז', flag: '🇨🇭', ovr: 89 },
    { name: 'אולימפיאקוס', flag: '🇬🇷', ovr: 89 },
  ],
  [ // pot 4 — 84-91. Your own pot, and the only place the table is winnable —
    // though Aston Villa at 91 outrates everything in pot 3.
    { name: 'אסטון וילה', flag: '🏴', ovr: 91 },
    { name: 'מונאקו', flag: '🇫🇷', ovr: 90 },
    { name: 'שטוטגרט', flag: '🇩🇪', ovr: 88 },
    { name: "ז'ירונה", flag: '🇪🇸', ovr: 86 },
    { name: 'ספרטה פראג', flag: '🇨🇿', ovr: 85 },
    { name: 'ברסט', flag: '🇫🇷', ovr: 85 },
    { name: 'שטורם גראץ', flag: '🇦🇹', ovr: 84 },
    { name: 'סלובאן ברטיסלבה', flag: '🇸🇰', ovr: 84 },
  ],
];

// One stand-by per pot. The league phase is 36 clubs and stays 36: a side you
// eliminated in qualifying is out of the competition, and somebody takes the
// seat. Today only Celtic can trigger this — she is the one club that sits in
// both a qualifying round and a pot — but the mechanism is general, because the
// day another overlap is added nobody will remember to re-check the count.
const EU_RESERVES = [
  [{ name: "צ'לסי", flag: '🏴', ovr: 97 },       { name: 'ניוקאסל', flag: '🏴', ovr: 96 }],
  [{ name: 'נאפולי', flag: '🇮🇹', ovr: 93 },      { name: 'מרסיי', flag: '🇫🇷', ovr: 93 }],
  [{ name: 'גלאטסראיי', flag: '🇹🇷', ovr: 89 },   { name: 'אייאקס', flag: '🇳🇱', ovr: 89 }],
  [{ name: "קלאב ברוז'", flag: '🇧🇪', ovr: 85 },  { name: "ריינג'רס", flag: '🏴', ovr: 85 }],
];

const EU_KEY = 'europe';                 // the slot inside the saved draft
let _euCampaign = null;

/* ── ratings ──────────────────────────────────────────────────────────────── */
// Four line ratings drawn at random that average EXACTLY the club's rating: the
// deltas are forced to sum to zero. A club is nothing but these four numbers —
// none of them exist in our player data, and none of them need to.
function euLines(ovr) {
  let d;
  do {
    d = [0, 0, 0].map(() => Math.floor(Math.random() * 9) - 4);
    d.push(-(d[0] + d[1] + d[2]));
  } while (Math.abs(d[3]) > 4);
  return { atk: ovr + d[0], mid: ovr + d[1], def: ovr + d[2], gk: ovr + d[3] };
}

function euTeam(club) { return { name: club.name, ovr: club.ovr, ...euLines(club.ovr) }; }

/* ── the qualifying ties ──────────────────────────────────────────────────── */
// Away first, home second, aggregate over the two. Level after 180 minutes goes
// to extra time in the second leg — a third of a match's worth of chances — and
// then, if it is still level, to a coin flip. No away goals: UEFA abolished them
// in 2021 and this ladder is the modern one.
function euPlayTie(me, club) {
  const opp = euTeam(club);
  const legs = [simulateMatchV2(me, opp, false), simulateMatchV2(me, opp, true)];
  const tie = { id: club.id, name: club.name, flag: club.flag, country: club.country,
                round: club.round, roundLong: club.roundLong, ovr: club.ovr, lines: { atk: opp.atk, mid: opp.mid, def: opp.def, gk: opp.gk },
                legs, et: null, pens: null };
  let gf = legs[0].gf + legs[1].gf, ga = legs[0].ga + legs[1].ga;
  if (gf === ga) {
    const a = simShrinkLines(me), b = simShrinkLines(opp);
    const eg = simDrawGoals(simExpectedGoals(a, b, true) / 3);
    const ea = simDrawGoals(simExpectedGoals(b, a, false) / 3);
    tie.et = { gf: eg, ga: ea };
    gf += eg; ga += ea;
  }
  if (gf === ga) {
    const mine = 3 + (Math.random() < 0.5 ? 1 : 0);
    tie.pens = { gf: mine, ga: mine === 4 ? 3 : 4 };
  }
  tie.agg = { gf, ga };
  tie.won = tie.pens ? tie.pens.gf > tie.pens.ga : gf > ga;
  return tie;
}

/* ── the league phase ─────────────────────────────────────────────────────── */
// Eight matches against eight different clubs: two out of every pot, one at home
// and one away in each — the real format since 2024. Your own pot gives you two
// of the eight clubs in it, because the ninth seat is you.
function euDrawLeaguePhase(me, myOvr, beaten = []) {
  const out = new Set(beaten);
  const used = new Set();          // a reserve fills exactly one seat
  const pots = EU_POTS.map((pot, i) => {
    const kept = pot.filter(c => !out.has(c.name));
    // refill, so the field is always 35 opponents and the table always 36 rows
    const bench = EU_RESERVES[i] || [];
    for (const club of bench) {
      if (kept.length >= pot.length) break;
      if (!used.has(club.name)) { kept.push(club); used.add(club.name); }
    }
    // A pot can in principle lose all four qualifying opponents, more than its
    // own bench covers, so a pot that is still short borrows from the others.
    // Without this the table quietly returns 35 rows and calls itself 36.
    for (const club of EU_RESERVES.flat()) {
      if (kept.length >= pot.length) break;
      if (!used.has(club.name)) { kept.push(club); used.add(club.name); }
    }
    return kept;
  });
  const opponents = [];
  pots.forEach((pot, pi) => {
    const two = shuffleArr([...pot]).slice(0, 2);
    two.forEach((club, k) => opponents.push({ ...club, pot: pi + 1, home: k === 0 }));
  });
  const matches = shuffleArr(opponents).map(o => {
    const m = simulateMatchV2(me, euTeam(o), o.home);
    m.pot = o.pot; m.flag = o.flag; m.ovr = o.ovr;
    return m;
  });

  // The other 35 clubs never play a ball. Their points come from the same
  // closed-form estimator that already fills the Israeli league table, over the
  // same eight matches — order from the xG model, spacing conventionalised, and
  // a form swing per club so the table is not identical every campaign.
  const field = pots.flat().map(c => ({ ...c, ...euLines(c.ovr) }));
  const est = simTableEstimateV2([...field, { ...me, name: 'me' }], 8);
  const myPts = matches.reduce((s, m) => s + (m.outcome === 'W' ? 3 : m.outcome === 'D' ? 1 : 0), 0);

  const table = field.map((c, i) => ({ name: c.name, flag: c.flag, pts: est[i], us: false }));
  table.push({ name: 'הקבוצה שלי', flag: '🇮🇱', pts: myPts, us: true, ovr: myOvr });
  // Ties always favour the player — the same rule the league table uses.
  table.sort((a, b) => b.pts - a.pts || (a.us ? -1 : b.us ? 1 : 0));

  const rank = table.findIndex(t => t.us) + 1;
  return { matches, table, rank, pts: myPts };
}

const EU_BANDS = [
  { max: 8,  id: 'r16',    label: '🏆 עלית ישירות לשמינית הגמר',  note: 'שמונה הראשונות עוקפות את הפלייאוף.' },
  { max: 24, id: 'po',     label: '✅ עלית לפלייאוף הנוקאאוט',      note: 'מקומות 9-24 משחקים סיבוב נוסף על מקום בשמינית.' },
  { max: 36, id: 'out',    label: '❌ סיימת מחוץ לתמונה',           note: 'מקומות 25-36 נגמרו להם באירופה.' },
];
function euBand(rank) { return EU_BANDS.find(b => rank <= b.max); }

/* ── the campaign ─────────────────────────────────────────────────────────── */
function euBuildCampaign() {
  const me = myLineRatings();
  const c = { v: 1, ovr: me.ovr, lines: { atk: me.atk, mid: me.mid, def: me.def, gk: me.gk },
              qual: [], eliminatedAt: null, league: null };
  const beaten = [];
  for (let i = 0; i < EU_ROUNDS.length; i++) {
    const r = EU_ROUNDS[i];
    const club = { ...r.clubs[Math.floor(Math.random() * r.clubs.length)],
                   round: r.round, roundLong: r.roundLong };
    const tie = euPlayTie(me, club);
    c.qual.push(tie);
    if (!tie.won) { c.eliminatedAt = i; break; }
    beaten.push(tie.name);
  }
  // A club you knocked out in July cannot be waiting for you in September. That
  // is why Salzburg and Crvena Zvezda were kept out of the pots by hand; doing it
  // from the tie you actually played covers every draw, including Celtic, who
  // sits in pot 3 as well as the play-off.
  if (c.eliminatedAt === null) c.league = euDrawLeaguePhase(me, me.ovr, beaten);

  // Scorers, so a European row reads like a league row. Same helper the season
  // uses, so the names come from the XI that actually played.
  const all = [];
  c.qual.forEach(t => { all.push(...t.legs); });
  if (c.league) all.push(...c.league.matches);
  try { simulatePlayerStats(all); } catch (e) {}
  return c;
}

/* ── persistence ──────────────────────────────────────────────────────────── */
// The campaign lives beside the season inside the saved draft, so a refresh
// shows the campaign you played rather than rolling a new one.
function euSave(c) {
  try {
    const raw = localStorage.getItem(DRAFT_SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    d[EU_KEY] = c;
    localStorage.setItem(DRAFT_SAVE_KEY, JSON.stringify(d));
  } catch (e) {}
}
function euLoad() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY));
    return d && d[EU_KEY] && d[EU_KEY].v === 1 ? d[EU_KEY] : null;
  } catch (e) { return null; }
}
function euClear() {
  _euCampaign = null;
  try {
    const raw = localStorage.getItem(DRAFT_SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    delete d[EU_KEY];
    localStorage.setItem(DRAFT_SAVE_KEY, JSON.stringify(d));
  } catch (e) {}
}

/* ── editable copy ────────────────────────────────────────────────────────── */
// Every sentence on this screen is overridable from the admin panel, like the
// rest of the site. The four qualifying blurbs deliberately reuse the gauntlet's
// own keys (gt-eu-*) so a club is described the same way wherever it turns up.
function euText(key, def) {
  return (typeof siteText === 'function' ? siteText(key, def) : def) || def;
}

/* ── the screen ───────────────────────────────────────────────────────────── */
function euStart() {
  if (!state.picks || !state.picks.some(Boolean)) return;
  _euCampaign = _euCampaign || euLoad();
  const fresh = !_euCampaign;
  if (fresh) { _euCampaign = euBuildCampaign(); euSave(_euCampaign); }
  showScreen('europe');
  const back = document.getElementById('eu-back');
  if (back) back.onclick = () => showScreen('results');
  euRender(fresh);
}

function euMatchRowHTML(m, label) {
  const rc = m.outcome === 'W' ? 'win' : m.outcome === 'D' ? 'draw' : 'loss';
  const rl = m.outcome === 'W' ? 'נ' : m.outcome === 'D' ? 'ת' : 'ה';
  const scorers = (m.scorers && m.scorers.length)
    ? `<div class="mr-scorers">⚽ ${m.scorers.map(s => `${s.n} ${s.min}'`).join(' · ')}</div>` : '';
  return `
    <div class="match-row ${rc}">
      <div class="mr-main">
        <span class="mr-badge ${rc}">${rl}</span>
        <span class="mr-opponent">${label} <span class="mr-venue">${m.home ? '(ב)' : '(ח)'}</span></span>
        <span class="mr-score" dir="ltr">${m.gf}-${m.ga}</span>
      </div>
      ${scorers}
    </div>`;
}

function euTieHTML(t) {
  const extra = [];
  if (t.et) extra.push(`הארכה <bdi dir="ltr">${t.et.gf}-${t.et.ga}</bdi>`);
  if (t.pens) extra.push(`פנדלים <bdi dir="ltr">${t.pens.gf}-${t.pens.ga}</bdi>`);
  return `
    <div class="eu-tie ${t.won ? 'won' : 'lost'}">
      <div class="eu-tie-head">
        <img class="eu-tie-crest" src="crests/eu/${t.id}.png" alt=""
             onerror="this.style.visibility='hidden'">
        <span class="eu-tie-name">${t.name}
          <span class="eu-tie-sub">${t.flag} ${t.country} · ${t.round}</span></span>
        <span class="eu-tie-ovr">${t.ovr}</span>
      </div>
      <div class="eu-tie-desc">${euText('gt-' + t.id, '')}</div>
      <div class="eu-tie-scout" dir="ltr">GK ${t.lines.gk} · DEF ${t.lines.def} · MID ${t.lines.mid} · ATK ${t.lines.atk}</div>
      ${euMatchRowHTML(t.legs[0], t.name)}
      ${euMatchRowHTML(t.legs[1], t.name)}
      <div class="eu-agg">
        <span class="eu-agg-lbl">מצטבר</span>
        <span class="eu-agg-val" dir="ltr">${t.agg.gf}-${t.agg.ga}</span>
        ${extra.length ? `<span class="eu-agg-extra">${extra.join(' · ')}</span>` : ''}
        <span class="eu-agg-res">${t.won ? '✅ עולה' : '❌ נעצרת כאן'}</span>
      </div>
    </div>`;
}

function euTableHTML(table) {
  return table.map((t, i) => {
    const sep = (i === 8 || i === 24) ? '<div class="lt-bracket-sep"></div>' : '';
    const name = t.us
      ? `<span class="lt-name">הקבוצה שלי <span class="lt-us-badge">#${i + 1}</span></span>`
      : `<span class="lt-name">${t.flag} ${t.name}</span>`;
    return `${sep}<div class="lt-row${t.us ? ' lt-us' : ''}">
      <span class="lt-pos">${i + 1}</span>${name}
      <span class="lt-pts" dir="ltr">${t.pts}</span></div>`;
  }).join('');
}

function euRender(animate) {
  const c = _euCampaign, body = document.getElementById('eu-body');
  if (!c || !body) return;
  const won = c.qual.filter(t => t.won).length;

  const head = `
    <div class="eu-head">
      <div class="eu-kicker">${euText('eu-kicker', 'אלופת ישראל · הקיץ שאחרי')}</div>
      <div class="eu-title">🇪🇺 ${euText('eu-title', 'מוקדמות ליגת האלופות')}</div>
      <p class="eu-sub">${euText('eu-sub', 'ארבעה תיקים, כל אחד בית וחוץ. ההרכב שלך משחק כמו שהוא -')}
        <bdi dir="ltr">${c.ovr}</bdi> ${euText('eu-sub-tail', 'מול אירופה.')}</p>
    </div>`;

  const ties = c.qual.map(euTieHTML).join('');

  let tail = '';
  if (c.eliminatedAt !== null) {
    const t = c.qual[c.eliminatedAt];
    tail = `
      <div class="eu-verdict out">
        <div class="eu-verdict-t">${euText('eu-out-title', 'נעצרת ב')}${euText('eu-round-' + t.id, t.roundLong || t.round)}</div>
        <p>${t.name} ${euText('eu-out-body', 'עברה במצבר')} <bdi dir="ltr">${t.agg.ga}-${t.agg.gf}</bdi>.
           ${euText('eu-out-tail-a', 'עברת')} ${won} ${euText('eu-out-tail-b', 'מתוך 4 סיבובים - הקיץ נגמר.')}</p>
      </div>`;
  } else {
    const L = c.league, band = euBand(L.rank);
    tail = `
      <div class="eu-verdict in">
        <div class="eu-verdict-t">🏆 ${euText('eu-in-title', 'עלית לשלב הליגה של ליגת האלופות!')}</div>
        <p>${euText('eu-in-body', 'רד בול זלצבורג נשארת מאחור. אין יותר מוקדמות.')}</p>
      </div>
      <div class="eu-phase">
        <div class="eu-phase-t">${euText('eu-phase-t', 'שלב הליגה')}</div>
        <p class="eu-phase-sub">${euText('eu-phase-sub', 'שמונה משחקים מול שמונה יריבות שונות - שתיים מכל סל, אחת בבית ואחת בחוץ.')}</p>
      </div>
      ${L.matches.map(m => euMatchRowHTML(m, `${m.flag} ${m.opponent} <span class="mr-pot">סל ${m.pot} · ${m.ovr}</span>`)).join('')}
      <div class="eu-phase">
        <div class="eu-phase-t">${euText('eu-table-t', 'טבלת שלב הליגה')}</div>
        <p class="eu-phase-sub">${euText('eu-table-sub', '36 קבוצות, 8 מחזורים. הקו הראשון הוא השמינית, השני הוא הפלייאוף.')}</p>
      </div>
      <div class="eu-table">${euTableHTML(L.table)}</div>
      <div class="eu-verdict ${band.id === 'out' ? 'out' : 'in'}">
        <div class="eu-verdict-t">${euText('eu-band-' + band.id, band.label)}</div>
        <p>${euText('eu-rank-a', 'מקום')} <bdi dir="ltr">${L.rank}</bdi>
           ${euText('eu-rank-b', 'מתוך 36 עם')} <bdi dir="ltr">${L.pts}</bdi>
           ${euText('eu-rank-c', 'נקודות.')} ${euText('eu-band-note-' + band.id, band.note)}</p>
      </div>`;
  }

  body.innerHTML = head + ties + tail +
    `<button class="btn-secondary btn-full" id="eu-done">← ${euText('eu-back', 'חזרה לתוצאות העונה')}</button>`;
  const done = body.querySelector('#eu-done');
  if (done) done.onclick = () => showScreen('results');

  // A fresh campaign is worth watching arrive; a revisit is not.
  if (animate) {
    const blocks = body.querySelectorAll('.eu-tie, .match-row, .eu-verdict, .eu-phase, .eu-table');
    blocks.forEach((el, i) => {
      el.style.opacity = '0';
      setTimeout(() => { el.style.transition = 'opacity .35s'; el.style.opacity = '1'; }, 120 * i);
    });
  }
}
