-- ============================================================
-- 사용자 관리형 프로젝트 상태
-- Supabase SQL Editor에 붙여넣어 실행하세요. (한 번만)
-- ============================================================

create table if not exists workspace_project_statuses (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name         text not null,
  color        text,
  is_active    boolean not null default false,  -- '진행 중' 성격 (대시보드 집계)
  is_done      boolean not null default false,
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);

-- 고정값 제약 해제
alter table projects drop constraint if exists projects_status_check;

-- 기존 값(backlog/active/done/archived) → 이름으로 이전
update projects set status = case status
  when 'backlog'  then '백로그'
  when 'active'   then '진행 중'
  when 'done'     then '완료'
  when 'archived' then '보관'
  else status end
where status in ('backlog', 'active', 'done', 'archived');

-- 새 프로젝트 기본 상태
alter table projects alter column status set default '진행 중';

-- 워크스페이스별 기본 상태 시드 (없을 때만)
insert into workspace_project_statuses (workspace_id, name, color, is_active, is_done, position)
select w.id, d.name, d.color, d.is_active, d.is_done, d.position
from workspaces w
cross join (values
  ('백로그',  null::text, false, false, 0),
  ('진행 중', null::text, true,  false, 1),
  ('완료',    null::text, false, true,  2),
  ('보관',    null::text, false, false, 3)
) as d(name, color, is_active, is_done, position)
where not exists (select 1 from workspace_project_statuses s where s.workspace_id = w.id);

alter table workspace_project_statuses enable row level security;

create policy "member crud workspace_project_statuses" on workspace_project_statuses for all
  using (is_member(workspace_id)) with check (is_member(workspace_id));
