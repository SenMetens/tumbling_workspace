import {
  CalendarDays, ChevronRight, FileText, Kanban, List, Plus, Settings2, Table2, Trash2, SquareCheckBig,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Board from "../../components/board/Board";
import { PriorityTag, PrioritySelect } from "../../components/Priorities";
import { ProjectFieldsEditor } from "../../components/ProjectFields";
import { ProjectStatusBadge, ProjectStatusSelect } from "../../components/ProjectStatuses";
import ProjectTable from "../../components/ProjectTable";
import TaskList from "../../components/TaskList";
import TaskPanel from "../../components/TaskPanel";
import ProjectCalendar from "./ProjectCalendar";
import { AppearancePicker, AppIcon, Avatar, Badge, Button, EmptyState, Field, Input, Modal, projectIconEl, SectionHeader, SegmentTabs, Select, Spinner, Textarea } from "../../components/ui";
import { useBoardColumns, useDocMutations, useDocs, useMembers, useProject, useProjectFields, useProjectMutations, useProjectTasks, useTaskMutations } from "../../hooks/data";
import { usePref } from "../../hooks/usePref";
import { cn, columnTone, midPosition, projectColorSet } from "../../lib/utils";
import type { Priority } from "../../types/db";

type Tab = "board" | "list" | "table" | "calendar";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: columns } = useBoardColumns(id);
  const { data: tasks } = useProjectTasks(id);
  const { data: fields } = useProjectFields(id);
  const { data: members } = useMembers();
  const { data: docs } = useDocs();
  const { update: updateProject, remove: removeProject } = useProjectMutations();
  const { create: createTask } = useTaskMutations();
  const { create: createDoc } = useDocMutations();

  const [tab, setTab] = usePref<Tab>("projectView", "board");
  const [addOpen, setAddOpen] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const [addColumnId, setAddColumnId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", priority: "" as "" | Priority, due_date: "", assignee_id: "" });
  const [editDesc, setEditDesc] = useState(false);
  const [desc, setDesc] = useState("");

  const progress = useMemo(() => {
    const list = tasks ?? [];
    if (list.length === 0) return null;
    const done = list.filter((t) => t.completed_at).length;
    return { done, total: list.length, pct: Math.round((done / list.length) * 100) };
  }, [tasks]);

  if (isLoading || !project) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  const lead = members?.find((m) => m.user_id === project.lead_id)?.profile;
  const c = projectColorSet(project.color);
  const dday = project.due_date
    ? Math.ceil((new Date(project.due_date).getTime() - Date.now()) / 86400000)
    : null;

  function openAdd(columnId?: string) {
    setAddColumnId(columnId ?? columns?.[0]?.id ?? null);
    setAddOpen(true);
  }

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    const colId = addColumnId ?? columns?.[0]?.id;
    const colTasks = (tasks ?? []).filter((t) => t.column_id === colId).sort((a, b) => a.position - b.position);
    await createTask.mutateAsync({
      title: form.title.trim(),
      project_id: project!.id,
      column_id: colId ?? null,
      priority: form.priority || null,
      due_date: form.due_date || null,
      assignee_id: form.assignee_id || null,
      position: midPosition(colTasks[colTasks.length - 1]?.position, undefined),
    });
    setAddOpen(false);
    setForm({ title: "", priority: "", due_date: "", assignee_id: "" });
  }

  async function deleteProject() {
    if (!confirm(`"${project!.name}" 프로젝트와 모든 태스크를 삭제할까요?`)) return;
    await removeProject.mutateAsync(project!.id);
    nav("/projects");
  }

  const sortedTasks = [...(tasks ?? [])].sort((a, b) => {
    const ca = columns?.find((c) => c.id === a.column_id)?.position ?? 99;
    const cb = columns?.find((c) => c.id === b.column_id)?.position ?? 99;
    return ca - cb || a.position - b.position;
  });

  const pid = project.id;
  const linkedDocs = (docs ?? []).filter((d) => d.project_id === pid);
  async function newDoc() {
    const d = await createDoc.mutateAsync({ project_id: pid });
    nav(`/docs/${d.id}`);
  }

  return (
    <div>
      {/* 브레드크럼 */}
      <nav className="mb-3 flex items-center gap-1 text-[13px] text-stone-400">
        <Link to="/projects" className="hover:text-stone-600">프로젝트</Link>
        <ChevronRight size={13} />
        <span className="font-medium text-stone-600">{project.name}</span>
      </nav>

      {/* 헤더: 제목 + 액션 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 items-center gap-2.5 text-xl font-bold tracking-tight">
            <AppIcon label={project.name} color={c} icon={projectIconEl(project.icon, 17)} size={30} />
            <input
              key={project.id}
              defaultValue={project.name}
              spellCheck={false}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== project.name) updateProject.mutate({ id: project.id, name: v }); }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-xl font-bold tracking-tight outline-none hover:bg-stone-100 focus:bg-stone-100"
            />
          </h1>
          {/* 메타 칩 */}
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-0.5">
            <ProjectStatusBadge value={project.status} />
            {project.priority && <PriorityTag value={project.priority} />}
            {project.label && <Badge className="bg-stone-100 text-stone-500">{project.label}</Badge>}
            {progress && (
              <span className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white py-0.5 pl-2 pr-2.5 text-xs font-medium text-stone-600">
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-100">
                  <span className={cn("block h-full rounded-full", c?.solid ?? "bg-stone-700")} style={{ width: `${progress.pct}%` }} />
                </span>
                {progress.pct}% 완료
              </span>
            )}
            {dday !== null && (
              <span className={cn("text-xs font-medium", dday < 0 ? "text-red-500" : "text-stone-400")}>
                {dday < 0 ? `${-dday}일 지남` : dday === 0 ? "오늘 마감" : `D-${dday}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lead && <Avatar profile={lead} size={28} />}
          <Button variant="ghost" size="sm" onClick={deleteProject} title="프로젝트 삭제"><Trash2 size={15} /></Button>
          <Button variant="secondary" size="sm" onClick={() => setPropsOpen(true)}><Settings2 size={14} /> 속성</Button>
          <Button size="sm" onClick={() => openAdd()}><Plus size={15} /> 새 태스크</Button>
        </div>
      </div>

      <div className="my-4 border-t border-stone-200" />

      {/* 설명 */}
      {editDesc ? (
        <div className="space-y-2">
          <Textarea rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditDesc(false)}>취소</Button>
            <Button size="sm" onClick={async () => { await updateProject.mutateAsync({ id: project.id, description: desc.trim() || null }); setEditDesc(false); }}>저장</Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setDesc(project.description ?? ""); setEditDesc(true); }}
          className="w-full rounded-lg border border-transparent px-1 py-1 text-left hover:border-stone-200 hover:bg-white"
          title="클릭해서 편집"
        >
          {project.description ? (
            <p className="whitespace-pre-wrap text-sm leading-6 text-stone-600">{project.description}</p>
          ) : (
            <p className="text-sm text-stone-300">설명 추가...</p>
          )}
        </button>
      )}

      {/* 연결된 문서 */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-stone-500">
            <FileText size={14} className="text-stone-400" /> 연결된 문서
            {linkedDocs.length > 0 && <span className="text-stone-400">{linkedDocs.length}</span>}
          </p>
          <Button variant="secondary" size="sm" onClick={newDoc} disabled={createDoc.isPending}><Plus size={14} /> 새 문서</Button>
        </div>
        {linkedDocs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-200 px-3 py-2.5 text-[13px] text-stone-400">이 프로젝트에 연결된 문서가 없어요. 문서 우측 "프로젝트"에서 연결하거나 여기서 새로 만들 수 있어요.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {linkedDocs.map((d) => (
              <button key={d.id} onClick={() => nav(`/docs/${d.id}`)} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[13px] text-stone-600 hover:bg-stone-50">
                <FileText size={13} className="text-stone-400" /> {d.title || "제목 없음"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="my-4 border-t border-stone-200" />

      {/* 콘텐츠: 탭 + 보드/리스트 */}
      <div className="mb-4">
        <SegmentTabs<Tab>
          tabs={[
            { key: "board", label: "보드", icon: <Kanban size={14} /> },
            { key: "list", label: "리스트", icon: <List size={14} /> },
            { key: "table", label: "테이블", icon: <Table2 size={14} /> },
            { key: "calendar", label: "캘린더", icon: <CalendarDays size={14} /> },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "board" && columns && (
        <Board projectId={project.id} columns={columns} tasks={tasks ?? []} onAddTask={openAdd} />
      )}

      {tab === "list" && (
        sortedTasks.length === 0 ? (
          <EmptyState icon={<SquareCheckBig size={32} />} title="태스크가 없습니다" action={<Button size="sm" onClick={() => openAdd()}><Plus size={14} /> 태스크 추가</Button>} />
        ) : (
          <div className="space-y-5">
            {columns?.map((col) => {
              const list = sortedTasks.filter((t) => t.column_id === col.id);
              if (list.length === 0) return null;
              return (
                <section key={col.id}>
                  <SectionHeader
                    dot={columnTone(col).dot}
                    title={col.name}
                    count={list.length}
                    action={<Button variant="ghost" size="sm" onClick={() => openAdd(col.id)}><Plus size={14} /></Button>}
                  />
                  <TaskList tasks={list} />
                </section>
              );
            })}
          </div>
        )
      )}

      {tab === "table" && (
        sortedTasks.length === 0 ? (
          <EmptyState icon={<SquareCheckBig size={32} />} title="태스크가 없습니다" action={<Button size="sm" onClick={() => openAdd()}><Plus size={14} /> 태스크 추가</Button>} />
        ) : (
          <ProjectTable tasks={sortedTasks} project={project} fields={fields ?? []} />
        )
      )}

      {tab === "calendar" && <ProjectCalendar tasks={tasks ?? []} />}

      {/* 속성 모달 */}
      <Modal open={propsOpen} onClose={() => setPropsOpen(false)} title="속성" wide>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="상태">
              <ProjectStatusSelect value={project.status} onChange={(v) => updateProject.mutate({ id: project.id, status: v })} />
            </Field>
            <Field label="우선순위">
              <PrioritySelect value={project.priority ?? null} onChange={(v) => updateProject.mutate({ id: project.id, priority: v })} />
            </Field>
            <Field label="마감일">
              <Input type="date" value={project.due_date ?? ""} onChange={(e) => updateProject.mutate({ id: project.id, due_date: e.target.value || null })} />
            </Field>
            <Field label="담당 (PIC)">
              <Select value={project.lead_id ?? ""} onChange={(e) => updateProject.mutate({ id: project.id, lead_id: e.target.value || null })}>
                <option value="">지정 안 함</option>
                {members?.map((m) => <option key={m.user_id} value={m.user_id}>{m.profile?.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="라벨">
              <Input key={project.label ?? ""} defaultValue={project.label ?? ""} placeholder="예: Design" onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== project.label) updateProject.mutate({ id: project.id, label: v }); }} />
            </Field>
            <Field label="그룹">
              <Input key={project.group_name ?? ""} defaultValue={project.group_name ?? ""} placeholder="예: 사내" onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== project.group_name) updateProject.mutate({ id: project.id, group_name: v }); }} />
            </Field>
          </div>
          <Field label="색·아이콘">
            <AppearancePicker
              name={project.name}
              color={project.color}
              icon={project.icon}
              onChange={(patch) => updateProject.mutate({ id: project.id, ...patch })}
            />
          </Field>
          <div className="border-t border-stone-200 pt-3">
            <p className="mb-2 text-[13px] font-medium text-stone-500">커스텀 필드</p>
            <ProjectFieldsEditor projectId={project.id} />
          </div>
        </div>
      </Modal>

      {/* 태스크 추가 모달 */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="새 태스크">
        <form onSubmit={submitTask} className="space-y-3">
          <Field label="제목">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus placeholder="무엇을 해야 하나요?" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="상태">
              <Select value={addColumnId ?? ""} onChange={(e) => setAddColumnId(e.target.value)}>
                {columns?.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
              </Select>
            </Field>
            <Field label="우선순위">
              <PrioritySelect value={form.priority || null} onChange={(v) => setForm({ ...form, priority: v ?? "" })} />
            </Field>
            <Field label="마감일">
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </Field>
            <Field label="담당자">
              <Select value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
                <option value="">지정 안 함</option>
                {members?.map((m) => <option key={m.user_id} value={m.user_id}>{m.profile?.name}</option>)}
              </Select>
            </Field>
          </div>
          <Button type="submit" className="w-full" disabled={createTask.isPending || !form.title.trim()}>
            {createTask.isPending ? "추가 중..." : "추가"}
          </Button>
        </form>
      </Modal>

      <TaskPanel tasks={tasks ?? []} />
    </div>
  );
}
