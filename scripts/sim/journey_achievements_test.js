const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..', '..');
const file = path.join(root, 'js/journey-achievements.js');
assert.ok(fs.existsSync(file), 'journey achievements must exist');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const memory = new Map();
const storage = { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, String(v)) };
const G = new Function('document', 'window', 'localStorage',
  ['js/data.js', 'js/sim-engine.js', 'js/game.js', 'js/journey-engine.js', 'js/journey.js', 'js/journey-achievements.js'].map(read).join('\n') +
  ';return {journeyAchievementKeys,journeyAchievementMetrics,journeyAwardAchievements,journeyAchievementsLoad,JOURNEY_ACHIEVEMENTS,SQUADS,journeyEngine,formationSlots,slotFitPos,state,journeyRecordPick,journeyAppendAchievements};')(
    { addEventListener() {}, getElementById() { return null; },
      createElement: () => ({ dataset: {}, innerHTML: '' }) }, {}, storage);
let n = 0;
function test(name, fn) { fn(); n++; console.log('PASS  ' + name); }
const metrics = { broken: true, clubs: 1, yearGap: 0, backwards: 0, phase: 'complete', level: 'normal' };
test('six unique achievements cover the journey and its season', () => {
  assert.strictEqual(G.JOURNEY_ACHIEVEMENTS.filter(a => !a.retired).length, 6);
  assert.strictEqual(new Set(G.JOURNEY_ACHIEVEMENTS.map(a => a.key)).size, G.JOURNEY_ACHIEVEMENTS.length);
});
test('a retired award is never granted again, but one already earned stays on show', () => {
  assert.ok(!G.journeyAchievementKeys({ ...metrics, clubs: 11, level: 'legacy' }).includes('jx_clubs'));
  memory.set('36-0-journey-achievements', JSON.stringify({ v: 1, earned: { jx_clubs: { at: new Date().toISOString() } } }));
  assert.ok(G.journeyAchievementsLoad().jx_clubs);
  memory.delete('36-0-journey-achievements');
});
test('a completed journey earns the first route award', () => {
  assert.deepStrictEqual(G.journeyAchievementKeys(metrics), ['jx_finish']);
});
test('only an unbroken route earns the chain award', () => {
  assert.ok(G.journeyAchievementKeys({ ...metrics, broken: false }).includes('jx_chain'));
  assert.ok(!G.journeyAchievementKeys(metrics).includes('jx_chain'));
});
test('club, year gap and backwards thresholds are exact', () => {
  assert.deepStrictEqual(G.journeyAchievementKeys({ ...metrics, clubs: 11, yearGap: 19, backwards: 3 }), ['jx_finish']);
  const keys = G.journeyAchievementKeys({ ...metrics, yearGap: 20, backwards: 4 });
  ['jx_time', 'jx_back'].forEach(k => assert.ok(keys.includes(k)));
});
test('the hard award needs the hard level, and an easy season wins no title award', () => {
  assert.ok(G.journeyAchievementKeys({ ...metrics, level: 'hard' }).includes('jx_hard'));
  assert.ok(!G.journeyAchievementKeys(metrics).includes('jx_hard'));
  assert.ok(!G.journeyAchievementKeys({ ...metrics, level: 'easy', phase: 'season' }, 1).includes('jx_title'));
  assert.ok(!G.journeyAchievementKeys({ ...metrics, level: 'legacy', phase: 'season' }, 1).includes('jx_title'));
  assert.ok(G.journeyAchievementKeys({ ...metrics, level: 'hard', phase: 'season' }, 1).includes('jx_title'));
});
test('a league title is awarded only for rank one in the season phase', () => {
  assert.ok(!G.journeyAchievementKeys(metrics, 1).includes('jx_title'));
  assert.ok(G.journeyAchievementKeys({ ...metrics, phase: 'season' }, 1).includes('jx_title'));
  assert.ok(!G.journeyAchievementKeys({ ...metrics, phase: 'season' }, 2).includes('jx_title'));
});
test('an incomplete or malformed journey earns nothing', () => {
  assert.strictEqual(G.journeyAchievementMetrics({ phase: 'pick', path: [] }), null);
  assert.deepStrictEqual(G.journeyAwardAchievements({ phase: 'complete', path: [] }, 1), []);
  assert.deepStrictEqual(G.journeyAchievementsLoad(), {});
});
test('invalid stored achievement data is ignored', () => {
  memory.set('36-0-journey-achievements', '{bad'); assert.deepStrictEqual(G.journeyAchievementsLoad(), {});
  memory.set('36-0-journey-achievements', JSON.stringify({ v: 1, earned: { jx_finish: { at: 'bad' }, unknown: { at: new Date().toISOString() } } }));
  assert.deepStrictEqual(G.journeyAchievementsLoad(), {});
});
function completedRoute() {
  const engine = G.journeyEngine({ level: 'normal' }), slots = G.formationSlots('4-3-3', 'bal');
  const remaining = slots.map((slot, i) => ({ pos: G.slotFitPos(slot), id: slot.id }));
  const first = engine.starts(remaining.map(s => s.pos))[0];
  const c = { currentId: first.id, remaining: remaining.map(s => s.pos), usedNames: [], visited: [first.id], breakLeft: 1 };
  const j = { v: 1, id: 'achievement-test', level: 'normal', phase: 'complete', path: [], visited: c.visited, broken: false };
  let arrival = 'start';
  while (remaining.length) {
    const pick = engine.choices(c)[0], i = pick.slots[0];
    j.path.push({ squadId: c.currentId, name: pick.name, slotId: remaining[i].id, arrival });
    c.usedNames.push(pick.name); remaining.splice(i, 1); c.remaining = remaining.map(s => s.pos);
    if (!remaining.length) break;
    let next = engine.destinations(pick.name, c); arrival = 'career';
    if (!next.length) { next = engine.escapes(c); c.breakLeft = 0; j.broken = true; arrival = 'break'; }
    c.currentId = next[0].id; c.visited.push(c.currentId);
  }
  return j;
}
const route = completedRoute();
test('the final pick unlocks awards before the summary screen or any timer runs', () => {
  memory.delete('36-0-journey-achievements');
  const j = JSON.parse(JSON.stringify(route)), last = j.path.pop();
  j.phase = 'pick'; j.arrival = last.arrival;
  const squad = G.journeyEngine(j).squad(last.squadId);
  G.state.slots = G.formationSlots('4-3-3', 'bal');
  Object.assign(G.state, { journey: j, currentRound: 11, currentSquad: squad });
  const idx = G.state.slots.findIndex(s => s.id === last.slotId);
  G.journeyRecordPick(idx, squad.players.find(p => p.name === last.name));
  assert.strictEqual(j.phase, 'complete');
  assert.ok(G.journeyAchievementsLoad().jx_finish);
  memory.delete('36-0-journey-achievements');
});
test('actual completed routes persist awards once, even on repeated restore', () => {
  assert.ok(G.journeyAchievementMetrics(route));
  assert.ok(G.journeyAwardAchievements(route).includes('jx_finish'));
  const before = storage.getItem('36-0-journey-achievements');
  assert.deepStrictEqual(G.journeyAwardAchievements(JSON.parse(JSON.stringify(route))), []);
  assert.strictEqual(storage.getItem('36-0-journey-achievements'), before);
});
test('a completed season adds the title once and keeps earlier route awards', () => {
  const season = { ...route, phase: 'season' };
  assert.deepStrictEqual(G.journeyAwardAchievements(season, 1), ['jx_title']);
  assert.ok(G.journeyAchievementsLoad().jx_finish);
  assert.ok(G.journeyAchievementsLoad().jx_title);
  assert.deepStrictEqual(G.journeyAwardAchievements(season, 1), []);
});
test('a route with two broken links cannot unlock awards', () => {
  const bad = JSON.parse(JSON.stringify(route));
  bad.broken = true; bad.path[1].arrival = 'break'; bad.path[2].arrival = 'break';
  assert.strictEqual(G.journeyAchievementMetrics(bad), null);
  assert.deepStrictEqual(G.journeyAwardAchievements(bad, 1), []);
});
test('signed in, the main list shows the device section only while it holds an award the account lacks', () => {
  const box = () => { const kids = []; return { kids, appendChild: c => kids.push(c) }; };
  memory.set('36-0-journey-achievements', JSON.stringify({ v: 1, earned: {
    jx_finish: { at: new Date().toISOString() }, jx_clubs: { at: new Date().toISOString() } } }));
  let b = box(); G.journeyAppendAchievements(b, { jx_finish: {} });
  assert.strictEqual(b.kids.length, 1, 'retired jx_clubs is not on the server: keep showing it');
  memory.set('36-0-journey-achievements', JSON.stringify({ v: 1, earned: { jx_finish: { at: new Date().toISOString() } } }));
  b = box(); G.journeyAppendAchievements(b, { jx_finish: {} });
  assert.strictEqual(b.kids.length, 0, 'everything is in the account: no duplicate section');
  b = box(); G.journeyAppendAchievements(b, {});
  assert.strictEqual(b.kids.length, 1, 'a queued route the server has not granted yet');
  b = box(); G.journeyAppendAchievements(b, null);
  assert.strictEqual(b.kids.length, 1, 'signed out: always');
  memory.delete('36-0-journey-achievements');
});
console.log('\n' + n + ' passed');
