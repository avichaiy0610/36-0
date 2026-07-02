-- Achievement repeat counter: how many times each user met each achievement's
-- condition (the unlock row is created once; repeats increment the counter).
alter table user_achievements
  add column if not exists times_earned int not null default 1;

-- Bulk increment used by the submit-result edge function (service role).
create or replace function increment_achievements(p_user_id uuid, p_keys text[])
returns void
language sql
as $$
  update user_achievements
     set times_earned = times_earned + 1
   where user_id = p_user_id
     and achievement_key = any(p_keys);
$$;
