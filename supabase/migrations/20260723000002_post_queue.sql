-- Queue for the news-reactive post engine (B). A scheduled job drafts posts
-- from Israeli football news into this table; the owner reviews them in the
-- admin panel (approve / edit / reject); approved rows are published to the
-- game's Facebook page by the job and marked 'posted'.
--
-- The engine connects with the service_role key (bypasses RLS). The admin panel
-- uses the owner's login — RLS below grants that account full access.

create table if not exists post_queue (
  id          bigint generated always as identity primary key,
  source_url  text,
  headline    text,
  draft_text  text not null,
  status      text not null default 'pending',   -- pending | approved | rejected | posted
  fb_post_id  text,
  created_at  timestamptz not null default now(),
  posted_at   timestamptz
);

create index if not exists post_queue_status_idx on post_queue (status, created_at desc);

alter table post_queue enable row level security;

-- Only the admin account may read/write from the panel.
-- ⚠ If you log in with a different email, replace it here.
create policy "post_queue admin all"
  on post_queue for all
  using  ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com')
  with check ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com');
