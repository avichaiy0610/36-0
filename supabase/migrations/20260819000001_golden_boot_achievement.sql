-- "מלך השערים" — one player beats Eran Zahavi's 35 for Maccabi Tel Aviv in
-- 2018/19, the Israeli top-flight single-season record.
--
-- Only reachable since per-player goals started riding along in the submitted
-- payload; the edge function refuses to award it unless the players' goals add
-- up to the season's goals for, so a season from before then can never earn it.
--
-- Measured rarity at the calibration point (OVR 87): about one season in two
-- hundred, which lands it in the game's "אגדי" band.
INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('golden_boot', 'מלך השערים', 'שחקן יחיד שבר את השיא של ערן זהבי — 36 שערים בעונה', '👟', false)
ON CONFLICT (key) DO NOTHING;
