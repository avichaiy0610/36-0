// Run: node scripts/sim/journey_test.js. Graph rules, not DOM snapshots.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..', '..');
const engineFile = path.join(root, 'js/journey-engine.js');
assert.ok(fs.existsSync(engineFile), 'journey engine must exist');
const factory = new Function(fs.readFileSync(engineFile, 'utf8') + ';return JourneyEngine;')();
const fit = (p, pos) => p.position === pos || (p.altPos || []).includes(pos);
const sq = (id, players) => ({ id, teamId: id, season: '2000/01', players });
const player = (name, position) => ({ name, position, ovr: 80 });
let n = 0;
function test(name, fn) { fn(); n++; console.log('PASS  ' + name); }
const a = player('bridge', 'ST'), b = player('keeper', 'GK');
const graph = factory.create([sq('a', [a]), sq('b', [a, b]), sq('c', [b])], fit);
const context = { currentId: 'a', remaining: ['ST', 'GK'], usedNames: [], visited: ['a'], breakLeft: 0 };
test('a career bridge opens only squads that contain that player', () => {
  assert.deepStrictEqual(graph.destinations('bridge', { ...context, remaining: ['GK'], usedNames: ['bridge'] }).map(s => s.id), ['b']);
});
test('a pick is permitted only in slots with a complete continuation', () => {
  assert.deepStrictEqual(graph.choices(context).map(p => ({ name: p.name, slots: p.slots })), [{ name: 'bridge', slots: [0] }]);
});
test('the last man needs no outgoing career', () => {
  assert.strictEqual(graph.choices({ ...context, currentId: 'c', visited: ['c'], remaining: ['GK'] }).length, 1);
});
test('without an escape a one-season player cannot strand the draft', () => {
  const g = factory.create([sq('a', [player('only', 'ST')]), sq('b', [b])], fit);
  assert.strictEqual(g.choices(context).length, 0);
  assert.strictEqual(g.choices({ ...context, breakLeft: 1 }).length, 1);
  assert.deepStrictEqual(g.escapes({ ...context, remaining: ['GK'], usedNames: ['only'], breakLeft: 0 }), []);
});
test('neither a visited squad nor an already picked player can recur', () => {
  assert.strictEqual(graph.choices({ ...context, usedNames: ['bridge'] }).length, 0);
  assert.deepStrictEqual(graph.destinations('bridge', { ...context, remaining: ['GK'], usedNames: ['bridge'], visited: ['a', 'b'] }), []);
});
test('an escape must itself allow the remaining XI with no second escape', () => {
  const g = factory.create([sq('a', [player('one', 'ST')]), sq('b', [player('two', 'CM')]), sq('c', [b])], fit);
  assert.deepStrictEqual(g.escapes({ ...context, remaining: ['CM', 'GK'], breakLeft: 1 }), []);
});
test('alternative positions are validated separately', () => {
  const g = factory.create([sq('a', [{ ...a, altPos: ['GK'] }]), sq('b', [a, b])], fit);
  assert.deepStrictEqual(g.choices(context)[0].slots, [0]);
});
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const memory = new Map();
const storage = { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, String(v)) };
const D = new Function('document', 'window', 'localStorage',
  ['js/data.js', 'js/sim-engine.js', 'js/game.js', 'js/journey-engine.js', 'js/journey.js'].map(read).join('\n') +
  '\nreturn { SQUADS, FORMATIONS, formationSlots, playerFitsSlot, slotFitPos, state, journeyValidSave, saveDraftState, trackDraftMode };')(
    { addEventListener() {} }, {}, storage);
const real = factory.create(D.SQUADS, D.playerFitsSlot);
function fixture() {
  const slots = D.formationSlots('4-3-3', 'bal');
  const squad = D.SQUADS.find(s => s.players.some(p => p.position === 'GK'));
  const p = squad.players.find(p => p.position === 'GK');
  const i = slots.findIndex(s => s.pos === 'GK');
  const picks = slots.map(() => null); picks[i] = { player: p, squad };
  const d = { formationId: '4-3-3', tactic: 'bal', currentRound: 1, currentSquadId: squad.id,
    journey: { v: 1, phase: 'travel', broken: false, arrival: 'start', visited: [squad.id], escapeIds: null,
      path: [{ squadId: squad.id, name: p.name, slotId: slots[i].id, arrival: 'start' }] } };
  return { slots, picks, d };
}
test('route and draft save round-trip without changing picks or resource', () => {
  const { slots, picks, d } = fixture();
  Object.assign(D.state, { slots, picks, currentRound: 1, currentSquad: picks.find(Boolean).squad,
    formationId: '4-3-3', journey: d.journey, usedPlayerKeys: new Set([d.journey.path[0].name]), usedSquadIds: new Set(d.journey.visited) });
  D.saveDraftState();
  const saved = JSON.parse(storage.getItem('36-0-draft'));
  assert.deepStrictEqual(saved.journey, d.journey);
  assert.ok(D.journeyValidSave(saved, picks));
  assert.strictEqual(D.trackDraftMode(), null);
});
test('a pre-journey draft is still accepted', () => {
  assert.ok(D.journeyValidSave({ v: 1 }, []));
});
test('malformed escape data is rejected without crashing the resume screen', () => {
  const { d, picks } = fixture(); d.journey.escapeIds = 'not-an-array';
  assert.strictEqual(D.journeyValidSave(d, picks), false);
});
test('a travel save cannot already contain an extra unentered destination', () => {
  const { d, picks } = fixture();
  const next = real.career(d.journey.path[0].name).find(s => s.id !== d.currentSquadId);
  assert.ok(next); d.journey.visited.push(next.id); d.journey.arrival = 'career';
  assert.strictEqual(D.journeyValidSave(d, picks), false);
});
test('a saved choice must match the slot it was actually placed in', () => {
  const { d, picks } = fixture(); d.journey.path[0].slotId = 'not-a-slot';
  assert.strictEqual(D.journeyValidSave(d, picks), false);
});
test('historical facts exactly match the original final league tables', () => {
  const tables = new Function(read('js/league_tables.js') + ';return LEAGUE_TABLES;')();
  const facts = new Function(read('js/journey-facts.js') + ';return JOURNEY_FACTS;')();
  D.SQUADS.forEach(s => {
    const row = (tables[s.season] || []).find(r => r.teamId === s.teamId);
    if (row) assert.deepStrictEqual(facts[s.id], { pos: row.pos, pts: row.pts });
    else assert.strictEqual(facts[s.id], undefined);
  });
});
if (!process.argv.includes('--quick')) test('real data: every formation completes legal, non-repeating journeys', () => {
  Object.keys(D.FORMATIONS).forEach((formation, f) => {
    for (let r = 0; r < 5; r++) {
      const slots = D.formationSlots(formation, 'bal').map(D.slotFitPos);
      const start = real.starts(slots);
      if (r === 0) console.log('  routes: ' + formation + ' (' + start.length + ' starts)');
      assert.ok(start.length);
      const c = { currentId: start[(r * 31 + f) % start.length].id, remaining: slots, usedNames: [], visited: [], breakLeft: 1 };
      c.visited.push(c.currentId);
      while (c.remaining.length) {
        const choices = real.choices(c);
        assert.ok(choices.length, 'no dead end: ' + formation + '/' + c.remaining.length);
        const choice = choices[(r + c.usedNames.length) % choices.length];
        c.usedNames.push(choice.name);
        c.remaining.splice(choice.slots[0], 1);
        if (!c.remaining.length) break;
        let next = real.destinations(choice.name, c);
        if (!next.length) { next = real.escapes(c); c.breakLeft--; }
        assert.ok(next.length);
        c.currentId = next[(r * 7) % next.length].id;
        assert.ok(!c.visited.includes(c.currentId));
        c.visited.push(c.currentId);
      }
      assert.strictEqual(new Set(c.usedNames).size, 11);
      assert.ok(c.breakLeft >= 0);
    }
  });
});
console.log('\n' + n + ' passed');
