-- ============================================================
-- 프로젝트별 커스텀 필드 (노션 속성처럼)
-- Supabase SQL Editor에 붙여넣어 실행하세요. (한 번만)
-- ============================================================

-- 필드 정의 (프로젝트마다 개별)
create table if not exists project_fields (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects on delete cascade,
  name        text not null,
  type        text not null check (type in ('text','select','number','checkbox','date')),
  options     jsonb not null default '[]'::jsonb,  -- select 타입의 옵션 목록
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

-- 태스크의 필드 값 (field_id -> value)
alter table tasks add column if not exists fields jsonb not null default '{}'::jsonb;

alter table project_fields enable row level security;

create policy "member crud project_fields" on project_fields for all
  using (exists (select 1 from projects p where p.id = project_id and is_member(p.workspace_id)))
  with check (exists (select 1 from projects p where p.id = project_id and is_member(p.workspace_id)));
