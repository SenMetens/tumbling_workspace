import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useWorkspace } from "../context/AuthContext";
import type {
  Membership, Project, BoardColumn, Task, Subtask, Comment,
  CalendarEvent, Doc, Snippet, Invitation, ProjectField, WorkspaceTag, WorkspacePriority, WorkspaceProjectStatus,
} from "../types/db";

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/* ================= 멤버 ================= */
export function useMembers() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["members", workspace.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("*, profile:profiles(*)")
        .eq("workspace_id", workspace.id)
        .order("created_at");
      throwIf(error);
      return (data ?? []) as Membership[];
    },
  });
}

export function useInvitations() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["invitations", workspace.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("workspace_id", workspace.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      throwIf(error);
      return (data ?? []) as Invitation[];
    },
  });
}

/* ================= 프로젝트 ================= */
export function useProjects() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["projects", workspace.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspace.id)
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      throwIf(error);
      return (data ?? []) as Project[];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).single();
      throwIf(error);
      return data as Project;
    },
  });
}

export function useProjectMutations() {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["projects", workspace.id] });
    qc.invalidateQueries({ queryKey: ["project"] });
  };
  const create = useMutation({
    mutationFn: async (input: Partial<Project> & { name: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...input, workspace_id: workspace.id })
        .select()
        .single();
      throwIf(error);
      return data as Project;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Project> & { id: string }) => {
      const { error } = await supabase.from("projects").update(patch).eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

/* ================= 태그 ================= */
export function useTags() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["tags", workspace.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_tags").select("*").eq("workspace_id", workspace.id).order("name");
      throwIf(error);
      return (data ?? []) as WorkspaceTag[];
    },
  });
}

export function useTagMutations() {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["tags", workspace.id] });
  const create = useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string | null }) => {
      const { data, error } = await supabase.from("workspace_tags").insert({ workspace_id: workspace.id, name, color: color ?? null }).select().single();
      throwIf(error);
      return data as WorkspaceTag;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<WorkspaceTag> & { id: string }) => {
      const { error } = await supabase.from("workspace_tags").update(patch).eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_tags").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

/* ================= 우선순위 ================= */
export function usePriorities() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["priorities", workspace.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_priorities").select("*").eq("workspace_id", workspace.id).order("rank", { ascending: false });
      if (error) return [] as WorkspacePriority[]; // 마이그레이션 전/오류 시 폴백
      return (data ?? []) as WorkspacePriority[];
    },
  });
}

export function usePriorityMutations() {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["priorities", workspace.id] });
  const create = useMutation({
    mutationFn: async ({ name, color, rank }: { name: string; color?: string | null; rank?: number }) => {
      const { data, error } = await supabase.from("workspace_priorities").insert({ workspace_id: workspace.id, name, color: color ?? null, rank: rank ?? 0 }).select().single();
      throwIf(error);
      return data as WorkspacePriority;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, oldName, ...patch }: Partial<WorkspacePriority> & { id: string; oldName?: string }) => {
      const { error } = await supabase.from("workspace_priorities").update(patch).eq("id", id);
      throwIf(error);
      if (patch.name && oldName && patch.name !== oldName) {
        await supabase.from("tasks").update({ priority: patch.name }).eq("workspace_id", workspace.id).eq("priority", oldName);
        await supabase.from("projects").update({ priority: patch.name }).eq("workspace_id", workspace.id).eq("priority", oldName);
      }
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects", workspace.id] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_priorities").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

/* ================= 프로젝트 상태 ================= */
export function useProjectStatuses() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["project_statuses", workspace.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_project_statuses").select("*").eq("workspace_id", workspace.id).order("position");
      if (error) return [] as WorkspaceProjectStatus[];
      return (data ?? []) as WorkspaceProjectStatus[];
    },
  });
}

export function useProjectStatusMutations() {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["project_statuses", workspace.id] });
  const create = useMutation({
    mutationFn: async (input: { name: string; color?: string | null; is_active?: boolean; is_done?: boolean; position?: number }) => {
      const { data, error } = await supabase.from("workspace_project_statuses").insert({
        workspace_id: workspace.id, name: input.name, color: input.color ?? null,
        is_active: input.is_active ?? false, is_done: input.is_done ?? false, position: input.position ?? 0,
      }).select().single();
      throwIf(error);
      return data as WorkspaceProjectStatus;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, oldName, ...patch }: Partial<WorkspaceProjectStatus> & { id: string; oldName?: string }) => {
      const { error } = await supabase.from("workspace_project_statuses").update(patch).eq("id", id);
      throwIf(error);
      if (patch.name && oldName && patch.name !== oldName) {
        await supabase.from("projects").update({ status: patch.name }).eq("workspace_id", workspace.id).eq("status", oldName);
      }
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["projects", workspace.id] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_project_statuses").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

/* ================= 보드/태스크 ================= */
export function useBoardColumns(projectId: string | undefined) {
  return useQuery({
    queryKey: ["columns", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_columns")
        .select("*")
        .eq("project_id", projectId!)
        .order("position");
      throwIf(error);
      return (data ?? []) as BoardColumn[];
    },
  });
}

export function useColumnMutations(projectId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["columns", projectId] });
  const create = useMutation({
    mutationFn: async ({ name, position, is_done = false }: { name: string; position: number; is_done?: boolean }) => {
      const { data, error } = await supabase
        .from("board_columns")
        .insert({ project_id: projectId, name, position, is_done })
        .select()
        .single();
      throwIf(error);
      return data as BoardColumn;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<BoardColumn> & { id: string }) => {
      const { error } = await supabase.from("board_columns").update(patch).eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async ({ id, reassignTo }: { id: string; reassignTo: string | null }) => {
      if (reassignTo) await supabase.from("tasks").update({ column_id: reassignTo }).eq("column_id", id);
      const { error } = await supabase.from("board_columns").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });
  return { create, update, remove };
}

export function useProjectFields(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_fields", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_fields")
        .select("*")
        .eq("project_id", projectId!)
        .order("position");
      throwIf(error);
      return (data ?? []) as ProjectField[];
    },
  });
}

export function useProjectFieldMutations(projectId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["project_fields", projectId] });
  const create = useMutation({
    mutationFn: async ({ name, type, position }: { name: string; type: ProjectField["type"]; position: number }) => {
      const { data, error } = await supabase
        .from("project_fields")
        .insert({ project_id: projectId, name, type, position, options: [] })
        .select()
        .single();
      throwIf(error);
      return data as ProjectField;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ProjectField> & { id: string }) => {
      const { error } = await supabase.from("project_fields").update(patch).eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_fields").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", "project", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId!)
        .order("position");
      throwIf(error);
      return (data ?? []) as Task[];
    },
  });
}

export function useMyTasks() {
  const { workspace, profile } = useWorkspace();
  return useQuery({
    queryKey: ["tasks", "mine", workspace.id, profile.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("assignee_id", profile.id)
        .order("due_date", { ascending: true, nullsFirst: false });
      throwIf(error);
      return (data ?? []) as Task[];
    },
  });
}

export function useWorkspaceTasks() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["tasks", "all", workspace.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", workspace.id);
      throwIf(error);
      return (data ?? []) as Task[];
    },
  });
}

export function useTaskMutations() {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const create = useMutation({
    mutationFn: async (input: Partial<Task> & { title: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, workspace_id: workspace.id })
        .select()
        .single();
      throwIf(error);
      return data as Task;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Task> & { id: string }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      throwIf(error);
    },
    // 낙관적 업데이트: 프로젝트 보드 캐시 즉시 반영
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const snapshots = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] });
      snapshots.forEach(([key, tasks]) => {
        if (!tasks) return;
        qc.setQueryData<Task[]>(
          key,
          tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        );
      });
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

/* ================= 서브태스크 / 코멘트 ================= */
export function useSubtasks(taskId: string | undefined) {
  return useQuery({
    queryKey: ["subtasks", taskId],
    enabled: Boolean(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subtasks")
        .select("*")
        .eq("task_id", taskId!)
        .order("position");
      throwIf(error);
      return (data ?? []) as Subtask[];
    },
  });
}

export function useComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["comments", taskId],
    enabled: Boolean(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, author:profiles(*)")
        .eq("task_id", taskId!)
        .order("created_at");
      throwIf(error);
      return (data ?? []) as Comment[];
    },
  });
}

/* ================= 일정 ================= */
export function useEvents(rangeStart: string, rangeEnd: string) {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["events", workspace.id, rangeStart, rangeEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("workspace_id", workspace.id)
        .lt("starts_at", rangeEnd)
        .gt("ends_at", rangeStart)
        .order("starts_at");
      throwIf(error);
      return (data ?? []) as CalendarEvent[];
    },
  });
}

export function useEventMutations() {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["events", workspace.id] });
  const create = useMutation({
    mutationFn: async (input: Partial<CalendarEvent> & { title: string; starts_at: string; ends_at: string }) => {
      const { error } = await supabase.from("events").insert({ ...input, workspace_id: workspace.id });
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CalendarEvent> & { id: string }) => {
      const { error } = await supabase.from("events").update(patch).eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

/* ================= 문서 ================= */
export function useDocs() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["docs", workspace.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, workspace_id, project_id, title, tags, created_by, updated_at, created_at")
        .eq("workspace_id", workspace.id)
        .order("updated_at", { ascending: false });
      throwIf(error);
      return (data ?? []) as Doc[];
    },
  });
}

export function useDoc(id: string | undefined) {
  return useQuery({
    queryKey: ["doc", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("id", id!).single();
      throwIf(error);
      return data as Doc;
    },
  });
}

export function useDocMutations() {
  const { workspace, profile } = useWorkspace();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["docs", workspace.id] });
    qc.invalidateQueries({ queryKey: ["doc"] });
  };
  const create = useMutation({
    mutationFn: async (input?: Partial<Doc>) => {
      const { data, error } = await supabase
        .from("documents")
        .insert({ workspace_id: workspace.id, created_by: profile.id, ...input })
        .select()
        .single();
      throwIf(error);
      return data as Doc;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Doc> & { id: string }) => {
      const { error } = await supabase
        .from("documents")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      throwIf(error);
    },
    onSuccess: (_data, vars) => {
      // 상세 캐시를 직접 갱신해, 재진입 시 이전 내용이 로드되는 것을 방지
      qc.setQueryData<Doc>(["doc", vars.id], (old) =>
        old ? { ...old, ...vars, updated_at: new Date().toISOString() } : old,
      );
      qc.invalidateQueries({ queryKey: ["docs", workspace.id] });
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

/* ================= 스니펫 ================= */
export function useSnippets() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["snippets", workspace.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("snippets")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("updated_at", { ascending: false });
      throwIf(error);
      return (data ?? []) as Snippet[];
    },
  });
}

export function useSnippetMutations() {
  const { workspace, profile } = useWorkspace();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["snippets", workspace.id] });
  const create = useMutation({
    mutationFn: async (input?: Partial<Snippet>) => {
      const { data, error } = await supabase
        .from("snippets")
        .insert({ workspace_id: workspace.id, created_by: profile.id, title: "새 스니펫", ...input })
        .select()
        .single();
      throwIf(error);
      return data as Snippet;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Snippet> & { id: string }) => {
      const { error } = await supabase
        .from("snippets")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("snippets").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

/* ================= Realtime ================= */
/** tasks/board_columns/comments 변경을 구독해 쿼리 캐시 무효화 */
export function useRealtimeSync() {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`ws-${workspace.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `workspace_id=eq.${workspace.id}` },
        () => qc.invalidateQueries({ queryKey: ["tasks"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "board_columns" },
        () => qc.invalidateQueries({ queryKey: ["columns"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        () => qc.invalidateQueries({ queryKey: ["comments"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace.id, qc]);
}
