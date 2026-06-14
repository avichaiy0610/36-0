import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HIGHEST_TIER = '36–0 🏆';
const CHAMPION_TIERS = ['36–0 🏆', '33–0 🏆', 'בלתי מנוצחים ✨', 'אלופים בפאחר 🥇', 'אלופים 🏆'];
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

  if (p.wins === 36)                                                              earned.push('perfect_season');
  if (p.losses === 0)                                                             earned.push('unbeaten_season');
  if (p.ovr >= 88)                                                                earned.push('ovr_88');
  if (p.ovr >= 90)                                                                earned.push('ovr_90');
  if (p.ga === 0)                                                                 earned.push('clean_season');
  if (p.gf >= 100)                                                                earned.push('century');
  if (CHAMPION_TIERS.includes(p.tier) && p.settings.difficulty === 'hard')       earned.push('hard_win');
  if (CHAMPION_TIERS.includes(p.tier) && p.settings.ratings_visible === false)   earned.push('blind_win');
  if (seasonYears.every(y => !isNaN(y) && y >= 1990 && y < 2000))               earned.push('era_90s');
  if (uniqueTeams.length === 1)                                                   earned.push('mono_club');
  if (p.tier === HIGHEST_TIER)                                                    earned.push('tier_legend');
  if (p.wins === 36 && p.settings.peak_mode)                                     earned.push('peak_master');
  if (gamesPlayed >= 10)                                                          earned.push('games_10');
  if (gamesPlayed >= 50)                                                          earned.push('games_50');
  if (ALL_FORMATIONS.every(f => usedFormations.includes(f)))                     earned.push('all_formations');
  if (p.all_club_ids?.length && p.all_club_ids.every(c => usedClubs.includes(c))) earned.push('all_clubs');
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
