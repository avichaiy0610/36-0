import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HIGHEST_TIER = '36–0 🏆';
const CHAMPION_TIERS = ['36–0 🏆', 'בלתי מנוצחים ✨', 'אלופים בפער 🥇', 'אלופים 🏆'];
const ALL_FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2'];
const GAME_MILESTONES: [number, string][] = [
  [1, 'games_1'], [10, 'games_10'], [50, 'games_50'],
  [100, 'games_100'], [250, 'games_250'], [500, 'games_500'], [1000, 'games_1000'],
];
// clubs whose primary kit color is red (the circle color on the pitch)
const RED_CLUB_IDS = [
  'bnei-sakhnin', 'hapoel-beersheba', 'hapoel-hadera', 'hapoel-haifa',
  'hapoel-jerusalem', 'hapoel-raanana', 'hapoel-rg', 'hapoel-tlv',
];
const ALL_CLUB_IDS = [
  'beitar-jerusalem', 'bnei-sakhnin', 'bnei-yehuda', 'hakoah-rg',
  'hapoel-aco', 'hapoel-ashkelon', 'hapoel-beersheba', 'hapoel-galil',
  'hapoel-hadera', 'hapoel-haifa', 'hapoel-holon', 'hapoel-jerusalem',
  'hapoel-kfar-saba', 'hapoel-pt', 'hapoel-raanana', 'hapoel-rg',
  'hapoel-rhs', 'hapoel-rishonim', 'hapoel-tlv', 'ironi-ks',
  'ironi-tiberias', 'maccabi-ahi-naz', 'maccabi-bnei-raina', 'maccabi-haifa',
  'maccabi-herzliya', 'maccabi-kg', 'maccabi-netanya', 'maccabi-pt',
  'maccabi-tlv', 'ms-ashdod', 'sakhnina-ns',
];

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
  is_public: boolean;
}

function validate(p: Payload): string | null {
  // 36 games = championship playoff season, 33 = relegation playoff season
  const total = p.wins + p.draws + p.losses;
  if (total !== 36 && total !== 33) return 'total games must equal 33 or 36';
  if (p.points !== p.wins * 3 + p.draws) return 'points mismatch';
  if (p.ovr < 0 || p.ovr > 99) return 'ovr out of range';
  if (!Array.isArray(p.matches) || p.matches.length !== total) return 'matches count mismatch';
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
  const uniqueTeams = [...new Set(p.players.map(pl => pl.teamId))];
  const seasonYears = p.players.map(pl => parseInt((pl.season ?? '').split('/')[0]));
  const maxMatchGf = p.matches.reduce((max, m) => Math.max(max, m.gf), 0);

  const fullEra = p.settings.era_min <= 1999 && p.settings.era_max >= 2025;
  const redCount = p.players.filter(pl => RED_CLUB_IDS.includes(pl.teamId)).length;

  if (p.wins === 36)                                                              earned.push('perfect_season');
  if (p.losses === 0)                                                             earned.push('unbeaten_season');
  if (p.ovr >= 88)                                                                earned.push('ovr_88');
  if (p.ovr >= 90)                                                                earned.push('ovr_90');
  if (p.ga <= 15)                                                                 earned.push('clean_season');
  if (p.gf >= 100)                                                                earned.push('century');
  if (p.points >= 100)                                                            earned.push('record_breaker');
  if (CHAMPION_TIERS.includes(p.tier) && p.settings.difficulty === 'hard')       earned.push('hard_win');
  if (CHAMPION_TIERS.includes(p.tier) && p.settings.ratings_visible === false)   earned.push('blind_win');
  if (seasonYears.every(y => !isNaN(y) && y >= 1990 && y < 2000) && fullEra)    earned.push('era_90s');
  if (uniqueTeams.length === 1)                                                   earned.push('mono_club');
  if (p.tier === HIGHEST_TIER && p.settings.difficulty === 'hard')              earned.push('tier_legend');
  if (p.wins === 36 && p.settings.peak_mode)                                     earned.push('peak_master');
  if (p.players.filter(pl => pl.ovr >= 93).length >= 4)                          earned.push('legendary_team');
  if (redCount === 11)                                                            earned.push('red_alert');
  for (const [n, key] of GAME_MILESTONES) {
    if (gamesPlayed >= n) earned.push(key);
  }
  const allFormationsUsed = [...new Set([...usedFormations, p.formation])];
  if (ALL_FORMATIONS.every(f => allFormationsUsed.includes(f)))                  earned.push('all_formations');
  const allClubsUsed = [...new Set([...usedClubs, ...p.players.map(pl => pl.teamId)])];
  if (ALL_CLUB_IDS.every(c => allClubsUsed.includes(c)))                        earned.push('all_clubs');
  if (p.wins === 36 && p.settings.difficulty === 'hard' && p.settings.ratings_visible === false) earned.push('secret_perfect_hard');
  if (maxMatchGf >= 10)                                                            earned.push('secret_big_score');
  if (p.wins === 36 && p.settings.peak_mode && p.settings.ratings_visible === false) earned.push('secret_peak_blind');

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

    let payload: Payload;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validationError = validate(payload);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query history BEFORE insert so counts reflect prior games only
    const { data: pastResults } = await supabase
      .from('game_results')
      .select('formation')
      .eq('user_id', user.id);

    const { data: pastSquads } = await supabase
      .from('squads')
      .select('players')
      .eq('user_id', user.id);

    // finished-seasons counter (incremented by the client on every completed
    // season, saved or not); falls back to saved-games count
    const { data: profile } = await supabase
      .from('profiles')
      .select('games_played')
      .eq('id', user.id)
      .single();
    const gamesPlayed = Math.max(profile?.games_played ?? 0, pastResults?.length ?? 0);
    const usedFormations = (pastResults ?? []).map((r: { formation: string }) => r.formation);
    const usedClubs = (pastSquads ?? []).flatMap(
      (s: { players: Player[] }) => s.players.map(p => p.teamId)
    );

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

    const { error: squadError } = await supabase.from('squads').insert({
      result_id: result.id,
      user_id: user.id,
      players: payload.players,
      is_public: payload.is_public ?? false,
    });
    if (squadError) throw squadError;

    const earned = computeAchievements(payload, gamesPlayed, usedFormations, usedClubs);

    const { data: existing } = await supabase
      .from('user_achievements')
      .select('achievement_key')
      .eq('user_id', user.id);

    const alreadyHas = new Set((existing ?? []).map((r: { achievement_key: string }) => r.achievement_key));
    const newAchievements = earned.filter(k => !alreadyHas.has(k));
    // Cumulative one-time milestones (play N games, use all formations/clubs) are
    // unlocked once and never "repeated" — don't bump their times_earned counter.
    const isCumulative = (k: string) => /^games_\d+$/.test(k) || k === 'all_formations' || k === 'all_clubs';
    const repeatedAchievements = earned.filter(k => alreadyHas.has(k) && !isCumulative(k));

    if (newAchievements.length > 0) {
      const { error: achError } = await supabase.from('user_achievements').insert(
        newAchievements.map(key => ({ user_id: user.id, achievement_key: key, result_id: result.id }))
      );
      if (achError) console.error('Achievement insert failed:', achError);
    }

    // Conditions met again on this run — bump their repeat counters
    if (repeatedAchievements.length > 0) {
      const { error: incError } = await supabase.rpc('increment_achievements', {
        p_user_id: user.id,
        p_keys: repeatedAchievements,
      });
      if (incError) console.error('Achievement increment failed:', incError);
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
