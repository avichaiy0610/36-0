// The European leg — what a champion actually gets for winning the league.
//
// Four ties, home and away, the real qualifying ladder an Israeli champion
// climbs. Who is on it is not invented: docs/EUROPE_OPPONENTS.md counts every
// tie Israeli title-holders played from 2000-01 to 2026-27, and these are the
// clubs that keep turning up in each round — Salzburg most of all, three times
// in the play-off, more than anyone.
//
// These clubs are not in our data and have no players. A club here is four line
// ratings and nothing else, which is exactly what the fight engine needs.

const GM_EU = [
  { id: 'eu-kalju', eu: true, name: 'נומה קאליו', country: 'אסטוניה', flag: '🇪🇪',
    round: 'מוקדמות 1', ovr: 77,
    desc: 'אלופת אסטוניה. הסיבוב שישראלית מגיעה אליו רק כשהמקדם נמוך - ובכל ארבע הפעמים היריבה הייתה אחרת.' },
  { id: 'eu-sheriff', eu: true, name: 'שריף טירספול', country: 'מולדובה', flag: '🇲🇩',
    round: 'מוקדמות 2', ovr: 84,
    desc: 'היריבה החוזרת ביותר של הסיבוב השני: פעמיים מול ישראליות, ושתי הפעמים הן עברו.' },
  { id: 'eu-zvezda', eu: true, name: 'הכוכב האדום בלגרד', country: 'סרביה', flag: '🇷🇸',
    round: 'מוקדמות 3', ovr: 87,
    desc: 'מכבי חיפה הדיחה אותה ב-2022/23 ועלתה לשלב הבתים. מרקאנה הסרבית לא מוחלת פעמיים.' },
  { id: 'eu-salzburg', eu: true, name: 'רד בול זלצבורג', country: 'אוסטריה', flag: '🇦🇹',
    round: 'פלייאוף', ovr: 89,
    desc: 'הקיר של הפלייאוף: שלושה מפגשים מול ישראליות, יותר מכל מועדון אחר. מי שעובר אותה - בשלב הבתים.' },
];

function gtEuNode(i) { return GM_EU[i] || null; }
function gtEuAt() { return gtRun().euAt || 0; }
function gtEuDone() { return gtEuAt() >= GM_EU.length; }
// the European leg only opens once the Israeli map is behind you
function gtEuUnlocked() { return gtRun().at >= GM_RUN.length; }

/* ── the four line ratings ────────────────────────────────────────────────── */
// Drawn at random, but never drifting from the club's rating: the four deltas
// are forced to sum to zero, so the average is exactly the number on the badge.
// Rolled once per run and stored, so a refresh does not hand you a different
// Salzburg than the one you were about to play.
function gtEuLines(node) {
  const run = gtRun();
  run.euLines = run.euLines || {};
  if (!run.euLines[node.id]) {
    let d;
    do {
      d = [0, 0, 0].map(() => Math.floor(Math.random() * 9) - 4);   // −4…+4
      d.push(-(d[0] + d[1] + d[2]));
    } while (Math.abs(d[3]) > 4);
    run.euLines[node.id] = {
      atk: node.ovr + d[0], mid: node.ovr + d[1],
      def: node.ovr + d[2], gk: node.ovr + d[3],
    };
    gtSave();
  }
  return run.euLines[node.id];
}

// Same shape the V2 engine wants, with the banner and the run rule folded in
// exactly as they are for an Israeli opponent.
function gtEuOpponent(node) {
  const l = gtEuLines(node);
  const lift = gtBannerBoost() + gtDealNum('oppOvr') + gtModNum('oppOvr');
  return {
    name: node.name, eu: true, id: node.id,
    ovr: node.ovr + lift,
    atk: l.atk + lift, mid: l.mid + lift, def: l.def + lift, gk: l.gk + lift,
  };
}

function gtEuShownOvr(node) {
  return node.ovr + gtBannerBoost() + gtDealNum('oppOvr') + gtModNum('oppOvr');
}

/* ── the panel ────────────────────────────────────────────────────────────── */
function gtEuPanelHTML() {
  const at = gtEuAt();
  const done = gtEuDone();
  const rows = GM_EU.map((n, i) => {
    const state = i < at ? 'done' : i === at && !done ? 'next' : 'locked';
    const l = i <= at ? gtEuLines(n) : null;
    return `
      <button class="gm-road eu-road ${state}" ${state === 'next' ? `data-eu="${i}"` : 'disabled'}>
        <img class="gm-road-crest" src="crests/eu/${n.id}.png" alt=""
             onerror="this.style.visibility='hidden'">
        <span class="gm-road-main">
          <span class="gm-road-club">${n.name} <span class="gm-road-season">${n.flag} ${n.country}</span>
            <span class="eu-round">${n.round}</span></span>
          <span class="gm-road-fin">${i < at ? '✅ הודחה' : 'בית וחוץ · מאזן מצטבר'}</span>
          <span class="gm-road-desc">${gtEuText(n)}</span>
          ${l && state !== 'locked' ? `<span class="gm-road-scout" dir="ltr">GK ${l.gk} · DEF ${l.def} · MID ${l.mid} · ATK ${l.atk}</span>` : ''}
        </span>
        <span class="gm-road-ovr">${gtEuShownOvr(n)}</span>
      </button>`;
  }).join('');

  return `
    <div class="gt-eu">
      <div class="gt-eu-head">
        <div class="gt-eu-kicker">הפרס על האליפות</div>
        <div class="gt-eu-title">🇪🇺 מוקדמות ליגת האלופות</div>
        <p class="gt-eu-sub">${done
          ? 'עברת את כל ארבעת הסיבובים. שלב הבתים.'
          : 'ארבעה סיבובים, כל אחד בית וחוץ עם מאזן מצטבר. אותם חוקים: הפסד מסיים את המסע.'}</p>
      </div>
      ${rows}
    </div>`;
}

// The copy here is editable from the admin panel like everything else.
function gtEuText(node) {
  // node.id already starts with "eu-", so the key reads gt-eu-salzburg
  return (typeof siteText === 'function' ? siteText('gt-' + node.id, node.desc) : node.desc) || '';
}

function gtWireEu(root) {
  root.querySelectorAll('.eu-road[data-eu]').forEach(btn => {
    btn.onclick = () => gtEuChoose(+btn.dataset.eu);
  });
}

function gtEuChoose(i) {
  const run = gtRun();
  if (run.over || i !== gtEuAt()) return;
  if (!gtRestoreSquad()) return;          // the XI that cleared Israel comes along
  state.gauntlet = { eu: i };
  gtFight();
}
