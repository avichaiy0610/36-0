-- The State Cup, and Europe in three competitions.
--
-- Two principles decide which badge belongs where:
--
--   GENERAL European badges belong to ALL of Europe. Winning a tie, surviving a
--   round without conceding, reaching a league phase and taking points in one
--   are the same achievement whichever competition you are in, so they are
--   awarded on the campaign, not on the tier. eu_giant is left alone: it asks
--   for a club rated 96 or more, and only the Champions League has any.
--
--   A TROPHY belongs to its own competition. Winning the Conference League is
--   not winning the Champions League, and the badge has to say so.
--
-- array_append everywhere. `earned || 'key'` resolves to anyarray || anyarray,
-- raises 22P02 and aborts the whole function — the defect that meant no eu_*
-- badge was ever awarded until 20260901000004.

INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('eu_uel',      'הליגה האירופית',    'זכה בליגה האירופית',                        '🟠', true),
  ('eu_uecl',     'קונפרנס ליג',       'זכה בקונפרנס ליג',                          '🟢', true),
  ('eu_treble',   'שלושת המפעלים',     'זכה בכל אחד משלושת הגביעים האירופיים',       '🌍', true),
  ('cup_win',     'גביע המדינה',       'זכה בגביע המדינה',                          '🥇', false),
  ('cup_double',  'הדאבל',             'אליפות וגביע המדינה באותה עונה',            '👑', true),
  ('cup_giantkill','רוצח ענקים מקומי', 'הודח מהגביע על ידי קבוצה מליגה נמוכה יותר', '🪤', true),
  ('eu_phoenix',  'הדלת הצדדית',       'צנח מפלייאוף אחד המפעלים - וזכה בגביע של המפעל שמתחתיו', '🪂', true)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;

-- ── Europe, now aware of which competition it was ───────────────────────────
CREATE OR REPLACE FUNCTION submit_europe_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid       uuid := auth.uid();
  v_tier    text := COALESCE(p->>'tier', 'ucl');
  v_won     int  := LEAST(GREATEST(COALESCE((p->>'won_ties')::int, 0), 0), 4);
  v_rank    int  := LEAST(GREATEST(COALESCE((p->>'rank')::int, 0), 0), 36);
  -- eight matches in the Champions and Europa Leagues, six in the Conference
  v_pts     int  := LEAST(GREATEST(COALESCE((p->>'points')::int, 0), 0), 24);
  v_clean   boolean := COALESCE((p->>'clean_tie')::boolean, false);
  v_giant   boolean := COALESCE((p->>'beat_giant')::boolean, false);
  v_ko      int  := LEAST(GREATEST(COALESCE((p->>'ko_won')::int, 0), 0), 5);
  v_fin     boolean := COALESCE((p->>'reached_final')::boolean, false);
  v_cup     boolean := COALESCE((p->>'trophy')::boolean, false);
  v_para    boolean := COALESCE((p->>'parachuted')::boolean, false);
  -- the Conference is entered a round later, so three qualifying ties is a full
  -- house there and four is one in the other two
  v_allq    int  := CASE WHEN v_tier = 'uecl' THEN 3 ELSE 4 END;
  -- A parachuted run reaches a league phase having LOST its final qualifier, so
  -- "did you get there" cannot be a count of ties won. The client says so, and
  -- the rank is still clamped, which is the only thing that can be checked here.
  v_qual    boolean := COALESCE((p->>'reached_league')::boolean, v_won >= v_allq)
                       AND v_rank BETWEEN 1 AND 36;
  v_deep    boolean := v_qual AND v_rank <= 24;
  earned    text[] := '{}';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;
  IF v_tier NOT IN ('ucl', 'uel', 'uecl') THEN v_tier := 'ucl'; END IF;

  -- general: any competition counts
  IF v_won >= 1 THEN earned := array_append(earned, 'eu_first');   END IF;
  IF v_won >= v_allq - 1 THEN earned := array_append(earned, 'eu_playoff'); END IF;
  IF v_clean  THEN earned := array_append(earned, 'eu_clean');     END IF;
  IF v_qual   THEN earned := array_append(earned, 'eu_group');     END IF;
  IF v_qual AND v_pts >= 8              THEN earned := array_append(earned, 'eu_points');   END IF;
  IF v_qual AND v_rank BETWEEN 9 AND 24 THEN earned := array_append(earned, 'eu_knockout'); END IF;
  IF v_qual AND v_rank <= 8             THEN earned := array_append(earned, 'eu_top8');     END IF;
  IF v_qual AND v_giant                 THEN earned := array_append(earned, 'eu_giant');    END IF;
  IF v_deep AND v_fin                   THEN earned := array_append(earned, 'eu_final');    END IF;

  -- the trophy belongs to its own competition
  IF v_deep AND v_cup AND v_fin AND v_ko >= 3 THEN
    IF    v_tier = 'ucl'  THEN earned := array_append(earned, 'eu_bigears');
    ELSIF v_tier = 'uel'  THEN earned := array_append(earned, 'eu_uel');
    ELSE                       earned := array_append(earned, 'eu_uecl');
    END IF;
    -- fell out of one competition's play-off and lifted the one below it
    IF v_para THEN earned := array_append(earned, 'eu_phoenix'); END IF;
  END IF;

  IF array_length(earned, 1) > 0 AND EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING;

    -- all three trophies, however many seasons it took
    IF EXISTS (
      SELECT 1 FROM user_achievements
      WHERE user_id = uid AND achievement_key IN ('eu_bigears', 'eu_uel', 'eu_uecl')
      GROUP BY user_id HAVING COUNT(DISTINCT achievement_key) = 3
    ) THEN
      INSERT INTO user_achievements (user_id, achievement_key)
      VALUES (uid, 'eu_treble') ON CONFLICT DO NOTHING;
      earned := array_append(earned, 'eu_treble');
    END IF;
  END IF;

  RETURN jsonb_build_object('achievements', to_jsonb(earned));
END;
$$;

GRANT EXECUTE ON FUNCTION submit_europe_run(jsonb) TO authenticated;

-- ── The State Cup ───────────────────────────────────────────────────────────
-- Nothing here can be verified server-side either, so every claim is clamped to
-- what the format can produce: five rounds, one champion, one league position.
CREATE OR REPLACE FUNCTION submit_cup_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid      uuid := auth.uid();
  v_won    boolean := COALESCE((p->>'won')::boolean, false);
  v_rank   int  := LEAST(GREATEST(COALESCE((p->>'rank')::int, 0), 0), 20);
  -- 0 = the top flight, 1 = Liga Leumit, 2 = Liga Alef
  v_bytier int  := LEAST(GREATEST(COALESCE((p->>'out_to_tier')::int, 0), 0), 2);
  earned   text[] := '{}';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not signed in');
  END IF;

  IF v_won THEN earned := array_append(earned, 'cup_win'); END IF;
  IF v_won AND v_rank = 1 THEN earned := array_append(earned, 'cup_double'); END IF;
  IF NOT v_won AND v_bytier > 0 THEN earned := array_append(earned, 'cup_giantkill'); END IF;

  IF array_length(earned, 1) > 0 AND EXISTS (SELECT 1 FROM profiles WHERE id = uid) THEN
    INSERT INTO user_achievements (user_id, achievement_key)
    SELECT uid, k FROM unnest(earned) AS k
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('achievements', to_jsonb(earned));
END;
$$;

GRANT EXECUTE ON FUNCTION submit_cup_run(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION submit_cup_run(jsonb) FROM anon;
