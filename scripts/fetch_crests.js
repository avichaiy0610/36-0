// Downloads club badges into /crests/<teamId>.png for the gauntlet map.
// Source: TheSportsDB, which publishes team badges through its API (the same
// place the fixture feed comes from). Uses the /preview size — ~30KB each.
//
//   node scripts/fetch_crests.js
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'crests');
const TEAMS = new Function(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') +
  '\n;return TEAMS;')();

// our id → how the club is written in English, plus a fallback spelling
const QUERY = {
  'maccabi-haifa': ['Maccabi Haifa'], 'maccabi-tlv': ['Maccabi Tel Aviv'],
  'hapoel-tlv': ['Hapoel Tel Aviv FC', 'Hapoel Tel-Aviv'], 'beitar-jerusalem': ['Beitar Jerusalem'],
  'hapoel-beersheba': ['Hapoel Beer Sheva', 'Hapoel Be er Sheva'],
  'hapoel-jerusalem': ['Hapoel Jerusalem'], 'maccabi-netanya': ['Maccabi Netanya'],
  'bnei-sakhnin': ['Bnei Sakhnin'], 'hapoel-haifa': ['Hapoel Haifa'],
  'maccabi-pt': ['Maccabi Petah Tikva'], 'hapoel-pt': ['Hapoel Petah Tikva'],
  'ironi-ks': ['Ironi Kiryat Shmona', 'Hapoel Ironi Kiryat Shmona'],
  'ironi-tiberias': ['Ironi Tiberias'], 'hapoel-hadera': ['Hapoel Hadera'],
  'maccabi-bnei-raina': ['Maccabi Bnei Reineh', 'Bnei Reineh', 'Maccabi Bnei Raina'], 'hapoel-rg': ['Hapoel Ramat Gan'],
  'ms-ashdod': ['FC Ashdod', 'Ashdod'], 'maccabi-ahi-naz': ['Maccabi Ahi Nazareth'],
  'hapoel-galil': ['Hapoel Nof HaGalil', 'Hapoel Bnei Nazareth Illit'],
  'hapoel-kfar-saba': ['Hapoel Kfar Saba'], 'hapoel-raanana': ['Hapoel Raanana'],
  'hapoel-rhs': ['Hapoel Ramat HaSharon'], 'hapoel-aco': ['Hapoel Acre', 'Hapoel Akko'],
  'hapoel-ashkelon': ['Hapoel Ashkelon'], 'maccabi-kg': ['Maccabi Kiryat Gat'],
  'sakhnina-ns': ['Sektzia Nes Tziona', 'Hapoel Nes Tziona'],
  'hapoel-rishonim': ['Hapoel Rishon LeZion'], 'hapoel-holon': ['Hapoel Holon'],
  'bnei-yehuda': ['Bnei Yehuda Tel Aviv'], 'maccabi-herzliya': ['Maccabi Herzliya'],
  'hakoah-rg': ['Hakoah Amidar Ramat Gan', 'Hakoah Ramat Gan'],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let ok = 0, miss = [];
  for (const id of Object.keys(TEAMS)) {
    const dest = path.join(OUT, id + '.png');
    if (fs.existsSync(dest)) { ok++; continue; }
    const names = QUERY[id] || [TEAMS[id].name];
    let url = null, matched = '';
    for (const q of names) {
      try {
        const r = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(q)}`);
        const d = await r.json();
        // Must be the FOOTBALL club: "Hapoel Tel Aviv BC" is the basketball team
        // and matched first, which would have put the wrong crest on the map.
        const cands = (d.teams || []).filter(t => /Soccer/i.test(t.strSport || ''));
        const team = cands.find(t => /Israel/i.test(t.strCountry || '')) || cands[0];
        if (team && (team.strBadge || team.strTeamBadge)) {
          url = (team.strBadge || team.strTeamBadge) + '/preview';
          matched = team.strTeam;
          break;
        }
      } catch (e) { /* try the next spelling */ }
      await sleep(250);
    }
    if (!url) { miss.push(id); continue; }
    try {
      const img = await fetch(url);
      if (!img.ok) throw new Error('http ' + img.status);
      fs.writeFileSync(dest, Buffer.from(await img.arrayBuffer()));
      console.log(`✓ ${id.padEnd(22)} ← ${matched}`);
      ok++;
    } catch (e) { miss.push(id + ' (' + e.message + ')'); }
    await sleep(250);
  }
  console.log(`\ndone: ${ok} crests · missing: ${miss.length}`);
  if (miss.length) console.log('missing:', miss.join(', '));
})();
