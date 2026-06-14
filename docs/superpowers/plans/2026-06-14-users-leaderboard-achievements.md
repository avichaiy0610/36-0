# User System, Leaderboard & Achievements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase-backed user accounts, global leaderboard, and persistent achievements to the 36-0 Israeli Premier League fantasy draft game.

**Architecture:** Static vanilla JS frontend communicates with Supabase Auth for login, reads leaderboard/achievements directly via the Supabase JS client, and submits game results through a Supabase Edge Function that validates score data and grants achievements server-side.

**Tech Stack:** Supabase (Auth + PostgreSQL + Edge Functions), Supabase JS v2 (CDN), Deno (Edge Functions), vanilla JS, Hebrew RTL CSS

---

## File Map

**New files:**
- `supabase/migrations/001_initial.sql` — DB schema + RLS policies
- `supabase/migrations/002_seed_achievements.sql` — achievements seed data
- `supabase/functions/submit-result/index.ts` — Edge Function (score validation + achievement granting)
- `js/config.js` — Supabase URL + anon key
- `js/supabase-client.js` — Supabase client singleton (`_supabase` global)
- `js/auth.js` — Auth state, login/logout, username setup, nav bar wiring
- `js/achievements.js` — Achievements screen + toast notifications
- `js/leaderboard.js` — Leaderboard screen + squad view modal

**Modified files:**
- `index.html` — Nav bar, auth modal, username modal, achievements screen, leaderboard screen, squad modal, achievement toast, save-result section in results
- `js/game.js` — `submitResult()` call + save-result UI wiring after game ends
- `css/style.css` — All new UI styles

---

## Task 1: Supabase Project Setup

**Files:**
- Create: `js/config.js`

- [ ] **Step 1: Create Supabase project**

  1. Go to https://supabase.com and sign in
  2. Click "New Project"
  3. Name: `36-0`, Region: Europe West (closest to Israeli users)
  4. Save the generated database password somewhere safe
  5. Wait for project to finish provisioning (~2 minutes)

- [ ] **Step 2: Get project credentials**

  1. In Supabase dashboard → Settings → API
  2. Copy "Project URL" (looks like `https://xxxx.supabase.co`)
  3. Copy "anon public" key (the long JWT string under "Project API keys")

- [ ] **Step 3: Create config file**

  Create `js/config.js`:
  ```js
  const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
  const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
  ```
  Replace both values with what you copied in Step 2.

- [ ] **Step 4: Enable Google OAuth**

  1. Go to https://console.cloud.google.com → create a project
  2. APIs & Services → Credentials → Create Credentials → OAuth Client ID
  3. Application type: **Web application**
  4. Authorized redirect URIs: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
  5. Copy the Client ID and Client Secret
  6. In Supabase → Authentication → Providers → Google → enable, paste credentials, save

- [ ] **Step 5: Set site URL in Supabase**

  Authentication → URL Configuration:
  - Site URL: `http://localhost:5500` (your Live Server port)
  - Redirect URLs: add `http://localhost:5500`

  > When deploying to production, add the production URL here too.

- [ ] **Step 6: Install Supabase CLI**

  ```bash
  npm install -g supabase
  supabase login
  supabase link --project-ref YOUR_PROJECT_ID
  ```

- [ ] **Step 7: Commit config**

  ```bash
  git add js/config.js
  git commit -m "chore: add Supabase config"
  ```

---

## Task 2: Database Schema + RLS

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create migration file**

  Create `supabase/migrations/001_initial.sql`:

  ```sql
  -- profiles
  CREATE TABLE profiles (
    id         uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    username   text UNIQUE,
    avatar_url text,
    created_at timestamptz DEFAULT now()
  );

  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
  CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

  -- Auto-create profile row on signup
  CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    INSERT INTO profiles (id, avatar_url)
    VALUES (new.id, new.raw_user_meta_data->>'avatar_url');
    RETURN new;
  END;
  $$;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

  -- game_results
  CREATE TABLE game_results (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
    ovr        int NOT NULL CHECK (ovr BETWEEN 0 AND 99),
    wins       int NOT NULL CHECK (wins >= 0),
    draws      int NOT NULL CHECK (draws >= 0),
    losses     int NOT NULL CHECK (losses >= 0),
    points     int NOT NULL CHECK (points >= 0),
    gf         int NOT NULL CHECK (gf >= 0),
    ga         int NOT NULL CHECK (ga >= 0),
    formation  text NOT NULL,
    tier       text NOT NULL,
    settings   jsonb NOT NULL DEFAULT '{}',
    matches    jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz DEFAULT now()
  );

  ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "results_insert" ON game_results FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "results_select" ON game_results FOR SELECT USING (true);

  -- squads
  CREATE TABLE squads (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id  uuid REFERENCES game_results(id) ON DELETE CASCADE,
    user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
    players    jsonb NOT NULL DEFAULT '[]',
    is_public  boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
  );

  ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "squads_insert" ON squads FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "squads_select" ON squads FOR SELECT USING (is_public = true OR auth.uid() = user_id);

  -- achievements catalog (static data)
  CREATE TABLE achievements (
    key       text PRIMARY KEY,
    name_he   text NOT NULL,
    desc_he   text NOT NULL,
    icon      text NOT NULL,
    is_hidden boolean DEFAULT false
  );

  ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "achievements_select" ON achievements FOR SELECT USING (true);

  -- user_achievements
  CREATE TABLE user_achievements (
    user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_key text REFERENCES achievements(key),
    unlocked_at     timestamptz DEFAULT now(),
    result_id       uuid REFERENCES game_results(id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, achievement_key)
  );

  ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "ua_select" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
  -- INSERT only via service role (Edge Function) — browser client blocked
  CREATE POLICY "ua_insert" ON user_achievements FOR INSERT WITH CHECK (false);
  ```

- [ ] **Step 2: Apply migration**

  ```bash
  supabase db push
  ```

  Expected output: all migrations applied, no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add supabase/migrations/001_initial.sql
  git commit -m "feat: add database schema with RLS"
  ```

---

## Task 3: Seed Achievements

**Files:**
- Create: `supabase/migrations/002_seed_achievements.sql`

- [ ] **Step 1: Create seed file**

  Create `supabase/migrations/002_seed_achievements.sql`:

  ```sql
  INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
    ('perfect_season',      'עונה מושלמת',       'נצח בכל 36 המשחקים',                          '🏆', false),
    ('unbeaten_season',     'עונה ללא הפסד',     '36 משחקים ללא הפסד אחד',                      '🛡️', false),
    ('ovr_88',              'הרכב עילי',          'בנה הרכב עם OVR 88+',                         '⭐', false),
    ('ovr_90',              'הרכב האלים',         'בנה הרכב עם OVR 90+',                         '👑', false),
    ('clean_season',        'קיר ברזל',          'אפס שערים ספוגים בכל העונה',                  '🧤', false),
    ('century',             'מאה שערים',          'כבש 100+ שערים בעונה',                        '💯', false),
    ('hard_win',            'נצחון בקושי',        'הגע לדרגת אלוף במצב קשה',                    '💪', false),
    ('blind_win',           'ניצחון בעיוור',      'הגע לדרגת אלוף עם דירוגים מוסתרים',          '🙈', false),
    ('era_90s',             'גנרציית זהב',        'כל שחקני ההרכב משנות ה-90',                  '📼', false),
    ('mono_club',           'נאמנות אחת',         'כל שחקני ההרכב מאותה קבוצה',                 '❤️', false),
    ('tier_legend',         'אגדה',               'הגע לדרגה הגבוהה ביותר',                      '🌟', false),
    ('peak_master',         'מאסטר שיא',          'הגע ל-36-0 במצב שיא',                        '⚡', false),
    ('games_10',            'מתחיל',              'שחק 10 משחקים',                                '🎮', false),
    ('games_50',            'מכור',               'שחק 50 משחקים',                                '🔥', false),
    ('all_formations',      'טקטיקאי',            'ניסה את כל המערכים',                           '📋', false),
    ('all_clubs',           'ציידי כישרונות',     'שיחק עם כל קבוצה לפחות פעם',                 '🗺️', false),
    ('secret_perfect_hard', 'בלתי אפשרי',         'הגע ל-36-0 במצב קשה עם דירוגים מוסתרים',     '🔮', true),
    ('secret_big_score',    'גולאדור',            '10+ שערים במשחק אחד',                         '🎯', true),
    ('secret_peak_blind',   'אגדת אגדות',         '36-0 במצב שיא עם דירוגים מוסתרים',           '💎', true)
  ON CONFLICT (key) DO NOTHING;
  ```

- [ ] **Step 2: Apply seed**

  ```bash
  supabase db push
  ```

- [ ] **Step 3: Verify in Supabase dashboard**

  Table Editor → achievements → should show 19 rows.

- [ ] **Step 4: Commit**

  ```bash
  git add supabase/migrations/002_seed_achievements.sql
  git commit -m "feat: seed achievements catalog"
  ```

---

## Task 4: Edge Function — `submit-result`

**Files:**
- Create: `supabase/functions/submit-result/index.ts`

Before writing, find the tier names in `js/game.js`:
- Search for where the `tier` property is assigned to the results object (grep for `tier`)
- Note the string value used for the highest tier (used for `tier_legend`)
- Note which tiers qualify as "champion level" for `hard_win` / `blind_win`
- Update `HIGHEST_TIER` and `CHAMPION_TIERS` constants accordingly before deploying

- [ ] **Step 1: Create function scaffold**

  ```bash
  supabase functions new submit-result
  ```

- [ ] **Step 2: Write the function**

  Replace `supabase/functions/submit-result/index.ts` with:

  ```typescript
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // UPDATE these to match the tier strings in js/game.js
  const HIGHEST_TIER = 'אלוף';
  const CHAMPION_TIERS = ['אלוף', 'מעולה'];

  const ALL_FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2'];

  interface MatchResult { gf: number; ga: number; venue: string; }
  interface Settings {
    difficulty: string;
    era_min: number;
    era_max: number;
    peak_mode: boolean;
    ratings_visible: boolean;
  }
  interface Player { teamId: string; season: string; name: string; pos: string; ovr: number; slotId: string; }

  interface Payload {
    ovr: number;
    wins: number; draws: number; losses: number;
    points: number; gf: number; ga: number;
    formation: string;
    tier: string;
    settings: Settings;
    players: Player[];
    matches: MatchResult[];
    all_club_ids: string[];
    is_public: boolean;
  }

  function validate(p: Payload): string | null {
    if (p.wins + p.draws + p.losses !== 36) return 'total games must equal 36';
    if (p.points !== p.wins * 3 + p.draws) return 'points mismatch';
    if (p.ovr < 0 || p.ovr > 99) return 'ovr out of range';
    if (!Array.isArray(p.matches) || p.matches.length !== 36) return 'matches must have 36 entries';
    if (!Array.isArray(p.players) || p.players.length !== 11) return 'squad must have 11 players';
    return null;
  }

  function computeAchievements(
    p: Payload,
    gamesPlayed: number,
    usedFormations: string[],
    usedClubs: string[],
  ): string[] {
    const earned: string[] = [];
    const allTeams = p.players.map(pl => pl.teamId);
    const uniqueTeams = [...new Set(allTeams)];
    const seasonYears = p.players.map(pl => parseInt((pl.season ?? '').split('/')[0]));
    const maxMatchGf = Math.max(...p.matches.map(m => m.gf));

    if (p.wins === 36)                                                            earned.push('perfect_season');
    if (p.losses === 0)                                                           earned.push('unbeaten_season');
    if (p.ovr >= 88)                                                              earned.push('ovr_88');
    if (p.ovr >= 90)                                                              earned.push('ovr_90');
    if (p.ga === 0)                                                               earned.push('clean_season');
    if (p.gf >= 100)                                                              earned.push('century');
    if (CHAMPION_TIERS.includes(p.tier) && p.settings.difficulty === 'hard')     earned.push('hard_win');
    if (CHAMPION_TIERS.includes(p.tier) && !p.settings.ratings_visible)          earned.push('blind_win');
    if (seasonYears.every(y => !isNaN(y) && y >= 1990 && y < 2000))             earned.push('era_90s');
    if (uniqueTeams.length === 1)                                                 earned.push('mono_club');
    if (p.tier === HIGHEST_TIER)                                                  earned.push('tier_legend');
    if (p.wins === 36 && p.settings.peak_mode)                                   earned.push('peak_master');
    if (gamesPlayed >= 10)                                                        earned.push('games_10');
    if (gamesPlayed >= 50)                                                        earned.push('games_50');
    if (ALL_FORMATIONS.every(f => usedFormations.includes(f)))                   earned.push('all_formations');
    if (p.all_club_ids?.length && p.all_club_ids.every(c => usedClubs.includes(c))) earned.push('all_clubs');
    // hidden
    if (p.wins === 36 && p.settings.difficulty === 'hard' && !p.settings.ratings_visible) earned.push('secret_perfect_hard');
    if (maxMatchGf >= 10)                                                          earned.push('secret_big_score');
    if (p.wins === 36 && p.settings.peak_mode && !p.settings.ratings_visible)    earned.push('secret_peak_blind');

    return earned;
  }

  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

      const payload: Payload = await req.json();
      const validationError = validate(payload);
      if (validationError) {
        return new Response(JSON.stringify({ error: validationError }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: result, error: resultError } = await supabase
        .from('game_results')
        .insert({
          user_id: user.id,
          ovr: payload.ovr,
          wins: payload.wins, draws: payload.draws, losses: payload.losses,
          points: payload.points, gf: payload.gf, ga: payload.ga,
          formation: payload.formation,
          tier: payload.tier,
          settings: payload.settings,
          matches: payload.matches,
        })
        .select('id')
        .single();
      if (resultError) throw resultError;

      await supabase.from('squads').insert({
        result_id: result.id,
        user_id: user.id,
        players: payload.players,
        is_public: payload.is_public ?? false,
      });

      const { data: pastResults } = await supabase
        .from('game_results')
        .select('formation')
        .eq('user_id', user.id);

      const { data: pastSquads } = await supabase
        .from('squads')
        .select('players')
        .eq('user_id', user.id);

      const gamesPlayed = pastResults?.length ?? 0;
      const usedFormations = [...new Set((pastResults ?? []).map((r: any) => r.formation))];
      const usedClubs = [...new Set(
        (pastSquads ?? []).flatMap((s: any) => (s.players as Player[]).map(p => p.teamId))
      )];

      const earned = computeAchievements(payload, gamesPlayed, usedFormations, usedClubs);

      const { data: existing } = await supabase
        .from('user_achievements')
        .select('achievement_key')
        .eq('user_id', user.id);

      const alreadyHas = new Set((existing ?? []).map((r: any) => r.achievement_key));
      const newAchievements = earned.filter(k => !alreadyHas.has(k));

      if (newAchievements.length > 0) {
        await supabase.from('user_achievements').insert(
          newAchievements.map(key => ({ user_id: user.id, achievement_key: key, result_id: result.id }))
        );
      }

      return new Response(
        JSON.stringify({ result_id: result.id, new_achievements: newAchievements }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  });
  ```

- [ ] **Step 3: Deploy**

  ```bash
  supabase functions deploy submit-result --no-verify-jwt
  ```

  Expected: "Deployed Functions submit-result"

- [ ] **Step 4: Test validation rejection**

  Get a user JWT: Supabase dashboard → Authentication → Users → pick a user → copy JWT.

  ```bash
  curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/submit-result \
    -H "Authorization: Bearer YOUR_JWT" \
    -H "apikey: YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"wins":10,"draws":0,"losses":0,"points":30,"gf":20,"ga":5,"ovr":80,"formation":"4-3-3","tier":"טוב","settings":{},"players":[],"matches":[],"all_club_ids":[],"is_public":false}'
  ```

  Expected:
  ```json
  {"error":"total games must equal 36"}
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add supabase/functions/submit-result/index.ts
  git commit -m "feat: add submit-result edge function with validation and achievements"
  ```

---

## Task 5: Frontend — Supabase Client Init

**Files:**
- Create: `js/supabase-client.js`
- Modify: `index.html`

- [ ] **Step 1: Create client module**

  Create `js/supabase-client.js`:

  ```js
  const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  ```

- [ ] **Step 2: Add script tags to index.html**

  In `index.html`, just before `<script src="js/data.js">`, add:

  ```html
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="js/config.js"></script>
  <script src="js/supabase-client.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/achievements.js"></script>
  <script src="js/leaderboard.js"></script>
  ```

- [ ] **Step 3: Verify in browser console**

  Open site via Live Server, open DevTools console, run:
  ```js
  _supabase.auth.getSession().then(r => console.log(r))
  ```
  Expected: `{ data: { session: null }, error: null }`

- [ ] **Step 4: Commit**

  ```bash
  git add js/supabase-client.js index.html
  git commit -m "feat: initialize Supabase client"
  ```

---

## Task 6: Auth Module + UI

**Files:**
- Create: `js/auth.js`
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Add nav bar and modal HTML to index.html**

  In `index.html`, immediately after `<body>`, before any `<div id="screen-...">`, add:

  ```html
  <!-- ══ NAV BAR ═══════════════════════════════════════════════════════════════ -->
  <nav id="app-nav" class="app-nav">
    <div class="nav-logo" dir="ltr">36–0</div>
    <div class="nav-actions">
      <button class="nav-btn" id="nav-leaderboard">לוח שיאים</button>
      <button class="nav-btn" id="nav-achievements">הישגים</button>
      <div class="nav-user" id="nav-user" style="display:none">
        <img class="nav-avatar" id="nav-avatar" src="" alt="" style="display:none">
        <span class="nav-username" id="nav-username"></span>
        <button class="nav-btn nav-btn-sm" id="nav-logout">יציאה</button>
      </div>
      <button class="nav-btn nav-btn-primary" id="nav-login">התחבר</button>
    </div>
  </nav>

  <!-- ══ AUTH MODAL ════════════════════════════════════════════════════════════ -->
  <div id="auth-modal" class="modal-overlay" style="display:none">
    <div class="modal-box">
      <button class="modal-close" id="auth-modal-close">✕</button>
      <div class="modal-title">כניסה / הרשמה</div>
      <button class="auth-google-btn" id="auth-google-btn">
        <span>G</span> כניסה עם Google
      </button>
      <div class="auth-divider">או</div>
      <div class="auth-tabs">
        <button class="auth-tab selected" data-tab="login">כניסה</button>
        <button class="auth-tab" data-tab="register">הרשמה</button>
      </div>
      <div id="auth-login-form">
        <input class="auth-input" type="email" id="auth-email" placeholder="אימייל" dir="ltr">
        <input class="auth-input" type="password" id="auth-password" placeholder="סיסמה" dir="ltr">
        <button class="btn-primary btn-full" id="auth-submit-login">כניסה</button>
      </div>
      <div id="auth-register-form" style="display:none">
        <input class="auth-input" type="email" id="auth-reg-email" placeholder="אימייל" dir="ltr">
        <input class="auth-input" type="password" id="auth-reg-password" placeholder="סיסמה (6+ תווים)" dir="ltr">
        <button class="btn-primary btn-full" id="auth-submit-register">הרשמה</button>
      </div>
      <div class="auth-error" id="auth-error" style="display:none"></div>
    </div>
  </div>

  <!-- ══ USERNAME MODAL ════════════════════════════════════════════════════════ -->
  <div id="username-modal" class="modal-overlay" style="display:none">
    <div class="modal-box">
      <div class="modal-title">בחר שם משתמש</div>
      <div class="modal-sub">השם יוצג ב-Leaderboard</div>
      <input class="auth-input" type="text" id="username-input" placeholder="שם משתמש" maxlength="20">
      <button class="btn-primary btn-full" id="username-submit">שמור</button>
      <div class="auth-error" id="username-error" style="display:none"></div>
    </div>
  </div>
  ```

- [ ] **Step 2: Add achievement toast HTML**

  In `index.html`, just before the closing `</body>` tag, add:

  ```html
  <!-- ══ ACHIEVEMENT TOAST ══════════════════════════════════════════════════════ -->
  <div id="achievement-toast" class="achievement-toast" style="display:none">
    <div class="toast-icon" id="toast-icon">🏆</div>
    <div class="toast-text">
      <div class="toast-label">הישג חדש!</div>
      <div class="toast-name" id="toast-name"></div>
    </div>
  </div>
  ```

- [ ] **Step 3: Create js/auth.js**

  Create `js/auth.js`:

  ```js
  let currentUser = null;

  async function initAuth() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session?.user) await onSignIn(session.user);
    else showLoginButton();

    _supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) await onSignIn(session.user);
      if (event === 'SIGNED_OUT') onSignOut();
    });

    document.getElementById('nav-login').addEventListener('click', () => {
      document.getElementById('auth-modal').style.display = 'flex';
    });
    document.getElementById('auth-modal-close').addEventListener('click', () => {
      document.getElementById('auth-modal').style.display = 'none';
    });
    document.getElementById('nav-logout').addEventListener('click', () => _supabase.auth.signOut());

    document.getElementById('auth-google-btn').addEventListener('click', () => {
      _supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname },
      });
    });

    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('selected'));
        tab.classList.add('selected');
        document.getElementById('auth-login-form').style.display   = tab.dataset.tab === 'login'    ? 'block' : 'none';
        document.getElementById('auth-register-form').style.display = tab.dataset.tab === 'register' ? 'block' : 'none';
        document.getElementById('auth-error').style.display = 'none';
      });
    });

    document.getElementById('auth-submit-login').addEventListener('click', async () => {
      const email    = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const { error } = await _supabase.auth.signInWithPassword({ email, password });
      if (error) showAuthError(error.message);
      else document.getElementById('auth-modal').style.display = 'none';
    });

    document.getElementById('auth-submit-register').addEventListener('click', async () => {
      const email    = document.getElementById('auth-reg-email').value.trim();
      const password = document.getElementById('auth-reg-password').value;
      const { error } = await _supabase.auth.signUp({ email, password });
      if (error) showAuthError(error.message);
      else {
        document.getElementById('auth-modal').style.display = 'none';
        alert('בדוק את האימייל שלך לאישור ההרשמה');
      }
    });

    document.getElementById('username-submit').addEventListener('click', saveUsername);
    document.getElementById('nav-leaderboard').addEventListener('click', showLeaderboard);
    document.getElementById('nav-achievements').addEventListener('click', showAchievements);
  }

  async function onSignIn(user) {
    currentUser = user;
    const { data: profile } = await _supabase
      .from('profiles').select('username, avatar_url').eq('id', user.id).single();
    if (!profile?.username) {
      document.getElementById('username-modal').style.display = 'flex';
    } else {
      updateNavUser(profile.username, profile.avatar_url);
    }
  }

  function onSignOut() {
    currentUser = null;
    showLoginButton();
  }

  function showLoginButton() {
    document.getElementById('nav-user').style.display  = 'none';
    document.getElementById('nav-login').style.display = 'inline-flex';
  }

  function updateNavUser(username, avatarUrl) {
    document.getElementById('nav-user').style.display  = 'flex';
    document.getElementById('nav-login').style.display = 'none';
    document.getElementById('nav-username').textContent = username;
    const avatar = document.getElementById('nav-avatar');
    if (avatarUrl) { avatar.src = avatarUrl; avatar.style.display = 'inline-block'; }
  }

  async function saveUsername() {
    const username = document.getElementById('username-input').value.trim();
    const errEl    = document.getElementById('username-error');
    if (username.length < 2) {
      errEl.textContent = 'שם חייב להכיל לפחות 2 תווים';
      errEl.style.display = 'block';
      return;
    }
    const { error } = await _supabase.from('profiles').update({ username }).eq('id', currentUser.id);
    if (error) {
      errEl.textContent = error.code === '23505' ? 'שם זה כבר תפוס' : error.message;
      errEl.style.display = 'block';
    } else {
      document.getElementById('username-modal').style.display = 'none';
      updateNavUser(username, null);
    }
  }

  function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
  }

  function getCurrentUser() { return currentUser; }

  document.addEventListener('DOMContentLoaded', initAuth);
  ```

- [ ] **Step 4: Add nav + modal CSS to css/style.css**

  Add to the bottom of `css/style.css`:

  ```css
  /* ── Nav Bar ─────────────────────────────────────────────────────────────── */
  .app-nav {
    position: fixed; top: 0; left: 0; right: 0; height: 48px;
    background: #1a1a2e; border-bottom: 1px solid #333;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px; z-index: 100; direction: rtl;
  }
  .nav-logo { font-weight: 900; font-size: 1.1rem; color: #fff; letter-spacing: 1px; }
  .nav-actions { display: flex; align-items: center; gap: 8px; }
  .nav-btn {
    background: transparent; border: 1px solid #444; color: #ccc;
    padding: 4px 12px; border-radius: 6px; cursor: pointer;
    font-size: 0.85rem; font-family: inherit; transition: background 0.15s;
  }
  .nav-btn:hover { background: #2a2a4e; color: #fff; }
  .nav-btn-primary { background: #4CAF50; border-color: #4CAF50; color: #fff; }
  .nav-btn-primary:hover { background: #45a049; }
  .nav-btn-sm { padding: 2px 8px; font-size: 0.75rem; }
  .nav-user { display: flex; align-items: center; gap: 8px; }
  .nav-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
  .nav-username { color: #fff; font-size: 0.9rem; }

  .screen { padding-top: 48px; }

  /* ── Modals ──────────────────────────────────────────────────────────────── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; direction: rtl;
  }
  .modal-box {
    background: #1e1e3a; border: 1px solid #333; border-radius: 12px;
    padding: 28px 24px; width: 340px; max-width: 90vw; position: relative;
  }
  .modal-close {
    position: absolute; top: 12px; left: 12px;
    background: none; border: none; color: #aaa; font-size: 1.1rem; cursor: pointer;
  }
  .modal-title { font-size: 1.2rem; font-weight: 700; color: #fff; margin-bottom: 8px; text-align: center; }
  .modal-sub   { font-size: 0.85rem; color: #aaa; text-align: center; margin-bottom: 16px; }

  .auth-google-btn {
    width: 100%; padding: 10px; background: #fff; color: #333;
    border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    gap: 8px; margin-bottom: 12px;
  }
  .auth-google-btn span { font-weight: 900; color: #4285F4; }
  .auth-divider { text-align: center; color: #666; margin: 8px 0; font-size: 0.85rem; }
  .auth-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
  .auth-tab {
    flex: 1; padding: 6px; background: transparent; border: 1px solid #444;
    color: #aaa; border-radius: 6px; cursor: pointer; font-family: inherit;
  }
  .auth-tab.selected { background: #4CAF50; border-color: #4CAF50; color: #fff; }
  .auth-input {
    width: 100%; padding: 10px 12px; background: #13132a; border: 1px solid #444;
    border-radius: 8px; color: #fff; font-size: 0.9rem; margin-bottom: 10px;
    box-sizing: border-box; font-family: inherit;
  }
  .auth-error { color: #e74c3c; font-size: 0.8rem; margin-top: 8px; text-align: center; }

  /* ── Achievement Toast ───────────────────────────────────────────────────── */
  .achievement-toast {
    position: fixed; bottom: 24px; right: 24px;
    background: #1e1e3a; border: 1px solid #4CAF50; border-radius: 12px;
    padding: 14px 18px; display: flex; align-items: center; gap: 12px;
    direction: rtl; z-index: 300; box-shadow: 0 4px 20px rgba(76,175,80,0.3);
    animation: toast-in 0.3s ease;
  }
  @keyframes toast-in {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  .toast-icon  { font-size: 2rem; }
  .toast-label { font-size: 0.7rem; color: #4CAF50; font-weight: 700; margin-bottom: 2px; }
  .toast-name  { font-size: 1rem; color: #fff; font-weight: 600; }
  ```

- [ ] **Step 5: Manual test**

  1. Open site via Live Server (not file://)
  2. Nav bar appears at top of all screens
  3. "התחבר" button visible when not logged in
  4. Click "התחבר" → auth modal opens with Google + email options
  5. Sign in with Google → redirects back → username modal appears
  6. Enter username → nav shows username
  7. Click "יציאה" → nav resets to "התחבר"

- [ ] **Step 6: Commit**

  ```bash
  git add js/auth.js index.html css/style.css
  git commit -m "feat: add auth module, nav bar, login and username modals"
  ```

---

## Task 7: Game Integration — Submit Result

**Files:**
- Create: `js/achievements.js` (toast function + placeholder for screen)
- Modify: `js/game.js`
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Create js/achievements.js with toast**

  Create `js/achievements.js`:

  ```js
  async function showAchievementToasts(achievementKeys) {
    if (!achievementKeys?.length) return;
    const { data: achs } = await _supabase
      .from('achievements')
      .select('key, name_he, icon')
      .in('key', achievementKeys);
    for (const ach of (achs ?? [])) {
      await showSingleToast(ach);
    }
  }

  function showSingleToast(ach) {
    return new Promise(resolve => {
      const toast = document.getElementById('achievement-toast');
      document.getElementById('toast-icon').textContent = ach.icon;
      document.getElementById('toast-name').textContent = ach.name_he;
      toast.style.display = 'flex';
      setTimeout(() => { toast.style.display = 'none'; resolve(); }, 3500);
    });
  }

  async function showAchievements() {
    // Implemented in Task 8
  }
  ```

- [ ] **Step 2: Add submitResult to game.js**

  At the very end of `js/game.js`, after all existing code, add:

  ```js
  async function submitResult(resultData) {
    const user = getCurrentUser();
    if (!user) return;
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return;

    const isPublic = document.getElementById('share-squad-checkbox')?.checked ?? false;

    const payload = {
      ovr:       resultData.ovr,
      wins:      resultData.wins,
      draws:     resultData.draws,
      losses:    resultData.losses,
      points:    resultData.points,
      gf:        resultData.gf,
      ga:        resultData.ga,
      formation: resultData.formation,
      tier:      resultData.tier,
      settings: {
        difficulty:      resultData.difficulty,
        era_min:         resultData.eraMin,
        era_max:         resultData.eraMax,
        peak_mode:       resultData.peakMode,
        ratings_visible: resultData.ratingsVisible,
      },
      players: resultData.players.map(p => ({
        teamId: p.teamId, season: p.season,
        name: p.name, pos: p.pos, ovr: p.ovr, slotId: p.slotId,
      })),
      matches: resultData.matches.map(m => ({ gf: m.gf, ga: m.ga, venue: m.venue })),
      all_club_ids: Object.keys(TEAMS),
      is_public: isPublic,
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.new_achievements?.length) await showAchievementToasts(json.new_achievements);
    } catch (err) {
      console.error('Failed to submit result:', err);
    }
  }
  ```

  > **Note on `resultData` shape:** After adding this function, find where `screen-results` is shown in `game.js` (search for `screen-results` or `showScreen`). The `resultData` object must be constructed from the game's state variables at that point. Map the game's internal variable names to the shape above:
  > - `ovr` → the final team OVR value
  > - `wins/draws/losses` → match counters
  > - `points` → `wins * 3 + draws`
  > - `gf/ga` → total goals for/against
  > - `formation` → current formation key (e.g. `'4-3-3'`)
  > - `tier` → tier name string
  > - `difficulty/eraMin/eraMax/peakMode/ratingsVisible` → setup options
  > - `players` → array of 11 picked players, each with `teamId`, `season`, `name`, `pos`, `ovr`, `slotId`
  > - `matches` → array of 36 match result objects, each with `gf`, `ga`, `venue`

- [ ] **Step 3: Add save-result section to index.html results screen**

  In `index.html`, find `<div class="results-actions">` and add before the existing buttons:

  ```html
  <div id="save-result-section" class="save-result-section" style="display:none">
    <label class="save-check-label">
      <input type="checkbox" id="share-squad-checkbox">
      שתף את ההרכב שלי (יוצג ב-Leaderboard)
    </label>
    <button class="btn-primary" id="btn-save-result">שמור ב-Leaderboard</button>
  </div>
  <div id="save-login-prompt" class="save-login-prompt" style="display:none">
    <span>התחבר כדי לשמור את התוצאה</span>
    <button class="nav-btn nav-btn-primary" id="save-login-btn">התחבר</button>
  </div>
  ```

- [ ] **Step 4: Add save-result CSS**

  Add to `css/style.css`:

  ```css
  /* ── Save Result ─────────────────────────────────────────────────────────── */
  .save-result-section { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
  .save-check-label { display: flex; align-items: center; gap: 8px; color: #ccc; font-size: 0.9rem; cursor: pointer; }
  .save-check-label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
  .save-login-prompt {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; background: #1a1a2e; border-radius: 8px;
    color: #ccc; font-size: 0.85rem; margin-bottom: 12px;
  }
  ```

- [ ] **Step 5: Wire save button in game.js**

  In `js/game.js`, find the code that transitions to the results screen (shows `screen-results`). Immediately after that transition, add the following block. Replace the `buildResultData()` call with the actual object from the game state:

  ```js
  // Wire up save-to-leaderboard section
  (function setupSaveSection() {
    const user = getCurrentUser();
    const saveSection   = document.getElementById('save-result-section');
    const loginPrompt   = document.getElementById('save-login-prompt');
    if (user) {
      saveSection.style.display = 'flex';
      loginPrompt.style.display = 'none';
    } else {
      saveSection.style.display = 'none';
      loginPrompt.style.display = 'flex';
      document.getElementById('save-login-btn').onclick = () => {
        document.getElementById('auth-modal').style.display = 'flex';
      };
    }
    const saveBtn = document.getElementById('btn-save-result');
    saveBtn.disabled = false;
    saveBtn.textContent = 'שמור ב-Leaderboard';
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'שומר...';
      // Replace the object literal below with the actual game state variables
      await submitResult({
        ovr: /* finalOvr */,
        wins: /* wins */, draws: /* draws */, losses: /* losses */,
        points: /* points */, gf: /* goalsFor */, ga: /* goalsAgainst */,
        formation: /* currentFormation */,
        tier: /* tierName */,
        difficulty: /* selectedDifficulty */,
        eraMin: /* eraMin */, eraMax: /* eraMax */,
        peakMode: /* peakModeOn */,
        ratingsVisible: /* ratingsVisible */,
        players: /* pickedPlayers array */,
        matches: /* matchResults array */,
      });
      saveBtn.textContent = '✓ נשמר!';
    };
  })();
  ```

- [ ] **Step 6: Manual test**

  1. Play a full game to the results screen
  2. If logged in: "שמור ב-Leaderboard" button appears
  3. Click it → button shows "שומר..." then "✓ נשמר!"
  4. If any achievements earned → toast appears
  5. Check Supabase dashboard → `game_results` table → new row present

- [ ] **Step 7: Commit**

  ```bash
  git add js/game.js js/achievements.js index.html css/style.css
  git commit -m "feat: submit game result with achievement toasts"
  ```

---

## Task 8: Achievements Screen

**Files:**
- Modify: `js/achievements.js`
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Add achievements screen HTML to index.html**

  After the share modal closing `</div>`, add:

  ```html
  <!-- ══ ACHIEVEMENTS SCREEN ════════════════════════════════════════════════════ -->
  <div id="screen-achievements" class="screen screen-page" style="display:none">
    <div class="page-inner">
      <div class="page-header">
        <button class="back-btn" id="achievements-back">→ חזרה</button>
        <h2 class="page-title">הישגים</h2>
      </div>
      <div id="achievements-grid" class="achievements-grid"></div>
    </div>
  </div>
  ```

- [ ] **Step 2: Implement showAchievements in achievements.js**

  Replace the placeholder `showAchievements` function in `js/achievements.js` with:

  ```js
  async function showAchievements() {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    const screen = document.getElementById('screen-achievements');
    screen.style.display = 'flex';
    const grid = document.getElementById('achievements-grid');
    grid.innerHTML = '<div class="page-loading">טוען...</div>';

    document.getElementById('achievements-back').onclick = () => {
      screen.style.display = 'none';
      document.getElementById('screen-welcome').style.display = 'flex';
    };

    const { data: allAchs } = await _supabase
      .from('achievements')
      .select('*')
      .order('is_hidden', { ascending: true });

    let unlockedMap = {};
    const user = getCurrentUser();
    if (user) {
      const { data: unlocked } = await _supabase
        .from('user_achievements')
        .select('achievement_key, unlocked_at')
        .eq('user_id', user.id);
      (unlocked ?? []).forEach(u => { unlockedMap[u.achievement_key] = u.unlocked_at; });
    }

    grid.innerHTML = '';

    if (!user) {
      const note = document.createElement('p');
      note.className = 'page-note';
      note.textContent = 'התחבר כדי לראות את ההישגים שלך';
      grid.appendChild(note);
    }

    (allAchs ?? []).forEach(ach => {
      const isUnlocked       = !!unlockedMap[ach.key];
      const isHiddenAndLocked = ach.is_hidden && !isUnlocked;
      const card = document.createElement('div');
      card.className = `ach-card ${isUnlocked ? 'ach-unlocked' : 'ach-locked'}`;
      card.innerHTML = `
        <div class="ach-icon">${isHiddenAndLocked ? '❓' : ach.icon}</div>
        <div class="ach-info">
          <div class="ach-name">${isHiddenAndLocked ? '???' : ach.name_he}</div>
          <div class="ach-desc">${isHiddenAndLocked ? '' : ach.desc_he}</div>
          ${isUnlocked ? `<div class="ach-date">${new Date(unlockedMap[ach.key]).toLocaleDateString('he-IL')}</div>` : ''}
        </div>
      `;
      grid.appendChild(card);
    });
  }
  ```

- [ ] **Step 3: Add achievements CSS**

  Add to `css/style.css`:

  ```css
  /* ── Page Screens (achievements, leaderboard) ────────────────────────────── */
  .screen-page { display: flex; flex-direction: column; min-height: 100vh; background: #0d0d1a; }
  .page-inner  { max-width: 600px; margin: 0 auto; padding: 24px 16px; width: 100%; box-sizing: border-box; }
  .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; direction: rtl; }
  .page-title  { font-size: 1.4rem; font-weight: 700; color: #fff; margin: 0; flex: 1; text-align: center; }
  .back-btn    { background: none; border: 1px solid #444; color: #aaa; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-family: inherit; }
  .page-loading { color: #666; text-align: center; padding: 40px; }
  .page-note   { color: #aaa; text-align: center; font-size: 0.9rem; margin-bottom: 20px; }

  /* ── Achievements Grid ───────────────────────────────────────────────────── */
  .achievements-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; direction: rtl; }
  .ach-card {
    border-radius: 10px; padding: 16px 12px;
    display: flex; align-items: flex-start; gap: 12px; border: 1px solid #333;
  }
  .ach-unlocked { background: #1a2a1a; border-color: #4CAF50; }
  .ach-locked   { background: #141425; opacity: 0.6; }
  .ach-icon  { font-size: 1.8rem; flex-shrink: 0; }
  .ach-info  { display: flex; flex-direction: column; gap: 2px; }
  .ach-name  { font-size: 0.9rem; font-weight: 700; color: #fff; }
  .ach-desc  { font-size: 0.75rem; color: #aaa; line-height: 1.3; }
  .ach-date  { font-size: 0.7rem; color: #4CAF50; margin-top: 4px; }
  ```

- [ ] **Step 4: Manual test**

  1. Click "הישגים" in nav bar
  2. All 19 achievements appear in grid
  3. Not logged in → note at top, all appear locked
  4. Logged in → unlocked ones appear green with date, hidden locked show ❓ / ???
  5. Click "→ חזרה" → returns to welcome screen

- [ ] **Step 5: Commit**

  ```bash
  git add js/achievements.js index.html css/style.css
  git commit -m "feat: achievements screen with locked/hidden/unlocked states"
  ```

---

## Task 9: Leaderboard Screen

**Files:**
- Create: `js/leaderboard.js`
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Add leaderboard and squad modal HTML**

  In `index.html`, after the achievements screen, add:

  ```html
  <!-- ══ LEADERBOARD SCREEN ════════════════════════════════════════════════════ -->
  <div id="screen-leaderboard" class="screen screen-page" style="display:none">
    <div class="page-inner lb-inner">
      <div class="page-header">
        <button class="back-btn" id="leaderboard-back">→ חזרה</button>
        <h2 class="page-title">לוח שיאים</h2>
      </div>
      <div class="lb-tabs">
        <button class="lb-tab selected" data-tab="ovr">🏅 OVR</button>
        <button class="lb-tab" data-tab="points">⚽ נקודות</button>
      </div>
      <div class="lb-filters">
        <button class="lb-filter selected" data-period="all">כל הזמנים</button>
        <button class="lb-filter" data-period="month">החודש</button>
        <button class="lb-filter" data-period="week">השבוע</button>
      </div>
      <div id="leaderboard-table" class="lb-table"></div>
    </div>
  </div>

  <!-- ══ SQUAD VIEW MODAL ═══════════════════════════════════════════════════════ -->
  <div id="squad-modal" class="modal-overlay" style="display:none">
    <div class="modal-box squad-modal-box">
      <button class="modal-close" id="squad-modal-close">✕</button>
      <div class="modal-title" id="squad-modal-title">הרכב</div>
      <div id="squad-modal-pitch"></div>
    </div>
  </div>
  ```

- [ ] **Step 2: Create js/leaderboard.js**

  Create `js/leaderboard.js`:

  ```js
  let lbTab    = 'ovr';
  let lbPeriod = 'all';

  async function showLeaderboard() {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    const screen = document.getElementById('screen-leaderboard');
    screen.style.display = 'flex';

    document.getElementById('leaderboard-back').onclick = () => {
      screen.style.display = 'none';
      document.getElementById('screen-welcome').style.display = 'flex';
    };

    document.querySelectorAll('.lb-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('selected'));
        tab.classList.add('selected');
        lbTab = tab.dataset.tab;
        loadLeaderboard();
      });
    });

    document.querySelectorAll('.lb-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.lb-filter').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        lbPeriod = btn.dataset.period;
        loadLeaderboard();
      });
    });

    document.getElementById('squad-modal-close').onclick = () => {
      document.getElementById('squad-modal').style.display = 'none';
    };

    loadLeaderboard();
  }

  async function loadLeaderboard() {
    const table = document.getElementById('leaderboard-table');
    table.innerHTML = '<div class="page-loading">טוען...</div>';

    const orderCol = lbTab === 'ovr' ? 'ovr' : 'points';
    let query = _supabase
      .from('game_results')
      .select('id, ovr, wins, draws, losses, points, gf, ga, formation, tier, created_at, profiles(username, avatar_url)')
      .order(orderCol, { ascending: false })
      .limit(100);

    if (lbPeriod === 'week') {
      query = query.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
    } else if (lbPeriod === 'month') {
      query = query.gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
    }

    const { data: rows, error } = await query;
    if (error || !rows?.length) {
      table.innerHTML = '<div class="page-loading">אין תוצאות עדיין</div>';
      return;
    }

    // Best result per user
    const seen = new Set();
    const best = [];
    for (const row of rows) {
      const uid = row.profiles?.username ?? row.id;
      if (!seen.has(uid)) { seen.add(uid); best.push(row); }
    }

    table.innerHTML = '';
    best.forEach((row, i) => {
      const rank     = i + 1;
      const username = row.profiles?.username ?? 'אנונימי';
      const mainStat = lbTab === 'ovr' ? `OVR ${row.ovr}` : `${row.points} נק׳`;
      const subStat  = lbTab === 'ovr'
        ? `${row.wins}נ ${row.draws}ת ${row.losses}ה`
        : `OVR ${row.ovr} · ${row.formation}`;

      const tr = document.createElement('div');
      tr.className = 'lb-row';
      tr.innerHTML = `
        <span class="lb-rank ${rank <= 3 ? 'lb-rank-top' : ''}">${rank}</span>
        <span class="lb-name">${username}</span>
        <span class="lb-stat">${mainStat}</span>
        <span class="lb-sub">${subStat}</span>
        <button class="lb-view-btn" data-id="${row.id}" data-user="${username}">הרכב</button>
      `;
      tr.querySelector('.lb-view-btn').addEventListener('click', e => {
        openSquadModal(e.target.dataset.id, e.target.dataset.user);
      });
      table.appendChild(tr);
    });
  }

  async function openSquadModal(resultId, username) {
    const { data: squad } = await _supabase
      .from('squads')
      .select('players')
      .eq('result_id', resultId)
      .eq('is_public', true)
      .single();

    document.getElementById('squad-modal-title').textContent = `הרכב של ${username}`;
    const pitch = document.getElementById('squad-modal-pitch');

    if (!squad?.players?.length) {
      pitch.innerHTML = '<p class="page-note">המשתמש לא שיתף את ההרכב</p>';
    } else {
      const list = document.createElement('div');
      list.className = 'squad-player-list';
      squad.players.forEach(p => {
        const item = document.createElement('div');
        item.className = 'squad-player-item';
        item.innerHTML = `
          <span class="sq-pos">${p.pos}</span>
          <span class="sq-name">${p.name}</span>
          <span class="sq-ovr">${p.ovr}</span>
        `;
        list.appendChild(item);
      });
      pitch.innerHTML = '';
      pitch.appendChild(list);
    }

    document.getElementById('squad-modal').style.display = 'flex';
  }
  ```

- [ ] **Step 3: Add leaderboard CSS**

  Add to `css/style.css`:

  ```css
  /* ── Leaderboard ─────────────────────────────────────────────────────────── */
  .lb-inner { max-width: 700px; }
  .lb-tabs { display: flex; gap: 6px; margin-bottom: 12px; direction: rtl; }
  .lb-tab {
    flex: 1; padding: 8px; background: transparent; border: 1px solid #444;
    color: #aaa; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 0.9rem;
  }
  .lb-tab.selected { background: #4CAF50; border-color: #4CAF50; color: #fff; font-weight: 700; }
  .lb-filters { display: flex; gap: 6px; margin-bottom: 16px; direction: rtl; }
  .lb-filter {
    padding: 4px 14px; background: transparent; border: 1px solid #333;
    color: #888; border-radius: 20px; cursor: pointer; font-family: inherit; font-size: 0.8rem;
  }
  .lb-filter.selected { border-color: #4CAF50; color: #4CAF50; }
  .lb-table { display: flex; flex-direction: column; gap: 6px; direction: rtl; }
  .lb-row {
    display: grid;
    grid-template-columns: 32px 1fr auto auto 64px;
    align-items: center; gap: 8px;
    background: #141425; border: 1px solid #222; border-radius: 8px; padding: 10px 12px;
  }
  .lb-rank      { font-weight: 900; color: #666; font-size: 0.95rem; text-align: center; }
  .lb-rank-top  { color: #f1c40f; }
  .lb-name      { font-size: 0.9rem; color: #fff; font-weight: 600; }
  .lb-stat      { font-size: 0.9rem; color: #4CAF50; font-weight: 700; }
  .lb-sub       { font-size: 0.75rem; color: #666; }
  .lb-view-btn  {
    padding: 4px 8px; background: transparent; border: 1px solid #444;
    color: #aaa; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-family: inherit;
  }
  .lb-view-btn:hover { border-color: #4CAF50; color: #4CAF50; }

  /* ── Squad Modal ─────────────────────────────────────────────────────────── */
  .squad-modal-box   { max-width: 400px; }
  .squad-player-list { display: flex; flex-direction: column; gap: 6px; direction: rtl; margin-top: 12px; }
  .squad-player-item {
    display: grid; grid-template-columns: 48px 1fr 40px; gap: 8px;
    align-items: center; background: #13132a; border-radius: 6px; padding: 6px 10px;
  }
  .sq-pos  { font-size: 0.7rem; font-weight: 700; color: #4CAF50; }
  .sq-name { font-size: 0.85rem; color: #fff; }
  .sq-ovr  { font-size: 0.8rem; color: #f1c40f; font-weight: 700; text-align: left; }
  ```

- [ ] **Step 4: Manual test**

  1. Click "לוח שיאים" in nav
  2. Table shows (empty until a result is saved)
  3. Save a game result → return to leaderboard → row appears
  4. Switch OVR ↔ נקודות tab → order changes
  5. Click "הרכב" on a row:
     - If `is_public = true` → squad player list appears
     - If `is_public = false` → "לא שיתף" message
  6. Filter by "השבוע" / "החודש" works

- [ ] **Step 5: Commit**

  ```bash
  git add js/leaderboard.js index.html css/style.css
  git commit -m "feat: leaderboard screen with OVR/points tabs, filters, squad view modal"
  ```

---

## Final Checklist

- [ ] Supabase project provisioned with Google OAuth and email auth enabled
- [ ] All 5 DB tables created with RLS policies applied
- [ ] 19 achievements seeded
- [ ] Edge Function deployed and validating submissions correctly
- [ ] Nav bar visible on all screens with correct auth state
- [ ] Google and email login both work
- [ ] Username modal appears on first login only
- [ ] Game results saved after clicking "שמור ב-Leaderboard"
- [ ] Achievement toast fires for newly earned achievements
- [ ] Achievements screen: unlocked = green + date, visible-locked = gray, hidden-locked = ❓ / ???
- [ ] Leaderboard: best-per-user, OVR and points tabs, week/month/all-time filters
- [ ] Squad view modal: shows players for public squads, "לא שיתף" for private
