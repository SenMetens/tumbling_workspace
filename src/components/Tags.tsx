import { Check, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTagMutations, useTags } from "../hooks/data";
import { cn, PALETTE_KEYS, projectColorSet } from "../lib/utils";
import { Button, Input } from "./ui";

function chipClass(color: string | null | undefined) {
  const c = projectColorSet(color);
  return c ? c.soft : "bg-stone-100 text-stone-600";
}
function dotClass(color: string | null | undefined) {
  const c = projectColorSet(color);
  return c ? c.dot : "bg-stone-400";
}

/* ---------- 읽기 전용 태그 칩 목록 ---------- */
export function TagList({ names, max }: { names: string[]; max?: number }) {
  const { data: tags } = useTags();
  if (!names || names.length === 0) return null;
  const shown = max ? names.slice(0, max) : names;
  const colorOf = (name: string) => tags?.find((t) => t.name === name)?.color ?? null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map((n) => (
        <span key={n} className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium", chipClass(colorOf(n)))}>{n}</span>
      ))}
      {max && names.length > max && <span className="text-[11px] text-stone-400">+{names.length - max}</span>}
    </span>
  );
}

/* ---------- 태그 선택기 (관리 태그에서 골라 붙이기 + 새로 만들기) ---------- */
export function TagPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { data: tags } = useTags();
  const { create } = useTagMutations();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = value ?? [];

  const colorOf = (name: string) => tags?.find((t) => t.name === name)?.color ?? null;
  const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  const filtered = (tags ?? []).filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()));
  const canCreate = q.trim().length > 0 && !(tags ?? []).some((t) => t.name.toLowerCase() === q.trim().toLowerCase());

  async function createAndAdd() {
    const name = q.trim();
    if (!name) return;
    const t = await create.mutateAsync({ name });
    onChange([...selected, t.name]);
    setQ("");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((n) => (
          <span key={n} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", chipClass(colorOf(n)))}>
            {n}
            <button type="button" onClick={() => toggle(n)} className="opacity-60 hover:opacity-100"><X size={10} /></button>
          </span>
        ))}
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 rounded-md border border-dashed border-stone-300 px-1.5 py-0.5 text-[11px] font-medium text-stone-500 hover:bg-stone-50">
          <Plus size={11} /> 태그
        </button>
      </div>
      {open && (
        <div className="mt-1.5 w-full max-w-xs rounded-lg border border-stone-200 bg-white p-1.5 shadow-sm">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="태그 검색 또는 추가..."
            className="mb-1 h-8 w-full rounded-md border border-stone-200 px-2 text-[13px] outline-none focus:border-stone-400"
          />
          <div className="max-h-52 overflow-y-auto">
            {filtered.map((t) => (
              <button key={t.id} type="button" onClick={() => toggle(t.name)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-stone-50">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClass(t.color))} />
                <span className="min-w-0 flex-1 truncate text-[13px]">{t.name}</span>
                {selected.includes(t.name) && <Check size={14} className="shrink-0 text-stone-500" />}
              </button>
            ))}
            {canCreate && (
              <button type="button" onClick={createAndAdd} className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-[13px] text-stone-600 hover:bg-stone-50">
                <Plus size={13} /> "<span className="font-medium">{q.trim()}</span>" 태그 만들기
              </button>
            )}
            {filtered.length === 0 && !canCreate && <p className="px-2 py-2 text-xs text-stone-400">관리되는 태그가 없어요. 위에 입력해서 만들 수 있어요.</p>}
          </div>
          <div className="mt-1 flex justify-end border-t border-stone-100 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="rounded px-2 py-1 text-[12px] text-stone-500 hover:bg-stone-50">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 태그 관리 (설정) ---------- */
export function TagManager() {
  const { data: tags } = useTags();
  const { create, update, remove } = useTagMutations();
  const [name, setName] = useState("");

  function add() {
    const n = name.trim();
    if (!n) return;
    create.mutate({ name: n });
    setName("");
  }

  return (
    <div className="space-y-2.5">
      {tags && tags.length > 0 && (
        <div className="space-y-2">
          {tags.map((t) => (
            <div key={t.id} className="rounded-lg border border-stone-200 p-2.5">
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium", chipClass(t.color))}>{t.name || "태그"}</span>
                <Input
                  key={t.name}
                  defaultValue={t.name}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.name) update.mutate({ id: t.id, name: v }); else e.target.value = t.name; }}
                  className="h-8 flex-1 text-[13px]"
                />
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(t.id)}><Trash2 size={14} /></Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => update.mutate({ id: t.id, color: null })} title="기본" className={cn("h-5 w-5 rounded-md border border-stone-300 bg-stone-200", !t.color && "ring-2 ring-stone-900 ring-offset-1")} />
                {PALETTE_KEYS.map((k) => (
                  <button key={k} type="button" onClick={() => update.mutate({ id: t.id, color: k })} className={cn("h-5 w-5 rounded-md", projectColorSet(k)!.solid, t.color === k && "ring-2 ring-stone-900 ring-offset-1")} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 태그 이름" className="h-8 flex-1 text-[13px]" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button size="sm" onClick={add} disabled={!name.trim()}><Plus size={14} /> 추가</Button>
      </div>
    </div>
  );
}
