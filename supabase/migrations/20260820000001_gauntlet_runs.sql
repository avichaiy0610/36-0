-- Gauntlet runs: the depth board, and the achievements that only this mode can
-- award.
--
-- A run is written once, when it ends — cleared or dead. There is no update
-- path: a finished run is a record, and records do not improve after the fact.
-- Depth is capped at the number of fights on the map (8), so a client cannot
-- claim a ninth.

CREATE TABLE IF NOT EXISTS gauntlet_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- profiles, not auth.users: the board embeds the username through this FK
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  depth       int  NOT NULL CHECK (depth BETWEEN 0 AND 8),
  cleared     boolean NOT NULL DEFAULT false,
  banner      int  NOT NULL DEFAULT 0 CHECK (banner BETWEEN 0 AND 5),
  team_ovr    int  CHECK (team_ovr BETWEEN 0 AND 99),
  coins       int  NOT NULL DEFAULT 0,
  signings    int  NOT NULL DEFAULT 0,
  relics      text[] NOT NULL DEFAULT '{}',
  squad       jsonb,
  log         jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- the board reads by banner then depth: a deeper run at a harder banner outranks
-- a full clear at banner 0
CREATE INDEX IF NOT EXISTS gauntlet_runs_board_idx
  ON gauntlet_runs (banner DESC, depth DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS gauntlet_runs_user_idx ON gauntlet_runs (user_id);

ALTER TABLE gauntlet_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gauntlet runs are public" ON gauntlet_runs;
CREATE POLICY "gauntlet runs are public"
  ON gauntlet_runs FOR SELECT USING (true);

DROP POLICY IF EXISTS "own gauntlet runs only" ON gauntlet_runs;
CREATE POLICY "own gauntlet runs only"
  ON gauntlet_runs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── achievements this mode can award ────────────────────────────────────────
INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('gt_first',    'יצאת לדרך',      'נצח את הקרב הראשון בגאונטלט',                          '🗺', false),
  ('gt_depth5',   'חצי הדרך',       'הגע לקרב החמישי במסע הגאונטלט',                        '🧭', false),
  ('gt_elite',    'הדרך הקשה',      'נצח את יריבת ה-ELITE',                                 '💜', false),
  ('gt_cleared',  'סוף המסע',       'עבור את כל שמונת הקרבות בגאונטלט',                     '🏆', false),
  ('gt_banner3',  'מניף באנרים',    'סיים את המסע בבאנר III ומעלה',                         '🏴', false),
  ('gt_loyal',    'נאמן לסגל',      'סיים את המסע בלי לצרף אף שחקן מהשלל',                  '🧊', true),
  ('gt_collector','אספן קמעות',     'החזק חמישה קמעות בו-זמנית בסוף מסע',                   '🔮', true)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

-- ── writing a run ───────────────────────────────────────────────────────────
-- One call ends a run: it stores the row and awards whatever the run earned.
-- SECURITY DEFINER so it can write user_achievements, but every value it uses is
-- either auth.uid() or clamped here — the client cannot hand itself a banner it
-- never played or a depth the map does not have.
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
  earned   text[] := '{}';
  run_id   uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;

  INSERT INTO gauntlet_runs (user_id, depth, cleared, banner, team_ovr, coins, signings, relics, squad, log)
  VALUES (uid, v_depth, v_clear, v_banner,
          LEAST(GREATEST(COALESCE((p->>'team_ovr')::int, 0), 0), 99),
          GREATEST(COALESCE((p->>'coins')::int, 0), 0),
          v_sign, v_relics, p->'squad', p->'log')
  RETURNING id INTO run_id;

  IF v_depth >= 1 THEN earned := earned || 'gt_first'; END IF;
  IF v_depth >= 5 THEN earned := earned || 'gt_depth5'; END IF;
  IF v_elite       THEN earned := earned || 'gt_elite'; END IF;
  IF v_clear       THEN earned := earned || 'gt_cleared'; END IF;
  IF v_clear AND v_banner >= 3 THEN earned := earned || 'gt_banner3'; END IF;
  IF v_clear AND v_sign = 0    THEN earned := earned || 'gt_loyal'; END IF;
  IF array_length(v_relics, 1) >= 5 THEN earned := earned || 'gt_collector'; END IF;

  -- achievements hang off profiles; a run by a user without one still counts
  -- as a run, it just cannot be decorated
  IF array_length(earned, 1) > 0 AND EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('id', run_id, 'achievements', to_jsonb(earned));
END;
$$;

GRANT EXECUTE ON FUNCTION submit_gauntlet_run(jsonb) TO authenticated;
