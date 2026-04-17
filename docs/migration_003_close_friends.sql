-- 親しいフレンド機能
-- friendships に is_close フラグ追加
alter table public.friendships add column is_close boolean not null default false;

-- records に visibility カラム追加（public / close_only / private）
alter table public.records add column visibility text not null default 'public'
  check (visibility in ('public', 'close_only', 'private'));

-- RLS更新: records_select を差し替え
drop policy "records_select" on public.records;

create policy "records_select" on public.records
  for select using (
    -- 自分の記録は全て見える
    user_id = auth.uid()
    or (
      -- そのユーザーが公開設定
      exists (
        select 1 from public.profiles p
        where p.id = records.user_id
        and p.is_public = true
      )
      and (
        -- public な記録: フレンドなら見える
        (
          visibility = 'public'
          and exists (
            select 1 from public.friendships
            where status = 'accepted'
            and (
              (requester_id = auth.uid() and addressee_id = records.user_id)
              or (addressee_id = auth.uid() and requester_id = records.user_id)
            )
          )
        )
        or
        -- close_only な記録: 親しいフレンドのみ見える
        (
          visibility = 'close_only'
          and exists (
            select 1 from public.friendships
            where status = 'accepted'
            and is_close = true
            and (
              (requester_id = auth.uid() and addressee_id = records.user_id)
              or (addressee_id = auth.uid() and requester_id = records.user_id)
            )
          )
        )
      )
    )
  );
