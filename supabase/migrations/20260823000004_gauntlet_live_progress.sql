-- The gauntlet board only ever heard about a run when it ENDED — on a loss or
-- on a clear. A player three fights deep and still going was invisible, and a
-- player who simply closed the tab was never counted at all. Every row in the
-- table is therefore a first-fight loss, and the board reads 0/8 for everyone.
--
-- So a run now reports after every won fight, and the row is updated in place
-- instead of inserted again. `rid` is the run's own id, generated on the client
-- when the run is created; rows written before this migration have none, and a
-- NULL never collides with another NULL, so they stay exactly as they are.

ALTER TABLE gauntlet_runs ADD COLUMN IF NOT EXISTS rid   text;
ALTER TABLE gauntlet_runs ADD COLUMN IF NOT EXISTS ended boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS gauntlet_runs_user_rid ON gauntlet_runs (user_id, rid);

-- One call, used both for "I just won another fight" and "the run is over".
-- Depth only ever goes up: a later report can add to a run, never shrink it.
CREATE OR REPLACE FUNCTION submit_gauntlet_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid      uuid := auth.uid();
  v_depth  int  := LEAST(GREATEST(COALESCE((p->>'depth')::int, 0), 0), 8);
  v_banner int  := LEAST(GREATEST(COALESCE((p->>'banner')::int, 0), 0), 5);
  v_clear  boolean := COALESCE((p->>'cleared')::boolean, false) AND v_depth = 8;
  v_sign   int  := GREATEST(COALESCE((p->>'signings')::int, 0), 0);
  v_relics text[] := COALESCE(ARRAY(SELECT jsonb_array_elements_text(p->'relics')), '{}');
  v_elite  boolean := COALESCE((p->>'beat_elite')::boolean, false);
  v_rid    text := NULLIF(left(COALESCE(p->>'rid', ''), 40), '');
  v_ended  boolean := COALESCE((p->>'ended')::boolean, true);
  earned   text[] := '{}';
  run_id   uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;

  INSERT INTO gauntlet_runs (user_id, rid, ended, depth, cleared, banner, team_ovr,
                             coins, signings, relics, squad, log)
  VALUES (uid, v_rid, v_ended, v_depth, v_clear, v_banner,
          LEAST(GREATEST(COALESCE((p->>'team_ovr')::int, 0), 0), 99),
          GREATEST(COALESCE((p->>'coins')::int, 0), 0),
          v_sign, v_relics, p->'squad', p->'log')
  ON CONFLICT (user_id, rid) DO UPDATE
    SET depth    = GREATEST(gauntlet_runs.depth, EXCLUDED.depth),
        cleared  = gauntlet_runs.cleared OR EXCLUDED.cleared,
        ended    = EXCLUDED.ended,
        banner   = EXCLUDED.banner,
        team_ovr = EXCLUDED.team_ovr,
        coins    = EXCLUDED.coins,
        signings = EXCLUDED.signings,
        relics   = EXCLUDED.relics,
        squad    = EXCLUDED.squad,
        log      = EXCLUDED.log
  RETURNING id INTO run_id;

  IF v_depth >= 1 THEN earned := earned || 'gt_first'; END IF;
  IF v_depth >= 5 THEN earned := earned || 'gt_depth5'; END IF;
  IF v_elite       THEN earned := earned || 'gt_elite'; END IF;
  IF v_clear       THEN earned := earned || 'gt_cleared'; END IF;
  IF v_clear AND v_banner >= 3 THEN earned := earned || 'gt_banner3'; END IF;
  IF v_clear AND v_sign = 0    THEN earned := earned || 'gt_loyal'; END IF;
  IF array_length(v_relics, 1) >= 5 THEN earned := earned || 'gt_collector'; END IF;

  IF array_length(earned, 1) > 0 AND EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('id', run_id, 'achievements', to_jsonb(earned));
END;
$$;

GRANT EXECUTE ON FUNCTION submit_gauntlet_run(jsonb) TO authenticated;
