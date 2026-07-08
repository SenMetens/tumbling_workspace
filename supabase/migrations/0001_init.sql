-- ============================================================
-- Workspace v1 초기 스키마
-- Supabase SQL Editor에 그대로 붙여넣어 실행하세요.
-- ============================================================

-- 워크스페이스
create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- 프로필 (auth.users 1:1)
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null,
  job_title   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- 멤버십
create table memberships (
  workspace_id uuid not null references workspaces on delete cascade,
  user_id      uuid not null references profiles on delete cascade,
  role         text not null default 'member' check (role in ('owner','admin','member')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- 초대
create table invitations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  email        text not null,
  role         text not null default 'member' check (role in ('admin','member')),
  invited_by   uuid references profiles,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- 프로젝트
create table projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name         text not null,
  description  text,
  status       text not null default 'active' check (status in ('backlog','active','done','archived')),
  priority     text check (priority in ('low','medium','high')),
  label        text,
  due_date     date,
  lead_id      uuid references profiles,
  created_at   timestamptz not null default now()
);

-- 보드 컬럼
create table board_columns (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects on delete cascade,
  name        text not null,
  position    int  not null,
  is_done     boolean not null default false
);

-- 태스크
create table tasks (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id   uuid references projects on delete cascade,
  column_id    uuid references board_columns on delete set null,
  task_no      int generated always as identity,
  title        text not null,
  description  text,
  priority     text check (priority in ('low','medium','high')),
  due_date     date,
  assignee_id  uuid references profiles,
  position     numeric not null default 0,
  completed_at timestamptz,
  created_by   uuid references profiles,
  created_at   timestamptz not null default now()
);

-- 서브태스크
create table subtasks (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid not null references tasks on delete cascade,
  title     text not null,
  done      boolean not null default false,
  position  int not null default 0
);

-- 코멘트
create table comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks on delete cascade,
  author_id  uuid references profiles,
  body       text not null,
  created_at timestamptz not null default now()
);

-- 일정
create table events (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id   uuid references projects on delete set null,
  title        text not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  all_day      boolean not null default false,
  color        text,
  created_by   uuid references profiles,
  created_at   timestamptz not null default now()
);

create table event_attendees (
  event_id uuid references events on delete cascade,
  user_id  uuid references profiles on delete cascade,
  primary key (event_id, user_id)
);

-- 문서
create table documents (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id   uuid references projects on delete set null,
  title        text not null default '제목 없음',
  body         text not null default '',
  tags         text[] not null default '{}',
  created_by   uuid references profiles,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- 코드 스니펫
create table snippets (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  title        text not null,
  language     text not null default 'plaintext',
  code         text not null default '',
  description  text,
  tags         text[] not null default '{}',
  created_by   uuid references profiles,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- 인덱스
create index on memberships (user_id);
create index on tasks (workspace_id, assignee_id);
create index on tasks (project_id, column_id, position);
create index on events (workspace_id, starts_at);
create index on documents using gin (tags);
create index on snippets using gin (tags);

-- ============================================================
-- 트리거: 가입 시 프로필 자동 생성
-- ============================================================
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 프로젝트 생성 시 기본 칸반 컬럼 생성
create or replace function handle_new_project() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.board_columns (project_id, name, position, is_done) values
    (new.id, 'To Do', 0, false),
    (new.id, 'In Progress', 1, false),
    (new.id, 'In Review', 2, false),
    (new.id, 'Done', 3, true);
  return new;
end;
$$;

create trigger on_project_created
  after insert on projects
  for each row execute function handle_new_project();

-- ============================================================
-- RLS
-- ============================================================
create or replace function is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function is_admin(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where workspace_id = ws and user_id = auth.uid() and role in ('owner','admin')
  );
$$;

-- 멤버십 정책이 자기 테이블을 참조하면 RLS 재귀가 발생하므로 security definer 헬퍼 사용
create or replace function workspace_member_count(ws uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from memberships where workspace_id = ws;
$$;

create or replace function has_pending_invite(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from invitations
    where workspace_id = ws
      and lower(email) = lower(auth.jwt()->>'email')
      and accepted_at is null
  );
$$;

alter table workspaces      enable row level security;
alter table profiles        enable row level security;
alter table memberships     enable row level security;
alter table invitations     enable row level security;
alter table projects        enable row level security;
alter table board_columns   enable row level security;
alter table tasks           enable row level security;
alter table subtasks        enable row level security;
alter table comments        enable row level security;
alter table events          enable row level security;
alter table event_attendees enable row level security;
alter table documents       enable row level security;
alter table snippets        enable row level security;

-- workspaces
-- 멤버 + 초대받은 사용자(초대 수락 화면에서 이름 표시용)가 조회 가능
create policy "member or invitee can read workspace" on workspaces
  for select using (is_member(id) or has_pending_invite(id));
create policy "anyone authed can create workspace" on workspaces
  for insert with check (auth.uid() is not null);
create policy "admin can update workspace" on workspaces
  for update using (is_admin(id));

-- profiles: 같은 워크스페이스 멤버끼리 조회, 본인만 수정
create policy "read profiles in shared workspace" on profiles
  for select using (
    id = auth.uid() or exists (
      select 1 from memberships m1
      join memberships m2 on m1.workspace_id = m2.workspace_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );
create policy "update own profile" on profiles
  for update using (id = auth.uid());

-- memberships
create policy "member can read memberships" on memberships
  for select using (is_member(workspace_id) or user_id = auth.uid());
-- 가입 허용: ① admin이 추가 ② 빈 워크스페이스에 owner로 셀프조인(생성 직후) ③ 유효한 초대 보유
create policy "insert memberships" on memberships
  for insert with check (
    is_admin(workspace_id)
    or (user_id = auth.uid() and role = 'owner' and workspace_member_count(workspace_id) = 0)
    or (user_id = auth.uid() and role <> 'owner' and has_pending_invite(workspace_id))
  );
create policy "admin can update memberships" on memberships
  for update using (is_admin(workspace_id));
create policy "admin can remove members" on memberships
  for delete using (is_admin(workspace_id) or user_id = auth.uid());

-- invitations
create policy "member can read invitations" on invitations
  for select using (is_member(workspace_id) or lower(email) = lower(auth.jwt()->>'email'));
create policy "admin can invite" on invitations
  for insert with check (is_admin(workspace_id));
create policy "invitee accepts or admin updates" on invitations
  for update using (is_admin(workspace_id) or lower(email) = lower(auth.jwt()->>'email'));
create policy "admin can delete invitations" on invitations
  for delete using (is_admin(workspace_id));

-- 워크스페이스 소속 콘텐츠 공통 패턴
create policy "member crud projects"  on projects  for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy "member crud tasks"     on tasks     for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy "member crud events"    on events    for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy "member crud documents" on documents for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy "member crud snippets"  on snippets  for all using (is_member(workspace_id)) with check (is_member(workspace_id));

-- 자식 테이블: 부모 join으로 검사
create policy "member crud board_columns" on board_columns for all
  using (exists (select 1 from projects p where p.id = project_id and is_member(p.workspace_id)))
  with check (exists (select 1 from projects p where p.id = project_id and is_member(p.workspace_id)));

create policy "member crud subtasks" on subtasks for all
  using (exists (select 1 from tasks t where t.id = task_id and is_member(t.workspace_id)))
  with check (exists (select 1 from tasks t where t.id = task_id and is_member(t.workspace_id)));

create policy "member crud comments" on comments for all
  using (exists (select 1 from tasks t where t.id = task_id and is_member(t.workspace_id)))
  with check (exists (select 1 from tasks t where t.id = task_id and is_member(t.workspace_id)));

create policy "member crud event_attendees" on event_attendees for all
  using (exists (select 1 from events e where e.id = event_id and is_member(e.workspace_id)))
  with check (exists (select 1 from events e where e.id = event_id and is_member(e.workspace_id)));

-- ============================================================
-- Realtime 발행
-- ============================================================
alter publication supabase_realtime add table tasks, board_columns, comments;
