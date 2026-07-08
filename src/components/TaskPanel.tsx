import { CheckSquare, MessageSquare, Plus, Send, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "../context/AuthContext";
import { useBoardColumns, useComments, useMembers, useSubtasks, useTaskMutations } from "../hooks/data";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import type { Task } from "../types/db";
import { PrioritySelect } from "./Priorities";
import { TaskFields } from "./ProjectFields";
import { TagPicker } from "./Tags";
import { Avatar, Badge, Button, Field, Input, Select, Spinner, Textarea } from "./ui";

/** ?task=<id> 쿼리 파라미터로 열리는 태스크 상세 패널 (PC: 사이드, 모바일: 풀시트) */
export default function TaskPanel({ tasks }: { tasks: Task[] }) {
  const [params, setParams] = useSearchParams();
  const taskId = params.get("task");
  const task = tasks.find((t) => t.id === taskId);

  function close() {
    setParams((p) => {
      p.delete("task");
      return p;
    });
  }

  if (!taskId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={close}>
      <div
        className="flex h-full w-full flex-col overflow-y-auto bg-white shadow-xl sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {task ? <TaskDetail task={task} onClose={close} /> : (
          <div className="flex flex-1 items-center justify-center"><Spinner /></div>
        )}
      </div>
    </div>
  );
}

function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const { profile } = useWorkspace();
  const { data: members } = useMembers();
  const { data: columns } = useBoardColumns(task.project_id ?? undefined);
  const { data: subtasks } = useSubtasks(task.id);
  const { data: comments } = useComments(task.id);
  const { update, remove } = useTaskMutations();
  const qc = useQueryClient();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
  }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveTitle() {
    const v = title.trim();
    if (v && v !== task.title) update.mutate({ id: task.id, title: v });
  }
  function saveDescription() {
    const v = description.trim() || null;
    if (v !== task.description) update.mutate({ id: task.id, description: v });
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    const t = newSubtask.trim();
    if (!t) return;
    await supabase.from("subtasks").insert({ task_id: task.id, title: t, position: (subtasks?.length ?? 0) });
    setNewSubtask("");
    qc.invalidateQueries({ queryKey: ["subtasks", task.id] });
  }

  async function toggleSubtask(id: string, done: boolean) {
    await supabase.from("subtasks").update({ done }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["subtasks", task.id] });
  }

  async function deleteSubtask(id: string) {
    await supabase.from("subtasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["subtasks", task.id] });
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    const b = newComment.trim();
    if (!b) return;
    await supabase.from("comments").insert({ task_id: task.id, author_id: profile.id, body: b });
    setNewComment("");
    qc.invalidateQueries({ queryKey: ["comments", task.id] });
  }

  async function deleteTask() {
    if (!confirm("이 태스크를 삭제할까요?")) return;
    await remove.mutateAsync(task.id);
    onClose();
  }

  const doneCount = subtasks?.filter((s) => s.done).length ?? 0;

  return (
    <>
      <div className="flex items-start gap-2 border-b border-stone-200 px-5 py-3">
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          spellCheck={false}
          rows={1}
          placeholder="태스크 제목"
          className="min-h-[28px] flex-1 resize-none bg-transparent pt-1 text-lg font-semibold leading-snug outline-none placeholder:text-stone-300"
        />
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={deleteTask} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500" title="삭제">
            <Trash2 size={16} />
          </button>
          <button onClick={onClose} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-5 px-5 py-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          <Field label="상태">
            <Select
              value={task.column_id ?? ""}
              onChange={(e) => {
                const col = columns?.find((c) => c.id === e.target.value);
                update.mutate({
                  id: task.id,
                  column_id: e.target.value || null,
                  completed_at: col?.is_done ? new Date().toISOString() : null,
                });
              }}
            >
              {columns?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="우선순위">
            <PrioritySelect value={task.priority ?? null} onChange={(v) => update.mutate({ id: task.id, priority: v })} />
          </Field>
          <Field label="담당자">
            <Select
              value={task.assignee_id ?? ""}
              onChange={(e) => update.mutate({ id: task.id, assignee_id: e.target.value || null })}
            >
              <option value="">지정 안 함</option>
              {members?.map((m) => <option key={m.user_id} value={m.user_id}>{m.profile?.name}</option>)}
            </Select>
          </Field>
          <Field label="마감일">
            <Input
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) => update.mutate({ id: task.id, due_date: e.target.value || null })}
            />
          </Field>
        </div>

        <Field label="설명">
          <Textarea
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            placeholder="태스크 설명을 입력하세요..."
            className="min-h-[160px] resize-y leading-6"
          />
        </Field>

        <Field label="태그">
          <TagPicker value={task.tags ?? []} onChange={(next) => update.mutate({ id: task.id, tags: next })} />
        </Field>

        <TaskFields task={task} />

        {/* 서브태스크 */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-stone-500">
            <CheckSquare size={14} /> 서브태스크
            {subtasks && subtasks.length > 0 && (
              <Badge className="bg-stone-100 text-stone-500">{doneCount}/{subtasks.length}</Badge>
            )}
          </p>
          <ul className="space-y-1">
            {subtasks?.map((s) => (
              <li key={s.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={(e) => toggleSubtask(s.id, e.target.checked)}
                  className="h-4 w-4 rounded accent-stone-900"
                />
                <span className={cn("flex-1 text-sm", s.done && "text-stone-400 line-through")}>{s.title}</span>
                <button onClick={() => deleteSubtask(s.id)} className="hidden text-stone-300 hover:text-red-500 group-hover:block">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addSubtask} className="mt-1.5 flex items-center gap-2">
            <Plus size={15} className="text-stone-400" />
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="서브태스크 추가..."
              className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-stone-400"
            />
          </form>
        </div>

        {/* 코멘트 */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-stone-500">
            <MessageSquare size={14} /> 코멘트 {comments && comments.length > 0 && <span className="text-stone-400">{comments.length}</span>}
          </p>
          <ul className="space-y-3">
            {comments?.map((c) => (
              <li key={c.id} className="flex gap-2.5">
                <Avatar profile={c.author} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px]">
                    <span className="font-medium">{c.author?.name ?? "알 수 없음"}</span>{" "}
                    <span className="text-xs text-stone-400">{new Date(c.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-stone-700">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <form onSubmit={addComment} className="mt-3 flex gap-2">
            <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="코멘트 작성..." />
            <Button type="submit" size="sm" className="h-9 shrink-0 px-3" disabled={!newComment.trim()}>
              <Send size={14} />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
