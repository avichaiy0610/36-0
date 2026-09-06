// Tunes בונה כדורגלן. Runs many careers per build archetype and reports where
// each one lands, because "the numbers look fine" is not a measurement.
//   node scripts/sim/pb_harness.js
const fs = require('fs'), path = require('path');
const B = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const G = new Function(
  B('js/data.js') + '\n' + B('js/attr-data.js') + '\n' + B('js/attrs.js') + '\n' +
  B('js/pb-career.js') +
  ';return {SQUADS,TEAMS,attrsOf,attrOvr,pbSimCareer,pbClubTiers,ATTR_ROLE};')();

const N = 4000;
// Six archetypes a real player could actually assemble out of six spins.
const BUILDS = {
  'חלוץ מושלם':      { role: 'fw', attrs: { fin: 95, cre: 88, def: 70, pac: 88, sta: 92, cls: 82 } },
  'חלוץ מאוזן':      { role: 'fw', attrs: { fin: 84, cre: 72, def: 55, pac: 74, sta: 76, cls: 66 } },
  'חלוץ חד-ממדי':    { role: 'fw', attrs: { fin: 95, cre: 45, def: 35, pac: 50, sta: 45, cls: 40 } },
  'חלוץ שביר':       { role: 'fw', attrs: { fin: 92, cre: 80, def: 60, pac: 85, sta: 44, cls: 70 } },
  'חלוץ עם יציבות':  { role: 'fw', attrs: { fin: 80, cre: 70, def: 60, pac: 70, sta: 94, cls: 66 } },
  'חלוץ גרוע':       { role: 'fw', attrs: { fin: 55, cre: 50, def: 45, pac: 55, sta: 55, cls: 45 } },
  'קשר מאוזן':       { role: 'cm', attrs: { fin: 70, cre: 88, def: 74, pac: 66, sta: 84, cls: 72 } },
  'מגן מאוזן':       { role: 'df', attrs: { fin: 50, cre: 60, def: 90, pac: 72, sta: 86, cls: 70 } },
  'שוער מאוזן':      { role: 'gk', attrs: { fin: 40, cre: 50, def: 78, pac: 55, sta: 86, cls: 70, gk: 92 } },
};

const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

console.log('build'.padEnd(18), 'OVR', ' legacy p10/med/p90'.padEnd(22),
            'שערים', ' תארים', 'נעליים', 'שח"ע', 'חו"ל', 'אבודות');
for (const [name, b] of Object.entries(BUILDS)) {
  const runs = [];
  for (let i = 1; i <= N; i++) runs.push(G.pbSimCareer(b, i * 7919));
  const leg = runs.map(r => r.legacy).sort((x, y) => x - y);
  const f = k => mean(runs.map(r => r.totals[k])).toFixed(1);
  console.log(
    name.padEnd(18),
    String(G.attrOvr(b.attrs, b.role)).padEnd(4),
    (pct(leg, 0.1) + '/' + pct(leg, 0.5) + '/' + pct(leg, 0.9)).padEnd(22),
    f('goals').padStart(5), f('titles').padStart(6), f('boots').padStart(6),
    f('poty').padStart(5), f('abroad').padStart(5), f('lost').padStart(6));
}
