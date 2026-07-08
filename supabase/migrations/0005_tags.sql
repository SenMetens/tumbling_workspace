-- ============================================================
-- 워크스페이스 태그 (중앙 관리, 문서·스니펫·태스크 공용)
-- Supabase SQL Editor에 붙여넣어 실행하세요. (한 번만)
-- ============================================================

create table if not exists workspace_tags (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name         text not null,
  color        text,
  created_at   timestamptz not null default now()
);

-- 태스크에도 태그 부여
alter table tasks add column if not exists tags text[] not null default '{}';

alter table workspace_tags enable row level security;

create policy "member crud workspace_tags" on workspace_tags for all
  using (is_member(workspace_id)) with check (is_member(workspace_id));
