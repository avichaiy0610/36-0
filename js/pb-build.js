// ─── בונה כדורגלן — המסך ───────────────────────────────────────────────────────
//
// Pick a role, then six rounds. Each round draws a club-season, you take one
// player out of it, and you decide WHICH of his attributes to keep. Every slot
// opens once, so the interesting move is rarely the biggest number on screen —
// it is whether to spend a slot now or gamble that a better one is coming while
// the slots that remain get harder to fill.
//
// The numbers all come from js/attrs.js, and so do the sentences under them:
// every value a player is asked to choose between can be defended with the row
// of a real table. Except מהירות, which says so itself.

const PB_KEY = '36-0-pb';
const PB_ROUNDS = 6;
const PB_MIN_SQUAD = 11;        // a squad too thin to choose from is not a round

let pb = null;                  // the live build, or null

function pbEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ── what the shelf shows ─────────────────────────────────────────────────── */
function pbLoad() {
  try { return JSON.parse(localStorage.getItem(PB_KEY)) || {}; } catch (e) { return {}; }
}
function pbSave(o) {
  try { localStorage.setItem(PB_KEY, JSON.stringify(o)); } catch (e) { /* private mode */ }
}
function pbShelfLine() {
  const s = pbLoad();
  return s.best ? `הקריירה הטובה שלך: ${s.best} נקודות מורשת` : '';
}

/* ── the draw ─────────────────────────────────────────────────────────────── */
// Independent of the draft's own deck. A thin squad is skipped rather than shown
// with four names in it.
function pbDrawSquad() {
  const pool = SQUADS.filter(sq =>
    sq.players.length >= PB_MIN_SQUAD && !pb.used.has(sq.id));
  if (!pool.length) return SQUADS[Math.floor(Math.random() * SQUADS.length)];
  const sq = pool[Math.floor(Math.random() * pool.length)];
  pb.used.add(sq.id);
  return sq;
}

/* ── open ─────────────────────────────────────────────────────────────────── */
function pbOpen() {
  if (typeof track === 'function') track('open', 'minigame', 'builder');
  pb = null;
  pbRenderRoles();
}

function pbRenderRoles() {
  const box = document.getElementById('mg-content');
  if (!box) return;
  const roles = ['fw', 'w', 'cm', 'df', 'gk'];
  const blurb = {
    fw: 'הגמר הוא כמעט חצי מהערך שלו. תבנה מבקיע.',
    w:  'גמר, יצירה ומהירות בחלקים שווים. הכי מאוזן מלפנים.',
    cm: 'היצירה מובילה, והיציבות שווה יותר מאשר בכל עמדה אחרת.',
    df: 'ההגנה היא כמעט חצי. מספר אחד גדול, וכל השאר תמיכה.',
    gk: 'שוער מחליף את גמר. הקריירה שלו נמדדת בשערים נקיים.',
  };
  box.innerHTML = `
    ${mgBackBar('בונה כדורגלן')}
    <p class="page-note">שישה סיבובים. בכל אחד נוחתים על מועדון ועונה, בוחרים שחקן,
       ולוקחים ממנו <b>תכונה אחת</b>. בסוף — חמש־עשרה עונות.</p>
    <p class="pb-role-q">מה אתה בונה?</p>
    <div class="pb-roles">
      ${roles.map(r => `
        <button class="pb-role" data-role="${r}">
          <span class="pb-role-name">${pbEsc(ATTR_ROLE[r].name)}</span>
          <span class="pb-role-sub">${pbEsc(blurb[r])}</span>
        </button>`).join('')}
    </div>`;
  mgWireBack();
  box.querySelectorAll('.pb-role').forEach(b => {
    b.onclick = () => pbStart(b.dataset.role);
  });
}

function pbStart(role) {
  pb = {
    role,
    slots: {},                       // key → { value, from }
    open: attrSlots(role),
    round: 0,
    used: new Set(),
    rerolled: false,
    squad: null,
  };
  pbNextRound();
}

function pbNextRound() {
  pb.round++;
  pb.rerolled = false;
  pb.squad = pbDrawSquad();
  pbRenderRound();
}

/* ── a round ──────────────────────────────────────────────────────────────── */
function pbRenderRound() {
  const box = document.getElementById('mg-content');
  if (!box) return;
  const sq = pb.squad;
  const club = (TEAMS[sq.teamId] || {}).name || sq.teamId;

  const rows = sq.players.map((p, i) => {
    const a = attrsOf(sq.id, i);
    if (!a) return '';
    const cells = pb.open.map(k => {
      const v = a[k];
      if (typeof v !== 'number') return `<td class="pb-na">—</td>`;
      return `<td><button class="pb-take" data-i="${i}" data-k="${k}">${v}</button></td>`;
    }).join('');
    return `<tr>
      <th class="pb-who"><span class="pb-name">${pbEsc(p.name)}</span>
        <span class="pb-meta">${pbEsc(p.position)} · ${p.ovr}</span></th>
      ${cells}</tr>`;
  }).join('');

  box.innerHTML = `
    ${mgBackBar('בונה כדורגלן')}
    <div class="pb-head">
      <span class="pb-round">סיבוב ${pb.round} מתוך ${PB_ROUNDS}</span>
      <span class="pb-club">${pbEsc(club)} ${pbEsc(sq.season)}</span>
      ${pb.rerolled ? '' : '<button class="pb-reroll" id="pb-reroll">🎲 הגרלה מחדש</button>'}
    </div>
    ${pbSlotsHTML()}
    <div class="pb-tablewrap">
      <table class="pb-table">
        <thead><tr><th></th>${pb.open.map(k =>
          `<th>${pbEsc(ATTR_NAME[k])}${ATTR_EST[k] ? '<sup>*</sup>' : ''}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="pb-foot" id="pb-why">בחר מספר — הוא ייכנס למשבצת שלו, והמשבצת תיסגר.</p>
    ${pb.open.some(k => ATTR_EST[k])
      ? '<p class="pb-est-note">* מהירות היא הערכה — לליגה אין נתוני מהירות, והיא נגזרת מהעמדה ומהדירוג בלבד.</p>'
      : ''}`;
  mgWireBack();

  const reroll = document.getElementById('pb-reroll');
  if (reroll) reroll.onclick = () => { pb.squad = pbDrawSquad(); pb.rerolled = true; pbRenderRound(); };

  box.querySelectorAll('.pb-take').forEach(btn => {
    const i = +btn.dataset.i, k = btn.dataset.k;
    // The evidence follows the cursor rather than sitting in a tooltip nobody
    // opens: the whole point of this build is that the numbers are defensible,
    // and a defence nobody reads is not one.
    const show = () => {
      const why = attrWhy(sq.id, i, k, sq.season, sq.teamId);
      const el = document.getElementById('pb-why');
      const p = sq.players[i];
      if (el && why) el.textContent = `${p ? p.name + ' · ' : ''}${ATTR_NAME[k]} — ${why}`;
    };
    btn.addEventListener('mouseenter', show);
    btn.addEventListener('focus', show);
    btn.onclick = () => pbTake(i, k);
  });
}

function pbSlotsHTML() {
  return `<div class="pb-slots">
    ${attrSlots(pb.role).map(k => {
      const s = pb.slots[k];
      return `<div class="pb-slot${s ? ' filled' : ''}">
        <span class="pb-slot-name">${pbEsc(ATTR_NAME[k])}</span>
        <span class="pb-slot-val">${s ? s.value : '—'}</span>
        ${s ? `<span class="pb-slot-from">${pbEsc(s.from)}</span>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

function pbTake(i, key) {
  const sq = pb.squad;
  const a = attrsOf(sq.id, i);
  if (!a || typeof a[key] !== 'number') return;
  pb.slots[key] = {
    value: a[key],
    from: sq.players[i].name,
    why: attrWhy(sq.id, i, key, sq.season, sq.teamId),
    season: sq.season,
  };
  pb.open = pb.open.filter(k => k !== key);
  if (pb.round >= PB_ROUNDS || !pb.open.length) pbFinish();
  else pbNextRound();
}

/* ── the career ───────────────────────────────────────────────────────────── */
function pbFinish() {
  const attrs = {};
  Object.keys(pb.slots).forEach(k => { attrs[k] = pb.slots[k].value; });
  // A keeper's build has no גמר, and an outfield one has no שוער. The career
  // reads both, so fill the missing one from the role's own floor rather than
  // leaving it undefined and letting a NaN reach the board.
  if (pb.role === 'gk' && typeof attrs.fin !== 'number') attrs.fin = 40;
  if (pb.role !== 'gk' && typeof attrs.gk !== 'number') attrs.gk = 40;

  const seed = (Date.now() ^ (attrs.fin * 7919 + attrs.def * 104729)) >>> 0;
  const run = pbSimCareer({ role: pb.role, attrs }, seed);
  run.slots = pb.slots;

  const st = pbLoad();
  if (!st.best || run.legacy > st.best) { st.best = run.legacy; st.bestRole = pb.role; }
  st.played = (st.played || 0) + 1;
  pbSave(st);

  if (typeof track === 'function') track('finish', 'minigame', 'builder');
  pbRenderCareer(run);
  pbSubmit(run);
}

// Fire-and-forget. A career is worth reading whether or not anyone is signed in,
// so nothing on the result screen waits for this and nothing breaks without it.
async function pbSubmit(run) {
  if (typeof _supabase === 'undefined' || !_supabase) return;
  if (typeof getCurrentUser !== 'function' || !getCurrentUser()) return;
  try {
    const t = run.totals;
    const { data } = await _supabase.rpc('submit_builder_run', {
      p: {
        role: run.role, peak: run.peak, legacy: run.legacy,
        apps: t.apps, goals: t.goals, assists: t.assists, clean: t.cs,
        titles: t.titles, boots: t.boots, poty: t.poty, seed: run.seed,
      },
    });
    if (data && data.achievements && typeof showAchievementToasts === 'function') {
      showAchievementToasts(data.achievements);
    }
  } catch (e) { /* the career still happened */ }
}

// Hebrew counts one differently from many, and a zero is not worth a word at
// all — the first build read "0 אליפויות" and "1 אליפויות", both wrong.
function pbCount(n, one, many) {
  if (!n) return '';
  return `<span>${n === 1 ? one : n + ' ' + many}</span>`;
}

function pbRenderCareer(run) {
  const box = document.getElementById('mg-content');
  if (!box) return;
  const t = run.totals;
  const gk = run.role === 'gk';

  const rows = run.seasons.map(s => `
    <tr class="${s.lost ? 'pb-lost' : ''}${s.abroad ? ' pb-abroad' : ''}">
      <td>${s.age}</td>
      <td class="pb-cl">${pbEsc(s.club)}</td>
      <td>${s.ovr}</td>
      <td>${s.apps}</td>
      <td>${gk ? s.cs : s.goals}</td>
      ${gk ? '' : `<td>${s.assists}</td>`}
      <td class="pb-hon">${s.champion ? '🏆' : ''}${s.goldenBoot ? '👑' : ''}${s.goldenGlove ? '🧤' : ''}${s.poty ? '🏅' : ''}${s.lost ? '🤕' : ''}</td>
    </tr>`).join('');

  box.innerHTML = `
    ${mgBackBar('בונה כדורגלן')}
    <div class="pb-verdict">
      <div class="pb-legacy">${run.legacy}</div>
      <div class="pb-legacy-label">נקודות מורשת</div>
      <div class="pb-peak">${pbEsc(ATTR_ROLE[run.role].name)} · שיא ${run.peak}</div>
    </div>
    <div class="pb-totals">
      ${pbCount(t.apps, 'הופעה אחת', 'הופעות')}
      ${gk ? pbCount(t.cs, 'שער נקי אחד', 'שערים נקיים')
           : pbCount(t.goals, 'שער אחד', 'שערים') + pbCount(t.assists, 'בישול אחד', 'בישולים')}
      ${pbCount(t.titles, 'אליפות אחת', 'אליפויות')}
      ${pbCount(t.boots, gk ? 'כפפת זהב אחת' : 'נעל זהב אחת', gk ? 'כפפות זהב' : 'נעלי זהב')}
      ${pbCount(t.poty, 'כדורגלן העונה', 'פעמים כדורגלן העונה')}
      ${pbCount(t.caps, 'משחק נבחרת אחד', 'משחקי נבחרת')}
    </div>
    <div class="pb-tablewrap">
      <table class="pb-table pb-career">
        <thead><tr><th>גיל</th><th>מועדון</th><th>דירוג</th><th>הופעות</th>
          <th>${gk ? 'נקיים' : 'שערים'}</th>${gk ? '' : '<th>בישולים</th>'}<th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="pb-built">
      <p class="pb-built-h">איך הוא נבנה</p>
      ${attrSlots(run.role).map(k => {
        const s = run.slots[k];
        if (!s) return '';
        return `<div class="pb-built-row">
          <span class="pb-built-k">${pbEsc(ATTR_NAME[k])} ${s.value}</span>
          <span class="pb-built-v">${pbEsc(s.from)} · ${pbEsc(s.season)}</span>
          ${s.why ? `<span class="pb-built-w">${pbEsc(s.why)}</span>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="pb-again">
      <button class="btn-primary" id="pb-again">עוד קריירה</button>
    </div>`;
  mgWireBack();
  const again = document.getElementById('pb-again');
  if (again) again.onclick = pbOpen;
}
