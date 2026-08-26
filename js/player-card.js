// ─── The player card: who this man actually was ───────────────────────────────
//
// A rating and a row of emoji are not enough to choose on. Hover a player in the
// draft (or tap the ⓘ) and this opens the file on him: the seasons he really
// played, the goals and assists the league actually credited him with, the
// titles his clubs actually won, and — spelled out in words — what each of his
// tags does if you put him where he belongs.
//
// Everything here is real. The season numbers come from the league's own
// top-scorer and top-assist lists (js/tag-data.js), the careers from the squad
// data, the titles from the final tables. Nothing is invented to fill a gap:
// a player who never made a list gets no numbers section at all, and what the
// card can still say about him — who he played beside, how long he stayed — is
// computed from his appearances, never guessed.

const PCARD_ID = 'pcard';
let _pcTimer = null, _pcOpenFor = null;

function pcEsc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function pcNorm(s) {
  return String(s ?? '')
    .replace(/[‎‏‪-‮⁦-⁩]/g, '')
    .replace(/[׳’`´']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
function pcHasHover() {
  try { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; }
  catch (e) { return true; }
}

/* ── the facts ────────────────────────────────────────────────────────────── */
// Every partner the pair list knows for this player, best link first.
let _pcPartners = null;
function pcPartnersOf(name) {
  if (typeof CHEM_PAIRS === 'undefined') return [];
  if (!_pcPartners) {
    _pcPartners = {};
    Object.keys(CHEM_PAIRS).forEach(k => {
      const [a, b] = k.split('|'), row = CHEM_PAIRS[k];
      (_pcPartners[a] = _pcPartners[a] || []).push({ who: b, tier: row[0], seasons: row[1], titles: row[2] });
      (_pcPartners[b] = _pcPartners[b] || []).push({ who: a, tier: row[0], seasons: row[1], titles: row[2] });
    });
    Object.keys(_pcPartners).forEach(k =>
      _pcPartners[k].sort((x, y) => y.tier - x.tier || y.seasons - x.seasons));
  }
  return _pcPartners[pcNorm(name)] || [];
}

/* ── the career, whole ────────────────────────────────────────────────────── */
// The minigames' index keeps ONE row per year, best card wins, so a career reads
// tidily. A card that states a man's clubs cannot do that: Gili Vermouth moved
// mid-season twice, and both of his Maccabi Tel Aviv seasons lost the tie-break
// to the other club — the card confidently listed three clubs for a man who
// played for four. So this index keeps every appearance and counts DISTINCT
// seasons separately from club-seasons.
let _pcIdx = null;
function pcIndex() {
  if (_pcIdx) return _pcIdx;
  _pcIdx = new Map();
  if (typeof SQUADS === 'undefined') return _pcIdx;
  SQUADS.forEach(sq => {
    const y = typeof parseSeasonYear === 'function' ? parseSeasonYear(sq.season) : parseInt(sq.season, 10);
    sq.players.forEach(p => {
      const k = pcNorm(p.name);
      let e = _pcIdx.get(k);
      if (!e) { e = { key: k, name: p.name, rows: [] }; _pcIdx.set(k, e); }
      e.rows.push({
        y, season: sq.season, teamId: sq.teamId, ovr: p.ovr,
        pos: typeof normalizePos === 'function' ? normalizePos(p.position) : p.position,
      });
    });
  });
  _pcIdx.forEach(e => {
    e.rows.sort((a, b) => a.y - b.y || b.ovr - a.ovr);
    e.seasons = new Set(e.rows.map(r => r.season)).size;   // distinct seasons
    e.peak    = Math.max(...e.rows.map(r => r.ovr));
    e.first   = e.rows[0];
    e.last    = e.rows[e.rows.length - 1];
    e.clubs   = [...new Set(e.rows.map(r => r.teamId))];
    const byPos = {};
    e.rows.forEach(r => { byPos[r.pos] = (byPos[r.pos] ?? 0) + 1; });
    e.pos = Object.keys(byPos).sort((a, b) => byPos[b] - byPos[a])[0];
  });
  return _pcIdx;
}
function pcFind(name) { return pcIndex().get(pcNorm(name)) || null; }

// What the tables say about him: career, titles, and the seasons he was credited
// with goals or assists. Nothing derived, nothing estimated.
function pcFacts(name) {
  const key = pcNorm(name);
  const e = pcFind(name);
  const real = (typeof PLAYER_REAL !== 'undefined' && PLAYER_REAL[key]) || null;
  const facts = (typeof SEASON_FACTS !== 'undefined') ? SEASON_FACTS : {};

  // A season counts once even when he played it at two clubs — otherwise a
  // mid-season move would hand him two titles for one championship.
  const tSet = new Map(), wSet = new Map();
  if (e) e.rows.forEach(r => {
    const f = facts[r.season];
    if (!f) return;
    if (f[0] === r.teamId) tSet.set(r.season, true);
    if (f[1] === r.teamId) wSet.set(r.season, f[2]);
  });
  const titles = [...tSet.keys()].sort();
  const walls = [...wSet.entries()].map(([season, ga]) => ({ season, ga }));

  // by club, the one he gave the most seasons to first
  const byClub = [];
  if (e) {
    const m = new Map();
    e.rows.forEach(r => {
      if (!m.has(r.teamId)) m.set(r.teamId, { teamId: r.teamId, seasons: new Set() });
      m.get(r.teamId).seasons.add(r.season);
    });
    m.forEach(c => byClub.push({ teamId: c.teamId, n: c.seasons.size }));
    byClub.sort((a, b) => b.n - a.n);
  }

  return {
    entry: e,
    goals:   real ? real.g.slice().sort((a, b) => b[1] - a[1]) : [],
    assists: real ? real.a.slice().sort((a, b) => b[1] - a[1]) : [],
    titles, walls, byClub,
    partners: pcPartnersOf(name),
  };
}

/* ── the story, where there are no numbers ────────────────────────────────── */
// Most players never made a scorer list, and saying so is an apology, not a
// fact about them. But every one of them left a real trace in the squad data:
// who he stood next to for a decade, how long he stayed, how far he travelled.
// These lines are computed from that trace, so they are true for a squad player
// at Bnei Yehuda exactly as they are for a star — and when the trace says
// nothing worth reading, the card says nothing at all.
let _pcSquads = null;
function pcSquadMap() {
  if (_pcSquads) return _pcSquads;
  _pcSquads = new Map();
  if (typeof SQUADS !== 'undefined')
    SQUADS.forEach(sq => _pcSquads.set(sq.teamId + '|' + sq.season, sq.players));
  return _pcSquads;
}

// The man he shared the most seasons with, anywhere. A season shared at one club
// counts once, however many squads either of them appears in that year.
function pcLongestTeammate(key, e) {
  const seen = {}, disp = {};
  e.rows.forEach(r => {
    (pcSquadMap().get(r.teamId + '|' + r.season) || []).forEach(p => {
      const k = pcNorm(p.name);
      if (k === key) return;
      (seen[k] = seen[k] || new Set()).add(r.season);
      disp[k] = p.name;
    });
  });
  let bestK = null;
  Object.keys(seen).forEach(k => { if (!bestK || seen[k].size > seen[bestK].size) bestK = k; });
  return bestK ? { name: disp[bestK], n: seen[bestK].size } : null;
}

// The longest unbroken stretch at one club, counted per club so a mid-season
// move cannot cut a spell in half.
function pcLongestSpell(e) {
  const byClub = new Map();
  e.rows.forEach(r => {
    if (!byClub.has(r.teamId)) byClub.set(r.teamId, new Set());
    byClub.get(r.teamId).add(r.y);
  });
  let best = { n: 0, teamId: null };
  byClub.forEach((years, teamId) => {
    const list = [...years].sort((a, b) => a - b);
    let n = 1;
    for (let i = 1; i <= list.length; i++) {
      if (i < list.length && list[i] === list[i - 1] + 1) n++;
      else { if (n > best.n) best = { n, teamId }; n = 1; }
    }
  });
  return best;
}

// League-wide facts, worked out once: the biggest scoring season anyone ever
// had, and where a career ranks by length. Both come straight from the tables,
// so "a record" here means the record IN THIS DATA and nothing grander.
let _pcLeague = null;
function pcLeagueFacts() {
  if (_pcLeague) return _pcLeague;
  let recN = 0, recWho = null, recSeason = null;
  if (typeof PLAYER_REAL !== 'undefined') {
    Object.keys(PLAYER_REAL).forEach(k => {
      (PLAYER_REAL[k].g || []).forEach(([season, n]) => {
        if (n > recN) { recN = n; recWho = k; recSeason = season; }
      });
    });
  }
  const lengths = [];
  pcIndex().forEach(p => lengths.push(p.seasons));
  lengths.sort((a, b) => b - a);
  return (_pcLeague = { recN, recWho, recSeason, lengths });
}

// Champion, or the league's top scorer, at more than one club — the kind of
// thing a fan argues about, and both of them checkable line by line.
function pcMultiClub(key, e, facts) {
  const champClubs = new Set(), bootClubs = new Set();
  const boots = new Set(
    ((typeof PLAYER_REAL !== 'undefined' && PLAYER_REAL[key] && PLAYER_REAL[key].g) || [])
      .filter(([, , rank]) => rank === 1).map(([season]) => season));
  e.rows.forEach(r => {
    const f = facts[r.season];
    if (f && f[0] === r.teamId) champClubs.add(r.teamId);
    if (boots.has(r.season)) bootClubs.add(r.teamId);
  });
  return { champClubs: [...champClubs], bootClubs: [...bootClubs] };
}

function pcStoryLines(name, e) {
  if (!e || !e.rows.length) return [];
  const key = pcNorm(name);
  const club = id => (typeof TEAMS !== 'undefined' && TEAMS[id] ? TEAMS[id].name : id);
  const facts = (typeof SEASON_FACTS !== 'undefined') ? SEASON_FACTS : {};
  const L = pcLeagueFacts();
  const lines = [];

  // the rarest things first — most players have none of them
  if (L.recWho === key)
    lines.push(`${L.recN} שערים ב-${L.recSeason} — שיא הליגה לעונה אחת`);

  const { champClubs, bootClubs } = pcMultiClub(key, e, facts);
  if (champClubs.length >= 2)
    lines.push(`אלוף עם ${champClubs.length} מועדונים — ${pcList(champClubs.map(club))}`);
  if (bootClubs.length >= 2)
    lines.push(`מלך שערים במדי ${pcList(bootClubs.map(club))}`);

  const rank = L.lengths.indexOf(e.seasons) + 1;
  if (e.seasons >= 15 && rank <= 20 && rank > 0)
    lines.push(`${e.seasons} עונות בליגה — מהוותיקים בכל הזמנים`);

  const mate = pcLongestTeammate(key, e);
  if (mate && mate.n >= 4) lines.push(`${mate.n} עונות באותה קבוצה עם ${mate.name}`);

  // A one-club man's longest spell IS his career, so only one of these is worth
  // a line — saying both just repeats the same number back at the reader.
  if (e.clubs.length === 1 && e.seasons >= 4) {
    lines.push(`כל ${e.seasons} העונות שלו במועדון אחד`);
  } else {
    const spell = pcLongestSpell(e);
    if (spell.n >= 5) lines.push(`${spell.n} עונות רצופות ב${club(spell.teamId)}`);
    if (e.clubs.length >= 6) lines.push(`${e.clubs.length} מועדונים לאורך הדרך`);
  }

  const decades = new Set(e.rows.map(r => Math.floor(r.y / 10)));
  if (decades.size >= 3) lines.push('שיחק בליגה בשלושה עשורים');

  return lines.slice(0, 3);
}

/* ── how a tag reads in words ─────────────────────────────────────────────── */
// The strip shows an icon. Here we owe the player a sentence: what it is, what
// it is worth, and — the part that decides a pick — whether it does anything at
// all in the position he is standing in.
function pcTagEffect(t, slotPos) {
  const d = t.def;
  // In a classic game the tags are history and nothing more, so the card must
  // not promise an effect the simulation will never apply.
  if (typeof classicMode === 'function' && classicMode()) return { text: '', live: false, story: true };
  // A tag with no effect needs no sentence — the name and the seasons say it.
  if (!d.goal && !d.assist) return { text: '', live: false, story: true };
  const verb = d.goal ? 'יבקיע' : 'יבשל';
  const raw  = d.goal ? d.goal : d.assist;
  const cap  = d.goal ? d.goalCap : d.assistCap;
  const pct  = Math.round((Math.min(1 + raw * t.count, cap) - 1) * 100);
  return { live: true, story: false, text: `סיכוי גבוה ב-${pct}% שהוא ${verb}` };
}

// "1 עונות" is the kind of thing that makes a card look machine-made.
function pcN(n, one, many) { return n === 1 ? one : many; }

// "א, ב ו-ג" rather than "א ובוג"
function pcList(items) {
  if (items.length <= 1) return items[0] || '';
  return items.slice(0, -1).join(', ') + ' ו' + items[items.length - 1];
}

/* ── the card ─────────────────────────────────────────────────────────────── */
function pcHTML(player, slotPos) {
  const name = typeof player === 'string' ? player : player.name;
  const classic = typeof classicMode === 'function' && classicMode();
  const f = pcFacts(name);
  const e = f.entry;
  const tags = typeof tagsOf === 'function' ? tagsOf(name) : [];
  const club = id => (typeof TEAMS !== 'undefined' && TEAMS[id] ? TEAMS[id].name : id);
  const badge = id => (typeof TEAMS !== 'undefined' && TEAMS[id] ? (TEAMS[id].badge || '⚽') : '⚽');

  let head = '';
  const pos = typeof player === 'object' && typeof playerPositions === 'function'
    ? playerPositions(player).join(' | ') : (e ? e.pos : '');
  const peak = e ? e.peak : (typeof player === 'object' ? (player.peak_ovr || player.ovr) : 0);
  const showR = typeof state === 'undefined' || state.showRatings !== false;
  // Second citizenships come from Transfermarkt's flag titles and are not
  // something we can stand behind about a real person, so the card shows what
  // the rest of the game shows: one nationality, unless a challenge has
  // deliberately put dual nationality in play.
  let nats = '';
  if (typeof playerNats === 'function') {
    const dual = typeof challengeDualNatsActive === 'function' && challengeDualNatsActive();
    const list = dual ? playerNats(name) : playerNats(name).slice(0, 1);
    if (list.length) {
      const flag = typeof natFlagImg === 'function' ? natFlagImg : () => '';
      nats = list.map(n => `${flag(n)} ${pcEsc(n)}`.trim()).join(' · ');
    }
  }
  head = `
    <div class="pc-head">
      <div class="pc-h-name">${pcEsc(name)}</div>
      <div class="pc-h-sub">${pcEsc(pos)}${nats ? ' · ' + nats : ''}</div>
      ${showR && peak ? `<div class="pc-h-ovr"><span dir="ltr">${peak}</span></div>` : ''}
    </div>`;

  /* what he did, with numbers */
  const rows = [];
  if (f.goals.length) {
    const tot = f.goals.reduce((s, r) => s + r[1], 0);
    const boots = f.goals.filter(r => r[2] === 1).length;
    rows.push(`<div class="pc-stat"><b>${tot}</b> ${pcN(tot, 'שער', 'שערים')} ב-${
      f.goals.length} ${pcN(f.goals.length, 'עונה שנרשמה', 'עונות שנרשמו')}${
      boots ? ` · ${boots}× מלך שערים` : ''}</div>`);
    rows.push(`<div class="pc-seasons">${f.goals.slice(0, 6).map(r =>
      `<span class="pc-sn${r[2] === 1 ? ' pc-first' : ''}"><i dir="ltr">${r[0]}</i> ${r[1]} ${r[2] === 1 ? '👑' : `#${r[2]}`}</span>`).join('')}</div>`);
  }
  if (f.assists.length) {
    const tot = f.assists.reduce((s, r) => s + r[1], 0);
    const kings = f.assists.filter(r => r[2] === 1).length;
    rows.push(`<div class="pc-stat"><b>${tot}</b> ${pcN(tot, 'בישול', 'בישולים')} ב-${
      f.assists.length} ${pcN(f.assists.length, 'עונה שנרשמה', 'עונות שנרשמו')}${
      kings ? ` · ${kings}× מלך בישולים` : ''}</div>`);
    rows.push(`<div class="pc-seasons">${f.assists.slice(0, 6).map(r =>
      `<span class="pc-sn${r[2] === 1 ? ' pc-first' : ''}"><i dir="ltr">${r[0]}</i> ${r[1]} ${r[2] === 1 ? '🎯' : `#${r[2]}`}</span>`).join('')}</div>`);
  }
  // A club's defence is the club's, not the man's — say so, or a winger ends up
  // credited with clean sheets he had nothing to do with.
  if (f.walls.length) {
    rows.push(`<div class="pc-stat"><b>${f.walls.length}</b> ${
      pcN(f.walls.length, 'עונה', 'עונות')} בקבוצה עם ההגנה הטובה בליגה · הכי מעט: ${
      f.walls.map(w => w.ga).sort((a, b) => a - b)[0]} ספיגות</div>`);
  }
  if (f.titles.length) {
    rows.push(`<div class="pc-stat"><b>${f.titles.length}</b> ${
      pcN(f.titles.length, 'אליפות', 'אליפויות')} · <i dir="ltr">${
      f.titles.slice(0, 8).join(', ')}</i></div>`);
  }
  const realBlock = rows.length
    ? `<div class="pc-sec"><div class="pc-sec-t">במציאות</div>${rows.join('')}
       <div class="pc-note">מתוך טבלאות מלכי השערים והבישולים של הליגה — רק העונות שבהן נכנס לרשימה.</div></div>`
    : '';   // no numbers is not a fact about him — say nothing, not sorry

  /* the career itself */
  const career = e ? `
    <div class="pc-sec">
      <div class="pc-sec-t">בליגה</div>
      <div class="pc-stat"><b>${e.seasons}</b> ${pcN(e.seasons, 'עונה', 'עונות')} · <i dir="ltr">${e.first.season}–${e.last.season}</i> · ${
        e.clubs.length} ${e.clubs.length === 1 ? 'מועדון' : 'מועדונים'}</div>
      <div class="pc-clubs">${f.byClub.map(c =>
        `<span class="pc-club">${badge(c.teamId)} ${pcEsc(club(c.teamId))} <i>${c.n}</i></span>`).join('')}</div>
      ${pcStoryLines(name, e).map(l => `<div class="pc-story">${pcEsc(l)}</div>`).join('')}
    </div>` : '';

  /* the tags, spelled out */
  const tagBlock = tags.length ? `
    <div class="pc-sec">
      <div class="pc-sec-t">תגיות</div>
      ${tags.map(t => {
        const eff = pcTagEffect(t, slotPos);
        return `<div class="pc-tag${eff.live ? ' pc-tag-live' : ''}${eff.story ? ' pc-tag-story' : ''}">
          <span class="pc-tag-i">${t.icon}</span>
          <span class="pc-tag-b">
            <span class="pc-tag-n">${pcEsc(t.name)}${t.count > 1 && t.key !== 'prime90' ? ` ×${t.count}` : ''}</span>
            ${eff.text ? `<span class="pc-tag-e">${pcEsc(eff.text)}</span>` : ''}
            ${t.evidence ? `<span class="pc-tag-w">${pcEsc(t.evidence)}</span>` : ''}
          </span>
        </div>`;
      }).join('')}
      <div class="pc-note">${classic
        ? 'במשחק קלאסי התגיות הן היסטוריה בלבד ואינן משפיעות על העונה.'
        : 'התגיות משנות מי מבקיע ומי מבשל — לא את תוצאת המשחק.'}</div>
    </div>` : '';

  /* who he played with */
  const partners = (!classic && f.partners.length) ? `
    <div class="pc-sec">
      <div class="pc-sec-t">צמדים</div>
      <div class="pc-duos">${f.partners.slice(0, 6).map(p => {
        const inXI = typeof state !== 'undefined' && state.picks &&
          state.picks.some(q => q && q.player && pcNorm(q.player.name) === p.who);
        return `<span class="pc-duo chem-t${p.tier}${inXI ? ' pc-duo-on' : ''}" title="${p.seasons} עונות יחד${p.titles ? ` · ${p.titles} אליפויות` : ''}">${
          inXI ? '🔗 ' : ''}${pcEsc(p.who)}${showR ? ` +${chemFmt(chemBonusOf(p.tier))}` : ''}</span>`;
      }).join('')}</div>
      <div class="pc-note">חבר לצמד באותה הרכב = בונוס לשניהם.</div>
    </div>` : '';

  return head + realBlock + tagBlock + partners + career;
}

/* ── showing it ───────────────────────────────────────────────────────────── */
function pcEl() {
  let el = document.getElementById(PCARD_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = PCARD_ID;
    el.className = 'pcard';
    el.addEventListener('mouseenter', () => clearTimeout(_pcTimer));
    el.addEventListener('mouseleave', () => pcHide());
    document.body.appendChild(el);
  }
  return el;
}

function pcShow(player, anchor, slotPos, modal) {
  // A classic game is eleven ratings and nothing else. The card exists to
  // explain chemistry, tags and the history behind them — with all of that
  // switched off it is a panel that answers a question nobody asked.
  if (typeof classicMode === 'function' && classicMode()) return;
  const name = typeof player === 'string' ? player : player && player.name;
  if (!name) return;
  clearTimeout(_pcTimer);
  const el = pcEl();
  el.innerHTML = (modal ? '<button class="pc-x" aria-label="סגור">✕</button>' : '') +
    pcHTML(player, slotPos);
  _pcOpenFor = name;
  el.classList.toggle('pcard-modal', !!modal);
  el.style.display = 'block';
  if (modal) {
    el.style.left = el.style.top = '';
    const x = el.querySelector('.pc-x');
    if (x) x.addEventListener('click', pcHide);
    pcBackdrop(true);
    return;
  }
  // Anchored: beside the card, on the pitch side, and never off-screen.
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight, pad = 10;
  let left = r.left - w - pad;
  if (left < pad) left = Math.min(r.right + pad, window.innerWidth - w - pad);
  let top = r.top - 8;
  if (top + h > window.innerHeight - pad) top = window.innerHeight - h - pad;
  if (top < pad) top = pad;
  el.style.left = Math.max(pad, left) + 'px';
  el.style.top = top + 'px';
}

function pcBackdrop(on) {
  let b = document.getElementById('pcard-bd');
  if (on) {
    if (!b) {
      b = document.createElement('div');
      b.id = 'pcard-bd';
      b.className = 'pcard-bd';
      b.addEventListener('click', pcHide);
      document.body.appendChild(b);
    }
    b.style.display = 'block';
  } else if (b) b.style.display = 'none';
}

function pcHide() {
  clearTimeout(_pcTimer);
  _pcOpenFor = null;
  const el = document.getElementById(PCARD_ID);
  if (el) el.style.display = 'none';
  pcBackdrop(false);
}

// Which player does this element stand for? A list card carries the name; a
// pitch token carries the slot it fills.
function pcPlayerFor(el) {
  if (el.classList.contains('player-card')) {
    const n = el.querySelector('.pc-name');
    if (!n) return null;
    const name = pcNorm(n.childNodes[0] ? n.childNodes[0].textContent : n.textContent);
    if (typeof state !== 'undefined' && state.currentSquad)
      return state.currentSquad.players.find(p => pcNorm(p.name) === name) || name;
    return name;
  }
  // A pick is { player, squad } — the token stands for the slot, not the man.
  const idx = el.dataset ? el.dataset.idx : null;
  if (idx != null && typeof state !== 'undefined' && state.picks) {
    const pick = state.picks[+idx];
    return (pick && pick.player) || null;
  }
  return null;
}

function pcSlotOf(el) {
  if (el.classList.contains('player-card')) {
    // his own best position — what the tags would do if you play him properly
    const p = pcPlayerFor(el);
    if (p && typeof p === 'object' && typeof playerPositions === 'function') return playerPositions(p)[0];
    return null;
  }
  const idx = el.dataset ? el.dataset.idx : null;
  if (idx != null && typeof state !== 'undefined' && state.slots && state.slots[+idx])
    return state.slots[+idx].pos;
  return null;
}

// One listener for the whole document — the lists are rebuilt constantly and
// per-card listeners would leak with them.
function pcInit() {
  const hoverable = e => e.target.closest && e.target.closest('.player-card, .slot-token.filled');
  document.addEventListener('mouseover', ev => {
    if (!pcHasHover()) return;
    const el = hoverable(ev);
    if (!el || el.contains(ev.relatedTarget)) return;
    const p = pcPlayerFor(el);
    if (!p) return;
    clearTimeout(_pcTimer);
    _pcTimer = setTimeout(() => pcShow(p, el, pcSlotOf(el), false), 140);
  });
  document.addEventListener('mouseout', ev => {
    if (!pcHasHover()) return;
    const el = hoverable(ev);
    if (!el) return;
    const to = ev.relatedTarget;
    if (to && to.closest && (to.closest('#' + PCARD_ID) || el.contains(to))) return;
    clearTimeout(_pcTimer);
    // long enough to cross the gap between the card and the panel on the way to
    // reading it — a card this tall is meant to be scrolled, not glanced at
    _pcTimer = setTimeout(pcHide, 300);
  });
  // touch: the ⓘ opens it as a sheet, and never counts as picking the player
  document.addEventListener('click', ev => {
    const info = ev.target.closest && ev.target.closest('.pc-info');
    if (!info) return;
    ev.stopPropagation();
    ev.preventDefault();
    const el = info.closest('.player-card, .slot-token.filled');
    const p = el && pcPlayerFor(el);
    if (p) pcShow(p, el, pcSlotOf(el), true);
  }, true);
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') pcHide(); });
  // An anchored panel is pinned to a card that moves when the page scrolls, so
  // it closes — but this listener is on capture and therefore also sees the
  // panel's OWN scrolling. Without the first check, reading a long card is
  // impossible: the first turn of the wheel closes the thing you are reading.
  window.addEventListener('scroll', ev => {
    const el = document.getElementById(PCARD_ID);
    if (!_pcOpenFor || !el || el.classList.contains('pcard-modal')) return;
    if (ev.target === el || (ev.target && ev.target.nodeType === 1 && el.contains(ev.target))) return;
    pcHide();
  }, true);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pcInit);
else pcInit();
