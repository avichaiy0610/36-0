// The European campaign, as a sequence of screens.
//
// One job: turn the campaign object into the screen it is currently at, and wire
// the single button that moves it on. All the deciding lives in js/europe.js —
// nothing here simulates anything, and nothing there touches the DOM.
//
// The shape follows the fight screen in js/gauntlet.js: a match is not a row that
// appears, it is ninety minutes that run, with the clock moving and the goals
// arriving on it. The difference is that a European tie is two of those and an
// aggregate, so the sequence is match → match → verdict, and the ladder to the
// final sits under every knockout screen so you can always see how far is left.

let _euTimer = null;
let _euLive = null;                       // the leg currently being played back

function euStopClock() { if (_euTimer) { clearTimeout(_euTimer); _euTimer = null; } }

// 1x / 2x / 4x, remembered. Eight legs at ninety minutes each is a lot of clock
// for someone who has seen it before.
const EU_SPEEDS = [1, 2, 4];
function euSpeed() {
  const v = +(localStorage.getItem('eu-speed') || 1);
  return EU_SPEEDS.includes(v) ? v : 1;
}
function euCycleSpeed() {
  const next = EU_SPEEDS[(EU_SPEEDS.indexOf(euSpeed()) + 1) % EU_SPEEDS.length];
  try { localStorage.setItem('eu-speed', next); } catch (e) {}
  return next;
}

/* ── crests ───────────────────────────────────────────────────────────────── */
// A badge, falling back to the flag emoji if we do not have that club's crest.
// Written as a sibling rather than a background-image so the fallback is one
// onerror away and never leaves an empty box.
function euCrest(cid, flag) {
  const f = `<span class="eu-mini-flag">${flag || ''}</span>`;
  // `.eu-mini-flag` is hidden until a badge next to it fails, so a club with no
  // badge at all needs the visible variant or it shows nothing — which is
  // exactly how Manchester City and Girona ended up with an empty gap.
  if (!cid) return `<span class="eu-mini-flag shown">${flag || ''}</span>`;
  return `<img class="eu-mini-crest" src="crests/eu/${cid}.png" alt="" loading="lazy" onerror="this.classList.add('missing')">` + f;
}
function euBigCrest(cid, flag) {
  return `<span class="eu-badge">${cid
    ? `<img src="crests/eu/${cid}.png" alt="" onerror="this.classList.add('missing')"><span class="eu-badge-fb">${flag || '🏳️'}</span>`
    : `<span class="eu-badge-fb shown">${flag || '🏳️'}</span>`}</span>`;
}

/* ── the backdrop ─────────────────────────────────────────────────────────────
   From the qualifying play-off on, the PAGE changes, not just the card: a fixed
   layer behind everything, holding the blue-to-magenta wash and the big curved
   panels of a ball lit from below.

   Drawn here rather than shipped as an image, and deliberately evocative rather
   than a copy — no starball, no wordmark, no official palette sampled off a
   badge. The site's own footer promises it uses no official emblems, and a
   European night is a mood before it is a logo.

   One element, appended once, toggled by a class. It is removed when Europe is
   left, so nothing leaks into the rest of the site. */
function euBackdrop(on) {
  let el = document.getElementById('eu-backdrop');
  // .screen-page paints a solid var(--bg) over the whole viewport, so the layer
  // is invisible until the screen itself is told to go transparent. The class
  // goes on <body> because that is the only element both of them can see.
  document.body.classList.toggle('eu-blue', !!on);
  if (!on) { if (el) el.remove(); return; }
  if (el) return;
  el = document.createElement('div');
  el.id = 'eu-backdrop';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="eu-wash" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0"    stop-color="#0a1a3d"/>
          <stop offset=".45"  stop-color="#16276b"/>
          <stop offset=".75"  stop-color="#3b1f7a"/>
          <stop offset="1"    stop-color="#5b1d63"/>
        </linearGradient>
        <linearGradient id="eu-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0"   stop-color="#5fd0ff"/>
          <stop offset=".55" stop-color="#4f7dff"/>
          <stop offset="1"   stop-color="#c05cff"/>
        </linearGradient>
        <radialGradient id="eu-floor" cx=".5" cy="1" r=".8">
          <stop offset="0"   stop-color="#6aa8ff" stop-opacity=".55"/>
          <stop offset="0.5" stop-color="#7d5cff" stop-opacity=".18"/>
          <stop offset="1"   stop-color="#000"    stop-opacity="0"/>
        </radialGradient>
        <filter id="eu-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7"/>
        </filter>
      </defs>

      <rect width="400" height="800" fill="url(#eu-wash)"/>

      <!-- The seams of a ball far larger than the frame, so it reads as a shape
           you are standing inside rather than a logo placed on a page. Drawn
           twice: once blurred for the bloom, once sharp on top. -->
      <g fill="none" stroke="url(#eu-edge)" stroke-linejoin="round">
        <defs><g id="eu-seams">
          <path d="M-60 150 Q90 30 250 84 Q300 210 196 300 Q60 312 -30 236 Z"/>
          <path d="M196 300 Q330 244 470 306 Q476 452 350 500 Q232 442 196 300 Z"/>
          <path d="M-30 236 Q-90 366 -18 470 Q120 512 196 424 Q214 344 196 300 Z"/>
          <path d="M250 84 Q400 26 470 130 Q478 224 470 306"/>
          <path d="M-18 470 Q150 570 350 500"/>
          <path d="M-60 150 Q-120 40 -40 -30"/>
          <path d="M196 424 Q250 540 350 500"/>
        </g></defs>
        <use href="#eu-seams" filter="url(#eu-soft)" stroke-width="5" opacity=".55"/>
        <use href="#eu-seams" stroke-width="2.1" opacity=".95"/>
      </g>

      <!-- lit from the floor, which is what makes it a night match -->
      <ellipse cx="200" cy="560" rx="330" ry="170" fill="url(#eu-floor)"/>
      <path d="M-40 530 Q200 486 440 540" fill="none" stroke="url(#eu-edge)"
            stroke-width="3" opacity=".95" filter="url(#eu-soft)"/>
      <path d="M-40 530 Q200 486 440 540" fill="none" stroke="#bcdcff"
            stroke-width="1" opacity=".55"/>
    </svg>`;
  document.body.appendChild(el);
}

/* ── the frame ────────────────────────────────────────────────────────────── */
// Kicker, title, stage chip, exit, progress bar — identical on every screen, so
// the campaign reads as one continuous thing rather than a series of pages.
//
// `stage` also drives the colour: from the qualifying play-off onward the whole
// screen turns Champions League blue, through one attribute and a palette of CSS
// variables. No selector is written twice.
function euStageOf(c) {
  if (c.view === 'out')    return c.outAt || 'q1';
  if (c.view === 'trophy') return 'final';
  if (c.cur)               return c.cur.roundId;
  if (c.view === 'league' || c.view === 'standings') return 'league';
  if (c.koi >= 0 && EU_KO[c.koi])  return EU_KO[c.koi].id;
  if (EU_ROUNDS[c.qi])     return EU_ROUNDS[c.qi].id;
  return 'q1';
}

// Everything from the qualifying play-off on is "the blue half".
const EU_BLUE_FROM = ['po', 'league', 'ko-po', 'r16', 'qf', 'sf', 'final'];

// How far through the whole campaign we are. Four qualifying ties, the league
// phase, then the knockout ladder — the denominator shrinks by one when a top-8
// finish skips the play-off round.
function euProgress(c) {
  const total = EU_ROUNDS.length + 1 + EU_KO.length - (c.seeded ? 1 : 0);
  let done = Math.min(c.qi, EU_ROUNDS.length) + (c.league ? 1 : 0)
           + c.ties.filter(t => t.kind === 'ko').length;
  if (c.result === 'won') done = total;
  return Math.max(0.04, Math.min(1, done / total));
}

function euStageLabel(c) {
  const id = euStageOf(c);
  const q = EU_ROUNDS.find(r => r.id === id);
  if (q) return q.round;
  const k = EU_KO.find(x => x.id === id);
  if (k) return k.round;
  return euText('eu-phase-t', 'שלב הליגה');
}

function euShell(c, body, cta) {
  const id = euStageOf(c);
  const pct = Math.round(euProgress(c) * 100);
  const speed = euSpeed();
  const live = c.view === 'tie';
  return `
    <div class="eu-seq" data-eu-stage="${id}" data-eu-blue="${EU_BLUE_FROM.includes(id) ? '1' : '0'}">
      <div class="eu-top">
        <div class="eu-top-l">
          <div class="eu-kicker">${euText('eu-kicker', 'המסע האירופי')}</div>
          <div class="eu-title">${euText('eu-title', 'ליגת האלופות')}</div>
        </div>
        <div class="eu-top-r">
          ${live ? `<button class="eu-chip" id="eu-speed">${speed}x</button>` : ''}
          <span class="eu-stage">${euStageLabel(c)}</span>
          <button class="eu-chip eu-exit" id="eu-quit">× יציאה</button>
        </div>
      </div>
      <div class="eu-prog"><span style="width:${pct}%"></span></div>
      ${body}
      ${cta || ''}
    </div>`;
}

function euCta(label, id) {
  return `<button class="eu-cta" id="${id || 'eu-next'}">${label}</button>`;
}

/* ── the live match ───────────────────────────────────────────────────────── */
function euLiveHTML(c, t, leg) {
  const legLabel = t.oneLeg ? euText('eu-final-at', 'האצטדיון של 36-0')
                            : `${euText('eu-leg', 'משחק')} ${leg.leg} ${euText('eu-of-2', 'מתוך 2')}`;
  const venue = leg.home === null ? euText('eu-neutral', 'מגרש ניטרלי')
              : leg.home ? euText('eu-home', 'בית') : euText('eu-away', 'חוץ');
  const prev = t.legs.length > 1
    ? `<div class="eu-live-prev">${euText('eu-leg1-was', 'במשחק הראשון')}
         <bdi dir="ltr">${t.legs[0].gf}-${t.legs[0].ga}</bdi></div>` : '';
  return `
    <div class="eu-card eu-live">
      <div class="eu-card-head">
        <span>${t.roundLong} · ${legLabel}</span>
        <span class="eu-vs">${euText('eu-vs', 'מול')} ${t.club.name}</span>
      </div>
      <div class="eu-live-top">
        <span class="eu-side">${euText('eu-you', 'ההרכב שלי')} ${euBigCrest(null, '⭐')}</span>
        <!-- RTL row: your side renders on the right. The scoreline is dir=ltr, so
             its first child is leftmost and must be the OPPONENT's goals, or your
             own score ends up printed beside their name. -->
        <span class="eu-live-score" dir="ltr"><b id="eu-sc-them">0</b> – <b id="eu-sc-me">0</b></span>
        <span class="eu-side">${euBigCrest(t.club.id, t.club.flag)} ${t.club.name}</span>
      </div>
      <div class="eu-clock"><span id="eu-min">0</span>' · ${venue}</div>
      <div class="eu-bar"><span id="eu-bar"></span></div>
      ${prev}
      ${euCapsNoteHTML(c, t)}
      <div class="eu-feed" id="eu-feed"></div>
    </div>
    ${t.kind === 'ko' ? euRoadHTML(c) : ''}`;
}

// The European night, said out loud. A mechanic the player cannot see is a
// mechanic he cannot draft for, so the knockout screens name it and say how many
// of his own eleven have really been here.
function euCapsNoteHTML(c, t) {
  if (t.kind !== 'ko') return '';
  const n = c.caps || 0;
  const body = n
    ? `${euText('eu-caps-a', 'בהרכב שלך')} <b>${n}</b> ${euText('eu-caps-b', n === 1
        ? 'שחקן שכבר שיחק בליגת האלופות באמת.' : 'שחקנים שכבר שיחקו בליגת האלופות באמת.')}`
    : euText('eu-caps-none', 'אף אחד בהרכב שלך לא שיחק בליגת האלופות באמת.');
  return `<div class="eu-caps-note">🌙 ${euText('eu-night', 'הלילה האירופאי')} · ${body}</div>`;
}

// Play the clock out. Goals land on the minute they were drawn for, so the feed
// and the scoreline can never disagree with the aggregate that follows.
//
// A self-rescheduling timeout rather than an interval, because the speed chip can
// change the pace mid-match: this way the tick simply reads euSpeed() again and
// the button has nothing to restart. Returns the skip handle.
function euPlayClock(leg, onEnd) {
  const feed = document.getElementById('eu-feed');
  let min = 0, shown = 0, stopped = false;

  const paint = () => {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const on = leg.events.filter(e => e.min <= min);
    set('eu-min', min);
    set('eu-sc-me', on.filter(e => e.side === 'me').length);
    set('eu-sc-them', on.filter(e => e.side === 'them').length);
    const bar = document.getElementById('eu-bar');
    if (bar) bar.style.width = Math.round(min / 90 * 100) + '%';
  };
  const flush = () => {
    while (shown < leg.events.length && leg.events[shown].min <= min) {
      const ev = leg.events[shown++];
      const row = document.createElement('div');
      row.className = 'eu-ev ' + ev.side;
      row.innerHTML = `<span class="eu-ev-min">${ev.min}'</span>
        <span class="eu-ev-txt">⚽ ${ev.name}</span>`;
      if (feed) feed.prepend(row);
    }
    paint();
  };
  const end = () => {
    if (stopped) return;
    stopped = true;
    euStopClock();
    _euLive = null;
    onEnd();
  };
  const tick = () => {
    if (stopped) return;
    // The screen can be swapped out from under a running clock — leaving Europe,
    // or the sandbox rebuilding the campaign. No element means nothing to play.
    if (!document.getElementById('eu-min')) return end();
    min++;
    flush();
    if (min >= 90) return end();
    _euTimer = setTimeout(tick, 45 / euSpeed());
  };

  euStopClock();
  _euLive = leg;
  _euTimer = setTimeout(tick, 45 / euSpeed());

  return () => { min = 90; flush(); end(); };
}

/* ── the aggregate ────────────────────────────────────────────────────────── */
function euAggHTML(c, t) {
  const extra = [];
  if (t.et) extra.push(`${euText('eu-et', 'הארכה')} <bdi dir="ltr">${t.et.gf}-${t.et.ga}</bdi>`);
  if (t.pens) extra.push(`${euText('eu-pens', 'פנדלים')} <bdi dir="ltr">${t.pens.gf}-${t.pens.ga}</bdi>`);
  const legs = t.legs.map((l, i) => `
    <div class="eu-leg-row ${l.outcome === 'W' ? 'win' : l.outcome === 'D' ? 'draw' : 'loss'}">
      <span class="eu-leg-n">${t.oneLeg ? euText('eu-the-final', 'הגמר')
        : (i === 0 ? euText('eu-away', 'חוץ') : euText('eu-home', 'בית'))}</span>
      <span class="eu-leg-sc" dir="ltr">${l.gf}-${l.ga}</span>
      <span class="eu-leg-sc-names">${(l.scorers || []).map(s => `${s.n} ${s.min}'`).join(' · ')}</span>
    </div>`).join('');

  return `
    <div class="eu-card ${t.won ? 'won' : 'lost'}">
      <div class="eu-card-head">
        <span>${t.roundLong}</span>
        <span class="eu-vs">${euBigCrest(t.club.id, t.club.flag)} ${t.club.name} · ${t.club.ovr}</span>
      </div>
      <div class="eu-agg-big">
        <div>
          <div class="eu-agg-lbl">${t.oneLeg ? euText('eu-result', 'התוצאה') : euText('eu-agg', 'מצטבר')}</div>
          <div class="eu-agg-val" dir="ltr">${t.agg.gf}-${t.agg.ga}</div>
          ${extra.length ? `<div class="eu-agg-extra">${extra.join(' · ')}</div>` : ''}
        </div>
        <div class="eu-agg-res ${t.won ? 'won' : 'lost'}">${t.won
          ? euText('eu-through', 'עולה') : euText('eu-eliminated', 'הודחת')}</div>
      </div>
      <div class="eu-legs">${legs}</div>
    </div>
    ${t.kind === 'ko' ? euRoadHTML(c) : ''}`;
}

/* ── the road to the final ────────────────────────────────────────────────── */
function euRoadHTML(c) {
  // A 0-0 that you somehow won needs to say how, or the row reads like a bug.
  const how = t => t.pens ? ` ${euText('eu-on-pens', 'בפנדלים')}`
             : t.et ? ` ${euText('eu-in-et', 'בהארכה')}` : '';
  const rows = euRoad(c).map(r => {
    const t = r.tie;
    const line = r.state === 'won'
      ? `${euText('eu-beat', 'ניצחת את')} ${t.club.name} <span class="eu-road-agg" dir="ltr">${t.agg.gf}-${t.agg.ga}</span>${how(t)}`
      : r.state === 'lost'
        ? `${euText('eu-lost-to', 'נפלת מול')} ${t.club.name}`
        : r.state === 'now' && t
          ? t.club.name
          : euText('eu-tbd', 'ייקבע בהמשך');
    const crest = t ? euBigCrest(t.club.id, t.club.flag) : '';
    return `
      <div class="eu-road-row ${r.state}">
        <span class="eu-road-dot">${r.state === 'won' ? '✓' : r.id === 'final' ? '🏆' : ''}</span>
        <span class="eu-road-name">${r.round}</span>
        <span class="eu-road-txt">${crest} ${line}</span>
      </div>`;
  }).join('');
  return `
    <div class="eu-card eu-road">
      <div class="eu-card-head"><span>${euText('eu-road-t', 'הדרך לגמר')}</span></div>
      ${rows}
    </div>`;
}

/* ── the league phase ─────────────────────────────────────────────────────── */
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

function euLeagueHTML(c) {
  const L = c.league;
  const w = L.matches.filter(m => m.outcome === 'W').length;
  const d = L.matches.filter(m => m.outcome === 'D').length;
  const l = L.matches.filter(m => m.outcome === 'L').length;
  return `
    <div class="eu-card">
      <div class="eu-card-head">
        <span>${euText('eu-phase-t', 'שלב הליגה')}</span>
        <span class="eu-tally"><bdi dir="ltr">${w}-${d}-${l}</bdi> · <b>${L.pts} ${euText('eu-pts', 'נק\'')}</b></span>
      </div>
      <p class="eu-note">${euText('eu-phase-sub', 'שמונה משחקים מול שמונה יריבות שונות - שתיים מכל דרג, אחת בבית ואחת בחוץ.')}</p>
      ${L.matches.map((m, i) => euMatchRowHTML(m,
        `<span class="mr-gw">מחזור ${i + 1}</span> ${euCrest(m.cid, m.flag)} ${m.opponent}
         <span class="mr-pot">דרג ${m.pot} · ${m.ovr}</span>`)).join('')}
    </div>`;
}

function euStandingsHTML(c) {
  const L = c.league, band = euBand(L.rank);
  // Ten rows around you, with the full 36 one tap away — the same compromise the
  // screenshots make, because a 36-row table is not a thing anyone reads on a phone.
  const from = Math.max(0, Math.min(L.rank - 5, L.table.length - 10));
  const rows = (list, offset) => list.map((t, i) => {
    const pos = offset + i + 1;
    const cls = pos <= 8 ? 'bye' : pos <= 24 ? 'po' : 'out';
    const name = t.us
      ? `<span class="lt-name">${euText('eu-you', 'ההרכב שלי')} <span class="lt-us-badge">#${pos}</span></span>`
      : `<span class="lt-name">${euCrest(t.cid, t.flag)} ${t.name}</span>`;
    return `<div class="lt-row ${cls}${t.us ? ' lt-us' : ''}">
      <span class="lt-pos">${pos}</span>${name}
      <span class="lt-pts" dir="ltr">${t.pts}</span></div>`;
  }).join('');

  return `
    <div class="eu-card">
      <div class="eu-card-head">
        <span>${euText('eu-table-t', 'הטבלה הסופית')}</span>
        <span class="eu-vs">${euText('eu-you-finished', 'סיימת')} ${L.rank} ${euText('eu-of-36', 'מתוך 36')}</span>
      </div>
      <div class="eu-verdict-h">${euText('eu-band-' + band.id, band.label)}</div>
      <p class="eu-note">${euText('eu-band-note-' + band.id, band.note)}</p>
      <div class="eu-table">${rows(L.table.slice(from, from + 10), from)}</div>
      <button class="eu-more" id="eu-full-table">${euText('eu-full-table', 'הצג את כל 36 הקבוצות')} ▾</button>
      <div class="eu-table eu-table-full" id="eu-table-full" hidden>${rows(L.table, 0)}</div>
      <div class="eu-legend">
        <span><i class="bye"></i>1-8 ${euText('eu-lg-bye', 'ישר לשמינית')}</span>
        <span><i class="po"></i>9-24 ${euText('eu-lg-po', 'פלייאוף')}</span>
        <span><i class="out"></i>25-36 ${euText('eu-lg-out', 'בחוץ')}</span>
      </div>
    </div>`;
}

/* ── the ends ─────────────────────────────────────────────────────────────── */
function euOutHTML(c) {
  const t = c.ties[c.ties.length - 1];
  const wonQ = c.ties.filter(x => x.kind === 'q' && x.won).length;
  if (c.outAt === 'league') {
    return `
      <div class="eu-card lost">
        <div class="eu-end-t">${euText('eu-out-league', 'נגמר בשלב הליגה')}</div>
        <p class="eu-note">${euText('eu-rank-a', 'מקום')} <bdi dir="ltr">${c.league.rank}</bdi>
          ${euText('eu-rank-b', 'מתוך 36 עם')} <bdi dir="ltr">${c.league.pts}</bdi>
          ${euText('eu-rank-c', 'נקודות.')} ${euText('eu-band-note-out', 'מקומות 25-36 נגמרו להם באירופה.')}</p>
      </div>
      ${euLeagueHTML(c)}`;
  }
  return `
    <div class="eu-card lost">
      <div class="eu-end-t">${euText('eu-out-title', 'נעצרת ב')}${euText('eu-round-' + t.club.id, t.roundLong)}</div>
      <p class="eu-note">${t.club.name} ${euText('eu-out-body', 'עברה במצבר')}
        <bdi dir="ltr">${t.agg.ga}-${t.agg.gf}</bdi>.
        ${t.kind === 'q'
          ? `${euText('eu-out-tail-a', 'עברת')} ${wonQ} ${euText('eu-out-tail-b', 'מתוך 4 סיבובים - הקיץ נגמר.')}`
          : euText('eu-out-ko', 'הגעת רחוק. לא מספיק רחוק.')}</p>
    </div>
    ${t.kind === 'ko' ? euRoadHTML(c) : ''}`;
}

function euTrophyHTML(c) {
  const ko = c.ties.filter(t => t.kind === 'ko');
  return `
    <div class="eu-card eu-trophy">
      <div class="eu-trophy-cup">🏆</div>
      <div class="eu-trophy-t">${euText('eu-trophy-t', 'אלופת אירופה')}</div>
      <p class="eu-note">${euText('eu-trophy-sub', 'אלופת ישראל, על גג היבשת. זה לא היה אמור לקרות.')}</p>
      <div class="eu-trophy-line">
        ${ko.map(t => `<span>${euBigCrest(t.club.id, t.club.flag)} ${t.club.name}
          <b dir="ltr">${t.agg.gf}-${t.agg.ga}</b>${t.pens
            ? `<i>${euText('eu-on-pens', 'בפנדלים')}</i>` : ''}</span>`).join('')}
      </div>
    </div>
    ${euRoadHTML(c)}`;
}

/* ── the renderer ─────────────────────────────────────────────────────────── */
// Leaving Europe is three things, and forgetting any one of them leaves a mess
// behind: stop the clock, take the backdrop off the page, show the results.
function euLeave() {
  euStopClock();
  euBackdrop(false);
  showScreen('results');
}

function euRender() {
  const c = _euCampaign, body = document.getElementById('eu-body');
  if (!c || !body) return;
  euStopClock();
  euBackdrop(EU_BLUE_FROM.includes(euStageOf(c)));

  let html = '', cta = '';
  let onNext = null;

  if (c.view === 'tie') {
    const t = euEnsureTie(c);
    const leg = euPlayLeg(c) || t.legs[t.legs.length - 1];
    html = euLiveHTML(c, t, leg);
    cta = euCta(euText('eu-skip', '⏩ דלג לסוף המשחק'), 'eu-skip');
    body.innerHTML = euShell(c, html, cta) + euAdminBlock();
    euWireCommon(body, c);

    const skip = euPlayClock(leg, () => {
      const btn = document.getElementById('eu-skip');
      if (!btn) return;
      const done = euTieComplete(c);
      btn.textContent = done ? euText('eu-see-agg', 'לתוצאת הסיבוב →')
                             : euText('eu-next-leg', 'למשחק הגומלין →');
      btn.onclick = () => {
        if (done) euCloseTie(c); else c.view = 'tie';
        euSave(c);
        euRender();
      };
    });
    const btn = document.getElementById('eu-skip');
    if (btn) btn.onclick = () => skip();
    return;
  }

  if (c.view === 'agg') {
    const t = c.ties[c.ties.length - 1];
    html = euAggHTML(c, t);
    const label = !t.won ? euText('eu-see-end', 'לסיכום המסע →')
      : t.kind === 'q' && c.qi + 1 >= EU_ROUNDS.length ? euText('eu-to-league', 'לשלב הליגה →')
      : t.roundId === 'final' ? euText('eu-lift-it', 'להרים את הגביע →')
      : euText('eu-next-round', 'לסיבוב הבא →');
    cta = euCta(label);
    onNext = () => { euAfterTie(c); euRender(); };
  } else if (c.view === 'league') {
    html = euLeagueHTML(c);
    cta = euCta(euText('eu-see-table', 'לטבלה הסופית →'));
    onNext = () => { c.view = 'standings'; euSave(c); euRender(); };
  } else if (c.view === 'standings') {
    html = euStandingsHTML(c);
    const band = euBand(c.league.rank);
    cta = euCta(band.id === 'out' ? euText('eu-see-end', 'לסיכום המסע →')
                                  : euText('eu-see-road', 'לדרך שלפניך →'));
    onNext = () => { euEnterKnockouts(c); euRender(); };
  } else if (c.view === 'road') {
    html = euRoadHTML(c);
    cta = euCta(euText('eu-into-ko', 'לנוקאאוט →'));
    onNext = () => { c.view = 'tie'; euSave(c); euRender(); };
  } else if (c.view === 'out') {
    html = euOutHTML(c);
    cta = euCta(euText('eu-back', '← חזרה לתוצאות העונה'));
    onNext = euLeave;
  } else if (c.view === 'trophy') {
    html = euTrophyHTML(c);
    cta = euCta(euText('eu-back', '← חזרה לתוצאות העונה'));
    onNext = euLeave;
  }

  body.innerHTML = euShell(c, html, cta) + euAdminBlock();
  euWireCommon(body, c);

  const next = document.getElementById('eu-next');
  if (next && onNext) next.onclick = onNext;

  // The league phase arrives match by match rather than all at once. It is still
  // ONE screen — the user asked for the recap to stay a recap — but eight rows
  // appearing together is a wall, and eight rows landing one after another is a
  // matchweek. Pressing on skips the rest in.
  if (c.view === 'league') euRevealRows(body, next);

  const full = document.getElementById('eu-full-table');
  if (full) full.onclick = () => {
    const t = document.getElementById('eu-table-full');
    if (!t) return;
    t.hidden = !t.hidden;
    full.textContent = t.hidden ? euText('eu-full-table', 'הצג את כל 36 הקבוצות') + ' ▾'
                                : euText('eu-full-table-hide', 'הסתר') + ' ▴';
  };
}

// Deal the rows in, one at a time, and let the button cut it short.
function euRevealRows(body, cta) {
  const rows = [...body.querySelectorAll('.match-row')];
  if (!rows.length) return;
  rows.forEach(r => r.classList.add('eu-dealt'));
  let i = 0;
  const showAll = () => { euStopClock(); rows.forEach(r => r.classList.remove('eu-dealt')); };
  const tick = () => {
    if (!document.body.contains(rows[0])) return euStopClock();
    rows[i++].classList.remove('eu-dealt');
    if (i < rows.length) _euTimer = setTimeout(tick, 260 / euSpeed());
  };
  euStopClock();
  _euTimer = setTimeout(tick, 220);
  if (cta) {
    const advance = cta.onclick;
    cta.onclick = () => {
      if (i < rows.length) { showAll(); i = rows.length; return; }   // first press deals
      advance();                                                     // second moves on
    };
  }
}

// The bits every screen carries: exit, and the speed chip while a match runs.
function euWireCommon(body, c) {
  const quit = body.querySelector('#eu-quit');
  if (quit) quit.onclick = euLeave;
  // The running clock re-reads euSpeed() on every tick, so changing the pace is
  // just changing the stored number — there is nothing here to restart.
  const sp = body.querySelector('#eu-speed');
  if (sp) sp.onclick = () => { sp.textContent = euCycleSpeed() + 'x'; };
  if (typeof euWireAdmin === 'function') euWireAdmin(body);
}

function euAdminBlock() {
  return typeof euAdminHTML === 'function' ? euAdminHTML() : '';
}
