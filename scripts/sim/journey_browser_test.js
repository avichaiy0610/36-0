// Execute this function with the connected Playwright browser_run_code tool.
// All production requests are blocked; only local files and public asset CDNs load.
async (page) => {
  const errors = [], stages = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', dialog => dialog.accept());
  await page.route('**/*', route => {
    const host = new URL(route.request().url()).hostname;
    return host === '127.0.0.1' || /^(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(host)
      ? route.continue() : route.abort();
  });
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const value = () => page.evaluate(() => JSON.stringify(state.journey));
  await page.goto('http://127.0.0.1:8917');
  await page.evaluate(() => { localStorage.removeItem(DRAFT_SAVE_KEY); startGame(); });
  await page.locator('#setup-journey-card').click();
  await page.screenshot({ path: 'C:/Users/avich/Desktop/Claude/Project Two/36-0/.playwright-mcp/journey-hub-desktop.png', fullPage: true });
  await page.locator('#jr-start').click();
  await page.locator('#screen-draft.active').waitFor();
  let before = await value();
  await page.reload();
  await page.locator('#screen-draft.active').waitFor();
  check(before === await value(), 'fresh draft changed on reload');
  check(await page.locator('#pitch-slots .slot-token').count() === 11, 'restored pitch has no tokens');
  stages.push('fresh draft resumes with its pitch');
  let maxPickMs = 0;
  for (let round = 0; round < 11; round++) {
    const start = Date.now();
    await page.locator('#players-list .player-card:not(.card-unavailable)').first().click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(150);
    const selected = await page.evaluate(() => state.selectedPlayer ? compatibleEmptySlots(state.selectedPlayer)[0] : null);
    if (selected !== null) await page.locator('#token-pitch-slots-' + selected).click();
    await page.locator('#screen-journey.active').waitFor();
    maxPickMs = Math.max(maxPickMs, Date.now() - start);
    if (round === 10) break;
    if (round === 2) {
      before = await value();
      await page.reload();
      await page.locator('#screen-journey.active').waitFor();
      check(before === await value(), 'travel changed on reload');
      stages.push('travel resumes exactly');
    }
    const broken = await page.evaluate(() => state.journey.broken);
    if (round === 3 && !broken) {
      await page.locator('#jr-escape').click();
      const ids = await page.evaluate(() => JSON.stringify(state.journey.escapeIds));
      await page.locator('#jr-cancel-escape').click();
      check(!await page.evaluate(() => state.journey.broken), 'cancel spent the escape');
      await page.reload();
      await page.locator('#screen-journey.active').waitFor();
      await page.locator('#jr-escape').click();
      check(ids === await page.evaluate(() => JSON.stringify(state.journey.escapeIds)), 'escape rerolled on refresh');
      await page.locator('[data-jr-break="1"]').first().click();
      stages.push('escape is stable on reload and consumed only on entry');
    } else {
      if (await page.locator('[data-jr-dest]').count() === 0) await page.locator('#jr-escape').click();
      await page.locator('[data-jr-dest]').first().click();
    }
    await page.locator('#screen-draft.active').waitFor();
    check(await page.locator('#pitch-slots .slot-token').count() === 11, 'pitch disappeared after travel');
  }
  const finish = await page.evaluate(() => ({ count: state.journey.path.length, broken: state.journey.broken,
    squads: new Set(state.journey.path.map(p => p.squadId)).size, names: new Set(state.journey.path.map(p => p.name)).size,
    valid: journeyValidSave(JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY)), state.picks), ovr: teamOVR(),
    crests: [...document.querySelectorAll('#journey-root img')].every(img => img.complete && img.naturalWidth > 0) }));
  check(finish.count === 11 && finish.squads === 11 && finish.names === 11 && finish.valid, 'invalid full journey');
  stages.push('11 legal picks, distinct names and squads');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#jr-share').click();
  const download = await downloadPromise;
  await download.saveAs('C:/Users/avich/Desktop/Claude/Project Two/36-0/.playwright-mcp/journey-route-export.png');
  stages.push('route PNG download with club crests');
  await page.screenshot({ path: 'C:/Users/avich/Desktop/Claude/Project Two/36-0/.playwright-mcp/journey-complete.png', fullPage: true });
  await page.locator('#jr-season').click();
  await page.locator('#btn-simulate').click();
  await page.locator('#screen-results.active').waitFor();
  for (let i = 0; i < 30; i++) {
    const cup = page.locator('#cup-go:visible');
    const skip = page.locator('#btn-skip-matches:visible');
    if (await cup.count()) await cup.click({ timeout: 4000 }).catch(() => {});
    else if (await skip.count()) await skip.click({ timeout: 4000 }).catch(() => {});
    else if (await page.evaluate(() => !!window._lastResult)) break;
    await page.waitForTimeout(100);
  }
  const season = await page.evaluate(() => ({ phase: state.journey.phase, result: !!window._lastResult,
    saved: !!JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY)).season, cup: cupEligible(), january: janEligible(),
    saveHidden: document.querySelector('#save-result-section').style.display === 'none',
    share: generateShareText().includes('מסע ה־11') }));
  check(season.saved && season.result && season.cup && !season.january && season.saveHidden && season.share, 'season integration failed: ' + JSON.stringify(season));
  stages.push('season, cup and share use the existing engine; ordinary board stays hidden');
  const savedSeason = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY)).season));
  await page.reload();
  await page.locator('#screen-results.active').waitFor();
  check(savedSeason === await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY)).season)), 'season changed on restore');
  stages.push('finished season replays the same result');
  const placement = page.locator('#placement-close:visible');
  if (await placement.count()) await placement.click({ timeout: 1000 }).catch(() => {});
  await page.evaluate(() => startGame());
  await page.locator('#btn-start-draft').click();
  await page.locator('#screen-draft.active').waitFor();
  check(await page.evaluate(() => state.journey === null && !document.querySelector('#journey-draft-route').offsetHeight), 'journey leaked into ordinary draft');
  stages.push('ordinary draft remains separate');
  check(errors.length === 0, 'runtime errors: ' + errors.join('; '));
  return { stages, finish, season, maxPickMs, runtimeErrors: errors };
}
