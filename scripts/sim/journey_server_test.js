// Run: node scripts/sim/journey_server_test.js. 1.61: the journey's real achievements,
// what it sends to submit_journey_run, its season event, and the admin funnel.
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const memory = new Map();
const storage = { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, String(v)) };
const calls = [], tracked = [];
let reply = { data: { achievements: [] } };
const server = { rpc(name, args) { calls.push({ name, args }); return Promise.resolve(reply); } };
let signedIn = true, userId = 'u';
const G = new Function('document', 'window', 'localStorage', '_supabase', 'getCurrentUser', 'track',
  ['js/data.js', 'js/sim-engine.js', 'js/game.js', 'js/journey-engine.js', 'js/journey.js', 'js/journey-achievements.js', 'js/journey-admin.js'].map(read).join('\n') +
  ';return {state,SQUADS,formationSlots,slotFitPos,journeyEngine,journeyAwardAchievements,JOURNEY_ACHIEVEMENTS,journeyAdminSummary,journeyAdminRunsRows,jaSquadName,journeyPendingLoad,journeyFlushPending};')(
    { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } }, {}, storage, server,
    () => (signedIn ? { id: userId } : null), (e, m, d) => tracked.push([e, m, d]));
let n = 0;
const SEASON = { wins: 25, draws: 6, losses: 5, gf: 70, ga: 25 };
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
  G.journeyAwardAchievements({ ...j, phase: 'season' }, 1, SEASON);
  G.journeyAwardAchievements({ ...j, phase: 'season' }, 1, SEASON);   // a refreshed results screen
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].args.p.rank, 1);
  assert.deepStrictEqual(tracked, [['progress', 'journey', 'normal|season|1']]);
});
test('the season travels with its rank; a rank without a readable season is not sent', () => {
  calls.length = 0; memory.delete('36-0-journey-pending');
  G.journeyAwardAchievements({ ...j, id: 'season-run-1', phase: 'season' }, 2, SEASON);
  assert.deepStrictEqual(calls[0].args.p.season, SEASON); assert.strictEqual(calls[0].args.p.rank, 2);
  calls.length = 0;
  G.journeyAwardAchievements({ ...j, id: 'season-run-2', phase: 'season' }, 2, { ...SEASON, wins: 2.5 });
  assert.strictEqual(calls[0].args.p.rank, undefined); assert.strictEqual(calls[0].args.p.season, undefined);
  memory.delete('36-0-journey-pending');
});
test('signed out, nothing reaches the server; a malformed route is never sent or queued', () => {
  memory.delete('36-0-journey-pending'); calls.length = 0;
  signedIn = false; G.journeyAwardAchievements(j); signedIn = true;
  G.journeyAwardAchievements({ ...j, id: 'other-run-1', path: j.path.slice(1) });
  assert.deepStrictEqual(calls, []);
  assert.deepStrictEqual(Object.keys(G.journeyPendingLoad()), [j.id]);
});
test('the server keeps the squad list the game has', () => {
  const sql = read('supabase/migrations/20261013000002_journey_runs.sql');
  const block = sql.slice(sql.indexOf('-- BEGIN journey_squads'), sql.indexOf('-- END journey_squads'));
  const ids = [...block.matchAll(/\('([^']+)'\)/g)].map(m => m[1]).sort();
  assert.deepStrictEqual(ids, G.SQUADS.map(x => x.id).sort(), 'run node scripts/build_journey_squads_sql.js');
});
test('a malformed detail never counts as a season, a title or a finish', () => {
  const s = G.journeyAdminSummary([
    { mode: 'journey', event: 'progress', detail: 'normal|season|1oops', events: 5, people: 5 },
    { mode: 'journey', event: 'progress', detail: 'normal|season', events: 5, people: 5 },
    { mode: 'journey', event: 'progress', detail: 'normal|season|0', events: 5, people: 5 },
    { mode: 'journey', event: 'finish', detail: 'normal|unexpected', events: 5, people: 5 },
    { mode: 'journey', event: 'progress', detail: 'normal|season|12', events: 1, people: 1 },
    { mode: 'journey', event: 'progress', detail: 'normal|season|1|unexpected', events: 5, people: 5 },
    { mode: 'journey', event: 'finish', detail: 'normal|chain|unexpected', events: 5, people: 5 },
    { mode: 'journey', event: 'progress', detail: 'normal|start|x', events: 5, people: 5 },
    { mode: 'journey', event: 'share', detail: 'normal|png', events: 5, people: 5 },
    { mode: 'journey', event: 'progress', detail: 'god|start', events: 5, people: 5 },
  ]);
  const nl = s.levels[0];
  assert.deepStrictEqual([nl.seasonE, nl.titleE, nl.rankSum, nl.finishE, nl.chainE, nl.startE, nl.shareE], [1, 0, 12, 0, 0, 0, 0]);
  assert.deepStrictEqual(s.levels.map(l => l.level), ['normal']);
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
// ── the queue: a refresh before sign-in, a route finished signed out (async) ──
(async () => {
  const flush = () => new Promise(r => setTimeout(r, 0));
  async function atest(name, fn) { await fn(); n++; console.log('PASS  ' + name); }
  await atest('after sign-in the queued route is sent, and an answer clears it', async () => {
    calls.length = 0; reply = { data: { achievements: ['jx_finish'] } };
    G.journeyFlushPending(); await flush();
    assert.strictEqual(calls.length, 1); assert.strictEqual(calls[0].args.p.run_id, j.id);
    assert.deepStrictEqual(G.journeyPendingLoad(), {});
  });
  await atest('no profile yet, or a network error, keeps it queued for the next sign-in', async () => {
    reply = { data: { error: 'no profile' } };
    G.journeyAwardAchievements(j); await flush();
    assert.ok(G.journeyPendingLoad()[j.id]);
    reply = { data: null, error: { message: 'offline' } };
    G.journeyFlushPending(); await flush();
    assert.ok(G.journeyPendingLoad()[j.id]);
  });
  await atest('a route the server refuses for good leaves the queue', async () => {
    reply = { data: { error: 'bad route' } };
    G.journeyFlushPending(); await flush();
    assert.deepStrictEqual(G.journeyPendingLoad(), {});
  });
  await atest('a queued season keeps its rank, and a later route call does not drop it', async () => {
    signedIn = false;
    G.journeyAwardAchievements({ ...j, phase: 'season' }, 3, SEASON);
    G.journeyAwardAchievements(j);            // the summary restored afterwards
    assert.strictEqual(G.journeyPendingLoad()[j.id].p.rank, 3);
    signedIn = true; calls.length = 0; reply = { data: { achievements: [] } };
    G.journeyFlushPending(); await flush();
    assert.strictEqual(calls[0].args.p.rank, 3);
  });
  await atest("a route finished in one account is never sent for another (shared device)", async () => {
    memory.delete('36-0-journey-pending'); calls.length = 0;
    reply = { data: null, error: { message: 'offline' } };
    userId = 'user-a'; G.journeyAwardAchievements({ ...j, id: 'owned-by-a' }); await flush();
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(G.journeyPendingLoad()['owned-by-a'].owner, 'user-a');
    calls.length = 0; reply = { data: { achievements: [] } };
    userId = 'user-b'; G.journeyFlushPending(); await flush();
    G.journeyAwardAchievements({ ...j, id: 'owned-by-a', phase: 'season' }, 1, SEASON); await flush();
    assert.deepStrictEqual(calls, [], 'B must not send A\'s route');
    assert.strictEqual(G.journeyPendingLoad()['owned-by-a'].owner, 'user-a');
    userId = 'user-a'; G.journeyFlushPending(); await flush();
    assert.strictEqual(calls.length, 1); assert.deepStrictEqual(G.journeyPendingLoad(), {});
  });
  await atest('a route finished signed out is adopted by the account that signs in', async () => {
    calls.length = 0; signedIn = false;
    G.journeyAwardAchievements({ ...j, id: 'anon-run-1' });
    assert.strictEqual(G.journeyPendingLoad()['anon-run-1'].owner, null);
    signedIn = true; userId = 'user-c'; G.journeyFlushPending(); await flush();
    assert.strictEqual(calls.length, 1); assert.deepStrictEqual(G.journeyPendingLoad(), {});
    userId = 'u';
  });
  await atest('a full localStorage still sends the route', async () => {
    memory.delete('36-0-journey-pending'); calls.length = 0;
    const setItem = storage.setItem;
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    try { G.journeyAwardAchievements({ ...j, id: 'quota-run-1' }); await flush(); }
    finally { storage.setItem = setItem; }
    assert.strictEqual(calls.length, 1); assert.strictEqual(calls[0].args.p.run_id, 'quota-run-1');
  });
  await atest('sign-in flushes every queued route belonging to this account', async () => {
    memory.delete('36-0-journey-pending'); calls.length = 0;
    const runs = {};
    for (let i = 0; i < 3; i++) {
      const id = 'flush-run-' + i;
      runs[id] = { owner: userId, at: i + 1, p: { run_id: id } };
    }
    storage.setItem('36-0-journey-pending', JSON.stringify({ v: 1, runs }));
    reply = { data: { achievements: [] } };
    G.journeyFlushPending(); await flush();
    assert.deepStrictEqual(calls.map(c => c.args.p.run_id), Object.keys(runs));
    assert.deepStrictEqual(G.journeyPendingLoad(), {});
  });
  await atest('another account at the front cannot block this account later in the queue', async () => {
    memory.delete('36-0-journey-pending'); calls.length = 0;
    const runs = {
      'foreign-first': { owner: 'another-user', at: 1, p: { run_id: 'foreign-first' } },
      'mine-second': { owner: userId, at: 2, p: { run_id: 'mine-second' } },
    };
    storage.setItem('36-0-journey-pending', JSON.stringify({ v: 1, runs }));
    G.journeyFlushPending(); await flush();
    assert.deepStrictEqual(calls.map(c => c.args.p.run_id), ['mine-second']);
    assert.deepStrictEqual(Object.keys(G.journeyPendingLoad()), ['foreign-first']);
  });
  await atest('the queue keeps only the newest ten routes', async () => {
    signedIn = false; memory.delete('36-0-journey-pending');
    for (let i = 0; i < 14; i++) G.journeyAwardAchievements({ ...j, id: 'queued-run-' + i });
    const ids = Object.keys(G.journeyPendingLoad());
    assert.strictEqual(ids.length, 10); assert.ok(ids.includes('queued-run-13')); assert.ok(!ids.includes('queued-run-0'));
    signedIn = true;
  });
  console.log('\n' + n + ' passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
