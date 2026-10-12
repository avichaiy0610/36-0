// Run: node scripts/sim/journey_edge_test.js. Exercise the actual run controller.
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const memory = new Map();
const storage = { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, String(v)) };
const G = new Function('document', 'window', 'localStorage',
  ['js/data.js', 'js/sim-engine.js', 'js/game.js', 'js/journey-engine.js', 'js/journey.js'].map(read).join('\n') +
  ';journeyStartRound = () => {}; return {state,SQUADS,formationSlots,journeyEngine,journeyOptions,journeyAllowedSlots,' +
  'journeyRecordPick,journeyPrepareEscape,journeyEnter,journeyValidSave,saveDraftState};')({ addEventListener() {} }, {}, storage);
let n = 0;
function test(name, fn) { fn(); n++; console.log('PASS  ' + name); }
const slots = G.formationSlots('4-3-3', 'bal');
const first = G.SQUADS[0];
Object.assign(G.state, { formationId: '4-3-3', slots, picks: slots.map(() => null), currentRound: 0,
  currentSquad: first, usedPlayerKeys: new Set(), usedSquadIds: new Set([first.id]), isAnimating: false,
  journey: { v: 1, id: 'edge-run', phase: 'pick', path: [], visited: [first.id], broken: false, arrival: 'start', escapeIds: null } });
function take() {
  const choice = G.journeyOptions()[0]; assert.ok(choice);
  const p = G.state.currentSquad.players.find(p => p.name === choice.name);
  const idx = G.journeyAllowedSlots(p)[0];
  G.state.picks[idx] = { player: p, squad: G.state.currentSquad };
  G.state.usedPlayerKeys.add(p.name); G.state.currentRound++;
  G.journeyRecordPick(idx, p);
  G.saveDraftState();
}
take();
let escapeIds;
test('showing and cancelling an escape keeps its three options and spends nothing', () => {
  escapeIds = G.journeyPrepareEscape().map(s => s.id);
  assert.strictEqual(escapeIds.length, 3);
  assert.strictEqual(G.state.journey.broken, false);
  assert.deepStrictEqual(G.journeyPrepareEscape().map(s => s.id), escapeIds);
});
test('entering one escape consumes the only break', () => {
  assert.strictEqual(G.journeyEnter(escapeIds[0], true), true);
  assert.strictEqual(G.state.journey.broken, true);
  assert.strictEqual(G.state.journey.visited.length, 2);
});
test('double-tapping a break destination does not enter another station', () => {
  const before = JSON.stringify(G.state.journey);
  assert.strictEqual(G.journeyEnter(escapeIds[1], true), false);
  assert.strictEqual(JSON.stringify(G.state.journey), before);
});
take();
test('a second break is rejected in the next travel phase without mutating the run', () => {
  const before = JSON.stringify(G.state.journey);
  assert.deepStrictEqual(G.journeyPrepareEscape(), []);
  assert.strictEqual(G.journeyEnter(escapeIds[1], true), false);
  assert.strictEqual(JSON.stringify(G.state.journey), before);
});
test('saving and reloading cannot replenish the break', () => {
  const d = JSON.parse(storage.getItem('36-0-draft'));
  const picks = d.picks.map(p => { if (!p) return null; const squad = G.journeyEngine().squad(p.squadId);
    return { squad, player: squad.players.find(x => x.name === p.name) }; });
  assert.ok(G.journeyValidSave(d, picks));
  G.state.journey = d.journey;
  assert.deepStrictEqual(G.journeyPrepareEscape(), []);
  assert.strictEqual(G.journeyEnter(escapeIds[2], true), false);
});
test('a save claiming two broken links is rejected', () => {
  const j = G.state.journey;
  const next = G.journeyEngine().destinations(j.path.at(-1).name, {
    currentId: G.state.currentSquad.id,
    remaining: G.state.slots.filter((_, i) => !G.state.picks[i]).map(s => s.role || s.pos),
    usedNames: [...G.state.usedPlayerKeys], visited: j.visited, breakLeft: 0,
  })[0];
  assert.ok(next); assert.ok(G.journeyEnter(next.id, false)); take();
  const d = JSON.parse(storage.getItem('36-0-draft'));
  assert.ok(G.journeyValidSave(d, G.state.picks));
  d.journey.path[2].arrival = 'break';
  assert.strictEqual(G.journeyValidSave(d, G.state.picks), false);
});
console.log('\n' + n + ' passed');
