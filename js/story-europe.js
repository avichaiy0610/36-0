/* ── מצב סיפור: Europe ────────────────────────────────────────────────────────
 *
 * A European chapter is a real campaign — the real opponents, round by round,
 * as verified against Wikipedia on 2026-09-23 (see STORY_CHAPTERS). There is no
 * league season: after the summer window the campaign IS the chapter.
 *
 * What makes it a game rather than a slideshow is the decision between legs.
 * Before every match you pick the tactic (js/game.js TACTICS — attack against
 * defence, already balanced for the league), knowing the state of the tie: go
 * for it when a goal is needed, shut up shop when you are ahead. Two-legged ties
 * play by the rules of their era: away goals (abolished only in 2021), then
 * extra time, then penalties.
 *
 * The knockout rounds carry js/europe.js's "European night": your XI rises by a
 * share of the gap to whoever is in front of you (the same 1.15). Qualifiers and
 * group stages do not — which is why a group of Bayern, Juventus and Bordeaux
 * is as hard here as it was in 2009.
 *
 * No DOM. Every leg is a seeded draw on the run's seed, the round, the leg and
 * the tactic you chose, and is saved the moment it is played: a refresh restores
 * the match, it does not replay it. Loaded in Node by the calibration harness.
 */

const STORY_EU_NIGHT_K = 1.15;          // = EU_NIGHT_K in js/europe.js

function storyEuSeed(run, ...parts) {
  return Math.floor(storyRand(run, 'eu', ...parts) * 4294967296) >>> 0;
}

// A club is four lines that average its rating, drawn once per run and round.
function storyEuClub(run, club, key) {
  const d = [0, 1, 2].map(i => Math.round(storyRand(run, 'lines', key, club.name, i) * 6) - 3);
  d.push(-(d[0] + d[1] + d[2]));
  return { name: club.name, ovr: club.ovr, atk: club.ovr + d[0], mid: club.ovr + d[1],
           def: club.ovr + d[2], gk: club.ovr + d[3], cs: 1 };
}

function storyEuNight(me, oppOvr) {
  const lift = STORY_EU_NIGHT_K * Math.max(0, oppOvr - me.ovr);
  if (!lift) return me;
  return { ...me, ovr: me.ovr + lift, atk: me.atk + lift, mid: me.mid + lift,
           def: me.def + lift, gk: me.gk + lift };
}

function storyEuStart(run) {
  run.eu = { at: 0, cur: null, done: [], stats: {}, out: false, windowDone: false };
  return run.eu;
}
// the injury key of the next match: 'eu|<round>|<match index>'
function storyEuWhen(run, round) {
  const cur = run.eu.cur;
  return 'eu|' + round.id + '|' + (cur && cur.id === round.id ? cur.legs.length : 0);
}
function storyEuRound(ch, run) { return (run.eu && ch.europe.rounds[run.eu.at]) || null; }
function storyEuOver(ch, run) { return !!run.eu && (run.eu.out || run.eu.at >= ch.europe.rounds.length); }
// The window opens before the round named in ch.europe.window, once. `window`
// may be a list: a campaign that branches has a different next round per branch.
function storyEuWindowDue(ch, run) {
  const r = storyEuRound(ch, run);
  return !!r && !run.eu.windowDone && [].concat(ch.europe.window).includes(r.id) && !run.eu.cur;
}

function storyEuAddStats(run, players) {
  for (const p of players) {
    const s = run.eu.stats[p.name] || (run.eu.stats[p.name] = { name: p.name, goals: 0, assists: 0, cs: 0 });
    s.goals += p.goals; s.assists += p.assists; s.cs += p.cs;
  }
}

// One match against `club`. The XI and the tactic must already be on `state`
// (storyApplyXI + state.tactic); `night` applies the knockout lift.
function storyEuMatch(run, club, key, home, night, seed) {
  const opp = storyEuClub(run, club, key);
  let me = myLineRatings();
  if (night) me = storyEuNight(me, club.ovr);
  const leg = withSeededRandom(seed, () => simulateMatchV2(me, opp, home));
  leg.opponent = club.name;
  const stats = withSeededRandom(seed ^ 0x5bd1e995, () => simulatePlayerStats([leg]));
  storyEuAddStats(run, stats);
  return { gf: leg.gf, ga: leg.ga, outcome: leg.outcome, home, scorers: leg.scorers || [] };
}

/* ── two-legged ties ─────────────────────────────────────────────────────── */
function storyEuTieState(ch, round, legs) {
  const gf = legs.reduce((s, l) => s + l.gf, 0), ga = legs.reduce((s, l) => s + l.ga, 0);
  const awayF = legs.filter(l => !l.home).reduce((s, l) => s + l.gf, 0);
  const awayA = legs.filter(l => l.home).reduce((s, l) => s + l.ga, 0);
  return { gf, ga, awayF, awayA };
}

// What you need from the second leg, in words — the reason the tactic matters.
function storyEuNeed(ch, round, legs) {
  if (round.kind !== 'tie' || legs.length !== 1 || round.oneLeg) return '';
  const t = storyEuTieState(ch, round, legs);
  const d = t.gf - t.ga;
  if (d > 0) return `אתם מובילים ${t.gf}-${t.ga} בסיכום. שוויון מספיק לכם.`;
  if (d < 0) {
    const need = -d;
    return need === 1 ? 'אתם בפיגור שער אחד בסיכום. צריך לנצח.' : `אתם בפיגור ${need} שערים בסיכום.`;
  }
  if (!ch.europe.awayGoals) return `${t.gf}-${t.ga} בסיכום. מי שמנצח עולה.`;
  if (t.awayF > t.awayA) return `${t.gf}-${t.ga} בסיכום, ושער החוץ שלכם שווה כפול. שוויון מספיק.`;
  return `${t.gf}-${t.ga} בסיכום. ${t.awayA > t.awayF ? 'שער החוץ שלהם שווה כפול: צריך לנצח.' : 'צריך לנצח.'}`;
}

function storyEuCloseTie(ch, run, round, legs) {
  const t = storyEuTieState(ch, round, legs);
  let gf = t.gf, ga = t.ga, won = null, et = null, pens = null, how = '';
  if (gf !== ga) { won = gf > ga; how = 'agg'; }
  else if (ch.europe.awayGoals && !round.oneLeg && t.awayF !== t.awayA) { won = t.awayF > t.awayA; how = 'away'; }
  else {
    // extra time: a third of a match, then a coin that is not quite a coin
    const u1 = storyRand(run, 'et', round.id), u2 = storyRand(run, 'et2', round.id);
    et = { gf: u1 < 0.28 ? 1 : 0, ga: u2 < 0.3 ? 1 : 0 };
    gf += et.gf; ga += et.ga;
    if (gf !== ga) { won = gf > ga; how = 'et'; }
    else {
      const mine = storyRand(run, 'pens', round.id) < 0.5;
      pens = mine ? { gf: 4, ga: 3 } : { gf: 3, ga: 4 };
      won = mine; how = 'pens';
    }
  }
  return { id: round.id, kind: 'tie', legs, agg: { gf, ga }, et, pens, won, how };
}

/* ── group stage ─────────────────────────────────────────────────────────── */
function storyEuGroupTable(round, played) {
  const rows = [{ name: 'us', us: true, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 },
                ...round.clubs.map(c => ({ name: c.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }))];
  const row = n => rows.find(r => r.name === n);
  // each game: { a, b, gf: a's goals, ga: b's goals }
  for (const g of played) {
    const a = row(g.a), b = row(g.b);
    a.p++; b.p++;
    a.gf += g.gf; a.ga += g.ga; b.gf += g.ga; b.ga += g.gf;
    if (g.gf > g.ga) { a.w++; b.l++; } else if (g.gf < g.ga) { b.w++; a.l++; } else { a.d++; b.d++; }
  }
  rows.forEach(r => { r.pts = r.w * 3 + r.d; r.gd = r.gf - r.ga; });
  return rows.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || (x.us ? 1 : 0) - (y.us ? 1 : 0));
}

/* ── the one entry point ─────────────────────────────────────────────────── */
// Play the next match of the campaign with `tactic`. Returns
//   { leg, round, closed? }  — `closed` is the finished tie or group, if this
// match finished one. The XI is put on the pitch here from the run.
function storyEuPlay(ch, run, tactic) {
  const round = storyEuRound(ch, run);
  if (!round || run.eu.out) return null;
  const cur = run.eu.cur || (run.eu.cur = { id: round.id, legs: [], played: [] });
  storyApplyXI(run, storyEuWhen(run, round), tactic);

  if (round.kind === 'tie') {
    const i = cur.legs.length;
    const home = round.oneLeg ? round.home : (i === 0) === !!round.firstHome;
    const seed = storyEuSeed(run, round.id, i, state.tactic);
    const leg = storyEuMatch(run, round.club, round.id, home, !!round.ko, seed);
    leg.tactic = state.tactic;
    cur.legs.push(leg);
    if (cur.legs.length < (round.oneLeg ? 1 : 2)) return { leg, round };
    const closed = storyEuCloseTie(ch, run, round, cur.legs);
    run.eu.done.push(closed);
    run.eu.cur = null;
    storyEuAdvance(ch, run, round, closed);
    return { leg, round, closed };
  }

  // group: matchday i — you against fixtures[i], the other two against each other
  const i = cur.legs.length;
  const fx = round.fixtures[i];
  const club = round.clubs[fx[0]];
  const seed = storyEuSeed(run, round.id, i, state.tactic);
  const leg = storyEuMatch(run, club, round.id, fx[1], false, seed);
  leg.tactic = state.tactic;
  leg.opp = club.name;
  cur.legs.push(leg);
  cur.played.push({ a: 'us', b: club.name, gf: leg.gf, ga: leg.ga });
  const others = round.clubs.filter((c, k) => k !== fx[0]);
  const h = storyEuClub(run, others[0], round.id), a = storyEuClub(run, others[1], round.id);
  const o = withSeededRandom(storyEuSeed(run, round.id, i, 'others'),
    () => simulateMatchV2(h, a, i % 2 === 0));
  cur.played.push({ a: others[0].name, b: others[1].name, gf: o.gf, ga: o.ga });
  if (cur.legs.length < round.fixtures.length) return { leg, round };
  const table = storyEuGroupTable(round, cur.played);
  const pos = table.findIndex(r => r.us) + 1;
  const us = table.find(r => r.us);
  const closed = { id: round.id, kind: 'group', legs: cur.legs, table, pos,
                   pts: us.pts, gf: us.gf, ga: us.ga, won: pos <= round.advance };
  run.eu.done.push(closed);
  run.eu.cur = null;
  storyEuAdvance(ch, run, round, closed);
  return { leg, round, closed };
}

// Where a finished round sends the campaign.
//   won  → the next round; or, when the round has `winEnds`, the end of the
//          chapter, above what really happened, with that text as the result.
//   lost → out; or, when the round has `dropTo`, down into that round — the
//          Champions League play-off loser's Europa League group, as it really was.
//   a group finished one place below `advance` → `thirdTo` when the round has
//          it: third in a Champions League group went on in the Europa League.
function storyEuAdvance(ch, run, round, closed) {
  const rounds = ch.europe.rounds;
  const won = closed.won;
  const to = id => rounds.findIndex(r => r.id === id);
  if (won && round.winEnds) { run.eu.at = rounds.length; run.eu.endText = round.winEnds; return; }
  if (won) { run.eu.at++; return; }
  if (round.thirdTo && closed.kind === 'group' && closed.pos === round.advance + 1) {
    run.eu.at = to(round.thirdTo);
    run.eu.dropped = round.id;
    return;
  }
  if (round.dropTo) {
    run.eu.at = to(round.dropTo);
    run.eu.dropped = round.id;
    return;
  }
  run.eu.out = true;
}

// The live group table, mid-group.
function storyEuLiveTable(ch, run) {
  const round = storyEuRound(ch, run);
  if (!round || round.kind !== 'group') return null;
  return storyEuGroupTable(round, (run.eu.cur && run.eu.cur.played) || []);
}

/* ── how far you got, and the stars ──────────────────────────────────────── */
// res.eu: { reached: index of the furthest round entered, group: closed group | null }
function storyEuResult(ch, run) {
  const rounds = ch.europe.rounds;
  const reached = run.eu.out ? run.eu.at : rounds.length;   // rounds.length = won the lot
  const group = run.eu.done.find(d => d.kind === 'group') || null;
  // every group by its round id, and every round played — for a campaign that
  // branches, where "the group" and "how far" depend on which way it went
  const groups = {};
  run.eu.done.filter(d => d.kind === 'group').forEach(d => { groups[d.id] = { pos: d.pos, pts: d.pts, gf: d.gf, ga: d.ga }; });
  return { reached, group, groups, played: run.eu.done.map(d => d.id),
           champion: !run.eu.out && run.eu.at >= rounds.length, endText: run.eu.endText || null };
}
function storyEuReachedRound(ch, res, roundId) {
  const idx = ch.europe.rounds.findIndex(r => r.id === roundId);
  return idx >= 0 && res.eu.reached >= idx;
}
// the real campaign's furthest round, for "you vs. reality"
function storyEuRealReach(ch) {
  const idx = ch.europe.rounds.findIndex(r => r.id === ch.europe.realOut);
  return idx < 0 ? ch.europe.rounds.length : idx;
}
function storyEuRoundLabel(ch, idx, endText) {
  if (idx >= ch.europe.rounds.length) return endText || ch.europe.endLabel || 'זכייה בגביע';
  return ch.europe.rounds[idx].label;
}
