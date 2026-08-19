# Line-Matchup Simulation Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the outcome-first match simulation with a goals-first model driven by attack / midfield / defence / goalkeeper line ratings, calibrated so a balanced OVR 88 squad achieves a 36-0 season in 5-6 of 300 seasons.

**Architecture:** A new pure-function module `js/sim-engine.js` holds the V2 engine (line ratings, xG, binomial goal draw). `simulateMatch` in `game.js` becomes a dispatcher selecting V1 or V2 by an explicit `engine` argument that threads down from the call site. Everything written before the cutover keeps calling V1 and replays byte-identically. Leagues and duels stay on V1 in this phase; solo and challenge seasons move to V2.

**Tech Stack:** Plain browser JS, no build, no framework. Verification is Node harnesses that concatenate the real source files (the project has no test runner — see `.claude/skills/verify/SKILL.md`).

**Spec:** `docs/superpowers/specs/2026-08-19-line-matchup-sim-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `js/sim-engine.js` (create) | V2 engine: constants, line-rating extraction, xG, binomial draw, `simulateMatchV2`, and the closed-form table estimate. Pure functions, no DOM. |
| `js/game.js` (modify) | `simulateMatch` dispatcher, `simTeamsForSeason` gains line ratings, `generateMatches` threads `engine`, `myLineRatings()`, engine stamping on save/submit. |
| `js/challenges.js` (modify) | `SIM_ENGINE2_FROM` key cutoff, mirroring the existing `CHAL_GEN2_FROM` idiom. |
| `index.html` (modify) | One script tag. |
| `scripts/sim/golden-v1.js` (create) | Captures V1 outputs to JSON before any engine change; re-run after to diff. |
| `scripts/sim/calibrate.js` (create) | Measures the spec's acceptance table from the real `game.js`. |

`js/sim-engine.js` is a new file rather than more lines in `game.js` because `game.js` is already 3,025 lines and the engine is self-contained pure logic with no DOM dependency.

---

### Task 1: Golden snapshot of V1 — the safety net

Nothing else may be committed before this. It is the only proof that goal 4 holds.

**Files:**
- Create: `scripts/sim/golden-v1.js`
- Create: `scripts/sim/golden-v1.json` (generated output, committed)

- [ ] **Step 1: Write the golden capture script**

```js
// scripts/sim/golden-v1.js
// Captures deterministic V1 engine outputs. Re-run after any engine change and
// diff the JSON: any difference means an existing league/challenge/duel result
// would change for a real user. See docs/superpowers/specs/2026-08-19-line-matchup-sim-design.md
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

const STUB = `
const document = { addEventListener(){}, getElementById(){ return null; },
  querySelectorAll(){ return []; },
  createElement(){ return { style:{}, classList:{ add(){}, remove(){} } }; } };
const window = {};
const localStorage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
const getCurrentUser = () => null;
const _supabase = { rpc(){ return Promise.resolve(); } };
`;

// mulberry32 lives in duel.js; league-sim.js needs it. Inline the same impl so
// the harness does not have to load the whole duel UI file.
const MULBERRY = `
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);
t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
`;

function loadWithRng() {
  const src = STUB + MULBERRY
    + fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8') + '\n'
    + fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8') + '\n'
    + fs.readFileSync(path.join(ROOT, 'js/league-sim.js'), 'utf8') + '\n'
    + ';return { generateMatches, generateLeagueTable, simTeamsForSeason,'
    + ' IL_TEAMS_SIM, MODERN_FORMAT, SEASON_FORMATS, withSeededRandom, lgSimSeed };';
  return new Function(src)();
}

const G = loadWithRng();
const out = { seededSeasons: [], aiRatings: {}, formats: [] };

// 1. Seeded seasons — exactly how a league reveal and a challenge run recompute.
for (const seed of ['ABCD|avi', 'ABCD|dana', 'chal|daily|2026-08-01|sim|x']) {
  for (const ovr of [78, 84, 88]) {
    const rec = G.withSeededRandom(G.lgSimSeed(seed + '|' + ovr), () => {
      const g = G.generateMatches(ovr);
      return { n: g.matches.length, inTopSix: g.inTopSix,
               matches: g.matches.map(m => `${m.outcome}${m.gf}-${m.ga}${m.home ? 'H' : 'A'}`).join(',') };
    });
    out.seededSeasons.push({ seed, ovr, ...rec });
  }
}

// 2. AI club ratings per season — these feed every table.
for (const y of [1999, 2005, 2012, 2020, 2025]) {
  out.aiRatings[y] = G.simTeamsForSeason(y, 13).map(t => `${t.teamId}:${t.ovr}`);
}

// 3. Every historical format still produces the right number of games.
for (const f of G.SEASON_FORMATS) {
  const g = G.withSeededRandom(4242, () => G.generateMatches(84, G.simTeamsForSeason(f.from, f.teams - 1), f));
  out.formats.push({ from: f.from, games: g.matches.length });
}

const dest = path.join(__dirname, 'golden-v1.json');
if (process.argv[2] === '--check') {
  const prev = JSON.parse(fs.readFileSync(dest, 'utf8'));
  const same = JSON.stringify(prev) === JSON.stringify(out);
  console.log(same ? 'GOLDEN OK — V1 output unchanged'
                   : 'GOLDEN MISMATCH — an existing user result would change');
  if (!same) {
    fs.writeFileSync(dest.replace('.json', '.actual.json'), JSON.stringify(out, null, 2));
    console.log('wrote golden-v1.actual.json for diffing');
  }
  process.exit(same ? 0 : 1);
}
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log('captured', out.seededSeasons.length, 'seeded seasons,',
            Object.keys(out.aiRatings).length, 'seasons of AI ratings,',
            out.formats.length, 'formats');
```

- [ ] **Step 2: Capture the baseline**

Run: `node scripts/sim/golden-v1.js`
Expected: `captured 9 seeded seasons, 5 seasons of AI ratings, 6 formats`

- [ ] **Step 3: Verify the check mode passes against itself**

Run: `node scripts/sim/golden-v1.js --check`
Expected: `GOLDEN OK — V1 output unchanged`, exit code 0

- [ ] **Step 4: Commit**

```bash
git add scripts/sim/golden-v1.js scripts/sim/golden-v1.json
git commit -m "test(sim): golden snapshot of the V1 engine before the line-matchup rewrite"
```

---

### Task 2: The V2 engine module

**Files:**
- Create: `js/sim-engine.js`
- Modify: `index.html:814-815`

- [ ] **Step 1: Write the engine**

```js
// ─── V2 simulation engine: line matchups ──────────────────────────────────────
// The V1 engine draws an OUTCOME from the overall-OVR gap and then invents a
// scoreline to fit it, so a 5-4 can never occur and the four line ratings shown
// in the UI are decoration. V2 inverts that: each side's expected goals come
// from attack-vs-(defence+keeper) plus midfield territory, goals are drawn, and
// the outcome falls out of the comparison.
//
// Calibration and the reasoning behind every constant:
// docs/superpowers/specs/2026-08-19-line-matchup-sim-design.md
const SIM_ENGINE_CURRENT = 2;

const SIM2 = {
  BASE:      1.25,    // baseline goals per side per match
  KA:        0.055,   // attack sensitivity, per rating point
  KD:        0.220,   // defence+keeper sensitivity — 4x KA on purpose (see spec)
  T:         0.0286,  // midfield sensitivity — ~half KA, because midfield acts
                      // on BOTH sides of the ball and would otherwise pay twice
  CHANCES:   3,       // goals = chances x conversion; lower = less variance
  MU_MAX:    3.4,     // ceiling on a side's xG — keeps 36-0 from exploding at
                      // the top of the rating range (there is deliberately no
                      // floor on the opponent's xG; see spec)
  HOME:      1.15,
  LAMBDA:    0.75,    // shrink each line toward the overall OVR
  GK_WEIGHT: 0.30,    // keeper's share of the defensive rating
};

// Which positions make up each line, and how many of them a real squad fields.
const SIM2_LINES = {
  atk: { pos: ['ST', 'CF', 'RW', 'LW'],               count: 3 },
  mid: { pos: ['CAM', 'CM', 'CDM', 'RM', 'LM'],       count: 3 },
  def: { pos: ['CB', 'RB', 'LB'],                     count: 4 },
  gk:  { pos: ['GK'],                                 count: 1 },
};

// A real club's four line ratings: the best N at each line, averaged.
// Falls back to the club's overall rating when a squad has nobody in a line.
function simLineRatingsForSquad(squadPlayers, fallbackOvr) {
  const out = {};
  for (const key of Object.keys(SIM2_LINES)) {
    const { pos, count } = SIM2_LINES[key];
    const best = squadPlayers
      .filter(p => pos.includes(p.position))
      .sort((a, b) => b.ovr - a.ovr)
      .slice(0, count);
    out[key] = best.length
      ? best.reduce((s, p) => s + p.ovr, 0) / best.length
      : fallbackOvr;
  }
  return out;
}

// Pull each line toward the overall rating, so the headline OVR stays a real
// anchor and a wildly lopsided XI is damped without an artificial penalty.
function simShrinkLines(t) {
  const L = SIM2.LAMBDA, o = t.ovr;
  return {
    ovr: o,
    atk: o + L * (t.atk - o),
    mid: o + L * (t.mid - o),
    def: o + L * (t.def - o),
    gk:  o + L * (t.gk  - o),
  };
}

function simDefGk(t) {
  return (1 - SIM2.GK_WEIGHT) * t.def + SIM2.GK_WEIGHT * t.gk;
}

// Expected goals for `me` against `opp`. Both are shrunk line-rating objects.
function simExpectedGoals(me, opp, home) {
  const xg = SIM2.BASE
    * Math.exp(SIM2.KA * (me.atk - 80))
    * Math.exp(SIM2.KD * (80 - simDefGk(opp)))
    * Math.exp(SIM2.T  * (me.mid - opp.mid))
    * (home ? SIM2.HOME : 1);
  return Math.min(SIM2.MU_MAX, xg);
}

// Goals as chances x conversion. Binomial rather than Poisson: its variance is
// np(1-p) instead of np, and Poisson's spread makes a 36-win season impossible
// at any believable goal level.
function simDrawGoals(xg) {
  const p = Math.min(0.97, xg / SIM2.CHANCES);
  let goals = 0;
  for (let i = 0; i < SIM2.CHANCES; i++) if (Math.random() < p) goals++;
  return goals;
}

// me / opp: { ovr, atk, mid, def, gk }. Returns the same shape as V1.
function simulateMatchV2(me, opp, homeOverride = null) {
  const home = homeOverride !== null ? homeOverride : Math.random() > 0.5;
  const a = simShrinkLines(me), b = simShrinkLines(opp);
  const gf = simDrawGoals(simExpectedGoals(a, b, home));
  const ga = simDrawGoals(simExpectedGoals(b, a, !home));
  const outcome = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
  return { outcome, gf, ga, opponent: opp.name, home };
}
```

- [ ] **Step 2: Load it before `game.js`**

In `index.html`, insert one line between `js/data.js` and `js/game.js`:

```html
  <script src="js/data.js"></script>
  <script src="js/sim-engine.js"></script>
  <script src="js/game.js"></script>
```

- [ ] **Step 3: Verify it parses and produces sane goals**

Run:
```bash
node -e "
const fs=require('fs');
const G=new Function(fs.readFileSync('js/sim-engine.js','utf8')+
  ';return {simulateMatchV2,simExpectedGoals,simShrinkLines,SIM_ENGINE_CURRENT};')();
const A={ovr:88,atk:88,mid:88,def:88,gk:88}, B={ovr:80,atk:80,mid:80,def:80,gk:80};
let gf=0,ga=0,w=0;
for(let i=0;i<36000;i++){const m=G.simulateMatchV2(A,B,i%2===0);gf+=m.gf;ga+=m.ga;if(m.outcome==='W')w++;}
console.log('engine',G.SIM_ENGINE_CURRENT,'| per 36 games  gf',(gf/1000).toFixed(1),'ga',(ga/1000).toFixed(1),'wins',(w/1000).toFixed(1));
"
```
Expected: engine 2, `gf ~94`, `ga ~7`, `wins ~35`. Any zero or NaN means a constant is wired wrong.

Note this is deliberately NOT the real-league figure. Here the opponent is a flat
80 in every match; the actual league has clubs up to 85, so a real season for an
OVR 88 squad scores ~83 rather than ~94. The closed form for this synthetic case
is `1.25 x e^(0.055x8) x e^(0.0286x8) = 2.44` away and `x1.15 = 2.81` at home,
averaging `2.62 x 36 = 94.4`. Task 9 measures the real-league numbers.

- [ ] **Step 4: Confirm V1 is untouched**

Run: `node scripts/sim/golden-v1.js --check`
Expected: `GOLDEN OK — V1 output unchanged`

- [ ] **Step 5: Commit**

```bash
git add js/sim-engine.js index.html
git commit -m "feat(sim): add the V2 line-matchup engine, not yet wired in"
```

---

### Task 3: Line ratings for the AI clubs

**Files:**
- Modify: `js/game.js:231-257` (`simTeamsForSeason`)

- [ ] **Step 1: Attach line ratings to each club**

In `simTeamsForSeason`, replace the `clubOf` helper:

```js
  const clubOf = sq => {
    const top = [...sq.players].sort((a, b) => b.ovr - a.ovr).slice(0, 11);
    const ovr = Math.round(top.reduce((sum, p) => sum + p.ovr, 0) / top.length);
    return {
      teamId: sq.teamId,
      name: (TEAMS[sq.teamId] ?? { name: sq.teamId }).name,
      ovr,
      // V2 line ratings, from the club's real squad. V1 ignores these entirely,
      // so adding them cannot change any existing result.
      ...simLineRatingsForSquad(sq.players, ovr),
    };
  };
```

- [ ] **Step 2: Verify the ratings look right and V1 is unchanged**

Run:
```bash
node -e "
const fs=require('fs');
const stub='const document={addEventListener(){},getElementById(){return null},querySelectorAll(){return[]},createElement(){return{style:{},classList:{add(){},remove(){}}}}};const window={};const localStorage={getItem(){return null},setItem(){},removeItem(){}};const getCurrentUser=()=>null;const _supabase={rpc(){return Promise.resolve()}};';
const G=new Function(stub+fs.readFileSync('js/data.js','utf8')+'\n'+fs.readFileSync('js/sim-engine.js','utf8')+'\n'+fs.readFileSync('js/game.js','utf8')+';return {simTeamsForSeason};')();
G.simTeamsForSeason(2025,13).slice(0,4).forEach(t=>
  console.log(t.ovr, 'atk',t.atk.toFixed(0),'mid',t.mid.toFixed(0),'def',t.def.toFixed(0),'gk',t.gk.toFixed(0), t.name));
"
```
Expected: four clubs printed, each with four line numbers in the 70-90 range. Hapoel Be'er Sheva should lead on `ovr`.

Run: `node scripts/sim/golden-v1.js --check`
Expected: `GOLDEN OK` — the golden captures `aiRatings` as `teamId:ovr`, so this proves the added fields did not disturb the existing ones.

- [ ] **Step 3: Commit**

```bash
git add js/game.js
git commit -m "feat(sim): per-line ratings for the AI clubs, from their real squads"
```

---

### Task 4: The dispatcher

**Files:**
- Modify: `js/game.js:1558` (`simulateMatch`), `js/game.js:1575` (`generateMatches`), `js/game.js:1623` (`generateAuthenticMatches`)

- [ ] **Step 1: Rename the existing function and add the dispatcher**

Rename `function simulateMatch(myOvr, opp, homeOverride = null)` to `function simulateMatchV1(myOvr, opp, homeOverride = null)` — its body is unchanged. Then add directly below it:

```js
// Engine dispatch. `me` is a number for V1 and a { ovr, atk, mid, def, gk }
// object for V2; V1 accepts either so a V2 call site can fall back cleanly.
// Anything recorded before the cutover keeps passing engine 1 and replays
// byte-identically — see the compatibility table in the design spec.
function simulateMatch(me, opp, homeOverride = null, engine = 1) {
  if (engine >= 2 && typeof me === 'object' && me !== null) {
    return simulateMatchV2(me, opp, homeOverride);
  }
  return simulateMatchV1(typeof me === 'number' ? me : me.ovr, opp, homeOverride);
}
```

- [ ] **Step 2: Thread `engine` through the match generators**

In `generateMatches`, change the signature and every `simulateMatch` call:

```js
function generateMatches(me, oppTeams = IL_TEAMS_SIM, spec = MODERN_FORMAT, engine = 1) {
  const ovr = typeof me === 'number' ? me : me.ovr;
  if (!isModernSpec(spec)) return generateAuthenticMatches(me, oppTeams, spec, engine);
```

Inside it, `simulateMatch(ovr, opp)` becomes `simulateMatch(me, opp, null, engine)` and
`simulateMatch(ovr, opp, homes[i])` becomes `simulateMatch(me, opp, homes[i], engine)`.
The bracket-split maths keeps using the local `ovr` number — it is V1 table estimation and must not change.

Apply the same two edits to `generateAuthenticMatches(me, oppTeams, spec, engine = 1)`, adding `const ovr = typeof me === 'number' ? me : me.ovr;` as its first line and replacing its two `simulateMatch(ovr, f.opp, f.home)` calls with `simulateMatch(me, f.opp, f.home, engine)`.

- [ ] **Step 3: Verify both engines run and V1 is byte-identical**

Run:
```bash
node -e "
const fs=require('fs');
const stub='const document={addEventListener(){},getElementById(){return null},querySelectorAll(){return[]},createElement(){return{style:{},classList:{add(){},remove(){}}}}};const window={};const localStorage={getItem(){return null},setItem(){},removeItem(){}};const getCurrentUser=()=>null;const _supabase={rpc(){return Promise.resolve()}};';
const G=new Function(stub+fs.readFileSync('js/data.js','utf8')+'\n'+fs.readFileSync('js/sim-engine.js','utf8')+'\n'+fs.readFileSync('js/game.js','utf8')+';return {generateMatches,simTeamsForSeason,MODERN_FORMAT};')();
const opp=G.simTeamsForSeason(2025,13);
const me={ovr:88,atk:88,mid:88,def:88,gk:88};
for(const [label,arg,eng] of [['V1',88,1],['V2',me,2]]){
  let gf=0,ga=0,w=0,N=2000;
  for(let i=0;i<N;i++){const g=G.generateMatches(arg,opp,G.MODERN_FORMAT,eng);
    g.matches.forEach(m=>{gf+=m.gf;ga+=m.ga;if(m.outcome==='W')w++;});}
  console.log(label,'wins',(w/N).toFixed(1),'gf',(gf/N).toFixed(1),'ga',(ga/N).toFixed(1));}
"
```
Expected: `V1 wins ~26 gf ~74 ga ~33` and `V2 wins ~31 gf ~77 ga ~7`.

The V1 figures are simply what V1 has always done at OVR 88 — verify by loading
`git show a12357e:js/game.js` in the same harness and confirming the numbers
match. What matters is that they are IDENTICAL before and after your change; the
golden proves it exactly, this check just makes a regression visible at a glance.

Run: `node scripts/sim/golden-v1.js --check`
Expected: `GOLDEN OK — V1 output unchanged`. This is the critical gate: the dispatcher must not perturb V1 by so much as one `Math.random` call.

- [ ] **Step 4: Commit**

```bash
git add js/game.js
git commit -m "feat(sim): dispatch simulateMatch by engine version, V1 preserved exactly"
```

---

### Task 5: The player's line ratings

**Files:**
- Modify: `js/game.js` — add after `calcGroupOVR` (around line 420)

- [ ] **Step 1: Build the squad object the V2 engine expects**

`calcGroupOVR` already computes each line from the current picks and is used by the results card. Reuse it rather than duplicating the logic:

```js
// The player's XI as the V2 engine wants it. Lines come from the same helper
// that draws the four bars on the results card, so what the player sees is
// literally what the simulation uses. An unfilled line falls back to the
// overall rating.
function myLineRatings() {
  const ovr = teamOVR();
  const line = (positions) => calcGroupOVR(positions) ?? ovr;
  return {
    ovr,
    atk: line(SIM2_LINES.atk.pos),
    mid: line(SIM2_LINES.mid.pos),
    def: line(SIM2_LINES.def.pos),
    gk:  line(SIM2_LINES.gk.pos),
  };
}
```

- [ ] **Step 2: Verify against a hand-built XI**

Run:
```bash
node -e "
const fs=require('fs');
const stub='const document={addEventListener(){},getElementById(){return null},querySelectorAll(){return[]},createElement(){return{style:{},classList:{add(){},remove(){}}}}};const window={};const localStorage={getItem(){return null},setItem(){},removeItem(){}};const getCurrentUser=()=>null;const _supabase={rpc(){return Promise.resolve()}};';
const G=new Function(stub+fs.readFileSync('js/data.js','utf8')+'\n'+fs.readFileSync('js/sim-engine.js','utf8')+'\n'+fs.readFileSync('js/game.js','utf8')+';return {myLineRatings,state,FORMATIONS,SQUADS};')();
const slots=G.FORMATIONS['4-3-3'].slots;
G.state.slots=slots; G.state.peakMode=false;
// give every slot a player of the right position, ovr 90 up front and 80 at the back
G.state.picks=slots.map(s=>({player:{name:'x',position:s.pos,ovr:['ST','CF','RW','LW'].includes(s.pos)?90:80},squad:{}}));
console.log(G.myLineRatings());
"
```
Expected: `{ ovr: <83-85>, atk: 90, mid: 80, def: 80, gk: 80 }` — attack exactly 90, the rest exactly 80.

- [ ] **Step 3: Commit**

```bash
git add js/game.js
git commit -m "feat(sim): expose the player's four line ratings to the engine"
```

---

### Task 6: Switch solo seasons to V2 and stamp the engine

**Files:**
- Modify: `js/game.js:2127` (`animateResults`), `js/game.js:1980` (`calcPreseasonOdds`), `js/game.js:804` (`saveSeasonState`)

- [ ] **Step 1: Simulate solo seasons with V2**

In `animateResults`, inside the `simulate` closure, change the generate call and record the engine:

```js
      const spec = specForState();
      const g = generateMatches(myLineRatings(), oppTeamsForState(), spec, SIM_ENGINE_CURRENT);
```

and add `engine: SIM_ENGINE_CURRENT,` to the returned season object, next to `ovr`.

- [ ] **Step 2: Make the preseason card use the same engine**

The odds card must predict the season the player is about to get. In `calcPreseasonOdds`, replace the generate call:

```js
    const g0 = generateMatches(myLineRatings(), oppTeamsForState(), spec, SIM_ENGINE_CURRENT);
```

`calcPreseasonOdds(ovr, simCount)` keeps its signature — `ovr` is still used by nothing else in the function, and its callers are unchanged.

- [ ] **Step 3: Persist the stamp**

In `saveSeasonState`, add one field to the `d.season` object being written:

```js
      engine: season.engine ?? 1,   // seasons saved before the V2 cutover have none
```

- [ ] **Step 4: Verify a solo season now uses V2, and V1 still does not move**

Run:
```bash
node -e "
const fs=require('fs');
const stub='const document={addEventListener(){},getElementById(){return null},querySelectorAll(){return[]},createElement(){return{style:{},classList:{add(){},remove(){}}}}};const window={};const localStorage={getItem(){return null},setItem(){},removeItem(){}};const getCurrentUser=()=>null;const _supabase={rpc(){return Promise.resolve()}};';
const G=new Function(stub+fs.readFileSync('js/data.js','utf8')+'\n'+fs.readFileSync('js/sim-engine.js','utf8')+'\n'+fs.readFileSync('js/game.js','utf8')+';return {generateMatches,myLineRatings,oppTeamsForState,specForState,state,FORMATIONS,SIM_ENGINE_CURRENT};')();
const slots=G.FORMATIONS['4-3-3'].slots;
G.state.slots=slots;G.state.peakMode=false;
G.state.picks=slots.map(s=>({player:{name:'x',position:s.pos,ovr:88},squad:{}}));
let ga=0,N=1000;
for(let i=0;i<N;i++){G.generateMatches(G.myLineRatings(),G.oppTeamsForState(),G.specForState(),G.SIM_ENGINE_CURRENT).matches.forEach(m=>ga+=m.ga);}
console.log('goals conceded per season:',(ga/N).toFixed(1),'(V2 expects ~7; V1 would be ~35)');
"
```
Expected: roughly `7`.

Run: `node scripts/sim/golden-v1.js --check`
Expected: `GOLDEN OK`.

- [ ] **Step 5: Commit**

```bash
git add js/game.js
git commit -m "feat(sim): solo seasons and the preseason card now run on the V2 engine"
```

---

### Task 7: Put the AI clubs' table on the V2 scale

`generateMatches` estimates each AI club's season points with `WINP_SLOPE`, which
is tuned to V1's scoring level. Under V2 the player takes ~100 points while that
estimate still tops out near 74, so the final table would show a 26-point gap to
second place and the playoff bracket split would put every decent squad in the
top six. The estimate has to live on the same scale as the matches.

**Files:**
- Modify: `js/sim-engine.js` (add `simTableEstimateV2`)
- Modify: `js/game.js:1575` (`generateMatches`), `js/game.js:1623` (`generateAuthenticMatches`)

- [ ] **Step 1: Compute each club's expected points exactly**

Append to `js/sim-engine.js`. This is closed-form, not sampled: with only
`CHANCES` shots a side, the full 4x4 scoreline grid is small enough to enumerate,
so the table carries no simulation noise of its own.

```js
// Probability of scoring exactly k goals from CHANCES chances at rate xg.
function simGoalPmf(xg) {
  const n = SIM2.CHANCES, p = Math.min(0.97, xg / n), out = [];
  for (let k = 0; k <= n; k++) {
    let c = 1;
    for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1);
    out.push(c * Math.pow(p, k) * Math.pow(1 - p, n - k));
  }
  return out;
}

// Exact expected points for `me` over one match against `opp`.
function simExpectedPoints(me, opp, home) {
  const a = simGoalPmf(simExpectedGoals(me, opp, home));
  const b = simGoalPmf(simExpectedGoals(opp, me, !home));
  let win = 0, draw = 0;
  for (let x = 0; x < a.length; x++) {
    for (let y = 0; y < b.length; y++) {
      if (x > y) win += a[x] * b[y];
      else if (x === y) draw += a[x] * b[y];
    }
  }
  return win * 3 + draw;
}

// Each club's expected points over a `games`-long season against the rest of the
// field, home and away in equal measure. Same units as the player's real total,
// because it is derived from the same xG model.
function simTableEstimateV2(clubs, games) {
  const per = clubs.map(t => {
    const me = simShrinkLines(t);
    let sum = 0, n = 0;
    for (const o of clubs) {
      if (o === t) continue;
      const them = simShrinkLines(o);
      sum += simExpectedPoints(me, them, true) + simExpectedPoints(me, them, false);
      n += 2;
    }
    return sum / n;                       // expected points per match
  });
  return per.map(p => Math.max(3, Math.round(p * games)));
}
```

- [ ] **Step 2: Use it when the engine is V2**

In `generateMatches`, replace the `simTeamPts` block with an engine-aware version:

```js
  const avgOppOvr = Math.round(oppTeams.reduce((s, t) => s + t.ovr, 0) / oppTeams.length);
  const v2pts = engine >= 2 ? simTableEstimateV2(oppTeams, 26) : null;
  const simTeamPts = oppTeams.map((t, i) => {
    if (v2pts) return { ...t, pts: v2pts[i] };
    const diff  = t.ovr - avgOppOvr;
    const winP  = Math.max(0.1, Math.min(0.85, 0.47 + diff * WINP_SLOPE));
    const drawP = Math.max(0.05, 0.22 - Math.abs(diff) * 0.005);
    const pts   = Math.max(5, Math.round((winP * 3 + drawP) * 26 + rand(-4, 4)));
    return { ...t, pts };
  });
```

Apply the same change in `generateAuthenticMatches`, using `regG` in place of `26`
in the `simTableEstimateV2` call and keeping its existing `Math.max(3, ...)` floor.

- [ ] **Step 3: Verify the table is coherent**

Run:
```bash
node -e "
const fs=require('fs');
const stub='const document={addEventListener(){},getElementById(){return null},querySelectorAll(){return[]},createElement(){return{style:{},classList:{add(){},remove(){}}}}};const window={};const localStorage={getItem(){return null},setItem(){},removeItem(){}};const getCurrentUser=()=>null;const _supabase={rpc(){return Promise.resolve()}};';
const G=new Function(stub+fs.readFileSync('js/data.js','utf8')+'
'+fs.readFileSync('js/sim-engine.js','utf8')+'
'+fs.readFileSync('js/game.js','utf8')+';return {generateMatches,generateLeagueTable,simTeamsForSeason,MODERN_FORMAT};')();
const opp=G.simTeamsForSeason(2025,13);
const me={ovr:88,atk:88,mid:88,def:88,gk:88};
const g=G.generateMatches(me,opp,G.MODERN_FORMAT,2);
let w=0,d=0;g.matches.forEach(m=>{if(m.outcome==='W')w++;else if(m.outcome==='D')d++;});
const t=G.generateLeagueTable(w,d,g.matches.length-w-d,g.inTopSix,g.champOpponents,g.relegOpponents);
console.log('player:',w*3+d,'pts, rank',t.findIndex(x=>x.us)+1);
console.log(t.slice(0,4).map(r=>r.name+' '+r.pts).join(' | '));
"
```
Expected: the player near 100 points at rank 1, and the clubs below within roughly
10-15 points of them — not 25+. Every row must be a number, never `NaN`.

- [ ] **Step 4: Confirm V1 is still frozen**

Run: `node scripts/sim/golden-v1.js --check`
Expected: `GOLDEN OK — V1 output unchanged`. The `engine >= 2` guard means the V1
branch keeps its `rand(-4, 4)` call in the same order, which is what the golden
proves.

- [ ] **Step 5: Commit**

```bash
git add js/sim-engine.js js/game.js
git commit -m "feat(sim): derive the AI clubs' table estimate from the V2 xG model"
```

---

### Task 7b: Lift the tail of the AI table

Task 7 put the AI clubs' points on the V2 scale, and rendering the result exposed
a problem: the weakest club came out on 14 points from 36 games — one win a
season — and there was a 33-point cliff between 6th and 7th. V2's steep
defensive response turns a 7-point rating gap into a 20x points gap.

Retuning the engine to flatten it was measured and rejected: every setting that
produces a realistic table also puts a 36-0 season out of reach (at `KA 0.030 /
KD 0.120` the table runs 85..27 but 36-0 drops to 0.1 per 300, against a target
of 5-6). The two are the same knob.

So the fix goes where the number is already an estimate rather than a simulated
result. The AI clubs never play real matches — V1 estimated their points from its
own separate formula too. Rescaling the estimate is a presentation correction,
not a change to anything the player actually experiences.

**Files:**
- Modify: `js/sim-engine.js` (`simTableEstimateV2`)

- [ ] **Step 1: Rescale the estimate onto a realistic floor**

Add the constant next to the others near the top of `js/sim-engine.js`:

```js
// A real bottom-of-the-table club takes roughly 0.8 points per game. The raw xG
// estimate puts it near 0.4, so the tail gets rescaled onto this floor.
const SIM2_TABLE_FLOOR_PPG = 0.80;
```

Then replace the final line of `simTableEstimateV2` so the function reads:

```js
function simTableEstimateV2(clubs, games) {
  const per = clubs.map(t => {
    const me = simShrinkLines(t);
    let sum = 0, n = 0;
    for (const o of clubs) {
      if (o === t) continue;
      const them = simShrinkLines(o);
      sum += simExpectedPoints(me, them, true) + simExpectedPoints(me, them, false);
      n += 2;
    }
    return sum / n;                       // expected points per match
  });

  // Lift the tail onto a believable floor by rescaling [worst, best] onto
  // [SIM2_TABLE_FLOOR_PPG, best]. The champion's total and the entire ordering
  // are untouched — only the gap below it is compressed. Skipped when the field
  // is flat or already above the floor.
  const lo = Math.min(...per), hi = Math.max(...per);
  const scaled = (hi - lo < 1e-9 || lo >= SIM2_TABLE_FLOOR_PPG)
    ? per
    : per.map(p => SIM2_TABLE_FLOOR_PPG + (p - lo) * (hi - SIM2_TABLE_FLOOR_PPG) / (hi - lo));

  return scaled.map(p => Math.max(3, Math.round(p * games)));
}
```

- [ ] **Step 2: Verify the rendered table**

```bash
node -e "
const fs=require('fs');
const stub='const document={addEventListener(){},getElementById(){return null},querySelectorAll(){return[]},createElement(){return{style:{},classList:{add(){},remove(){}}}}};const window={};const localStorage={getItem(){return null},setItem(){},removeItem(){}};const getCurrentUser=()=>null;const _supabase={rpc(){return Promise.resolve()}};';
const G=new Function(stub+fs.readFileSync('js/data.js','utf8')+'
'+fs.readFileSync('js/sim-engine.js','utf8')+'
'+fs.readFileSync('js/game.js','utf8')+';return {generateMatches,generateLeagueTable,simTeamsForSeason,MODERN_FORMAT};')();
const opp=G.simTeamsForSeason(2025,13);
const me={ovr:88,atk:88,mid:88,def:88,gk:88};
const g=G.generateMatches(me,opp,G.MODERN_FORMAT,2);
let w=0,d=0;g.matches.forEach(m=>{if(m.outcome==='W')w++;else if(m.outcome==='D')d++;});
G.generateLeagueTable(w,d,g.matches.length-w-d,g.inTopSix,g.champOpponents,g.relegOpponents)
 .forEach((r,i)=>console.log(String(i+1).padStart(2), String(r.pts).padStart(3), r.w+'W '+r.d+'D '+r.l+'L', r.name));
"
```
Expected: 14 rows, champion near 96, **bottom club no lower than about 25 points and with more than one win**, no `NaN`, ordering strictly descending by points.

- [ ] **Step 3: Confirm nothing else moved**

Run: `node scripts/sim/golden-v1.js --check` → `GOLDEN OK`.
Run the Task 7 sorted-estimate check again and confirm the top club is unchanged at 69 over 26 games while the bottom has risen.

- [ ] **Step 4: Commit**

```bash
git add js/sim-engine.js
git commit -m "fix(sim): lift the tail of the AI table estimate onto a realistic floor"
```

---

### Task 8: Challenge cutover by key, leaderboard segmentation

**Files:**
- Modify: `js/challenges.js:20-21`
- Modify: `js/game.js` — the `simulate` closure in `animateResults`, and the result payload

- [ ] **Step 1: Add the key cutoff, mirroring the existing generator gate**

In `js/challenges.js`, directly below `CHAL_GEN2_FROM` / `chalGen2`:

```js
// Which challenge keys run on the V2 simulation engine. Same key-gate mechanics
// and deploy rule as CHAL_GEN2_FROM: a key already in progress must keep
// producing the exact season it produced yesterday, so only future keys flip.
// Set these to dates AFTER the deploy date.
const SIM_ENGINE2_FROM = { daily: '2026-08-25', weekly: '2026-08-30', monthly: '2026-09' };
function chalSimEngine(period, key) {
  return String(key) >= (SIM_ENGINE2_FROM[period] ?? '9999') ? 2 : 1;
}
```

- [ ] **Step 2: Use it in the solo simulate path**

In `animateResults`, replace the line written in Task 6 Step 1 with a per-run engine choice:

```js
      const spec = specForState();
      const engine = state.challenge
        ? chalSimEngine(state.challenge.period, state.challenge.key)
        : SIM_ENGINE_CURRENT;
      const g = generateMatches(myLineRatings(), oppTeamsForState(), spec, engine);
```

and change the season object's stamp from `engine: SIM_ENGINE_CURRENT,` to `engine,`.

- [ ] **Step 3: Stamp the engine onto the submitted result**

The leaderboard orders by `points` ([leaderboard.js:90](../../../js/leaderboard.js#L90)), and a V2 season scores ~11 points more than a V1 season at the same OVR. Without a marker, every new entry permanently outranks every old one. `settings` is already part of the payload, so no schema change is needed. In `submitResult`'s payload (`js/game.js:2841` area, where `era_min` and the other settings are assembled), add:

```js
      engine:          window._lastResult?.engine ?? 1,
```

and in `animateResults`, after `saveSeasonState(season)`, add `window._lastResult = { ...(window._lastResult ?? {}), engine: season.engine };` so the payload can see it.

- [ ] **Step 4: Verify the challenge gate**

Run:
```bash
node -e "
const fs=require('fs');
const src=fs.readFileSync('js/challenges.js','utf8');
const G=new Function(src.slice(0,src.indexOf('function chalSeedDeckForReqs'))+';return {chalSimEngine,SIM_ENGINE2_FROM};')();
[['daily','2026-08-01'],['daily','2026-08-25'],['daily','2026-09-01'],['monthly','2026-08'],['monthly','2026-09']]
  .forEach(([p,k])=>console.log(p,k,'-> engine',G.chalSimEngine(p,k)));
"
```
Expected: `2026-08-01 -> 1`, `2026-08-25 -> 2`, `2026-09-01 -> 2`, `monthly 2026-08 -> 1`, `monthly 2026-09 -> 2`.

- [ ] **Step 5: Commit**

```bash
git add js/challenges.js js/game.js
git commit -m "feat(sim): gate challenges onto V2 by key cutoff, stamp engine on results"
```

---

### Task 9: Verify the calibration matches the spec

**Files:**
- Create: `scripts/sim/calibrate.js`

- [ ] **Step 1: Write the calibration harness**

```js
// scripts/sim/calibrate.js
// Measures the acceptance table in the design spec against the REAL engine.
// Re-run after any squad-data update: the 36-0 rate is steep in OVR and will
// drift. Usage: node scripts/sim/calibrate.js [seasonsPerRow]
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const STUB = `
const document = { addEventListener(){}, getElementById(){ return null; },
  querySelectorAll(){ return []; },
  createElement(){ return { style:{}, classList:{ add(){}, remove(){} } }; } };
const window = {}; const localStorage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
const getCurrentUser = () => null; const _supabase = { rpc(){ return Promise.resolve(); } };
`;
const G = new Function(STUB
  + fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8') + '\n'
  + fs.readFileSync(path.join(ROOT, 'js/sim-engine.js'), 'utf8') + '\n'
  + fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8')
  + ';return { generateMatches, simTeamsForSeason, MODERN_FORMAT, SIM_ENGINE_CURRENT };')();

const N = parseInt(process.argv[2] || '50000', 10);
const OPP = G.simTeamsForSeason(2025, 13);
const bal = o => ({ ovr: o, atk: o, mid: o, def: o, gk: o });

function measure(me, n) {
  let wins = 0, pts = 0, gf = 0, ga = 0, perfect = 0;
  for (let s = 0; s < n; s++) {
    const g = G.generateMatches(me, OPP, G.MODERN_FORMAT, 2);
    let w = 0, d = 0;
    g.matches.forEach(m => { gf += m.gf; ga += m.ga;
      if (m.outcome === 'W') w++; else if (m.outcome === 'D') d++; });
    wins += w; pts += w * 3 + d;
    if (g.matches.length === 36 && w === 36) perfect++;
  }
  return { w: wins / n, pts: pts / n, gf: gf / n, ga: ga / n, per300: perfect / n * 300 };
}

console.log(`engine ${G.SIM_ENGINE_CURRENT} · ${N.toLocaleString()} seasons per row\n`);
console.log('OVR | wins | pts | goals |  36-0 per 300 | spec');
const SPEC = { 84: 0.00, 85: 0.05, 86: 0.25, 87: 1.26, 88: 4.68, 89: 13.30, 90: 29.84 };
let fail = false;
for (const o of [84, 85, 86, 87, 88, 89, 90]) {
  const r = measure(bal(o), N);
  const want = SPEC[o];
  const ok = Math.abs(r.per300 - want) <= Math.max(0.6, want * 0.35);
  if (!ok) fail = true;
  console.log(`${o} | ${r.w.toFixed(1).padStart(4)} | ${r.pts.toFixed(0).padStart(3)} | `
    + `${(r.gf.toFixed(0) + ':' + r.ga.toFixed(0)).padStart(6)} | `
    + `${r.per300.toFixed(2).padStart(13)} | ${want.toFixed(2)} ${ok ? 'OK' : 'DRIFT'}`);
}

console.log('\nbuilds at OVR 88:');
const BUILDS = { attacking: [97,88,82,81], balanced: [88,88,88,88],
                 midfield: [85,96,86,86], defensive: [80,87,94,95] };
for (const [name, [atk, mid, def, gk]] of Object.entries(BUILDS)) {
  const r = measure({ ovr: 88, atk, mid, def, gk }, N);
  console.log(`  ${name.padEnd(10)} ${(r.gf.toFixed(0)+':'+r.ga.toFixed(0)).padStart(6)} `
    + `${r.pts.toFixed(0).padStart(4)} pts   36-0 ${r.per300.toFixed(2)} per 300`);
}
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it**

Run: `node scripts/sim/calibrate.js 50000`
Expected: every row `OK`; OVR 88 lands near `4.68`; the four builds show clearly different goal profiles (attacking near `94:20`, defensive near `75:3`) and points within about 3 of each other.

If a row reports `DRIFT`, the squad data has moved since the spec was written. Do not "fix" it by editing the SPEC table — re-tune `SIM2.KA` / `SIM2.KD` / `SIM2.MU_MAX` and update the spec's calibration section together.

- [ ] **Step 3: Commit**

```bash
git add scripts/sim/calibrate.js
git commit -m "test(sim): calibration harness asserting the spec's acceptance table"
```

---

### Task 10: Verify at the real surface

The project's hard-won lesson (`.claude/skills/verify/SKILL.md`): "parsing the inline script proves nothing — always click the thing." Two dead buttons shipped because a syntax check passed.

**Files:** none modified.

- [ ] **Step 1: Serve the site**

Run: `python -m http.server 8901 &` from the repo root.

- [ ] **Step 2: Drive a full draft to the results screen**

Copy the repo to the scratchpad, and before `</body>` in the copy's `index.html` append an auto-driver that starts a draft, auto-picks the first player each round, and opens the results:

```html
<script>
setTimeout(() => { document.getElementById('btn-start')?.click(); }, 500);
let guard = 0;
const tick = setInterval(() => {
  if (++guard > 40) return clearInterval(tick);
  const p = document.querySelector('#players-list .player-card');
  if (p) return p.click();
  const sim = document.getElementById('btn-simulate');
  if (sim) { sim.click(); clearInterval(tick); }
}, 120);
</script>
```

Then screenshot:
```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new \
  --disable-gpu --window-size=500,1400 --virtual-time-budget=20000 \
  --screenshot=results.png http://localhost:8901/index.html
```

- [ ] **Step 3: Read the screenshot and check three things**

Open `results.png` and confirm:
1. The match list renders scorelines, and goals-against are visibly low (a V2 season concedes single digits).
2. The league table renders with the player slotted in and no `NaN` or `undefined`.
3. The four line bars on the results card show the same numbers the engine used.

If the page is blank, check the browser console output — a `ReferenceError` from a missing `sim-engine.js` script tag is the likeliest cause and will not show up in any Node harness.

- [ ] **Step 4: Confirm the golden still holds and commit nothing**

Run: `node scripts/sim/golden-v1.js --check`
Expected: `GOLDEN OK`.

No commit — this task is verification only.

---

## Deliberately out of scope

- **Leagues and duels stay on V1.** `lgFriendRecord` and `duelComputeResult` recompute from a seed on every open, and their records live server-side without an `engine` column. Migrating them needs a stored stamp per league/room and is its own piece of work. Until then they call `generateMatches` with a plain number, which routes to V1 and cannot change.
- **Leaderboard UI segmentation.** Task 8 stamps `engine` into the result payload so the data is there. Adding a filter or separate board is a follow-up; without it the points board will mix scales.
- **Open calibration item #1 from the spec** — goals conceded are low (7 per season at OVR 88) and 5+ goal games dropped to 1% for balanced builds. Tune `SIM2.KD` against `SIM2.BASE` after the engine is live.
