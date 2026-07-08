import { ChevronDown, ChevronUp, Columns3 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useBoardColumns, useMembers, useProjectMutations } from "../hooks/data";
import { cn, columnTone } from "../lib/utils";
import type { Project, ProjectField, TableColumnConfig, TableConfig, Task } from "../types/db";
import { PriorityTag } from "./Priorities";
import { renderFieldValue } from "./ProjectFields";
import { Avatar, DotLabel, Input, Modal } from "./ui";

type Kind = "builtin" | "field";
interface ResolvedCol { key: string; label: string; kind: Kind; field?: ProjectField; hidden: boolean; }

const BUILTIN: { key: string; label: string }[] = [
  { key: "status", label: "상태" },
  { key: "assignee", label: "담당" },
  { key: "priority", label: "우선순위" },
  { key: "due", label: "마감" },
];

function allCols(fields: ProjectField[]) {
  return [
    ...BUILTIN.map((b) => ({ ...b, kind: "builtin" as Kind, field: undefined as ProjectField | undefined })),
    ...fields.map((f) => ({ key: f.id, label: f.name, kind: "field" as Kind, field: f })),
  ];
}

function resolveCols(config: TableConfig | null | undefined, fields: ProjectField[]): ResolvedCol[] {
  const all = allCols(fields);
  const cfg = config?.columns ?? [];
  const cfgKeys = new Set(cfg.map((c) => c.key));
  const out: ResolvedCol[] = [];
  cfg.forEach((c) => {
    const a = all.find((x) => x.key === c.key);
    if (a) out.push({ key: a.key, kind: a.kind, field: a.field, label: c.label || a.label, hidden: !!c.hidden });
  });
  all.forEach((a) => { if (!cfgKeys.has(a.key)) out.push({ key: a.key, kind: a.kind, field: a.field, label: a.label, hidden: false }); });
  return out;
}

export default function ProjectTable({ tasks, project, fields }: { tasks: Task[]; project: Project; fields: ProjectField[] }) {
  const { data: members } = useMembers();
  const { data: boardCols } = useBoardColumns(project.id);
  const [, setParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cols = resolveCols(project.table_config, fields).filter((c) => !c.hidden);
  const openTask = (id: string) => setParams((p) => { p.set("task", id); return p; });
  const today = new Date().toISOString().slice(0, 10);

  function cell(col: ResolvedCol, t: Task): ReactNode {
    if (col.kind === "field" && col.field) return renderFieldValue(col.field, t.fields?.[col.field.id] ?? null);
    switch (col.key) {
      case "status": {
        const c = boardCols?.find((x) => x.id === t.column_id);
        return c ? <DotLabel dot={columnTone(c).dot} text={columnTone(c).text} label={c.name} /> : <span className="text-stone-300">—</span>;
      }
      case "assignee": {
        const a = members?.find((m) => m.user_id === t.assignee_id)?.profile;
        return a
          ? <span className="flex items-center gap-2 text-stone-600"><Avatar profile={a} size={20} /><span className="truncate">{a.name}</span></span>
          : <span className="text-stone-300">미지정</span>;
      }
      case "priority":
        return t.priority ? <PriorityTag value={t.priority} /> : <span className="text-stone-300">—</span>;
      case "due": {
        const overdue = t.due_date && !t.completed_at && t.due_date < today;
        return t.due_date
          ? <span className={cn(overdue ? "font-medium text-red-500" : "text-stone-500")}>{t.due_date.slice(5).replace("-", "/")}</span>
          : <span className="text-stone-300">—</span>;
      }
      default: return null;
    }
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button onClick={() => setSettingsOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 text-[13px] text-stone-600 hover:bg-stone-50">
          <Columns3 size={14} /> 컬럼
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-[13px]">
          <thead>
            <tr className="bg-stone-50 text-left text-[12px] text-stone-500">
              <th className="min-w-[220px] py-2 pl-4 pr-3 font-medium">태스크</th>
              {cols.map((c) => <th key={c.key} className="min-w-[110px] whitespace-nowrap border-l border-stone-200 px-3 py-2 font-medium">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} onClick={() => openTask(t.id)} className="cursor-pointer border-t border-stone-200 hover:bg-stone-50">
                <td className="min-w-[220px] py-2.5 pl-4 pr-3">
                  <p className={cn("font-medium", t.completed_at && "text-stone-400 line-through")}>{t.title}</p>
                  {t.description && <p className="truncate text-xs text-stone-400">{t.description}</p>}
                </td>
                {cols.map((c) => <td key={c.key} className="whitespace-nowrap border-l border-stone-200 px-3 py-2.5">{cell(c, t)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TableColumnSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} project={project} fields={fields} />
    </div>
  );
}

function TableColumnSettings({ open, onClose, project, fields }: { open: boolean; onClose: () => void; project: Project; fields: ProjectField[] }) {
  const { update } = useProjectMutations();
  const cols = resolveCols(project.table_config, fields);

  function save(next: ResolvedCol[]) {
    const columns: TableColumnConfig[] = next.map((c) => ({ key: c.key, hidden: c.hidden, label: c.label }));
    update.mutate({ id: project.id, table_config: { columns } });
  }
  const toggle = (i: number) => save(cols.map((c, idx) => (idx === i ? { ...c, hidden: !c.hidden } : c)));
  const rename = (i: number, label: string) => save(cols.map((c, idx) => (idx === i ? { ...c, label } : c)));
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= cols.length) return;
    const next = [...cols];
    [next[i], next[j]] = [next[j], next[i]];
    save(next);
  }

  return (
    <Modal open={open} onClose={onClose} title="테이블 컬럼">
      <div className="space-y-1.5">
        <div className="rounded-md bg-stone-50 px-2.5 py-2 text-[12px] text-stone-400">태스크 (항상 표시)</div>
        {cols.map((c, i) => (
          <div key={c.key} className="flex items-center gap-2">
            <input type="checkbox" checked={!c.hidden} onChange={() => toggle(i)} className="h-4 w-4 shrink-0 accent-stone-900" />
            <Input key={c.label} defaultValue={c.label} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.label) rename(i, v); else e.target.value = c.label; }} className="h-8 flex-1 text-[13px]" />
            <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 disabled:opacity-30"><ChevronUp size={15} /></button>
            <button onClick={() => move(i, 1)} disabled={i === cols.length - 1} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 disabled:opacity-30"><ChevronDown size={15} /></button>
          </div>
        ))}
        <p className="pt-1 text-xs text-stone-400">체크 해제 시 숨김 · 화살표로 순서 변경 · 이름은 이 프로젝트 테이블에만 적용돼요.</p>
      </div>
    </Modal>
  );
}
