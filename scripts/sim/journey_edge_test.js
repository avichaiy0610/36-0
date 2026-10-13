// Run: node scripts/sim/journey_edge_test.js. Exercise the actual run controller.
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const memory = new Map();
const storage = { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, String(v)) };
const G = new Function('document', 'window', 'localStorage',
  ['js/data.js', 'js/sim-engine.js', 'js/game.js', 'js/journey-engine.js', 'js/journey.js'].map(read).join('\n') +
  ';journeyStartRound = () => {}; return {state,SQUADS,formationSlots,journeyEngine,journeyOptions,journeyAllowedSlots,' +
  'journeyRecordPick,journeyPrepareEscape,journeyEnter,journeyValidSave,saveDraftState,journeyDestinations,playerFitsSlot};')({ addEventListener() {} }, {}, storage);
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
// ── a normal-level run: three doors drawn once, a club only once ──────────────
const normalStart = G.journeyEngine({ level: 'normal' }).starts(slots.map(s => s.role || s.pos), null, 1)[0];
Object.assign(G.state, { slots, picks: slots.map(() => null), currentRound: 0,
  currentSquad: normalStart, usedPlayerKeys: new Set(), usedSquadIds: new Set([normalStart.id]),
  journey: { v: 1, id: 'edge-normal', level: 'normal', phase: 'pick', path: [], visited: [normalStart.id],
    broken: false, arrival: 'start', escapeIds: null, destIds: null } });
take();
let doors;
test('a normal draw shows at most three doors and a refresh deals the same ones', () => {
  doors = G.journeyDestinations().map(s => s.id);
  assert.ok(doors.length >= 1 && doors.length <= 3);
  assert.deepStrictEqual(G.journeyDestinations().map(s => s.id), doors);
  const d = JSON.parse(storage.getItem('36-0-draft'));
  assert.deepStrictEqual(d.journey.destIds, doors);
  const picks = d.picks.map(p => { if (!p) return null; const squad = G.journeyEngine().squad(p.squadId);
    return { squad, player: squad.players.find(x => x.name === p.name) }; });
  assert.ok(G.journeyValidSave(d, picks));
  d.journey.destIds = [G.SQUADS.find(s => !doors.includes(s.id) && !d.journey.visited.includes(s.id) &&
    !G.journeyEngine().career(d.journey.path[0].name).some(x => x.id === s.id)).id];
  assert.strictEqual(G.journeyValidSave(d, picks), false, 'a door outside his career is forged');
});
test('a squad outside the draw cannot be entered, and the drawn one can', () => {
  const outside = G.journeyEngine().destinations(G.state.journey.path[0].name, {
    currentId: G.state.currentSquad.id, remaining: G.state.slots.filter((_, i) => !G.state.picks[i]).map(s => s.role || s.pos),
    usedNames: [...G.state.usedPlayerKeys], visited: G.state.journey.visited, breakLeft: 1 }).find(s => !doors.includes(s.id));
  if (outside) assert.strictEqual(G.journeyEnter(outside.id, false), false);
  assert.strictEqual(G.journeyEnter(doors[0], false), true);
  assert.strictEqual(G.state.journey.destIds, null);
  const clubs = G.state.journey.visited.map(id => G.journeyEngine().squad(id).teamId);
  assert.strictEqual(new Set(clubs).size, clubs.length);
});
// ── club limits on a real chain (Codex's review): בית"ר 1999 → גנון → בית"ר 2000 → קורנפיין → בית"ר 2005 → אלברמן
function beitarSave(level, steps) {
  const chain = [['beitar-jerusalem-1999', 'קובי גנון'], ['beitar-jerusalem-2000', 'איציק קורנפיין'], ['beitar-jerusalem-2005', 'גל אלברמן']].slice(0, steps);
  const picks = slots.map(() => null), path = [];
  chain.forEach(([id, name], i) => {
    const squad = G.journeyEngine().squad(id), player = squad && squad.players.find(p => p.name === name);
    assert.ok(player, id + ' / ' + name);
    const idx = slots.findIndex((s, k) => !picks[k] && G.playerFitsSlot(player, s.role || s.pos));
    picks[idx] = { squad, player };
    path.push({ squadId: id, name, slotId: slots[idx].id, arrival: i ? 'career' : 'start' });
  });
  const journey = { v: 1, id: 'beitar', phase: 'travel', path, visited: chain.map(c => c[0]), broken: false,
    arrival: 'career', escapeIds: null, destIds: null };
  if (level) journey.level = level;
  Object.assign(G.state, { formationId: '4-3-3', tactic: 'bal', slots, picks, currentRound: path.length,
    currentSquad: G.journeyEngine().squad(chain[chain.length - 1][0]), journey,
    usedPlayerKeys: new Set(path.map(p => p.name)), usedSquadIds: new Set(journey.visited) });
  G.saveDraftState();
  return { d: JSON.parse(storage.getItem('36-0-draft')), picks };
}
test('a pre-level save keeps its unlimited route; easy allows a club twice; normal once', () => {
  let s = beitarSave(null, 3); assert.strictEqual(G.journeyValidSave(s.d, s.picks), true, 'legacy, three Beitar');
  s = beitarSave('easy', 3);   assert.strictEqual(G.journeyValidSave(s.d, s.picks), false, 'easy, three Beitar');
  s = beitarSave('easy', 2);   assert.strictEqual(G.journeyValidSave(s.d, s.picks), true, 'easy, two Beitar');
  s = beitarSave('normal', 2); assert.strictEqual(G.journeyValidSave(s.d, s.picks), false, 'normal, two Beitar');
});
test('a stored door or escape into a club already used is rejected and cannot be entered', () => {
  const s = beitarSave('normal', 1);
  s.d.journey.destIds = ['beitar-jerusalem-2000'];
  assert.strictEqual(G.journeyValidSave(s.d, s.picks), false, 'forged door');
  s.d.journey.destIds = null; s.d.journey.escapeIds = ['beitar-jerusalem-2000'];
  assert.strictEqual(G.journeyValidSave(s.d, s.picks), false, 'forged escape');
  G.state.journey.destIds = ['beitar-jerusalem-2000'];
  assert.strictEqual(G.journeyEnter('beitar-jerusalem-2000', false), false);
  assert.strictEqual(G.state.journey.visited.length, 1);
});
console.log('\n' + n + ' passed');
