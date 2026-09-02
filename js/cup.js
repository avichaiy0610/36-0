// גביע המדינה — the second competition inside the season.
//
// Ligat ha'Al enters the real cup at round eight, into a field of 32, and every
// tie from there is a SINGLE match. That is five games: 1/16, last 16, quarter,
// semi, final. Small enough to live inside a season without taking it over.
//
// ── Two things make this more than a side-show ───────────────────────────────
//
// 1. THE WHOLE BRACKET IS PLAYED, not just your half. Thirty-one matches, every
//    club already carrying four line ratings, so it costs nothing — and it buys
//    a champion who is a RESULT rather than a coin flip. When you go out in the
//    last 16 you still get to watch who lifted it, and "the champions did the
//    double" becomes something that genuinely happens.
//
// 2. IT DECIDES EUROPE. The cup winner takes Israel's Europa League place, so
//    the final has to be resolved before the European allocation is made — which
//    is why it is the last seam of the season, after the final league fixture.
//
// The reveal interleaves it with the January window: two rounds before the
// decision, three after. A winter signing that decides a cup final is exactly
// what that ordering is for.

(function (global) {
  'use strict';

  const CUP_KEY = 'cup';                 // the slot inside the saved draft
  const CUP_SAVE_V = 1;
  let _run = null;
  let _timer = null;

  /* ── when it runs ─────────────────────────────────────────────────────────
     Out of the daily challenge and the leagues, where every player must face
     identical conditions and a drawn cup run would break the comparison the
     boards depend on, and out of the gauntlet, which is not a season. The
     salary cap keeps it: a cup run costs nothing and signs nobody. */
  function cupEligible() {
    if (typeof state === 'undefined' || !state) return false;
    if (state.challenge || state.league || state.gauntlet) return false;
    if (!Array.isArray(state.picks) || state.picks.some(p => !p)) return false;
    return true;
  }

  /* ── the field ─────────────────────────────────────────────────────────────
     Fourteen from the top flight — you and the thirteen the season is being
     played against, with their real ratings — plus eighteen from below, who
     need a name and four numbers and nothing else. */
  function cupField() {
    const me = myLineRatings();
    const mine = { id: 'me', name: 'הקבוצה שלי', us: true, tier: 0,
                   ovr: me.ovr, atk: me.atk, mid: me.mid, def: me.def, gk: me.gk };

    const year = state.oppSeason ?? LATEST_SEASON_YEAR;
    const top = simTeamsForSeason(year, 13).slice(0, 13)
      .map(c => ({ id: c.teamId, name: c.name, tier: 0,
                   ovr: c.ovr, atk: c.atk, mid: c.mid, def: c.def, gk: c.gk }));

    const lower = [
      ...shuffleArr([...CUP_LEUMIT]).slice(0, 6).map(c => ({ ...c, tier: 1 })),
      ...shuffleArr([...CUP_ALEF]).slice(0, 12).map(c => ({ ...c, tier: 2 })),
    ].map(c => ({ ...c, ...cupLines(c.ovr) }));

    return { mine, top, lower };
  }

  // Four line ratings that average exactly the club's rating — the same trick
  // Europe uses for clubs that have no players in our data, and for the same
  // reason: below the top flight there are no squads and there never will be.
  function cupLines(ovr) {
    let d;
    do {
      d = [0, 0, 0].map(() => Math.floor(Math.random() * 9) - 4);
      d.push(-(d[0] + d[1] + d[2]));
    } while (Math.abs(d[3]) > 4);
    return { atk: ovr + d[0], mid: ovr + d[1], def: ovr + d[2], gk: ovr + d[3] };
  }

  /* ── the draw ──────────────────────────────────────────────────────────────
     The round of 32 pairs every top-flight club against somebody from below,
     which is what the real draw feels like at this stage and what makes the
     first round a banana skin rather than a fixture. Fourteen such ties, and the
     four lower clubs left over meet each other. */
  function cupDraw(field) {
    const tops = shuffleArr([field.mine, ...field.top]);
    const lows = shuffleArr([...field.lower]);
    const ties = [];
    tops.forEach(t => ties.push({ a: t, b: lows.pop() }));
    while (lows.length >= 2) ties.push({ a: lows.pop(), b: lows.pop() });
    return shuffleArr(ties);
  }

  function cupBuild() {
    const field = cupField();
    return {
      v: CUP_SAVE_V,
      rounds: [{ id: CUP_ROUNDS[0].id, ties: cupDraw(field) }],
      out: null,          // the round the player went out in
      champion: null,
    };
  }

  /* ── the cup night ─────────────────────────────────────────────────────────
     The exact mirror of the European night, and for the same reason: a single
     match on a bad pitch is not what the league table says it is. In Europe the
     gap is closed in YOUR favour because you are the small club; in the cup it
     is closed against you, because here you are the big one.

     Both sides are pulled toward the midpoint by this share of the gap between
     them, so it applies to every tie in the bracket and not only to yours.

     Without it a perfect XI won the cup 87% of the time and a good one 58% — a
     trophy you collect rather than win, which would also have made "cup winner
     but not champion" a route to Europe nobody ever takes.

     Measured over 3,000 cups per rating, before and after:

       XI    | 80   | 83   | 85   | 87   | 91
       raw   | 3.9% | 20.5%| 39.8%| 57.7%| 86.8%
       0.45  | 7.2% | 17.7%| 27.9%| 37.2%| 56.7%

     A dominant side still wins it more often than anyone else, and still fails
     to win it in most seasons — which is what a cup is. Note the bottom of the
     range moves the other way: at 80 the levelling HELPS you, because there you
     are the underdog in most ties. That is the mechanic being symmetric rather
     than a handicap, and it is the point. */
  const CUP_LEVEL_K = 0.45;

  function cupLevelled(a, b) {
    const shift = CUP_LEVEL_K * (a.ovr - b.ovr) / 2;
    const move = (t, by) => ({ ovr: t.ovr + by, atk: t.atk + by, mid: t.mid + by,
                               def: t.def + by, gk: t.gk + by, cs: t.cs });
    return [move(a, -shift), move(b, shift)];
  }

  /* ── a tie ─────────────────────────────────────────────────────────────────
     One match. The club from the lower division hosts — the real rule, and the
     reason a cup upset feels like an away day. Level after ninety goes to extra
     time and then to penalties; a cup tie cannot be drawn. */
  function cupPlayTie(tie) {
    const home = tie.b.tier > tie.a.tier ? false
               : tie.a.tier > tie.b.tier ? true
               : Math.random() < 0.5;
    const [A, B] = cupLevelled(tie.a, tie.b);
    const m = simulateMatchV2(A, B, home);
    tie.home = home;
    tie.gf = m.gf; tie.ga = m.ga; tie.et = null; tie.pens = null;
    // The ninety minutes on their own. The clock only ever animates these, so a
    // 1-1 that was won in extra time reads "1-1" at full time and says why
    // underneath, instead of quietly showing a 2-1 nobody watched.
    tie.reg = { gf: m.gf, ga: m.ga };

    if (tie.gf === tie.ga) {
      const a = simShrinkLines(A), b = simShrinkLines(B);
      const eg = simDrawGoals(simExpectedGoals(a, b, home) / 3);
      const ea = simDrawGoals(simExpectedGoals(b, a, !home) / 3);
      tie.et = { gf: eg, ga: ea };
      tie.gf += eg; tie.ga += ea;
    }
    if (tie.gf === tie.ga) {
      const mine = 3 + (Math.random() < 0.5 ? 1 : 0);
      tie.pens = { gf: mine, ga: mine === 4 ? 3 : 4 };
    }
    const aWon = tie.pens ? tie.pens.gf > tie.pens.ga : tie.gf > tie.ga;
    tie.winner = aWon ? tie.a : tie.b;

    // Scorers for the player's own match, so a cup row reads like a league row.
    if (tie.a.us || tie.b.us) {
      const forMe = tie.a.us ? tie.reg.gf : tie.reg.ga;
      const stub = { gf: forMe, ga: tie.a.us ? tie.reg.ga : tie.reg.gf };
      try { simulatePlayerStats([stub]); } catch (e) {}
      tie.scorers = stub.scorers || [];
    }
    return tie;
  }

  // Play a round and draw the next one from its winners.
  function cupPlayRound(i) {
    const r = _run.rounds[i];
    if (!r || r.played) return r;
    r.ties.forEach(cupPlayTie);
    r.played = true;

    const mine = r.ties.find(t => t.a.us || t.b.us);
    if (mine && !mine.winner.us) _run.out = r.id;

    const winners = r.ties.map(t => t.winner);
    if (winners.length === 1) {
      _run.champion = winners[0];
    } else {
      const next = [];
      for (let k = 0; k < winners.length; k += 2) next.push({ a: winners[k], b: winners[k + 1] });
      _run.rounds.push({ id: CUP_ROUNDS[i + 1].id, ties: next });
    }
    cupSave();
    return r;
  }

  // Everything up to and including round `i`, so a seam can never read a round
  // that was never played.
  function cupEnsure(i) { for (let k = 0; k <= i; k++) cupPlayRound(k); }

  /* ── the seams ─────────────────────────────────────────────────────────────
     Where each round interrupts the league. The final is at `n` — after the last
     fixture — because Europe needs the table AND the cup in the same breath. */
  function cupSeamsFor(n) {
    if (!cupEligible()) return [];
    _run = cupLoad() || cupBuild();
    cupSave();
    return CUP_ROUNDS.map((r, i) => ({
      kind: 'cup',
      round: r.id,
      at: i === CUP_ROUNDS.length - 1 ? n : Math.max(1, Math.round(n * CUP_AT[i])),
    }));
  }

  /* ── the screen ────────────────────────────────────────────────────────────
     A seam is only worth stopping for if there is something to see. Once you are
     out, the remaining rounds are played in the background and the reveal is not
     interrupted — except for the final, which always stops, because who lifted
     the cup is the point of having played it out. */
  function cupOpenRound(roundId, resume) {
    const i = CUP_ROUNDS.findIndex(r => r.id === roundId);
    if (i < 0 || !_run) return resume();
    cupEnsure(i);

    const r = _run.rounds[i];
    const tie = r && r.ties.find(t => t.a.us || t.b.us);
    if (tie) return cupShowMatch(i, tie, resume);
    if (roundId === 'f') {
      cupEnsure(CUP_ROUNDS.length - 1);
      return cupShowChampion(resume);
    }
    resume();
  }

  /* ── rendering ────────────────────────────────────────────────────────────── */
  function frame(html) {
    close();
    const w = document.createElement('div');
    w.className = 'cup-wrap';
    w.innerHTML = `<div class="cup-box" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(w);
    return w;
  }
  function close() {
    if (_timer) { clearTimeout(_timer); _timer = null; }
    document.querySelectorAll('.cup-wrap').forEach(e => e.remove());
  }

  const TIER_NAME = ['ליגת העל', 'ליגה לאומית', "ליגה א'"];

  function cupShowMatch(i, tie, resume) {
    const meta = CUP_ROUNDS[i];
    const opp = tie.a.us ? tie.b : tie.a;
    const reg = tie.reg || { gf: tie.gf, ga: tie.ga };
    const myGf = tie.a.us ? reg.gf : reg.ga;
    const myGa = tie.a.us ? reg.ga : reg.gf;
    const won = tie.winner.us;
    const atHome = tie.a.us ? tie.home : !tie.home;

    // The events, so the ninety minutes have shape. Only your goals carry a
    // name; theirs carry the club, exactly as in Europe.
    const used = new Set();
    const minute = () => { let m; do { m = 1 + Math.floor(Math.random() * 90); } while (used.has(m)); used.add(m); return m; };
    const ev = [];
    (tie.scorers || []).forEach(s => { used.add(s.min); ev.push({ min: s.min, side: 'me', name: s.n }); });
    for (let k = 0; k < myGa; k++) ev.push({ min: minute(), side: 'them', name: opp.name });
    ev.sort((a, b) => a.min - b.min);

    frame(`
      <div class="cup-kicker">🏆 ${meta.roundLong}</div>
      <div class="cup-top">
        <span class="cup-side">${siteTextOr('cup-you', 'ההרכב שלי')}</span>
        <span class="cup-score" dir="ltr"><b id="cup-them">0</b> – <b id="cup-me">0</b></span>
        <span class="cup-side">${opp.name}<i>${TIER_NAME[opp.tier]} · ${opp.ovr}</i></span>
      </div>
      <div class="cup-clock"><span id="cup-min">0</span>' · ${atHome ? 'בית' : 'חוץ'}</div>
      <div class="cup-bar"><span id="cup-bar"></span></div>
      <div class="cup-feed" id="cup-feed"></div>
      <div class="cup-btns"><button class="cup-b" id="cup-go">⏩ דלג לסוף</button></div>`);

    const done = () => {
      const extra = [];
      if (tie.et) extra.push(`הארכה <bdi dir="ltr">${tie.a.us ? tie.et.gf : tie.et.ga}-${tie.a.us ? tie.et.ga : tie.et.gf}</bdi>`);
      if (tie.pens) extra.push(`פנדלים <bdi dir="ltr">${tie.a.us ? tie.pens.gf : tie.pens.ga}-${tie.a.us ? tie.pens.ga : tie.pens.gf}</bdi>`);
      const b = document.getElementById('cup-go');
      if (!b) return;
      const box = document.querySelector('.cup-box');
      if (box) box.classList.add(won ? 'won' : 'lost');
      const verdict = document.createElement('div');
      verdict.className = 'cup-verdict ' + (won ? 'won' : 'lost');
      verdict.innerHTML = won
        ? `✅ ${i === CUP_ROUNDS.length - 1 ? 'זכית בגביע המדינה!' : 'עולה לסיבוב הבא'}` +
          (extra.length ? ` <span>${extra.join(' · ')}</span>` : '')
        : `❌ הודחת ב${meta.round}` + (extra.length ? ` <span>${extra.join(' · ')}</span>` : '');
      b.parentNode.insertBefore(verdict, b);
      b.textContent = 'המשך לעונה ←';
      b.onclick = () => { close(); resume(); };
    };

    cupClock(ev, myGf, myGa, done);
    const b = document.getElementById('cup-go');
    if (b) b.onclick = () => cupSkip(ev, done);
  }

  // The clock. Self-rescheduling so it can be cut short at any point without
  // leaving a timer behind.
  let _clockSkip = null;
  function cupClock(ev, gf, ga, onEnd) {
    let min = 0, at = 0, stopped = false;
    const feed = () => document.getElementById('cup-feed');
    const paint = () => {
      const on = ev.filter(e => e.min <= min);
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('cup-min', min);
      set('cup-me', on.filter(e => e.side === 'me').length);
      set('cup-them', on.filter(e => e.side === 'them').length);
      const bar = document.getElementById('cup-bar');
      if (bar) bar.style.width = Math.round(min / 90 * 100) + '%';
    };
    const flush = () => {
      while (at < ev.length && ev[at].min <= min) {
        const e = ev[at++];
        const row = document.createElement('div');
        row.className = 'cup-ev ' + e.side;
        row.innerHTML = `<span>${e.min}'</span> ⚽ ${e.name}`;
        const f = feed(); if (f) f.prepend(row);
      }
      paint();
    };
    const end = () => { if (stopped) return; stopped = true; if (_timer) clearTimeout(_timer); onEnd(); };
    const tick = () => {
      if (stopped) return;
      if (!document.getElementById('cup-min')) return end();
      min++; flush();
      if (min >= 90) return end();
      _timer = setTimeout(tick, 42);
    };
    _clockSkip = () => { min = 90; flush(); end(); };
    _timer = setTimeout(tick, 42);
  }
  function cupSkip(ev, done) { if (_clockSkip) _clockSkip(); else done(); }

  function cupShowChampion(resume) {
    const c = _run.champion;
    const path = _run.rounds.filter(r => r.played).map(r => {
      const t = r.ties.find(x => x.winner && x.winner.id === c.id);
      return t ? `${CUP_ROUNDS.find(m => m.id === r.id).round} · ${(t.a.id === c.id ? t.b : t.a).name}` : null;
    }).filter(Boolean);
    frame(`
      <div class="cup-kicker">🏆 גמר גביע המדינה</div>
      <div class="cup-champ">${c.us ? 'זכית בגביע המדינה!' : c.name}</div>
      <p class="cup-note">${c.us ? 'הגביע שלך.' : 'לקחה את הגביע העונה.'}</p>
      <div class="cup-path">${path.map(p => `<span>${p}</span>`).join('')}</div>
      <div class="cup-btns"><button class="cup-b" id="cup-go">המשך ←</button></div>`);
    const b = document.getElementById('cup-go');
    if (b) b.onclick = () => { close(); resume(); };
  }

  // Play a round and show nothing. "דלג לינואר" promises January, so a cup tie
  // sitting in front of it must be resolved on the way rather than opening a
  // modal the player did not ask for and the skip cannot dismiss.
  function cupSkipRound(roundId) {
    const i = CUP_ROUNDS.findIndex(r => r.id === roundId);
    if (i < 0 || !_run) return;
    cupEnsure(i);
  }

  /* ── the bracket ───────────────────────────────────────────────────────────
     Everything that happened, yours and everyone else's. Reachable from the
     results screen at any time, which is the whole reason the bracket is played
     out rather than drawn: skipping a round should cost you the drama, not the
     information. */
  function cupShowBracket() {
    if (!_run) return;
    const rounds = _run.rounds.filter(r => r.played).map((r, i) => {
      const meta = CUP_ROUNDS.find(m => m.id === r.id);
      const mine = r.ties.find(t => t.a.us || t.b.us);
      const rows = r.ties.map(t => {
        const us = t.a.us || t.b.us;
        const win = t.winner;
        const lose = t.winner === t.a ? t.b : t.a;
        const upset = (lose.tier || 0) < (win.tier || 0);      // beaten from below
        const how = t.pens ? ' <i>פנדלים</i>' : t.et ? ' <i>הארכה</i>' : '';
        // The winner is on the right and the loser dimmed on the left, which
        // reads fine until it is YOUR tie: the row is bold throughout and both
        // sides look the same, so a defeat could be mistaken for going through.
        // The tick says it outright.
        return `<div class="cup-br-row${us ? ' me' : ''}${upset ? ' upset' : ''}">
          <span class="cup-br-go">${win.us ? '✓' : ''}</span>
          <span class="cup-br-w">${win.us ? 'ההרכב שלי' : win.name}</span>
          <span class="cup-br-s" dir="ltr">${Math.max(t.gf, t.ga)}-${Math.min(t.gf, t.ga)}</span>${how}
          <span class="cup-br-l">${lose.us ? 'ההרכב שלי' : lose.name}</span>
        </div>`;
      }).join('');
      // Past the last 16 the whole round fits; before that only yours is worth
      // the height, with the rest one line away.
      const big = r.ties.length <= 4;
      return `<div class="cup-br-round">
        <div class="cup-br-h">${meta.round}<span>${r.ties.length} ${r.ties.length === 1 ? 'משחק' : 'משחקים'}</span></div>
        ${big || !mine ? rows : `<div class="cup-br-only">${rows}</div>`}
      </div>`;
    }).join('');

    const c = _run.champion;
    frame(`
      <div class="cup-kicker">🏆 גביע המדינה</div>
      ${c ? `<div class="cup-champ">${c.us ? 'הגביע שלך' : c.name}</div>
             <p class="cup-note">${c.us ? '' : 'זוכת הגביע העונה'}</p>` : ''}
      <div class="cup-br">${rounds || '<p class="cup-note">עוד לא שוחק דבר.</p>'}</div>
      <div class="cup-btns"><button class="cup-b" id="cup-go">סגור</button></div>`);
    const b = document.getElementById('cup-go');
    if (b) b.onclick = close;
  }

  // A way in, put beside the Europe button on the results screen. Only appears
  // once something has been played.
  function cupMountButton(after) {
    const old = document.getElementById('cup-open');
    if (old) old.remove();
    if (!after || !_run || !_run.rounds.some(r => r.played)) return;
    const b = document.createElement('button');
    b.id = 'cup-open';
    b.className = 'cup-open-link';
    const c = _run.champion;
    b.textContent = c
      ? (c.us ? '🏆 זכית בגביע המדינה - לצפייה בדרך' : '🥇 גביע המדינה · ' + c.name)
      : '🥇 גביע המדינה - לצפייה בבראקט';
    b.onclick = cupShowBracket;
    after.parentNode.appendChild(b);
  }

  /* ── achievements ──────────────────────────────────────────────────────────
     Sent once, from wireEuropeButton, because that is the first moment both
     halves of the story are known: who won the cup, and where the league
     finished. The double needs both. */
  async function cupSubmit(rank) {
    if (!_run || _run.submitted) return;
    _run.submitted = true;
    cupSave();
    if (typeof getCurrentUser !== 'function' || !getCurrentUser()) return;
    // which tier knocked me out, for the badge nobody wants
    let byTier = 0;
    if (_run.out) {
      const r = _run.rounds.find(x => x.id === _run.out);
      const t = r && r.ties.find(x => x.a.us || x.b.us);
      if (t) byTier = (t.a.us ? t.b : t.a).tier || 0;
    }
    try {
      const r = await _supabase.rpc('submit_cup_run', {
        p: { won: cupPlayerWon(), rank: rank || 0, out_to_tier: byTier },
      });
      const got = (r && r.data && r.data.achievements) || [];
      if (got.length && typeof showAchievementToasts === 'function') showAchievementToasts(got);
    } catch (e) {}
  }

  /* ── what the rest of the game asks ───────────────────────────────────────── */
  function cupWinner() { return _run && _run.champion; }
  function cupPlayerWon() { return !!(_run && _run.champion && _run.champion.us); }
  function cupRun() { return _run; }

  /* ── persistence ──────────────────────────────────────────────────────────── */
  function cupSave() {
    try {
      const raw = localStorage.getItem(DRAFT_SAVE_KEY);
      if (!raw || !_run) return;
      const d = JSON.parse(raw);
      d[CUP_KEY] = _run;
      localStorage.setItem(DRAFT_SAVE_KEY, JSON.stringify(d));
    } catch (e) {}
  }
  function cupLoad() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY));
      return d && d[CUP_KEY] && d[CUP_KEY].v === CUP_SAVE_V ? d[CUP_KEY] : null;
    } catch (e) { return null; }
  }
  function cupClear() {
    _run = null;
    try {
      const raw = localStorage.getItem(DRAFT_SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      delete d[CUP_KEY];
      localStorage.setItem(DRAFT_SAVE_KEY, JSON.stringify(d));
    } catch (e) {}
  }

  const siteTextOr = (k, d) => (typeof siteText === 'function' ? siteText(k, d) : d) || d;

  global.cupShowBracket = cupShowBracket;
  global.cupMountButton = cupMountButton;
  global.cupSkipRound = cupSkipRound;
  global.cupSubmit    = cupSubmit;
  global.cupSeamsFor  = cupSeamsFor;
  global.cupOpenRound = cupOpenRound;
  global.cupWinner    = cupWinner;
  global.cupPlayerWon = cupPlayerWon;
  global.cupRun       = cupRun;
  global.cupClear     = cupClear;
  global.cupEligible  = cupEligible;
})(window);
