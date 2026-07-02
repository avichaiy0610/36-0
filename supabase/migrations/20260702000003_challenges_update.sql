-- Challenge catalog sync (per challenges.csv review) + games-played counter.

-- 1) Sync all challenge names/descriptions/icons; add the new ones.
insert into achievements (key, name_he, desc_he, icon, is_hidden) values
  ('all_clubs',           'ציידי כישרונות',   'להשתמש בשחקן מכל קבוצה לפחות פעם אחת',                 '🗺️', false),
  ('all_formations',      'טקטיקאי',          'לנסות את כל המערכים האפשריים',                          '📋', false),
  ('blind_win',           'ניצחון בעיוור',     'לזכות באליפות עם דירוגים מוסתרים',                      '🙈', false),
  ('century',             'מאה שערים',        'לכבוש מעל 100 שערים בעונה',                             '💯', false),
  ('clean_season',        'קיר הברזל',        'לספוג עד 15 שערים בעונה שלמה',                          '🧤', false),
  ('era_90s',             'דור הזהב',         'כל שחקני ההרכב משנות ה-90, מבלי לסנן את העונות',        '📼', false),
  ('games_1',             'שחקן נוער',        'לסיים את המשחק הראשון',                                 '🐥', false),
  ('games_10',            'חובבן',            'לסיים מעל עשרה משחקים',                                 '🎮', false),
  ('games_50',            'חצי מקצוען',       'לסיים מעל חמישים משחקים',                               '🔥', false),
  ('games_100',           'מקצוען',           'לסיים מעל מאה משחקים',                                  '🎖️', false),
  ('games_250',           'כוכב',             'לסיים מעל 250 משחקים',                                  '💫', false),
  ('games_500',           'אגדת מועדון',      'לסיים מעל 500 משחקים',                                  '🏟️', false),
  ('games_1000',          'אגדת ליגת העל',    'לסיים מעל 1000 משחקים',                                 '🐐', false),
  ('hard_win',            'נצחון בקושי',      'הגע לדרגת אלוף במצב קשה',                               '💪', false),
  ('mono_club',           'נאמן לסמל',        'כל שחקני ההרכב מאותה קבוצה',                            '❤️', false),
  ('ovr_88',              'הרכב עילי',        'לבנות הרכב בציון של 88 ומעלה',                          '⭐', false),
  ('ovr_90',              'הרכב האלים',       'לבנות הרכב בציון של 90 ומעלה',                          '👑', false),
  ('record_breaker',      'שובר שיאים',       'להשיג 100 נקודות בעונה אחת',                            '📈', false),
  ('peak_master',         'מאסטר שיא',        'לנצח את כל המשחקים במצב שיא',                           '⚡', false),
  ('perfect_season',      'עונה מושלמת',      'לנצח את כל 36 המשחקים בעונה',                           '🏆', false),
  ('tier_legend',         'אגדה',             'לנצח את כל 36 המשחקים בעונה ברמה קשה',                  '🌟', false),
  ('unbeaten_season',     'הבלתי מנוצחים',    'לסיים עונה שלמה ללא הפסד',                              '🛡️', false),
  ('secret_big_score',    'המפציץ',           '10+ שערים במשחק אחד',                                   '🎯', true),
  ('secret_peak_blind',   'יש לי עיניים בגב', '36-0 במצב שיא עם דירוגים מוסתרים',                      '💎', true),
  ('secret_perfect_hard', 'בלתי אפשרי',       'להגיע ל-36-0 במצב קשה עם דירוגים מוסתרים',              '🔮', true),
  ('legendary_team',      'קבוצה מהאגדות',    'לבחור ארבעה שחקנים עם ציון של 93 ומעלה',                '🔱', true),
  ('red_alert',           'צבע אדום',         'לבחור 11 שחקנים ממועדונים שמשחקים במדים אדומים',        '🔴', true)
on conflict (key) do update set
  name_he = excluded.name_he,
  desc_he = excluded.desc_he,
  icon = excluded.icon,
  is_hidden = excluded.is_hidden;

-- 2) Games-played counter: counts every FINISHED season (simulated to the end),
--    not just saved ones. Incremented from the client when a season completes.
alter table profiles add column if not exists games_played int not null default 0;

-- start everyone from their saved-games count
update profiles p set games_played = coalesce(sub.cnt, 0)
from (select user_id, count(*) cnt from game_results group by user_id) sub
where sub.user_id = p.id and p.games_played = 0;

create or replace function increment_games_played()
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set games_played = games_played + 1 where id = auth.uid();
$$;

revoke all on function increment_games_played() from anon;
grant execute on function increment_games_played() to authenticated;
