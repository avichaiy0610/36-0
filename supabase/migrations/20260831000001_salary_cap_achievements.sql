-- Salary cap achievements. The mode runs entirely in the browser, like the
-- career, so the only thing that reaches the server is what a season EARNED.
--
-- array_append, never `earned || 'key'`. With an untyped literal on the right
-- Postgres resolves || to anyarray || anyarray, tries to parse the key AS an
-- array and raises 22P02, which aborts the whole function and rolls back the
-- insert with it. That bug silently starved every gt_* and cr_* award until
-- 20260823000005 found it; it is not being reintroduced here.

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('sc_first',   'ראש קטן לתקציב',  'סיים עונה במצב תקרת שכר',                                   '💰', false),
  ('sc_thrifty', 'קמצן',             'סיים עונה בתקרת שכר עם תקציב שנשאר',                        '🪙', false),
  ('sc_bargain', 'מציאה',            'זכה באליפות בתקרת שכר עם הרכב ששכרו מתחת לחצי מהתקציב',     '🧾', false),
  ('sc_perfect', 'תקציב מאוזן',      'עונה מושלמת 36-0 תחת תקרת שכר',                             '🏆', false),
  ('sc_sold',    'מכר את הכוכב',     'סיים עונה אחרי ששחרר שחקן בדירוג 88 ומעלה',                 '📉', true)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

-- Every value is clamped here rather than trusted. The client can claim it
-- played a capped season; it cannot claim a budget it never had.
CREATE OR REPLACE FUNCTION award_salary_achievements(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid        uuid    := auth.uid();
  -- budgets are 22 / 26 / 30, so anything outside 10..40 is not a real run
  v_budget   numeric := LEAST(GREATEST(COALESCE((p->>'budget')::numeric, 0), 0), 40);
  v_spent    numeric := LEAST(GREATEST(COALESCE((p->>'spent')::numeric, 0), 0), v_budget);
  v_wins     int     := LEAST(GREATEST(COALESCE((p->>'wins')::int, 0), 0), 36);
  v_losses   int     := LEAST(GREATEST(COALESCE((p->>'losses')::int, 0), 0), 36);
  v_draws    int     := LEAST(GREATEST(COALESCE((p->>'draws')::int, 0), 0), 36);
  v_champion boolean := COALESCE((p->>'champion')::boolean, false);
  v_sold     int     := LEAST(GREATEST(COALESCE((p->>'sold_ovr')::int, 0), 0), 99);
  earned     text[]  := '{}';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;
  -- a season that was never played cannot award anything
  IF v_budget < 10 OR (v_wins + v_draws + v_losses) < 1 THEN
    RETURN jsonb_build_object('achievements', '[]'::jsonb);
  END IF;

  earned := array_append(earned, 'sc_first');
  IF v_spent < v_budget                        THEN earned := array_append(earned, 'sc_thrifty'); END IF;
  IF v_champion AND v_spent <= v_budget / 2    THEN earned := array_append(earned, 'sc_bargain'); END IF;
  IF v_wins = 36 AND v_draws = 0 AND v_losses = 0
                                               THEN earned := array_append(earned, 'sc_perfect'); END IF;
  IF v_sold >= 88                              THEN earned := array_append(earned, 'sc_sold');    END IF;

  IF array_length(earned, 1) IS NULL THEN
    RETURN jsonb_build_object('achievements', '[]'::jsonb);
  END IF;

  -- a player without a profile still played the season, it just cannot be decorated
  IF EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('achievements', to_jsonb(earned));
END $$;

GRANT EXECUTE ON FUNCTION award_salary_achievements(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION award_salary_achievements(jsonb) FROM anon;
