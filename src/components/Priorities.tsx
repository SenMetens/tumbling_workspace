import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { usePriorities, usePriorityMutations } from "../hooks/data";
import { cn, PALETTE_KEYS, projectColorSet } from "../lib/utils";
import type { WorkspacePriority } from "../types/db";
import { Button, Input } from "./ui";

/* DB가 비었을 때(마이그레이션 전/신규) 폴백 기본 우선순위 */
const DEFAULT_PRIORITIES: WorkspacePriority[] = [
  { id: "d-high", workspace_id: "", name: "높음", color: "rose", rank: 3, position: 0, created_at: "" },
  { id: "d-medium", workspace_id: "", name: "보통", color: "amber", rank: 2, position: 1, created_at: "" },
  { id: "d-low", workspace_id: "", name: "낮음", color: "emerald", rank: 1, position: 2, created_at: "" },
];
/* 마이그레이션 전 레거시 값(low/medium/high) 렌더 폴백 */
const LEGACY: Record<string, { name: string; color: string; rank: number }> = {
  high: { name: "높음", color: "rose", rank: 3 },
  medium: { name: "보통", color: "amber", rank: 2 },
  low: { name: "낮음", color: "emerald", rank: 1 },
};

export function usePriorityList(): WorkspacePriority[] {
  const { data } = usePriorities();
  return data && data.length ? data : DEFAULT_PRIORITIES;
}

export interface PriorityMeta { label: string; soft: string; dot: string; rank: number; }
function meta(name: string, color: string | null, rank: number): PriorityMeta {
  const c = projectColorSet(color);
  return { label: name, soft: c ? c.soft : "bg-stone-100 text-stone-600", dot: c ? c.dot : "bg-stone-400", rank };
}

export function usePriorityMeta() {
  const list = usePriorityList();
  return (value: string | null | undefined): PriorityMeta | null => {
    if (!value) return null;
    const p = list.find((x) => x.name === value);
    if (p) return meta(p.name, p.color, p.rank);
    const lg = LEGACY[value];
    if (lg) return meta(lg.name, lg.color, lg.rank);
    return { label: value, soft: "bg-stone-100 text-stone-600", dot: "bg-stone-400", rank: 0 };
  };
}

/** 우선순위 리딩 도트 색 클래스 반환 함수 */
export function usePriorityDot() {
  const m = usePriorityMeta();
  return (value: string | null | undefined) => m(value)?.dot ?? "bg-stone-300";
}

/** 정렬용 순위 (없으면 0) */
export function usePriorityRank() {
  const m = usePriorityMeta();
  return (value: string | null | undefined) => m(value)?.rank ?? 0;
}

export function PriorityTag({ value, className }: { value: string | null | undefined; className?: string }) {
  const getMeta = usePriorityMeta();
  const m = getMeta(value);
  if (!m) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", m.soft, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />{m.label}
    </span>
  );
}

export function PrioritySelect({ value, onChange, className }: { value: string | null; onChange: (v: string | null) => void; className?: string }) {
  const list = usePriorityList();
  const inList = value != null && list.some((p) => p.name === value);
  return (
    <span className="relative block w-full">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn("h-9 w-full appearance-none rounded-lg border border-stone-200 bg-white pl-3 pr-8 text-sm outline-none focus:border-stone-400", className)}
      >
        <option value="">없음</option>
        {list.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        {value != null && !inList && <option value={value}>{LEGACY[value]?.name ?? value}</option>}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">▾</span>
    </span>
  );
}

/* ---------- 관리 UI (설정) ---------- */
export function PriorityManager() {
  const { data: priorities } = usePriorities();
  const { create, update, remove } = usePriorityMutations();
  const [name, setName] = useState("");
  const list = priorities ?? [];

  function add() {
    const n = name.trim();
    if (!n) return;
    const rank = list.reduce((m, p) => Math.max(m, p.rank), 0) + 1;
    create.mutate({ name: n, rank });
    setName("");
  }
  function seedDefaults() {
    DEFAULT_PRIORITIES.forEach((d) => create.mutate({ name: d.name, color: d.color, rank: d.rank }));
  }

  return (
    <div className="space-y-2.5">
      {list.length === 0 && (
        <button onClick={seedDefaults} className="w-full rounded-lg border border-dashed border-stone-300 px-3 py-2 text-[13px] font-medium text-stone-500 hover:bg-stone-50">
          기본 3단계(높음·보통·낮음) 만들기
        </button>
      )}
      {list.map((p) => (
        <div key={p.id} className="rounded-lg border border-stone-200 p-2.5">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-medium", projectColorSet(p.color) ? projectColorSet(p.color)!.soft : "bg-stone-100 text-stone-600")}>{p.name || "우선순위"}</span>
            <Input
              key={p.name}
              defaultValue={p.name}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== p.name) update.mutate({ id: p.id, name: v, oldName: p.name }); else e.target.value = p.name; }}
              className="h-8 flex-1 text-[13px]"
            />
            <Input
              type="number"
              defaultValue={p.rank}
              title="정렬 순위 (클수록 높음)"
              onBlur={(e) => { const r = Number(e.target.value) || 0; if (r !== p.rank) update.mutate({ id: p.id, rank: r }); }}
              className="h-8 w-14 text-[13px]"
            />
            <Button variant="ghost" size="sm" onClick={() => remove.mutate(p.id)}><Trash2 size={14} /></Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => update.mutate({ id: p.id, color: null })} title="기본" className={cn("h-5 w-5 rounded-md border border-stone-300 bg-stone-200", !p.color && "ring-2 ring-stone-900 ring-offset-1")} />
            {PALETTE_KEYS.map((k) => (
              <button key={k} type="button" onClick={() => update.mutate({ id: p.id, color: k })} className={cn("h-5 w-5 rounded-md", projectColorSet(k)!.solid, p.color === k && "ring-2 ring-stone-900 ring-offset-1")} />
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 우선순위 이름" className="h-8 flex-1 text-[13px]" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button size="sm" onClick={add} disabled={!name.trim()}><Plus size={14} /> 추가</Button>
      </div>
    </div>
  );
}
