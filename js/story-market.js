/* ── מצב סיפור: the market ────────────────────────────────────────────────────
 *
 * Pure functions over a `run` and the season's squads. No DOM and no `state`,
 * so scripts/sim/story_calibrate.js can load this beside game.js in Node and
 * play thousands of chapters. The two game.js helpers used here (playerFitsSlot,
 * slotFitPos) are pure too. Everything that touches the pitch is in
 * js/story-season.js.
 *
 * A run:
 *   { v, chapterId, seed, budget, phase: 'summer'|'season'|'jan'|'done',
 *     formationId, tactic,
 *     own:    [{ squadId, name }]                       — the squad you hold
 *     bought: [{ squadId, name, window, price }]        — every signing, even if resold
 *     sold:   [{ squadId, name, window, price }]
 *     buys:   { summer, jan }                           — signings used per window
 *     result: { rank, points, budget, stars, score }    — once phase is 'done' }
 */

function storyChapter(id) { return STORY_CHAPTERS.find(c => c.id === id) || null; }

// The rules a chapter plays by: STORY_RULES with the chapter's own `rules` on
// top. A small club gets fewer signings and a bigger minimum squad — without
// them six cheap signings, funded by selling the bench, turned a relegation
// squad into a mid-table one (Netanya 2015/16 survived 100% at a 1-million budget).
function storyRules(chOrRun) {
  const ch = chOrRun && chOrRun.stars ? chOrRun : storyChapter(chOrRun && chOrRun.chapterId);
  const own = (ch && ch.rules) || {};
  return { ...STORY_RULES, ...own, buys: { ...STORY_RULES.buys, ...(own.buys || {}) } };
}
// Money is in thousands of ₪, kept to the nearest 10,000.
function storyK(n) { return Math.round(n / 10) * 10; }

// A seeded draw per (run, what, …): the same offer to the same club on the same
// run always gets the same answer, so reloading cannot grind a negotiation.
function storyRand(run, ...parts) {
  let h = 2166136261 >>> 0;
  const str = run.seed + '|' + parts.join('|');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h = Math.imul(h ^ (h >>> 15), 1 | h); h ^= h + Math.imul(h ^ (h >>> 7), 61 | h);
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
}

function storyValueOfOvr(ovr) {
  const n = Number(ovr) || 0;
  return STORY_VALUE_TIERS.find(t => n >= t.min).v;
}

// '2015/16' → '2014/15'
function storyPrevSeason(season) {
  const y = parseInt(season, 10);
  return `${y - 1}/${String(y).slice(-2)}`;
}

// Scraped names carry stray direction marks ('יוסי אבוקסיס‎'); the tables do not.
function storyNameKey(n) { return String(n || '').replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim(); }

// The site does not load js/league_tables.js; it loads the generated sliver in
// js/story-facts.js (scripts/build_story_facts.js). Both come from one source.
function storyTable(season) {
  return (typeof STORY_FACTS !== 'undefined' && STORY_FACTS.tables[season]) || [];
}

const _storyRepCache = {};
function storyRepNames(season) {
  if (_storyRepCache[season]) return _storyRepCache[season];
  const prev = storyPrevSeason(season);
  const names = (typeof STORY_FACTS !== 'undefined' && STORY_FACTS.reps[prev]) || [];
  return (_storyRepCache[season] = new Set(names.map(storyNameKey)));
}

function storySummerValue(player, season) {
  const base = storyValueOfOvr(player.ovr);
  return storyK(storyRepNames(season).has(storyNameKey(player.name))
    ? base * STORY_RULES.repPremium : base);
}

// What half a season in YOUR simulation did to a player's price, in rating points.
// Attackers and midfielders are paid for goals and assists, the back line and
// the keeper for clean sheets. Anchored so that a 79 striker with 11 goals by
// January is priced like an 84 (the owner's own example, spec §5).
const STORY_ATT = ['ST', 'CF', 'LW', 'RW', 'LM', 'RM', 'CAM'];
const STORY_MID = ['CM', 'CDM'];
function storyPerfBonus(position, stats) {
  if (!stats) return 0;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const out = (stats.goals || 0) + 0.5 * (stats.assists || 0);
  if (STORY_ATT.includes(position)) return clamp(Math.round((out - 3) / 1.5), -2, 6);
  if (STORY_MID.includes(position)) return clamp(Math.round((out - 2) / 1.5), -2, 6);
  return clamp(Math.round(((stats.cs || 0) - 4) / 1.5), -1, 4);
}
function storyJanValue(player, stats) {
  return storyValueOfOvr((Number(player.ovr) || 0) + storyPerfBonus(player.position, stats));
}


function storyPrevPos(teamId, season) {
  const r = storyTable(storyPrevSeason(season)).find(x => x.teamId === teamId);
  return r ? r.pos : Infinity;              // promoted last summer: below everyone
}
function storyIsRival(ch, sellerTeamId) {
  return storyPrevPos(sellerTeamId, ch.season) < storyPrevPos(ch.teamId, ch.season);
}

function storyReal(ch) {
  const t = storyTable(ch.season);
  const r = t.find(x => x.teamId === ch.teamId);
  return r ? { pos: r.pos, pts: r.pts, n: t.length } : null;
}

// The lowest finish that stays up that season (clubs minus the relegated).
function storySafeRank(ch) {
  const n = storyTable(ch.season).length;
  const d = (typeof STORY_FACTS !== 'undefined' && STORY_FACTS.drop && STORY_FACTS.drop[ch.season]) || 2;
  return n - d;
}

function storySeasonSquads(season) { return SQUADS.filter(s => s.season === season); }
function storyHomeSquad(ch) {
  return SQUADS.find(s => s.teamId === ch.teamId && s.season === ch.season) || null;
}
function storyRefKey(r) { return r.squadId + '|' + r.name; }

function storyNewRun(ch, seed) {
  const home = storyHomeSquad(ch);
  return {
    v: 1, chapterId: ch.id, seed: seed >>> 0, budget: ch.budget, phase: 'summer',
    formationId: '4-3-3', tactic: 'bal',
    own: home.players.map(p => ({ squadId: home.id, name: p.name })),
    bought: [], sold: [], buys: { summer: 0, jan: 0 },
    talks: {},        // 'phase|squadId|name' → { ask, round, closed }
    offers: [],       // bids on your players: { id, squadId, name, club, amount, window, asked, unsolicited }
    courted: {},      // phase → true once that window's unsolicited bids were made
  };
}

function storyResolve(ref) {
  const squad = SQUADS.find(s => s.id === ref.squadId);
  const player = squad && squad.players.find(p => p.name === ref.name);
  return (squad && player) ? { player, squad } : null;
}
function storyOwned(run) { return run.own.map(storyResolve).filter(Boolean); }

// Everyone who played in the league that season, bar your own club and anyone
// already signed (a signing who was sold on has left the league).
function storyMarketPool(run, ch) {
  const taken = new Set([...run.bought, ...(run.rivalBuys || [])].map(storyRefKey));
  const out = [];
  for (const sq of storySeasonSquads(ch.season)) {
    if (sq.teamId === ch.teamId) continue;
    for (const p of sq.players) {
      if (!taken.has(sq.id + '|' + p.name)) out.push({ player: p, squad: sq });
    }
  }
  return out;
}

function storyBuyBlock(run, price) {
  const w = run.phase;
  if (w !== 'summer' && w !== 'jan') return 'החלון סגור';
  if (run.buys[w] >= storyRules(run).buys[w]) return 'נגמרו הרכישות בחלון הזה';
  if (price > run.budget + 1e-9) return 'אין מספיק תקציב';
  return null;
}
// Returns null on success, or the reason in Hebrew — the UI shows it as is.
function storyBuy(run, ch, entry, price) {
  const why = storyBuyBlock(run, price);
  if (why) return why;
  const ref = { squadId: entry.squad.id, name: entry.player.name };
  run.budget = storyK(run.budget - price);
  run.own.push(ref);
  run.bought.push({ ...ref, window: run.phase, price });
  run.buys[run.phase]++;
  return null;
}

function storySellBlock(run) {
  if (run.phase !== 'summer' && run.phase !== 'jan') return 'החלון סגור';
  const min = storyRules(run).minSquad;
  if (run.own.length <= min) return `הסגל לא יכול לרדת מתחת ל-${min}`;
  return null;
}
function storySell(run, entry, price) {
  const why = storySellBlock(run);
  if (why) return why;
  const k = entry.squad.id + '|' + entry.player.name;
  const i = run.own.findIndex(r => storyRefKey(r) === k);
  if (i < 0) return 'השחקן לא בסגל';
  run.own.splice(i, 1);
  run.sold.push({ squadId: entry.squad.id, name: entry.player.name, window: run.phase, price });
  run.offers = (run.offers || []).filter(o => o.squadId + '|' + o.name !== k);   // he is gone: so are the bids
  run.budget = storyK(run.budget + price);
  return null;
}

// The same rating simTeamsForSeason gives a club (top-11 average + V2 lines),
// computed from the squad AFTER your signings left it.
function storyClubRating(teamId, players) {
  const top = [...players].sort((a, b) => b.ovr - a.ovr).slice(0, 11);
  const ovr = Math.round(top.reduce((s, p) => s + p.ovr, 0) / Math.max(1, top.length));
  return {
    teamId,
    name: ((typeof TEAMS !== 'undefined' && TEAMS[teamId]) || { name: teamId }).name,
    ovr,
    ...simLineRatingsForSquad(players, ovr),
  };
}
// A club's squad as the run has left it: minus whoever you and the rivals took
// from it, plus whoever it signed itself.
// upTo: 'summer' — only summer moves have happened (the first half),
//       'all'    — January's too (the second half).
function storyClubPlayers(ch, run, teamId, upTo) {
  const inWindow = b => upTo === 'all' || b.window === 'summer';
  const rivals = (run.rivalBuys || []).filter(inWindow);
  const gone = new Set([...run.bought.filter(inWindow), ...rivals].map(storyRefKey));
  const sq = storySeasonSquads(ch.season).find(s => s.teamId === teamId);
  const own = sq ? sq.players.filter(p => !gone.has(sq.id + '|' + p.name)) : [];
  const signed = rivals.filter(b => b.teamId === teamId).map(storyResolve).filter(Boolean).map(e => e.player);
  return [...own, ...signed];
}
function storyOpponents(ch, run, upTo) {
  return storySeasonSquads(ch.season)
    .filter(sq => sq.teamId !== ch.teamId)
    .map(sq => storyClubRating(sq.teamId, storyClubPlayers(ch, run, sq.teamId, upTo)))
    .sort((a, b) => b.ovr - a.ovr);
}

/* ── rivals who shop ─────────────────────────────────────────────────────────
 * A favourite's chapter was easy because its rivals stood still: B7 2015/16 won
 * the title 85% of the time before a single transfer. The owner turned down an
 * opening debt as unreal ("זה אמור להיות בהתאם למציאות"); what is real is that
 * the clubs chasing you also buy. When a chapter sets `rivalBudget`, last
 * season's top three (bar you) each spend it on the biggest upgrades they can
 * afford — three signings at the end of summer, one in January — from whoever
 * is still on the market after YOUR window. Deterministic: no draw at all, the
 * best affordable upgrade wins, so the same run always sees the same moves. */
function storyRivalClubs(ch) {
  const here = new Set(storySeasonSquads(ch.season).map(s => s.teamId));
  return storyTable(storyPrevSeason(ch.season))
    .filter(r => r.teamId !== ch.teamId && here.has(r.teamId))
    .sort((a, b) => a.pos - b.pos).slice(0, 3).map(r => r.teamId);
}
function storyRivalShop(run, ch, window) {
  if (!ch.rivalBudget) return [];
  run.rivalBuys = run.rivalBuys || [];
  if (run.rivalBuys.some(b => b.window === window)) return [];     // once per window
  const n = window === 'summer' ? 3 : 1;
  const mine = new Set(run.own.map(storyRefKey));
  const made = [];
  for (const teamId of storyRivalClubs(ch)) {
    let budget = window === 'summer' ? ch.rivalBudget : storyK(ch.rivalBudget / 3);
    for (let i = 0; i < n; i++) {
      const squad = storyClubPlayers(ch, run, teamId, 'all');
      const floor = [...squad].sort((a, b) => b.ovr - a.ovr).slice(0, 11).pop();
      const pick = storyMarketPool(run, ch)
        .filter(e => e.squad.teamId !== teamId && !mine.has(storyEntryKey(e)) &&
                     e.player.ovr > (floor ? floor.ovr : 0) && storyValueOfOvr(e.player.ovr) <= budget)
        .sort((a, b) => b.player.ovr - a.player.ovr || storyValueOfOvr(a.player.ovr) - storyValueOfOvr(b.player.ovr) ||
                        storyEntryKey(a).localeCompare(storyEntryKey(b)))[0];
      if (!pick) break;
      const price = storyValueOfOvr(pick.player.ovr);
      const b = { teamId, squadId: pick.squad.id, name: pick.player.name, from: pick.squad.teamId, window, price };
      run.rivalBuys.push(b);
      made.push(b);
      budget -= price;
    }
  }
  return made;
}

// The eleven that start: scarcest slot first, best natural fit, and only then
// the best man left out of position. Phase 1 picks it for you (plan §פישוטים 1).
function storyBestXI(entries, slots) {
  const pool = entries.slice().sort((a, b) => b.player.ovr - a.player.ovr);
  const fits = (e, i) => playerFitsSlot(e.player, slotFitPos(slots[i]));
  const order = slots.map((_, i) => i).sort((a, b) =>
    (pool.filter(e => fits(e, a)).length - pool.filter(e => fits(e, b)).length) || (a - b));
  const used = new Set();
  const picks = new Array(slots.length).fill(null);
  for (const i of order) {
    const pick = pool.find(e => !used.has(e) && fits(e, i)) || pool.find(e => !used.has(e));
    if (pick) { picks[i] = pick; used.add(pick); }
  }
  return picks;
}

// The real opening eleven: the best XI of the real squad in the default shape.
// "Keep the core" is judged against these names, whatever shape you later play.
function storyCoreNames(ch) {
  const home = storyHomeSquad(ch);
  const entries = home.players.map(p => ({ player: p, squad: home }));
  return storyBestXI(entries, formationSlots('4-3-3', 'bal')).filter(Boolean).map(e => e.player.name);
}

// res: { rank, points, margin, budget, sold: [names], boughtTeams: [teamIds] }
//   margin — your points minus the best other club's; budget — what is left.
// GRADED: a star counts only if the one before it does.
function storyStars(ch, res) {
  const real = storyReal(ch);
  const raw = ch.stars.map(s => {
    if (s.type === 'rank') return res.rank <= s.max;
    if (s.type === 'survive') return res.rank <= storySafeRank(ch);
    if (s.type === 'beatPoints') return !!real && res.points > real.pts;
    if (s.type === 'margin') return res.rank === 1 && (res.margin || 0) >= s.min;
    if (s.type === 'noBuyFrom') return !(res.boughtTeams || []).some(t => s.teams.includes(t));
    if (s.type === 'maxBuys') return (res.boughtTeams || []).length <= s.n;
    if (s.type === 'keepCore') {
      const core = new Set(storyCoreNames(ch));
      return !(res.sold || []).some(n => core.has(n));
    }
    return false;
  });
  return raw.map((ok, i) => raw.slice(0, i + 1).every(Boolean));
}
function storyScore(ch, res) {
  const real = storyReal(ch);
  const stars = storyStars(ch, res).filter(Boolean).length;
  // budget is thousands of ₪: 10 points per million left over
  return stars * 1000 + (real ? (res.points - real.pts) * 20 : 0) + Math.round(res.budget / 100);
}

// The facts storyStars needs from a finished run and its league table.
function storyResult(run, table, rank, points) {
  const us = table.find(r => r.us);
  const others = table.filter(r => !r.us).map(r => r.pts ?? (r.w * 3 + r.d));
  const usPts = us ? (us.pts ?? (us.w * 3 + us.d)) : points;
  return {
    rank, points, budget: run.budget,
    margin: usPts - Math.max(...others),
    sold: run.sold.map(s => s.name),
    boughtTeams: run.bought.map(b => (SQUADS.find(s => s.id === b.squadId) || {}).teamId),
  };
}

// A signing's rating, from his reference — for reports and the calibration.
function storyResolveOvr(ref) { const e = storyResolve(ref); return e ? e.player.ovr : 0; }

/* ── negotiation: buying ─────────────────────────────────────────────────────
 * A signing is a conversation with the selling club, not a price tag. The club
 * names its price; you offer; it accepts, counters or walks away. Three offers
 * per player per window, and a rival will not sell you one of its three best at
 * all. Every answer is a seeded draw (storyRand), so it cannot be re-rolled. */

function storyEntryKey(e) { return e.squad.id + '|' + e.player.name; }
function storyTalkKey(run, e) { return run.phase + '|' + storyEntryKey(e); }

// Where a player stands in his own club's squad, by rating (1 = its best).
function storyClubRank(e) {
  return [...e.squad.players].sort((a, b) => b.ovr - a.ovr).findIndex(p => p.name === e.player.name) + 1;
}

// The selling club's opening position. `value` is the player's market value in
// the current window (summer: rating + reputation; January: the same list price,
// performance counts only for YOUR players).
function storyAsk(run, ch, e, value) {
  const rival = storyIsRival(ch, e.squad.teamId);
  const key = storyClubRank(e) <= 3;
  const notForSale = rival && key && storyPrevPos(e.squad.teamId, ch.season) <= 3;
  const ask = Math.min(STORY_RULES.maxAsk,
    storyK(value * (rival ? STORY_RULES.rivalMarkup : 1) * (key ? STORY_RULES.keyMarkup : 1)));
  return { ask, notForSale, rival, key };
}

function storyTalk(run, ch, e, value) {
  const k = storyTalkKey(run, e);
  if (!run.talks[k]) {
    const a = storyAsk(run, ch, e, value);
    run.talks[k] = { ask: a.ask, round: 0, closed: a.notForSale, nfs: a.notForSale };
  }
  return run.talks[k];
}

// Make an offer. Returns { kind, price?, counter?, left, why? }:
//   'accept'  — done at `price` (the player is yours, the money gone)
//   'counter' — the club names `counter`; it is now its asking price
//   'reject'  — no; `left` offers remain (0 = the club has stopped answering)
//   'blocked' — the offer could not be made (`why`: budget, window, limit, closed)
function storyOffer(run, ch, e, value, amount) {
  const talk = storyTalk(run, ch, e, value);
  if (talk.nfs) return { kind: 'blocked', why: 'המועדון לא מוכר אותו', left: 0 };
  if (talk.closed) return { kind: 'blocked', why: 'המועדון הפסיק לענות', left: 0 };
  const block = storyBuyBlock(run, amount);
  if (block) return { kind: 'blocked', why: block, left: STORY_RULES.talkRounds - talk.round };
  amount = storyK(amount);
  talk.round++;
  const left = STORY_RULES.talkRounds - talk.round;
  const r = amount / talk.ask;
  const u = storyRand(run, 'offer', storyTalkKey(run, e), talk.round);
  const u2 = storyRand(run, 'meet', storyTalkKey(run, e), talk.round);
  let out;
  if (r >= 1) {
    out = { kind: 'accept', price: amount };
  } else if (r >= 0.8) {
    // close: sometimes a yes, otherwise they meet you part of the way
    if (u < (r - 0.8) / 0.2 * 0.6) out = { kind: 'accept', price: amount };
    else out = { kind: 'counter', counter: storyK(talk.ask - (talk.ask - amount) * (0.3 + 0.3 * u2)) };
  } else if (r >= 0.6) {
    // low: they barely move, and sometimes they are offended
    if (u < 0.3) out = { kind: 'reject' };
    else out = { kind: 'counter', counter: storyK(talk.ask * (0.95 + 0.05 * u2)) };
  } else {
    out = { kind: 'reject' };                                  // not a serious offer
  }
  if (out.kind === 'counter') talk.ask = Math.max(out.counter, amount);
  talk.lastCounter = out.kind === 'counter';     // a counter can be taken even after the last round
  if (out.kind === 'accept') {
    storyBuy(run, ch, e, out.price);
    talk.closed = true;
  } else if (left <= 0) {
    talk.closed = true;
  }
  return { ...out, left: out.kind === 'accept' ? 0 : left };
}

// Take the club's last counter as it stands.
function storyTakeCounter(run, ch, e, value) {
  const talk = storyTalk(run, ch, e, value);
  if (talk.nfs || !talk.lastCounter) return { kind: 'blocked', why: 'אין הצעה נגדית על השולחן' };
  const why = storyBuyBlock(run, talk.ask);
  if (why) return { kind: 'blocked', why };
  storyBuy(run, ch, e, talk.ask);
  talk.closed = true;
  talk.lastCounter = false;
  return { kind: 'accept', price: talk.ask };
}

/* ── offers: selling ─────────────────────────────────────────────────────────
 * You do not sell a player, you put him on the market and see who bids — or a
 * club comes for someone you never offered. Each bid can be taken, turned down,
 * or pushed once for more, and pushing too hard makes the club walk. */

const STORY_ABROAD = 'abroad';

function storyBidderName(club) {
  if (club === STORY_ABROAD) return 'מועדון מחו״ל';
  return ((typeof TEAMS !== 'undefined' && TEAMS[club]) || { name: club }).name;
}

function storyMakeBids(run, ch, e, value, n, lo, span, unsolicited) {
  const clubs = storySeasonSquads(ch.season).map(s => s.teamId).filter(t => t !== ch.teamId);
  const k = storyEntryKey(e);
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = storyRand(run, 'bid', run.phase, k, i);
    const uc = storyRand(run, 'bidder', run.phase, k, i);
    const club = uc < 0.2 ? STORY_ABROAD : clubs[Math.floor(uc * clubs.length) % clubs.length];
    if (out.some(o => o.club === club)) continue;              // one bid per club
    out.push({ id: `${run.phase}|${k}|${i}`, squadId: e.squad.id, name: e.player.name, club,
               amount: storyK(value * (lo + span * u)), window: run.phase, asked: false, unsolicited });
  }
  return out;
}

// Put a player on the market: one to three bids arrive, at 65-110% of his value.
function storyListPlayer(run, ch, e, value) {
  const k = storyEntryKey(e);
  if (run.offers.some(o => o.window === run.phase && o.squadId + '|' + o.name === k)) return [];
  const n = 1 + Math.floor(storyRand(run, 'bids', run.phase, k) * 3);
  const bids = storyMakeBids(run, ch, e, value, n, 0.65, 0.45, false);
  run.offers.push(...bids);
  return bids;
}

// Bids you did not ask for, once per window: for the men who have been
// performing (January) or who arrived with a reputation (summer).
function storyCourt(run, ch, entries, valueOf, isCourted) {
  if (run.courted[run.phase]) return [];
  run.courted[run.phase] = true;
  const made = [];
  for (const e of entries) {
    if (!isCourted(e)) continue;
    const bids = storyMakeBids(run, ch, e, valueOf(e), 1, 0.9, 0.35, true);
    run.offers.push(...bids);
    made.push(...bids);
  }
  return made;
}

function storyLiveOffers(run) { return run.offers.filter(o => o.window === run.phase); }

function storyAcceptBid(run, id) {
  const o = run.offers.find(x => x.id === id);
  if (!o || o.window !== run.phase) return 'ההצעה כבר לא בתוקף';
  const e = storyResolve(o);
  if (!e) return 'השחקן לא בסגל';
  const why = storySell(run, e, o.amount);
  if (why) return why;
  return null;
}

function storyRejectBid(run, id) {
  run.offers = run.offers.filter(x => x.id !== id);
}

// Name your price to a bidder — the selling side of a negotiation. Each bidder
// has a ceiling (10-30% over his opening bid, a seeded draw he never shows):
//   at or under it          → 'accept', sold at your price
//   up to 30% over it       → 'counter', he raises his bid part of the way
//   further than that, or your last round → 'walk', the bid is gone
// Returns { kind, amount? } or { kind: 'blocked', why }.
function storyPushBid(run, id, amount) {
  const o = run.offers.find(x => x.id === id);
  if (!o || o.window !== run.phase) return { kind: 'blocked', why: 'ההצעה כבר לא בתוקף' };
  amount = storyK(amount);
  if (amount <= o.amount) {                                   // asking less than he offers: take it
    const why = storyAcceptBid(run, id);
    return why ? { kind: 'blocked', why } : { kind: 'accept', amount: o.amount };
  }
  o.opening = o.opening || o.amount;
  o.round = (o.round || 0) + 1;
  const max = storyK(o.opening * (1.1 + 0.2 * storyRand(run, 'ceiling', id)));
  if (amount <= max) {
    o.amount = amount;
    const why = storyAcceptBid(run, id);
    return why ? { kind: 'blocked', why } : { kind: 'accept', amount };
  }
  if (amount <= max * 1.3 && o.round < STORY_RULES.bidRounds) {
    const u = storyRand(run, 'raise', id, o.round);
    o.amount = Math.min(max, storyK(o.amount + (max - o.amount) * (0.4 + 0.4 * u)));
    return { kind: 'counter', amount: o.amount, left: STORY_RULES.bidRounds - o.round };
  }
  storyRejectBid(run, id);
  return { kind: 'walk' };
}

/* ── positions ───────────────────────────────────────────────────────────────
 * The squad is shown in position groups with a count on each, next to what the
 * chosen shape needs — so a gap is visible before the season, not after it. */
const STORY_GROUPS = [
  { id: 'gk', label: 'שוערים', pos: ['GK'] },
  { id: 'cb', label: 'בלמים',  pos: ['CB'] },
  { id: 'fb', label: 'מגנים',  pos: ['RB', 'LB'] },
  { id: 'cm', label: 'קשרים',  pos: ['CDM', 'CM', 'CAM'] },
  { id: 'wg', label: 'כנפיים', pos: ['LM', 'RM', 'LW', 'RW'] },
  { id: 'st', label: 'חלוצים', pos: ['ST', 'CF'] },
];
function storyGroupOf(pos) { return (STORY_GROUPS.find(g => g.pos.includes(pos)) || STORY_GROUPS[3]).id; }
// How many of each group the shape fields: { gk: 1, cb: 2, … }
function storyGroupNeeds(slots) {
  const out = {};
  STORY_GROUPS.forEach(g => { out[g.id] = 0; });
  slots.forEach(s => { out[storyGroupOf(slotFitPos(s))]++; });
  return out;
}
