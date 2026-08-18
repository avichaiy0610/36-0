-- Achievements that only exist in the historical league formats.
-- The 36-0 achievements stay exclusive to the modern format: they are gated on
-- exactly 36 games, which none of the old formats can produce.
INSERT INTO achievements (key, name_he, desc_he, icon, is_hidden) VALUES
  ('retro_season',  'מסע בזמן',        'שחק עונה בפורמט המקורי של אותה עונה',            '🏛', false),
  ('retro_champ',   'אלוף רטרו',       'זכה באליפות בעונה שמשוחקת בפורמט המקורי שלה',    '🥇', false),
  ('classic_champ', 'אלוף הקלאסיקה',   'אליפות בליגה של 12 קבוצות ושלושה סיבובים (2001–2009)', '📜', false),
  ('champ_39',      'אליפות המילניום',  'אליפות בעונת 1999/00 — 39 מחזורים, העונה הארוכה בהיסטוריה', '🗓', false),
  ('halved_champ',  'שורד הקיזוז',     'אליפות בעונת הקיזוז, כשחצי מהנקודות נמחקו לפני הפלייאוף', '✂️', false),
  ('era_tour',      'שביל ישראל',      'שחק עונה בכל אחד מחמשת הפורמטים ההיסטוריים',     '🥾', false),
  ('retro_perfect', 'מושלם בכל דור',   'נצח בכל משחקי העונה בפורמט המקורי שלה — 39/38/37/35/33 מתוך 39/38/37/35/33', '🏺', true)
ON CONFLICT (key) DO NOTHING;
