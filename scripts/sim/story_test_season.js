// Season-level tests for מצב סיפור. Run through story_test.js --season.
const assert = require('assert');
module.exports = function (G, t) {
  const ch = G.storyChapter('b7-2015');
  const setUp = (run) => {
    Object.assign(G.state, { story: { chapterId: ch.id }, peakMode: false, classic: false,
      coach: null, oppSeason: 2015, leagueFormat: 'authentic' });
    G.storyApplyXI(run);
  };

  t('storyApplyXI puts eleven on the pitch', () => {
    const run = G.storyNewRun(ch, 7);
    setUp(run);
    assert.strictEqual(G.state.picks.filter(Boolean).length, 11);
    assert.ok(G.teamOVR() >= 80);
  });
  t('storyXiOvr does not disturb state', () => {
    const run = G.storyNewRun(ch, 7);
    setUp(run);
    const keep = JSON.stringify(G.state.picks.map(p => p.player.name));
    run.formationId = '4-4-2';
    G.storyXiOvr(run);
    assert.strictEqual(JSON.stringify(G.state.picks.map(p => p.player.name)), keep);
  });
  t('merge adds halves by name', () => {
    const m = G.storyMergeStats([{ name: 'a', goals: 2, assists: 1, cs: 0 }],
      [{ name: 'a', goals: 1, assists: 0, cs: 1 }, { name: 'b', goals: 3, assists: 0, cs: 0 }]);
    assert.deepStrictEqual(m.map(x => [x.name, x.goals, x.assists, x.cs]), [['a', 3, 1, 1], ['b', 3, 0, 0]]);
  });
  t('prepare: a full season, split at the seam, deterministic from the seed', () => {
    const run = G.storyNewRun(ch, 12345);
    setUp(run);
    const sim = G.storySimulateFn(ch, run);
    const a = G.storySeasonPrepare(sim, run, ch);
    setUp(run);
    const b = G.storySeasonPrepare(G.storySimulateFn(ch, run), run, ch);
    assert.ok(a && a.played > 0);
    assert.ok([33, 36].includes(a.stay.matches.length));   // top six plays 36, the lower playoff 33
    assert.deepStrictEqual(a.stay.matches.map(m => m.gf + ':' + m.ga), b.stay.matches.map(m => m.gf + ':' + m.ga));
    assert.ok(a.stay.leagueTable.some(r => r.us && r.name === 'הפועל באר שבע'));
  });
  t('resim after a January signing: identical first half, different second', () => {
    const run = G.storyNewRun(ch, 999);
    setUp(run);
    const pair = G.storySeasonPrepare(G.storySimulateFn(ch, run), run, ch);
    run.phase = 'jan'; run.budget = 100;
    const star = G.storyMarketPool(run, ch).sort((x, y) => y.player.ovr - x.player.ovr)[0];
    assert.strictEqual(G.storyBuy(run, ch, star, 1), null);
    const s = G.storySeasonResim(pair, run, ch);
    const h = pair.played;
    const key = ms => ms.map(m => m.opponent + m.gf + ':' + m.ga);
    assert.deepStrictEqual(key(s.matches.slice(0, h)), key(pair.stay.matches.slice(0, h)));
    assert.notDeepStrictEqual(key(s.matches), key(pair.stay.matches));
    assert.ok(G.state.picks.some(p => p.player.name === star.player.name));
  });
  t('first-half scorers are the same in both futures', () => {
    const run = G.storyNewRun(ch, 4242);
    setUp(run);
    const pair = G.storySeasonPrepare(G.storySimulateFn(ch, run), run, ch);
    const before = JSON.stringify(pair.stay.matches.slice(0, pair.played).map(m => m.scorers));
    run.phase = 'jan'; run.formationId = '4-4-2';
    const s = G.storySeasonResim(pair, run, ch);
    assert.strictEqual(JSON.stringify(s.matches.slice(0, pair.played).map(m => m.scorers)), before);
  });
};
