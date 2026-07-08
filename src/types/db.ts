export type Role = "owner" | "admin" | "member";
export type Priority = string; // 사용자 관리형 (workspace_priorities.name)
export type ProjectStatus = string; // 사용자 관리형 (workspace_project_statuses.name)

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  job_title: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Membership {
  workspace_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  profile?: Profile;
}

export interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  role: Exclude<Role, "owner">;
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority | null;
  label: string | null;
  color: string | null;
  icon: string | null;
  group_name: string | null;
  due_date: string | null;
  lead_id: string | null;
  created_at: string;
  table_config?: TableConfig | null;
}

export interface TableColumnConfig {
  key: string;
  hidden?: boolean;
  label?: string;
}
export interface TableConfig {
  columns: TableColumnConfig[];
}

export interface BoardColumn {
  id: string;
  project_id: string;
  name: string;
  position: number;
  is_done: boolean;
}

export interface Task {
  id: string;
  workspace_id: string;
  project_id: string | null;
  column_id: string | null;
  task_no: number;
  title: string;
  description: string | null;
  priority: Priority | null;
  due_date: string | null;
  assignee_id: string | null;
  position: number;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  fields?: Record<string, FieldValue> | null;
  tags?: string[];
}

export interface WorkspaceTag {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface WorkspacePriority {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  rank: number;
  position: number;
  created_at: string;
}

export interface WorkspaceProjectStatus {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  is_active: boolean;
  is_done: boolean;
  position: number;
  created_at: string;
}

export type FieldType = "text" | "select" | "number" | "checkbox" | "date";
export type FieldValue = string | number | boolean | null;

export interface ProjectField {
  id: string;
  project_id: string;
  name: string;
  type: FieldType;
  options: string[];
  position: number;
  created_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  position: number;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  author?: Profile;
}

export interface CalendarEvent {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Doc {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  body: string;
  tags: string[];
  created_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface Snippet {
  id: string;
  workspace_id: string;
  title: string;
  language: string;
  code: string;
  description: string | null;
  tags: string[];
  created_by: string | null;
  updated_at: string;
  created_at: string;
}
