import { FolderKanban, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppearancePicker, AppIcon, Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader,
  projectIconEl, SectionHeader, Select, Spinner, Textarea, ToolbarSearch, ViewToggle,
} from "../../components/ui";
import { PriorityTag, PrioritySelect } from "../../components/Priorities";
import { ProjectStatusBadge } from "../../components/ProjectStatuses";
import { useMembers, useProjectMutations, useProjects, useWorkspaceTasks } from "../../hooks/data";
import { usePref } from "../../hooks/usePref";
import { cn, projectColorSet } from "../../lib/utils";
import type { Priority, Project } from "../../types/db";

export default function Projects() {
  const nav = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const { data: tasks } = useWorkspaceTasks();
  const { data: members } = useMembers();
  const { create } = useProjectMutations();

  const [q, setQ] = useState("");
  const [view, setView] = usePref<"grid" | "list">("projectsView", "grid");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", priority: "" as "" | Priority, due_date: "", lead_id: "", color: null as string | null, icon: null as string | null, group_name: "" });

  const filtered = useMemo(
    () => (projects ?? []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),
    [projects, q],
  );

  const existingGroups = useMemo(
    () => [...new Set((projects ?? []).map((p) => p.group_name?.trim()).filter(Boolean) as string[])].sort(),
    [projects],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Project[]>();
    filtered.forEach((p) => {
      const k = p.group_name?.trim() || "";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    });
    return [...map.entries()].sort((a, b) => (a[0] === "" ? 1 : b[0] === "" ? -1 : a[0].localeCompare(b[0])));
  }, [filtered]);

  function progressOf(p: Project) {
    const list = (tasks ?? []).filter((t) => t.project_id === p.id);
    if (list.length === 0) return null;
    const done = list.filter((t) => t.completed_at).length;
    return { done, total: list.length, pct: Math.round((done / list.length) * 100) };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = await create.mutateAsync({
      name: form.name.trim(),
      description: form.description.trim() || null,
      priority: form.priority || null,
      due_date: form.due_date || null,
      lead_id: form.lead_id || null,
      ...(form.color ? { color: form.color } : {}),
      ...(form.icon ? { icon: form.icon } : {}),
      ...(form.group_name.trim() ? { group_name: form.group_name.trim() } : {}),
    });
    setOpen(false);
    setForm({ name: "", description: "", priority: "", due_date: "", lead_id: "", color: null, icon: null, group_name: "" });
    nav(`/projects/${p.id}`);
  }

  const renderCard = (p: Project) => {
    const prog = progressOf(p);
    const lead = members?.find((m) => m.user_id === p.lead_id)?.profile;
    const c = projectColorSet(p.color);
    return (
      <Card key={p.id} className="p-3.5" onClick={() => nav(`/projects/${p.id}`)}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <AppIcon label={p.name} color={c} icon={projectIconEl(p.icon, 18)} size={34} />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold leading-tight">{p.name}</h3>
              <ProjectStatusBadge value={p.status} className="mt-1" />
            </div>
          </div>
          {lead && <Avatar profile={lead} size={24} />}
        </div>
        {p.description && <p className="mb-3 line-clamp-2 text-[13px] text-stone-500">{p.description}</p>}
        {prog ? (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-stone-400">
              <span>{prog.done}/{prog.total} 태스크</span>
              <span className="font-medium text-stone-500">{prog.pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div className={cn("h-full rounded-full transition-all", c?.solid ?? "bg-stone-700")} style={{ width: `${prog.pct}%` }} />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-stone-300">태스크 없음</p>
        )}
        <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-3">
          {p.priority && <PriorityTag value={p.priority} />}
          {p.label && <Badge className="bg-stone-100 text-stone-500">{p.label}</Badge>}
          {p.due_date && <span className="ml-auto text-xs text-stone-400">~{p.due_date.slice(5).replace("-", "/")}</span>}
        </div>
      </Card>
    );
  };

  const renderRow = (p: Project) => {
    const prog = progressOf(p);
    const lead = members?.find((m) => m.user_id === p.lead_id)?.profile;
    const c = projectColorSet(p.color);
    return (
      <li key={p.id} onClick={() => nav(`/projects/${p.id}`)} className="flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors hover:bg-stone-50">
        <AppIcon label={p.name} color={c} icon={projectIconEl(p.icon, 18)} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{p.name}</p>
          {p.description && <p className="truncate text-xs text-stone-400">{p.description}</p>}
        </div>
        <ProjectStatusBadge value={p.status} className="hidden sm:inline-flex" />
        {p.priority && <PriorityTag value={p.priority} className="hidden md:inline-flex" />}
        {prog && (
          <div className="hidden w-28 lg:block">
            <div className="mb-1 flex justify-between text-[11px] text-stone-400">
              <span>{prog.pct}%</span><span>{prog.done}/{prog.total}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div className={cn("h-full rounded-full", c?.solid ?? "bg-stone-700")} style={{ width: `${prog.pct}%` }} />
            </div>
          </div>
        )}
        {lead ? <Avatar profile={lead} size={26} /> : <span className="h-[26px] w-[26px] rounded-full border border-dashed border-stone-200" />}
      </li>
    );
  };

  return (
    <div>
      <PageHeader
        title="프로젝트"
        subtitle={`${(projects ?? []).length}개의 프로젝트`}
        actions={<Button onClick={() => setOpen(true)}><Plus size={15} /> 새 프로젝트</Button>}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <ToolbarSearch value={q} onChange={setQ} placeholder="프로젝트 검색..." className="w-full sm:w-72" />
        <ViewToggle value={view} onChange={setView} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={36} />}
          title={q ? "검색 결과가 없습니다" : "아직 프로젝트가 없습니다"}
          description={q ? undefined : "첫 프로젝트를 만들어 팀의 일을 정리해 보세요."}
          action={!q && <Button size="sm" onClick={() => setOpen(true)}><Plus size={14} /> 새 프로젝트</Button>}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([groupName, list]) => (
            <section key={groupName || "__none"}>
              {grouped.length > 1 && (
                <SectionHeader icon={<FolderKanban size={14} className="text-stone-400" />} title={groupName || "그룹 없음"} count={list.length} />
              )}
              {view === "grid" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map(renderCard)}</div>
              ) : (
                <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">{list.map(renderRow)}</ul>
              )}
            </section>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="새 프로젝트">
        <form onSubmit={submit} className="space-y-3">
          <Field label="이름">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus placeholder="프로젝트 이름" />
          </Field>
          <Field label="설명 (선택)">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="범위, 목표 등" />
          </Field>
          <Field label="색·아이콘">
            <AppearancePicker
              name={form.name}
              color={form.color}
              icon={form.icon}
              onChange={(patch) => setForm({ ...form, ...patch })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="우선순위">
              <PrioritySelect value={form.priority || null} onChange={(v) => setForm({ ...form, priority: v ?? "" })} />
            </Field>
            <Field label="마감일">
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </Field>
          </div>
          <Field label="담당자 (PIC)">
            <Select value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })}>
              <option value="">지정 안 함</option>
              {members?.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.profile?.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="그룹 (선택)">
            <Input list="project-groups" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} placeholder="예: 사내 · 클라이언트A" />
            <datalist id="project-groups">
              {existingGroups.map((g) => <option key={g} value={g} />)}
            </datalist>
          </Field>
          <Button type="submit" disabled={create.isPending || !form.name.trim()} className="w-full">
            {create.isPending ? "생성 중..." : "만들기"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
