-- ユーザー単位の公開/非公開に変更
-- profiles に is_public カラム追加（デフォルト: true）
alter table public.profiles add column is_public boolean not null default true;

-- records の is_public カラム削除
alter table public.records drop column is_public;

-- RLS ポリシー更新: records_select を差し替え
drop policy "records_select" on public.records;

create policy "records_select" on public.records
  for select using (
    user_id = auth.uid()
    or (
      -- そのユーザーが公開設定 かつ フレンド
      exists (
        select 1 from public.profiles p
        where p.id = records.user_id
        and p.is_public = true
      )
      and exists (
        select 1 from public.friendships
        where status = 'accepted'
        and (
          (requester_id = auth.uid() and addressee_id = records.user_id)
          or (addressee_id = auth.uid() and requester_id = records.user_id)
        )
      )
    )
  );
