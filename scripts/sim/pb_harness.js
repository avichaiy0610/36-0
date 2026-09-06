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
  'חלוץ מושלם':      { role: 'fw', attrs: { pac: 90, sho: 95, pas: 84, dri: 90, def: 60, phy: 90 } },
  'חלוץ מאוזן':      { role: 'fw', attrs: { pac: 74, sho: 84, pas: 68, dri: 74, def: 50, phy: 76 } },
  'חלוץ חד-ממדי':    { role: 'fw', attrs: { pac: 48, sho: 95, pas: 44, dri: 46, def: 35, phy: 60 } },
  'חלוץ שביר':       { role: 'fw', attrs: { pac: 88, sho: 92, pas: 78, dri: 88, def: 55, phy: 56 } },
  'חלוץ עמיד':       { role: 'fw', attrs: { pac: 70, sho: 80, pas: 66, dri: 70, def: 55, phy: 93 } },
  'חלוץ גרוע':       { role: 'fw', attrs: { pac: 55, sho: 55, pas: 52, dri: 55, def: 45, phy: 62 } },
  'כנף מאוזן':       { role: 'w',  attrs: { pac: 90, sho: 74, pas: 76, dri: 88, def: 46, phy: 66 } },
  'קשר מאוזן':       { role: 'cm', attrs: { pac: 66, sho: 70, pas: 90, dri: 80, def: 66, phy: 78 } },
  'מגן מאוזן':       { role: 'df', attrs: { pac: 74, sho: 48, pas: 62, dri: 56, def: 92, phy: 86 } },
  'שוער מאוזן':      { role: 'gk', attrs: { pac: 50, sho: 30, pas: 52, dri: 34, def: 88, phy: 84 } },
  // The control pair: SAME role, SAME rating, physical traded against shooting.
  // Anything else is comparing two different players and learning nothing.
  'בקרה · שביר':     { role: 'fw', attrs: { pac: 78, sho: 90, pas: 72, dri: 78, def: 52, phy: 55 } },
  'בקרה · עמיד':     { role: 'fw', attrs: { pac: 78, sho: 78, pas: 72, dri: 78, def: 52, phy: 92 } },
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
