import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useProjectFieldMutations, useProjectFields, useTaskMutations } from "../hooks/data";
import type { FieldType, FieldValue, ProjectField, Task } from "../types/db";
import { Badge, Button, Input, Select } from "./ui";

const TYPE_LABEL: Record<FieldType, string> = {
  text: "텍스트", select: "선택", number: "숫자", checkbox: "체크박스", date: "날짜",
};

/* 값 표시(읽기 전용) — 테이블 컬럼 등 */
export function renderFieldValue(field: ProjectField, value: FieldValue): ReactNode {
  if (value === null || value === undefined || value === "") {
    return field.type === "checkbox" ? <span className="text-stone-300">—</span> : <span className="text-stone-300">—</span>;
  }
  switch (field.type) {
    case "checkbox":
      return value ? <span className="text-stone-700">✓</span> : <span className="text-stone-300">—</span>;
    case "select":
      return <Badge className="bg-stone-100 text-stone-600">{String(value)}</Badge>;
    case "date":
      return <span className="text-stone-600">{String(value).slice(5).replace("-", "/")}</span>;
    default:
      return <span className="text-stone-600">{String(value)}</span>;
  }
}

/* ---------- 태스크 패널: 커스텀 필드 값 편집 ---------- */
export function TaskFields({ task }: { task: Task }) {
  const { data: fields } = useProjectFields(task.project_id ?? undefined);
  const { update } = useTaskMutations();
  if (!task.project_id || !fields || fields.length === 0) return null;

  function setVal(fieldId: string, v: FieldValue) {
    update.mutate({ id: task.id, fields: { ...(task.fields ?? {}), [fieldId]: v } });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((f) => {
        const val = task.fields?.[f.id] ?? null;
        return (
          <label key={f.id} className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-stone-500">{f.name}</span>
            {f.type === "text" && (
              <Input defaultValue={typeof val === "string" ? val : ""} key={String(val)} onBlur={(e) => setVal(f.id, e.target.value.trim() || null)} />
            )}
            {f.type === "number" && (
              <Input type="number" defaultValue={val != null ? String(val) : ""} key={String(val)} onBlur={(e) => setVal(f.id, e.target.value === "" ? null : Number(e.target.value))} />
            )}
            {f.type === "date" && (
              <Input type="date" value={typeof val === "string" ? val : ""} onChange={(e) => setVal(f.id, e.target.value || null)} />
            )}
            {f.type === "checkbox" && (
              <span className="flex h-9 items-center">
                <input type="checkbox" checked={Boolean(val)} onChange={(e) => setVal(f.id, e.target.checked)} className="h-4 w-4 accent-stone-900" />
              </span>
            )}
            {f.type === "select" && (
              <Select value={typeof val === "string" ? val : ""} onChange={(e) => setVal(f.id, e.target.value || null)}>
                <option value="">없음</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            )}
          </label>
        );
      })}
    </div>
  );
}

/* ---------- 프로젝트 속성 모달: 필드 정의 관리 ---------- */
export function ProjectFieldsEditor({ projectId }: { projectId: string }) {
  const { data: fields } = useProjectFields(projectId);
  const { create, update, remove } = useProjectFieldMutations(projectId);
  const [name, setName] = useState("");
  const [type, setType] = useState<FieldType>("text");

  function add() {
    const n = name.trim();
    if (!n) return;
    const pos = (fields ?? []).reduce((m, f) => Math.max(m, f.position), -1) + 1;
    create.mutate({ name: n, type, position: pos });
    setName("");
    setType("text");
  }

  return (
    <div className="space-y-2.5">
      {fields && fields.length > 0 && (
        <div className="space-y-2">
          {fields.map((f) => (
            <div key={f.id} className="rounded-lg border border-stone-200 p-2.5">
              <div className="flex items-center gap-2">
                <Input
                  key={f.name}
                  defaultValue={f.name}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== f.name) update.mutate({ id: f.id, name: v }); else e.target.value = f.name; }}
                  className="h-8 flex-1 text-[13px]"
                />
                <span className="w-24 shrink-0">
                  <Select value={f.type} onChange={(e) => update.mutate({ id: f.id, type: e.target.value as FieldType })} className="h-8 text-[13px]">
                    {(Object.keys(TYPE_LABEL) as FieldType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </Select>
                </span>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(f.id)}><Trash2 size={14} /></Button>
              </div>
              {f.type === "select" && (
                <Input
                  key={f.options.join(",")}
                  defaultValue={f.options.join(", ")}
                  placeholder="옵션 (쉼표로 구분): 낮음, 보통, 높음"
                  onBlur={(e) => {
                    const opts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                    update.mutate({ id: f.id, options: opts });
                  }}
                  className="mt-2 h-8 text-[13px]"
                />
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 필드 이름" className="h-8 flex-1 text-[13px]" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <span className="w-24 shrink-0">
          <Select value={type} onChange={(e) => setType(e.target.value as FieldType)} className="h-8 text-[13px]">
            {(Object.keys(TYPE_LABEL) as FieldType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </Select>
        </span>
        <Button size="sm" onClick={add} disabled={!name.trim()}><Plus size={14} /></Button>
      </div>
    </div>
  );
}
