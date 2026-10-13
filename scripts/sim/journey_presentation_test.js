// Run: node scripts/sim/journey_presentation_test.js. No browser or network.
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0;
async function test(name, fn) {
  try { await fn(); n++; console.log('PASS  ' + name); }
  catch (e) { process.exitCode = 1; console.error('FAIL  ' + name + '\n' + e.message); }
}

// Expose the private renderer in the test harness without changing its source file.
const cupSource = read('js/cup.js').replace('})(window);', 'global.testCupMine = cupMine; })(window);');
function cupHeader(careerName, club, story = false) {
  const window = {};
  new Function('window', 'document', 'state', 'crRun', 'clubNameRaw', 'clubHas', 'clubStory',
    'clubShown', 'clubCrestSVG', 'siteTextOr',
    read('js/texts.js') + '\n' + cupSource)(window, { addEventListener() {} },
      { career: careerName ? {} : null }, () => ({ clubName: careerName }),
      () => club ? club.name : '', () => !!club && !story, () => story ? club : null,
      () => club, c => '<svg data-club="' + c.name + '"></svg>', (key, fallback) => fallback);
  return window.testCupMine();
}
async function board(reply) {
  const table = { innerHTML: '', querySelectorAll() { return []; } };
  const load = new Function('document', '_supabase', read('js/leaderboard.js') +
    ';lbTab = "journey"; return loadJourneyBoardTab;')({}, { rpc: async () => reply });
  await load(table);
  return table.innerHTML;
}
(async () => {
  await test('a different career name never receives the personal club crest', () => {
    const html = cupHeader('Career A', { name: 'Personal B' });
    assert.ok(html.includes('Career A')); assert.ok(!html.includes('<svg'));
  });
  await test('matching career and club names keep the crest', () => {
    assert.ok(cupHeader('Personal B', { name: 'Personal B' }).includes('<svg'));
  });
  await test('the personal club and a story club still show their own crest', () => {
    assert.ok(cupHeader(null, { name: 'Personal B' }).includes('<svg'));
    assert.ok(cupHeader(null, { name: 'Story C' }, true).includes('<svg'));
  });
  await test('without a club the cup header retains the plain fallback', () => {
    assert.ok(!cupHeader(null, null).includes('<svg'));
  });
  await test('a failed board request is not presented as an empty season history', async () => {
    const html = await board({ data: null, error: { message: '<unsafe server message>' } });
    assert.ok(html.includes('role="alert"')); assert.ok(!html.includes('<unsafe server message>'));
  });
  await test('a successful empty board retains its first-season invitation', async () => {
    assert.ok(!(await board({ data: [], error: null })).includes('role="alert"'));
  });
  // The cup and Europe ask one helper (js/texts.js), so a career wears the same
  // crest — or none — in both. Test the helper, and that both callers use it.
  const crestFor = (careerName, club, story = false) => new Function('state', 'crRun', 'clubHas', 'clubStory',
    'clubShown', 'clubCrestSVG', read('js/texts.js') + ';return myTeamCrestClub();')(
      { career: careerName ? {} : null }, () => ({ clubName: careerName }), () => !!club && !story,
      () => story ? club : null, () => club, () => '<svg></svg>');
  await test('myTeamCrestClub: a different career name gets no crest, the same name keeps it', () => {
    assert.strictEqual(crestFor('Career A', { name: 'Personal B' }), null);
    assert.strictEqual(crestFor('Personal B', { name: 'Personal B' }).name, 'Personal B');
    assert.strictEqual(crestFor(null, { name: 'Personal B' }).name, 'Personal B');
    assert.strictEqual(crestFor(null, { name: 'Story C' }, true).name, 'Story C');
    assert.strictEqual(crestFor(null, null), null);
  });
  await test('Europe and the cup both take their crest from myTeamCrestClub', () => {
    const eu = read('js/europe-screens.js'), cup = read('js/cup.js');
    const euBody = eu.slice(eu.indexOf('function euMyCrest'), eu.indexOf('\n}', eu.indexOf('function euMyCrest')));
    const cupBody = cup.slice(cup.indexOf('function cupMine'), cup.indexOf('\n  }', cup.indexOf('function cupMine')));
    assert.ok(euBody.includes('myTeamCrestClub()'), 'euMyCrest');
    assert.ok(cupBody.includes('myTeamCrestClub()'), 'cupMine');
    assert.ok(!euBody.includes('clubShown()') && !cupBody.includes('clubShown()'), 'no second copy of the rule');
  });
  console.log('\n' + n + ' passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
