// Run with PGlite installed externally: JOURNEY_PGLITE_PATH=<module path> node scripts/sim/journey_sql_test.js
// Executes the unapplied SQL in memory only; never connects to Supabase or writes a database directory.
const fs = require('fs'), path = require('path'), assert = require('assert');
// The repo has no package.json, so PGlite is not always there. Missing, the test
// says so and exits 0 instead of crashing the run; install it anywhere and point
// JOURNEY_PGLITE_PATH at the module to run it.
let PGlite;
try { ({ PGlite } = require(process.env.JOURNEY_PGLITE_PATH || '@electric-sql/pglite')); }
catch (e) {
  console.log('SKIP  journey_sql_test: PGlite is not installed. `npm i @electric-sql/pglite@0.2.17` in a scratch folder,');
  console.log('      then JOURNEY_PGLITE_PATH=<that folder>/node_modules/@electric-sql/pglite node scripts/sim/journey_sql_test.js');
  process.exit(0);
}
const root = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const squads = new Function(read('js/data.js') + ';return SQUADS;')();
const chosen = [];
for (const s of squads.filter(s => s.season === '1999/00')) {
  if (chosen.some(c => c.teamId === s.teamId)) continue;
  const p = s.players.find(p => !chosen.some(c => c.name === p.name));
  if (p) chosen.push({ teamId: s.teamId, squadId: s.id, name: p.name });
  if (chosen.length === 11) break;
}
assert.strictEqual(chosen.length, 11);
(async () => {
  const db = new PGlite();
  let n = 0;
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE FUNCTION is_site_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE TABLE profiles(id uuid PRIMARY KEY, username text, club jsonb);
      CREATE TABLE achievements(key text PRIMARY KEY, name_he text, desc_he text, icon text, is_hidden boolean);
      CREATE TABLE user_achievements(user_id uuid REFERENCES profiles(id), achievement_key text REFERENCES achievements(key),
        PRIMARY KEY(user_id, achievement_key));
      INSERT INTO profiles VALUES ('00000000-0000-0000-0000-000000000001', 'test', null);
      SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);`);
    await db.exec(read('supabase/migrations/20261013000002_journey_runs.sql'));
    const base = { level: 'normal', formation: '4-3-3', broken: false, rank: 1,
      route: chosen.map(({ squadId, name }) => ({ squadId, name })) };
    const submit = async (id, season) => (await db.query('SELECT submit_journey_run($1::jsonb) AS result',
      [JSON.stringify({ ...base, run_id: id, season })])).rows[0].result;
    const cases = [
      ['wins need goals', { wins: 36, draws: 0, losses: 0, gf: 0, ga: 0 }],
      ['losses need conceded goals', { wins: 0, draws: 0, losses: 1, gf: 0, ga: 0 }],
      ['an unbeaten season cannot have a negative goal difference', { wins: 1, draws: 1, losses: 0, gf: 1, ga: 2 }],
      ['draw-only seasons have equal goals', { wins: 0, draws: 2, losses: 0, gf: 1, ga: 2 }],
    ];
    for (const [label, season] of cases) {
      const id = 'invalid-season-' + n;
      assert.strictEqual((await submit(id, season)).error, 'bad season', label);
      assert.strictEqual((await db.query('SELECT count(*)::int AS n FROM journey_runs WHERE run_id=$1', [id])).rows[0].n, 0);
      n++; console.log('PASS  ' + label);
    }
    assert.strictEqual((await db.query('SELECT count(*)::int AS n FROM user_achievements')).rows[0].n, 0);
    for (const season of [
      { wins: 25, draws: 6, losses: 5, gf: 70, ga: 25 },
      { wins: 0, draws: 2, losses: 0, gf: 0, ga: 0 },
      { wins: 36, draws: 0, losses: 0, gf: 36, ga: 0 },
      { wins: 0, draws: 0, losses: 1, gf: 0, ga: 1 },
    ]) {
      assert.ok(!(await submit('valid-season-' + n, season)).error);
      n++; console.log('PASS  valid goals and outcomes, including boundary scores');
    }
    console.log('\n' + n + ' passed');
  } finally { await db.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
