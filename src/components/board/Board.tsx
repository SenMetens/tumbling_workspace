import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useColumnMutations, useMembers, useTaskMutations } from "../../hooks/data";
import { cn, midPosition } from "../../lib/utils";
import type { BoardColumn, Task } from "../../types/db";
import { PriorityTag } from "../Priorities";
import { TagList } from "../Tags";
import { Avatar } from "../ui";

/* ---------- 태스크 카드 ---------- */
function TaskCardBody({ task }: { task: Task }) {
  const { data: members } = useMembers();
  const assignee = members?.find((m) => m.user_id === task.assignee_id)?.profile;
  const overdue = task.due_date && !task.completed_at && task.due_date < new Date().toISOString().slice(0, 10);
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <p className={cn("text-sm font-medium leading-snug", task.completed_at && "text-stone-400 line-through")}>{task.title}</p>
      {task.description && <p className="mt-1 line-clamp-2 text-xs text-stone-400">{task.description}</p>}
      {task.tags && task.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1"><TagList names={task.tags} max={4} /></div>}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {task.priority && <PriorityTag value={task.priority} />}
          {task.due_date && (
            <span className={cn("inline-flex items-center gap-1 text-[11px]", overdue ? "font-medium text-red-500" : "text-stone-400")}>
              <CalendarDays size={11} />
              {task.due_date.slice(5).replace("-", "/")}
            </span>
          )}
        </div>
        {assignee && <Avatar profile={assignee} size={22} />}
      </div>
    </div>
  );
}

function SortableTaskCard({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("touch-manipulation", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task.id)}
    >
      <TaskCardBody task={task} />
    </div>
  );
}

/* ---------- 컬럼 (드래그로 순서 변경 가능) ---------- */
function Column({ column, tasks, onOpen, onAdd, onRename, onDelete }: {
  column: BoardColumn; tasks: Task[]; onOpen: (id: string) => void; onAdd: (columnId: string) => void;
  onRename: (id: string, name: string) => void; onDelete: (id: string) => void;
}) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging, isOver } = useSortable({
    id: column.id,
    data: { type: "column", column },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group/col flex w-[272px] shrink-0 flex-col rounded-lg bg-stone-100/80 sm:w-[280px]", isDragging && "opacity-50")}
    >
      <div className="flex items-center gap-1 px-2 py-2.5">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          title="드래그로 순서 변경"
          className="shrink-0 cursor-grab rounded-md p-0.5 text-stone-300 opacity-0 hover:text-stone-500 active:cursor-grabbing group-hover/col:opacity-100"
        >
          <GripVertical size={14} />
        </button>
        <span className={cn("h-2 w-2 shrink-0 rounded-full", column.is_done ? "bg-stone-800" : "bg-stone-300")} />
        <input
          key={column.id}
          defaultValue={column.name}
          spellCheck={false}
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== column.name) onRename(column.id, v); else e.target.value = column.name; }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { (e.target as HTMLInputElement).value = column.name; (e.target as HTMLInputElement).blur(); } }}
          className="min-w-0 flex-1 truncate rounded bg-transparent px-1 text-[13px] font-semibold outline-none hover:bg-stone-200/70 focus:bg-white"
        />
        <span className="shrink-0 text-xs text-stone-400">{tasks.length}</span>
        <button onClick={() => onDelete(column.id)} title="컬럼 삭제" className="shrink-0 rounded-md p-1 text-stone-400 opacity-0 transition-opacity hover:bg-stone-200 hover:text-red-500 group-hover/col:opacity-100">
          <Trash2 size={14} />
        </button>
        <button onClick={() => onAdd(column.id)} title="태스크 추가" className="shrink-0 rounded-md p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-600">
          <Plus size={15} />
        </button>
      </div>
      <div className={cn("min-h-[120px] flex-1 space-y-2 px-2 pb-2", isOver && "rounded-b-lg bg-stone-200/60")}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <SortableTaskCard key={t.id} task={t} onOpen={onOpen} />
          ))}
        </SortableContext>
        {tasks.length === 0 && <div className="rounded-lg border border-dashed border-stone-200 py-6 text-center text-xs text-stone-400">비어 있음</div>}
      </div>
    </div>
  );
}

/* ---------- 보드 ---------- */
export default function Board({ projectId, columns, tasks, onAddTask }: { projectId: string; columns: BoardColumn[]; tasks: Task[]; onAddTask: (columnId: string) => void }) {
  const [, setParams] = useSearchParams();
  const { update } = useTaskMutations();
  const { create: createCol, update: updateCol, remove: removeCol } = useColumnMutations(projectId);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<BoardColumn | null>(null);

  function addColumn() {
    const maxPos = columns.reduce((m, c) => Math.max(m, c.position), -1);
    createCol.mutate({ name: "새 컬럼", position: maxPos + 1 });
  }
  function deleteColumn(id: string) {
    const others = columns.filter((c) => c.id !== id);
    if (others.length === 0) { alert("마지막 컬럼은 삭제할 수 없어요."); return; }
    const hasTasks = tasks.some((t) => t.column_id === id);
    if (!confirm(hasTasks ? "이 컬럼을 삭제할까요? 안의 태스크는 첫 컬럼으로 옮겨져요." : "이 컬럼을 삭제할까요?")) return;
    removeCol.mutate({ id, reassignTo: others[0]?.id ?? null });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  const byColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    columns.forEach((c) => map.set(c.id, []));
    [...tasks]
      .sort((a, b) => a.position - b.position)
      .forEach((t) => {
        if (t.column_id && map.has(t.column_id)) map.get(t.column_id)!.push(t);
      });
    return map;
  }, [columns, tasks]);

  function openTask(id: string) {
    setParams((p) => { p.set("task", id); return p; });
  }

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current;
    if (data?.type === "column") setActiveColumn(data.column as BoardColumn);
    else setActiveTask((data?.task as Task) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const activeType = active.data.current?.type;
    setActiveTask(null);
    setActiveColumn(null);
    if (!over) return;

    // ── 컬럼 순서 변경 ──
    if (activeType === "column") {
      const overData = over.data.current;
      const overColId = overData?.type === "column" ? String(over.id) : ((overData?.task as Task | undefined)?.column_id ?? null);
      if (!overColId || overColId === active.id) return;
      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === overColId);
      if (oldIndex < 0 || newIndex < 0) return;
      arrayMove(columns, oldIndex, newIndex).forEach((c, i) => {
        if (c.position !== i) updateCol.mutate({ id: c.id, position: i });
      });
      return;
    }

    // ── 태스크 이동 ──
    const task = active.data.current?.task as Task | undefined;
    if (!task) return;
    let targetColumnId: string;
    let targetIndex: number;
    const overTask = over.data.current?.task as Task | undefined;
    if (overTask) {
      targetColumnId = overTask.column_id!;
      const list = byColumn.get(targetColumnId) ?? [];
      targetIndex = list.findIndex((t) => t.id === overTask.id);
    } else {
      targetColumnId = String(over.id);
      targetIndex = (byColumn.get(targetColumnId) ?? []).length;
    }
    if (!byColumn.has(targetColumnId)) return;

    const list = (byColumn.get(targetColumnId) ?? []).filter((t) => t.id !== task.id);
    const before = list[targetIndex - 1]?.position;
    const after = list[targetIndex]?.position;
    const position = midPosition(before, after);

    const column = columns.find((c) => c.id === targetColumnId)!;
    if (task.column_id === targetColumnId && task.position === position) return;

    update.mutate({
      id: task.id,
      column_id: targetColumnId,
      position,
      completed_at: column.is_done ? (task.completed_at ?? new Date().toISOString()) : null,
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex items-start gap-3 overflow-x-auto pb-4">
        <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          {columns.map((c) => (
            <Column
              key={c.id}
              column={c}
              tasks={byColumn.get(c.id) ?? []}
              onOpen={openTask}
              onAdd={onAddTask}
              onRename={(id, name) => updateCol.mutate({ id, name })}
              onDelete={deleteColumn}
            />
          ))}
        </SortableContext>
        <button
          onClick={addColumn}
          disabled={createCol.isPending}
          className="flex h-9 w-[200px] shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-stone-300 px-3 text-[13px] font-medium text-stone-400 hover:bg-stone-100 hover:text-stone-600"
        >
          <Plus size={15} /> 컬럼 추가
        </button>
      </div>
      <DragOverlay>
        {activeTask && <div className="w-[272px] rotate-2 sm:w-[280px]"><TaskCardBody task={activeTask} /></div>}
        {activeColumn && (
          <div className="w-[272px] rounded-lg border border-stone-300 bg-stone-100 px-3 py-2.5 text-[13px] font-semibold shadow-lg sm:w-[280px]">
            {activeColumn.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
