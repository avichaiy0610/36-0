-- "תיק" → "סיבוב", per the user's wording.
--
-- The three European achievements that shipped yesterday call a two-legged tie a
-- "תיק". The rest of the game — the round names, the elimination line, the panel
-- header — says "סיבוב", so the badges were the odd ones out.
--
-- Rewritten rather than re-inserted: these rows already exist and are already
-- attached to whoever has earned them, so only the text changes.

UPDATE achievements SET desc_he = 'נצח סיבוב אחד במוקדמות ליגת האלופות' WHERE key = 'eu_first';
UPDATE achievements SET desc_he = 'הגע לסיבוב הרביעי - הפלייאוף'        WHERE key = 'eu_playoff';
UPDATE achievements SET desc_he = 'עבור סיבוב שלם, בית וחוץ, בלי לספוג שער' WHERE key = 'eu_clean';
