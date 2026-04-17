-- パートナーストリーク機能
create table public.partnerships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  partner_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  streak_count int not null default 0,
  last_both_date date,
  created_at timestamptz not null default now(),
  unique (requester_id, partner_id)
);

-- RLS
alter table public.partnerships enable row level security;

create policy "partnerships_select" on public.partnerships
  for select using (
    requester_id = auth.uid() or partner_id = auth.uid()
  );

create policy "partnerships_insert" on public.partnerships
  for insert with check (requester_id = auth.uid());

create policy "partnerships_update" on public.partnerships
  for update using (
    requester_id = auth.uid() or partner_id = auth.uid()
  );

create policy "partnerships_delete" on public.partnerships
  for delete using (
    requester_id = auth.uid() or partner_id = auth.uid()
  );

create index idx_partnerships_requester on public.partnerships(requester_id);
create index idx_partnerships_partner on public.partnerships(partner_id);
