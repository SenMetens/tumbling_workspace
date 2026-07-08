-- ============================================================
-- 사용자 관리형 우선순위
-- Supabase SQL Editor에 붙여넣어 실행하세요. (한 번만)
-- ============================================================

create table if not exists workspace_priorities (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name         text not null,
  color        text,
  rank         int  not null default 0,   -- 클수록 높은 우선순위 (정렬용)
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);

-- 고정 3단계 제약 해제 (임의 우선순위 허용)
alter table tasks    drop constraint if exists tasks_priority_check;
alter table projects drop constraint if exists projects_priority_check;

-- 기존 값(low/medium/high) → 이름으로 이전
update tasks    set priority = case priority when 'high' then '높음' when 'medium' then '보통' when 'low' then '낮음' else priority end where priority in ('high','medium','low');
update projects set priority = case priority when 'high' then '높음' when 'medium' then '보통' when 'low' then '낮음' else priority end where priority in ('high','medium','low');

-- 워크스페이스별 기본 우선순위 시드 (없을 때만)
insert into workspace_priorities (workspace_id, name, color, rank, position)
select w.id, d.name, d.color, d.rank, d.position
from workspaces w
cross join (values ('높음','rose',3,0), ('보통','amber',2,1), ('낮음','emerald',1,2)) as d(name, color, rank, position)
where not exists (select 1 from workspace_priorities p where p.workspace_id = w.id);

alter table workspace_priorities enable row level security;

create policy "member crud workspace_priorities" on workspace_priorities for all
  using (is_member(workspace_id)) with check (is_member(workspace_id));
