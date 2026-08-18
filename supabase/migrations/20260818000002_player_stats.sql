-- Lifetime stats for the personal profile screen.
-- One round trip returns everything the screen shows: totals, bests, the
-- formation you keep going back to, the players and clubs you draft most.
-- SECURITY DEFINER so it can read the caller's own rows regardless of RLS, but
-- it is hard-scoped to auth.uid() — a caller can never ask for someone else.
CREATE OR REPLACE FUNCTION player_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  res jsonb;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;

  SELECT jsonb_build_object(
    'seasons_saved',   COALESCE(r.n, 0),
    'seasons_played',  GREATEST(COALESCE(p.games_played, 0), COALESCE(r.n, 0)),
    'wins',            COALESCE(r.wins, 0),
    'draws',           COALESCE(r.draws, 0),
    'losses',          COALESCE(r.losses, 0),
    'goals_for',       COALESCE(r.gf, 0),
    'goals_against',   COALESCE(r.ga, 0),
    'best_points',     r.best_points,
    'avg_points',      ROUND(r.avg_points, 1),
    'best_ovr',        r.best_ovr,
    'avg_ovr',         ROUND(r.avg_ovr, 1),
    'perfect_seasons', COALESCE(r.perfect, 0),
    'titles',          COALESCE(r.titles, 0),
    'unbeaten',        COALESCE(r.unbeaten, 0),
    'first_season',    r.first_at,
    'last_season',     r.last_at,
    'top_formation',   f.formation,
    'top_formation_n', f.n,
    'top_tier',        t.tier,
    'top_player',      pl.name,
    'top_player_n',    pl.n,
    'top_club',        cl.team_id,
    'top_club_n',      cl.n,
    'achievements',    COALESCE(a.n, 0)
  )
  INTO res
  FROM (SELECT 1) _
  LEFT JOIN (
    SELECT
      count(*)                                        AS n,
      sum(g.wins)                                     AS wins,
      sum(g.draws)                                    AS draws,
      sum(g.losses)                                   AS losses,
      sum(g.gf)                                       AS gf,
      sum(g.ga)                                       AS ga,
      max(g.points)                                   AS best_points,
      avg(g.points)::numeric                          AS avg_points,
      max(g.ovr)                                      AS best_ovr,
      avg(g.ovr)::numeric                             AS avg_ovr,
      count(*) FILTER (WHERE g.losses = 0 AND g.draws = 0) AS perfect,
      count(*) FILTER (WHERE g.tier LIKE 'אלופים%' OR g.tier LIKE '%–0%')  AS titles,
      count(*) FILTER (WHERE g.losses = 0)            AS unbeaten,
      min(g.created_at)                               AS first_at,
      max(g.created_at)                               AS last_at
    FROM game_results g WHERE g.user_id = uid
  ) r ON true
  LEFT JOIN profiles p ON p.id = uid
  LEFT JOIN (
    SELECT g.formation, count(*) AS n FROM game_results g
    WHERE g.user_id = uid GROUP BY g.formation ORDER BY count(*) DESC, g.formation LIMIT 1
  ) f ON true
  LEFT JOIN (
    SELECT g.tier, count(*) AS n FROM game_results g
    WHERE g.user_id = uid GROUP BY g.tier ORDER BY count(*) DESC, g.tier LIMIT 1
  ) t ON true
  LEFT JOIN (
    SELECT pl.value->>'name' AS name, count(*) AS n
    FROM squads s CROSS JOIN LATERAL jsonb_array_elements(s.players) pl
    WHERE s.user_id = uid AND pl.value->>'name' IS NOT NULL
    GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 1
  ) pl ON true
  LEFT JOIN (
    SELECT pl.value->>'teamId' AS team_id, count(*) AS n
    FROM squads s CROSS JOIN LATERAL jsonb_array_elements(s.players) pl
    WHERE s.user_id = uid AND pl.value->>'teamId' IS NOT NULL
    GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 1
  ) cl ON true
  LEFT JOIN (
    SELECT count(*) AS n FROM user_achievements ua WHERE ua.user_id = uid
  ) a ON true;

  RETURN COALESCE(res, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION player_stats() FROM public;
GRANT EXECUTE ON FUNCTION player_stats() TO authenticated;
