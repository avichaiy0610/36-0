-- Extend the post queue for B: publish type (post on the page vs. a comment) and
-- a platform column so Twitter/Instagram can be added later without a redesign.
-- Plus a tiny key/value table for the engine's Telegram update offset.

alter table post_queue add column if not exists publish_type text not null default 'post';   -- post | comment
alter table post_queue add column if not exists platform     text not null default 'facebook'; -- facebook | twitter | instagram

create table if not exists engine_state (
  key   text primary key,
  value text
);
alter table engine_state enable row level security;
-- Only the engine (service_role, which bypasses RLS) touches this; deny everyone else.
create policy "engine_state admin all"
  on engine_state for all
  using  ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com')
  with check ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com');
