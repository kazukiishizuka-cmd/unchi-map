-- ==============================
-- うんちマップ DB設計 v1
-- Supabase SQL Editor で実行
-- ==============================

-- 1. profiles テーブル（Supabase Auth の users を拡張）
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  user_id text unique not null,          -- 検索用ID（@zuka_is など）
  nickname text not null,                 -- 表示名
  pin_color text not null default '#4A90D9', -- マップ上のピン色
  streak_count int not null default 0,    -- 現在のストリーク日数
  last_record_date date,                  -- 最終記録日
  created_at timestamptz not null default now()
);

-- 2. records テーブル
create table public.records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  comment text,
  is_public boolean not null default true,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 3. friendships テーブル
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  addressee_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

-- ==============================
-- インデックス
-- ==============================
create index idx_records_user_id on public.records(user_id);
create index idx_records_recorded_at on public.records(recorded_at);
create index idx_friendships_addressee on public.friendships(addressee_id);
create index idx_friendships_status on public.friendships(status);
create index idx_profiles_user_id on public.profiles(user_id);

-- ==============================
-- RLS（Row Level Security）
-- ==============================

-- profiles
alter table public.profiles enable row level security;

-- 誰でもプロフィールは閲覧可（フレンド検索用）
create policy "profiles_select" on public.profiles
  for select using (true);

-- 自分のプロフィールのみ更新可
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- 自分のプロフィールのみ作成可
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- records
alter table public.records enable row level security;

-- 自分の記録は全て見える + フレンドの公開記録が見える
create policy "records_select" on public.records
  for select using (
    user_id = auth.uid()
    or (
      is_public = true
      and (
        -- フレンド関係が accepted のユーザーの公開記録
        exists (
          select 1 from public.friendships
          where status = 'accepted'
          and (
            (requester_id = auth.uid() and addressee_id = records.user_id)
            or (addressee_id = auth.uid() and requester_id = records.user_id)
          )
        )
      )
    )
  );

-- 自分の記録のみ作成可
create policy "records_insert" on public.records
  for insert with check (user_id = auth.uid());

-- 自分の記録のみ更新可
create policy "records_update" on public.records
  for update using (user_id = auth.uid());

-- 自分の記録のみ削除可
create policy "records_delete" on public.records
  for delete using (user_id = auth.uid());

-- friendships
alter table public.friendships enable row level security;

-- 自分が関わるフレンド関係のみ閲覧可
create policy "friendships_select" on public.friendships
  for select using (
    requester_id = auth.uid() or addressee_id = auth.uid()
  );

-- 自分が申請者のフレンド申請のみ作成可
create policy "friendships_insert" on public.friendships
  for insert with check (requester_id = auth.uid());

-- 自分が被申請者の場合のみステータス更新可（承認/拒否）
create policy "friendships_update" on public.friendships
  for update using (addressee_id = auth.uid());

-- 自分が関わるフレンド関係のみ削除可
create policy "friendships_delete" on public.friendships
  for delete using (
    requester_id = auth.uid() or addressee_id = auth.uid()
  );

-- ==============================
-- トリガー: 新規ユーザー登録時に profiles を自動作成
-- ==============================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, user_id, nickname)
  values (
    new.id,
    new.raw_user_meta_data->>'user_id',
    new.raw_user_meta_data->>'nickname'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
