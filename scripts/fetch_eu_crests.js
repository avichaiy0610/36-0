// Badges for the European qualifying opponents → /crests/eu/<id>.png
//
// Same source as the Israeli crests (TheSportsDB), but these clubs are not in
// our data, so the mapping from our id to a searchable English name lives here.
// A club can be listed under more than one spelling; the first hit that returns
// a badge wins.
//
// Existing files are LEFT ALONE unless --force is passed. That is deliberate:
// Hapoel Be'er Sheva once came back as the basketball club, and a re-run that
// silently overwrites a hand-checked badge is how that survives unnoticed.
//
//   node scripts/fetch_eu_crests.js [--force]
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'crests', 'eu');
const FORCE = process.argv.includes('--force');

// [country, ...spellings]. The country is not decoration: searching "Flora"
// returns a club in SURINAME first, and "Maribor" returns the youth side. Both
// were caught only because the country came back in the response, so it is now
// a hard filter rather than something to read afterwards.
const QUERY = {
  'eu-kalju':      ['Estonia',     'Nomme Kalju'],
  'eu-flora':      ['Estonia',     'Flora Tallinn', 'FC Flora'],
  'eu-kairat':     ['Kazakhstan',  'Kairat', 'FC Kairat'],
  'eu-sheriff':    ['Moldova',     'Sheriff Tiraspol'],
  'eu-zilina':     ['Slovakia',    'MSK Zilina', 'Zilina'],
  'eu-copenhagen': ['Denmark',     'FC Copenhagen', 'Copenhagen'],
  'eu-zvezda':     ['Serbia',      'Crvena Zvezda', 'Red Star Belgrade'],
  'eu-maribor':    ['Slovenia',    'NK Maribor', 'Maribor'],
  'eu-basel':      ['Switzerland', 'FC Basel', 'Basel'],
  'eu-salzburg':   ['Austria',     'Red Bull Salzburg'],
  'eu-bate':       ['Belarus',     'BATE Borisov'],
  'eu-celtic':     ['Scotland',    'Celtic'],
};

const API = 'https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=';

// Anchored on word boundaries. An unanchored "B" alternative matched the b in
// "Maribor", threw away every real candidate, and left the youth side as the
// only thing the search could still return.
const RESERVE = /\b(youth|u1[5-9]|u2[0-3]|women|ladies|reserves?|academy|amateur)\b/i;

async function badgeFor(country, names) {
  for (const n of names) {
    const res = await fetch(API + encodeURIComponent(n));
    if (!res.ok) continue;
    const j = await res.json();
    const teams = j.teams || [];
    const hit = teams.find(t =>
      /soccer/i.test(t.strSport || '') &&          // "Celtic" and "Basel" return other sports first
      t.strBadge &&
      (t.strCountry || '') === country &&          // the Suriname trap
      !RESERVE.test(t.strTeam || ''));             // the youth-side trap
    if (hit) return { url: hit.strBadge, label: `${hit.strTeam} (${hit.strCountry})` };
  }
  return null;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [id, [country, ...names]] of Object.entries(QUERY)) {
    const file = path.join(OUT, id + '.png');
    if (fs.existsSync(file) && !FORCE) { console.log(`${id.padEnd(15)} כבר קיים, מדלג`); continue; }
    try {
      const found = await badgeFor(country, names);
      if (!found) { console.log(`${id.padEnd(15)} ❌ לא נמצא`); continue; }
      const img = await fetch(found.url + '/preview');
      const buf = Buffer.from(await img.arrayBuffer());
      fs.writeFileSync(file, buf);
      console.log(`${id.padEnd(15)} ✓ ${found.label} — ${(buf.length / 1024).toFixed(0)}KB`);
    } catch (e) {
      console.log(`${id.padEnd(15)} ❌ ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 400));   // be polite to a free API
  }
})();
