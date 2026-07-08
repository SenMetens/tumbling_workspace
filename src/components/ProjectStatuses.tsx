import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useProjectStatuses, useProjectStatusMutations } from "../hooks/data";
import { cn, PALETTE_KEYS, projectColorSet } from "../lib/utils";
import type { WorkspaceProjectStatus } from "../types/db";
import { Button, Input } from "./ui";

const DEFAULT_STATUSES: WorkspaceProjectStatus[] = [
  { id: "d-backlog", workspace_id: "", name: "백로그", color: null, is_active: false, is_done: false, position: 0, created_at: "" },
  { id: "d-active", workspace_id: "", name: "진행 중", color: null, is_active: true, is_done: false, position: 1, created_at: "" },
  { id: "d-done", workspace_id: "", name: "완료", color: null, is_active: false, is_done: true, position: 2, created_at: "" },
  { id: "d-archived", workspace_id: "", name: "보관", color: null, is_active: false, is_done: false, position: 3, created_at: "" },
];
const LEGACY: Record<string, { name: string; active: boolean; done: boolean }> = {
  backlog: { name: "백로그", active: false, done: false },
  active: { name: "진행 중", active: true, done: false },
  done: { name: "완료", active: false, done: true },
  archived: { name: "보관", active: false, done: false },
};

export function useStatusList(): WorkspaceProjectStatus[] {
  const { data } = useProjectStatuses();
  return data && data.length ? data : DEFAULT_STATUSES;
}

function chipClass(color: string | null) {
  const c = projectColorSet(color);
  return c ? c.soft : "bg-stone-100 text-stone-600";
}

export function useStatusMeta() {
  const list = useStatusList();
  return (value: string | null | undefined): { label: string; soft: string } => {
    if (!value) return { label: "—", soft: "bg-stone-100 text-stone-500" };
    const s = list.find((x) => x.name === value);
    if (s) return { label: s.name, soft: chipClass(s.color) };
    const lg = LEGACY[value];
    if (lg) return { label: lg.name, soft: "bg-stone-100 text-stone-600" };
    return { label: value, soft: "bg-stone-100 text-stone-600" };
  };
}

/** 프로젝트가 '진행 중' 성격인지 판정 (대시보드·사이드바 집계용) */
export function useIsActiveStatus() {
  const list = useStatusList();
  return (value: string | null | undefined): boolean => {
    if (!value) return false;
    const s = list.find((x) => x.name === value);
    if (s) return s.is_active;
    return LEGACY[value]?.active ?? false;
  };
}

export function ProjectStatusBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  const getMeta = useStatusMeta();
  const m = getMeta(value);
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", m.soft, className)}>{m.label}</span>;
}

export function ProjectStatusSelect({ value, onChange, className }: { value: string | null; onChange: (v: string) => void; className?: string }) {
  const list = useStatusList();
  const inList = value != null && list.some((s) => s.name === value);
  return (
    <span className="relative block w-full">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={cn("h-9 w-full appearance-none rounded-lg border border-stone-200 bg-white pl-3 pr-8 text-sm outline-none focus:border-stone-400", className)}
      >
        {list.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        {value != null && !inList && <option value={value}>{LEGACY[value]?.name ?? value}</option>}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">▾</span>
    </span>
  );
}

/* ---------- 관리 UI (설정) ---------- */
export function ProjectStatusManager() {
  const { data: statuses } = useProjectStatuses();
  const { create, update, remove } = useProjectStatusMutations();
  const [name, setName] = useState("");
  const list = statuses ?? [];

  function add() {
    const n = name.trim();
    if (!n) return;
    const pos = list.reduce((m, s) => Math.max(m, s.position), -1) + 1;
    create.mutate({ name: n, position: pos });
    setName("");
  }
  function seedDefaults() {
    DEFAULT_STATUSES.forEach((d) => create.mutate({ name: d.name, is_active: d.is_active, is_done: d.is_done, position: d.position }));
  }

  return (
    <div className="space-y-2.5">
      {list.length === 0 && (
        <button onClick={seedDefaults} className="w-full rounded-lg border border-dashed border-stone-300 px-3 py-2 text-[13px] font-medium text-stone-500 hover:bg-stone-50">
          기본 상태(백로그·진행 중·완료·보관) 만들기
        </button>
      )}
      {list.map((s) => (
        <div key={s.id} className="rounded-lg border border-stone-200 p-2.5">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-medium", chipClass(s.color))}>{s.name || "상태"}</span>
            <Input
              key={s.name}
              defaultValue={s.name}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.name) update.mutate({ id: s.id, name: v, oldName: s.name }); else e.target.value = s.name; }}
              className="h-8 flex-1 text-[13px]"
            />
            <Button variant="ghost" size="sm" onClick={() => remove.mutate(s.id)}><Trash2 size={14} /></Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => update.mutate({ id: s.id, color: null })} title="기본" className={cn("h-5 w-5 rounded-md border border-stone-300 bg-stone-200", !s.color && "ring-2 ring-stone-900 ring-offset-1")} />
            {PALETTE_KEYS.map((k) => (
              <button key={k} type="button" onClick={() => update.mutate({ id: s.id, color: k })} className={cn("h-5 w-5 rounded-md", projectColorSet(k)!.solid, s.color === k && "ring-2 ring-stone-900 ring-offset-1")} />
            ))}
            <span className="ml-1 flex items-center gap-3 text-[12px] text-stone-500">
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.is_active} onChange={(e) => update.mutate({ id: s.id, is_active: e.target.checked })} className="h-3.5 w-3.5 accent-stone-900" /> 진행 중</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.is_done} onChange={(e) => update.mutate({ id: s.id, is_done: e.target.checked })} className="h-3.5 w-3.5 accent-stone-900" /> 완료</label>
            </span>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 상태 이름" className="h-8 flex-1 text-[13px]" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button size="sm" onClick={add} disabled={!name.trim()}><Plus size={14} /> 추가</Button>
      </div>
    </div>
  );
}
