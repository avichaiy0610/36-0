// Run: node scripts/sim/journey_server_test.js. 1.61: the journey's real achievements,
// what it sends to submit_journey_run, its season event, and the admin funnel.
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const memory = new Map();
const storage = { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, String(v)) };
const calls = [], tracked = [];
const server = { rpc(name, args) { calls.push({ name, args }); return Promise.resolve({ data: { achievements: [] } }); } };
let signedIn = true;
const G = new Function('document', 'window', 'localStorage', '_supabase', 'getCurrentUser', 'track',
  ['js/data.js', 'js/sim-engine.js', 'js/game.js', 'js/journey-engine.js', 'js/journey.js', 'js/journey-achievements.js', 'js/journey-admin.js'].map(read).join('\n') +
  ';return {state,SQUADS,formationSlots,slotFitPos,journeyEngine,journeyAwardAchievements,JOURNEY_ACHIEVEMENTS,journeyAdminSummary,journeyAdminRunsRows,jaSquadName};')(
    { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } }, {}, storage, server,
    () => (signedIn ? { id: 'u' } : null), (e, m, d) => tracked.push([e, m, d]));
let n = 0;
function test(name, fn) { fn(); n++; console.log('PASS  ' + name); }

test('the migration grants exactly the live JS achievements, with the same names and icons', () => {
  const sql = read('supabase/migrations/20261013000002_journey_runs.sql');
  const rows = [...sql.matchAll(/\('(jx_\w+)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*false\)/g)]
    .map(m => ({ key: m[1], name_he: m[2], desc_he: m[3], icon: m[4] }));
  const live = G.JOURNEY_ACHIEVEMENTS.filter(a => !a.retired).map(({ key, name_he, desc_he, icon }) => ({ key, name_he, desc_he, icon }));
  assert.deepStrictEqual(rows, live);
  // and every key the server can append is one of them
  const appended = [...sql.matchAll(/array_append\(earned, '(jx_\w+)'\)/g)].map(m => m[1]).sort();
  assert.deepStrictEqual(appended, live.map(a => a.key).sort());
});

function route() {
  const engine = G.journeyEngine({ level: 'normal' }), slots = G.formationSlots('4-3-3', 'bal');
  const remaining = slots.map(s => ({ pos: G.slotFitPos(s), id: s.id }));
  const first = engine.starts(remaining.map(s => s.pos), null, 1)[0];
  const c = { currentId: first.id, remaining: remaining.map(s => s.pos), usedNames: [], visited: [first.id], breakLeft: 1 };
  const j = { v: 1, id: 'lq2x9-abcd1234', level: 'normal', phase: 'complete', path: [], visited: c.visited, broken: false };
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
const j = route();
G.state.formationId = '4-3-3';
G.state.slots = G.formationSlots('4-3-3', 'bal'); G.state.picks = G.state.slots.map(() => null);

test('a finished route is sent with the shape the server checks', () => {
  calls.length = 0;
  G.journeyAwardAchievements(j);
  assert.strictEqual(calls.length, 1);
  const { name, args: { p } } = calls[0];
  assert.strictEqual(name, 'submit_journey_run');
  assert.match(p.run_id, /^[a-z0-9-]{4,40}$/);
  assert.strictEqual(p.level, 'normal'); assert.strictEqual(p.broken, j.broken); assert.strictEqual(p.rank, undefined);
  assert.strictEqual(p.route.length, 11);
  const re = /^[a-z0-9]+(-[a-z0-9]+)*-(199[0-9]|20[0-4][0-9])$/;
  p.route.forEach(s => { assert.ok(re.test(s.squadId), s.squadId); assert.deepStrictEqual(Object.keys(s), ['squadId', 'name']); });
});
test('the run id journeyStart makes passes the server pattern', () => {
  for (let i = 0; i < 50; i++) {
    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    assert.match(id, /^[a-z0-9-]{4,40}$/);
  }
});
test('the season sends its rank, and its event is counted once per journey', () => {
  calls.length = 0; tracked.length = 0;
  G.journeyAwardAchievements({ ...j, phase: 'season' }, 1);
  G.journeyAwardAchievements({ ...j, phase: 'season' }, 1);   // a refreshed results screen
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].args.p.rank, 1);
  assert.deepStrictEqual(tracked, [['progress', 'journey', 'normal|season|1']]);
});
test('signed out, nothing reaches the server; a malformed route is never sent', () => {
  calls.length = 0;
  signedIn = false; G.journeyAwardAchievements(j); signedIn = true;
  G.journeyAwardAchievements({ ...j, path: j.path.slice(1) });
  assert.deepStrictEqual(calls, []);
});
test('the admin funnel adds up per level', () => {
  const rows = [
    { mode: 'journey', event: 'open', detail: '—', events: 9, people: 7 },
    { mode: 'journey', event: 'progress', detail: 'normal|start', events: 6, people: 5 },
    { mode: 'journey', event: 'progress', detail: 'hard|start', events: 2, people: 2 },
    { mode: 'journey', event: 'progress', detail: 'normal|break', events: 3, people: 3 },
    { mode: 'journey', event: 'finish', detail: 'normal|chain', events: 1, people: 1 },
    { mode: 'journey', event: 'finish', detail: 'normal|break', events: 3, people: 3 },
    { mode: 'journey', event: 'progress', detail: 'normal|season|1', events: 1, people: 1 },
    { mode: 'journey', event: 'progress', detail: 'normal|season|4', events: 2, people: 2 },
    { mode: 'journey', event: 'share', detail: 'hard', events: 1, people: 1 },
    { mode: 'derby', event: 'progress', detail: 'normal|start', events: 50, people: 50 },
  ];
  const s = G.journeyAdminSummary(rows);
  assert.strictEqual(s.hub, 7);
  assert.deepStrictEqual(s.levels.map(l => l.level), ['normal', 'hard']);
  const nl = s.levels[0];
  assert.deepStrictEqual([nl.startP, nl.startE, nl.breakE, nl.finishE, nl.chainE, nl.seasonE, nl.titleE, nl.rankSum],
    [5, 6, 3, 4, 1, 3, 1, 9]);
  assert.strictEqual(s.totals.startE, 8); assert.strictEqual(s.totals.shareE, 1);
});
test('admin rows name the squads and count seasons and titles per player', () => {
  assert.strictEqual(G.jaSquadName('beitar-jerusalem-1999'), 'בית"ר ירושלים 1999/00');
  const { rows, users } = G.journeyAdminRunsRows([
    { created_at: '2026-10-13T10:00:00Z', username: 'a', level: 'hard', route: [{ squadId: 'beitar-jerusalem-2009', name: 'x' }], rank: 1 },
    { created_at: '2026-10-13T11:00:00Z', username: 'a', level: 'normal', route: [], rank: null },
  ]);
  assert.strictEqual(rows[0].level, 'קשה'); assert.strictEqual(rows[1].rank, null);
  assert.deepStrictEqual(users, [{ user: 'a', runs: 2, seasons: 1, titles: 1 }]);
});
console.log('\n' + n + ' passed');
