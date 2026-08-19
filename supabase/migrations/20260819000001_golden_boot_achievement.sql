-- "מלך השערים" — one player finishes the season with MORE than Eran Zahavi's 35
-- for Maccabi Tel Aviv in 2018/19, the Israeli top-flight single-season record.
-- The gate is strictly greater than 35, so 36 and anything above it qualifies.
--
-- Only reachable since per-player goals started riding along in the submitted
-- payload; the edge function refuses to award it unless the players' goals add
-- up to the season's goals for, so a season from before then can never earn it.
--
-- Measured rarity: about one season in two hundred for a balanced OVR 87 squad,
-- and one in thirty-five with a 92-rated forward up front, which puts it in the
-- game's "אגדי" band.
INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('golden_boot', 'מלך השערים', 'שבור את שיא ערן זהבי — יותר מ-35 שערים לשחקן אחד בעונה', '👟', false)
ON CONFLICT (key) DO UPDATE
  SET name_he = EXCLUDED.name_he,
      desc_he = EXCLUDED.desc_he,
      icon    = EXCLUDED.icon;
