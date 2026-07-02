-- Editable UI texts, managed from admin.html by the site owner only.
-- Everyone can read; only the admin can write (enforced by RLS, not by the UI).

create table if not exists site_texts (
  key        text primary key,          -- free identifier, e.g. 'welcome-title'
  selector   text not null,             -- CSS selector of the element(s) to override
  value      text not null,             -- the text to show
  updated_at timestamptz not null default now()
);

alter table site_texts enable row level security;

-- Everyone (including anonymous visitors) may read the texts
create policy "site_texts read for all"
  on site_texts for select
  using (true);

-- Only the admin account may create/update/delete.
-- ⚠ If you log in with a different email (e.g. your Google address), replace it here.
create policy "site_texts admin write"
  on site_texts for all
  using  ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com')
  with check ((auth.jwt() ->> 'email') = 'avichaiy0610@outlook.com');
