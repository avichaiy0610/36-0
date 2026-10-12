// Regression: a local competition must not submit after leaving its mode.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const memory = new Map();
const localStorage = { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, String(v)) };
const calls = [];
const server = { rpc(name) { calls.push(name); return Promise.resolve({ data: {} }); } };
const windowStub = {};
const G = new Function('document', 'window', 'localStorage', '_supabase', 'getCurrentUser',
  ['js/data.js', 'js/sim-engine.js', 'js/game.js', 'js/journey-engine.js', 'js/journey.js', 'js/cup.js', 'js/europe.js', 'js/europe-super.js'].map(read).join('\n') +
  ';beginDraftWithState = style => { state.journey = style.journey; };' +
  ';return { state, cup: window, euSubmit, euUscSubmit, euSave, euLoad, submitResult, journeyStart };')(
    { addEventListener() {}, getElementById() { return null; } }, windowStub, localStorage, server, () => ({ id: 'test' }));
(async () => {
  memory.set('36-0-draft', JSON.stringify({ journey: { id: 'old', phase: 'season' }, cup: {
    v: 1, rounds: [], champion: { us: true }, out: null, submitted: false,
  } }));
  G.state.journey = null;
  await G.cup.cupSubmit(1);
  assert.deepStrictEqual(calls, [], 'restored journey cup submitted after navigation');
  console.log('PASS  restored journey cup retains local provenance after navigation');

  await G.euSubmit({ sandbox: false, localJourney: true });
  await G.euUscSubmit({ localJourney: true, super: { legs: [{}], won: true } });
  assert.deepStrictEqual(calls, []);
  console.log('PASS  Europe and its super cup remain local after navigation');

  memory.set('36-0-draft', JSON.stringify({ journey: { phase: 'season' }, europe: { v: 2, tier: 'ucl' } }));
  assert.strictEqual(G.euLoad().localJourney, true);
  console.log('PASS  restoring an earlier local campaign recovers its provenance');

  const ordinary = { v: 1, picks: [], marker: 'ordinary draft' };
  memory.set('36-0-draft', JSON.stringify(ordinary));
  G.euSave({ v: 2, localJourney: true, tier: 'ucl' });
  assert.deepStrictEqual(JSON.parse(memory.get('36-0-draft')), ordinary);
  console.log('PASS  stale European save cannot overwrite an ordinary draft');

  memory.set('36-0-draft', JSON.stringify({ journey: { id: 'new', phase: 'season' } }));
  const untouched = memory.get('36-0-draft');
  G.cup.cupRun().submitted = false;
  await G.cup.cupSubmit(1);
  G.euSave({ v: 2, localJourney: true, journeyId: 'old', tier: 'ucl' });
  assert.strictEqual(memory.get('36-0-draft'), untouched);
  console.log('PASS  an old cup or campaign cannot overwrite a new journey');

  windowStub._lastResult = { journey: true };
  assert.strictEqual(await G.submitResult(), false);
  assert.deepStrictEqual(calls, []);
  console.log('PASS  a journey result cannot be submitted after its state flag was cleared');

  windowStub._restoredSeason = { old: true }; windowStub._presetSeason = { old: true };
  G.journeyStart('4-3-3');
  const firstId = G.state.journey.id;
  assert.strictEqual(windowStub._restoredSeason, null);
  assert.strictEqual(windowStub._presetSeason, null);
  G.journeyStart('4-3-3');
  assert.notStrictEqual(G.state.journey.id, firstId);
  console.log('PASS  new journeys clear abandoned presets and have distinct run identities');
  console.log('\n7 passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
