// Re-checks every downloaded crest against TheSportsDB's SOCCER team.
// The fetcher skips files that already exist, so a crest downloaded before the
// sport filter was added can sit there forever — that is how the basketball
// Hapoel Be'er Sheva ended up on the map.
//
//   node scripts/verify_crests.js         report only
//   node scripts/verify_crests.js --fix   redownload the ones that differ
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'crests');
const src = fs.readFileSync(path.join(__dirname, 'fetch_crests.js'), 'utf8');
const QUERY = new Function(src.slice(src.indexOf('const QUERY')).replace(/\nconst sleep[\s\S]*$/, '') + '\n;return QUERY;')();
const TEAMS = new Function(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') + '\n;return TEAMS;')();
const FIX = process.argv.includes('--fix');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const bad = [];
  for (const id of Object.keys(TEAMS)) {
    const dest = path.join(OUT, id + '.png');
    if (!fs.existsSync(dest)) continue;
    const names = QUERY[id] || [TEAMS[id].name];
    let team = null;
    for (const q of names) {
      try {
        const r = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(q)}`);
        const d = await r.json();
        const cands = (d.teams || []).filter(t => /Soccer/i.test(t.strSport || ''));
        team = cands.find(t => /Israel/i.test(t.strCountry || '')) || cands[0];
        if (team) break;
      } catch (e) { /* next spelling */ }
      await sleep(200);
    }
    if (!team) { console.log(`?  ${id.padEnd(22)} no soccer team found`); continue; }
    const url = (team.strBadge || team.strTeamBadge) + '/preview';
    let same = false;
    try {
      const img = await fetch(url);
      const buf = Buffer.from(await img.arrayBuffer());
      same = buf.equals(fs.readFileSync(dest));
      if (!same && FIX) fs.writeFileSync(dest, buf);
    } catch (e) { console.log(`!  ${id} download failed: ${e.message}`); continue; }
    console.log(`${same ? 'OK' : (FIX ? 'FIXED' : 'DIFF')}  ${id.padEnd(22)} ${team.strTeam}`);
    if (!same) bad.push(id);
    await sleep(200);
  }
  console.log(`\n${bad.length ? (FIX ? 'redownloaded: ' : 'differ: ') + bad.join(', ') : 'every crest matches its soccer club'}`);
})();
