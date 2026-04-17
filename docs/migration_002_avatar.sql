-- プロフィール画像用カラム追加
alter table public.profiles add column avatar_url text;

-- Supabase Storage バケット作成（SQL Editorではできないので Dashboard > Storage から作成）
-- バケット名: avatars
-- Public: ON
