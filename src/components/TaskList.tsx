import { useSearchParams } from "react-router-dom";
import { useBoardColumns, useMembers } from "../hooks/data";
import { cn, columnTone } from "../lib/utils";
import type { ProjectField, Task } from "../types/db";
import { PriorityTag, usePriorityDot } from "./Priorities";
import { renderFieldValue } from "./ProjectFields";
import { Avatar, DotLabel } from "./ui";

/* 밀집 테이블 행. showStatus=true 면 상태 컬럼 노출(테이블·내 태스크 뷰용) */
function Row({ task, showStatus, fields }: { task: Task; showStatus?: boolean; fields?: ProjectField[] }) {
  const [, setParams] = useSearchParams();
  const { data: members } = useMembers();
  const { data: columns } = useBoardColumns(showStatus ? (task.project_id ?? undefined) : undefined);
  const priorityDot = usePriorityDot();
  const assignee = members?.find((m) => m.user_id === task.assignee_id)?.profile;
  const column = columns?.find((c) => c.id === task.column_id);
  const overdue = task.due_date && !task.completed_at && task.due_date < new Date().toISOString().slice(0, 10);

  function open() {
    setParams((p) => { p.set("task", task.id); return p; });
  }

  return (
    <tr onClick={open} className="cursor-pointer border-t border-stone-200 hover:bg-stone-50">
      <td className="py-2.5 pl-4 pr-3">
        <div className="flex items-start gap-2.5">
          <span className={cn("mt-[5px] h-2 w-2 shrink-0 rounded-full", priorityDot(task.priority))} />
          <div className="min-w-0">
            <p className={cn("truncate text-[13px] font-medium", task.completed_at && "text-stone-400 line-through")}>{task.title}</p>
            {task.description && <p className="truncate text-xs text-stone-400">{task.description}</p>}
          </div>
        </div>
      </td>
      {showStatus && (
        <td className="hidden w-32 border-l border-stone-200 px-3 py-2.5 sm:table-cell">
          {column ? <DotLabel dot={columnTone(column).dot} text={columnTone(column).text} label={column.name} /> : <span className="text-[13px] text-stone-300">—</span>}
        </td>
      )}
      <td className="hidden w-40 border-l border-stone-200 px-3 py-2.5 md:table-cell">
        {assignee ? (
          <span className="flex items-center gap-2 text-[13px] text-stone-600">
            <Avatar profile={assignee} size={20} />
            <span className="truncate">{assignee.name}</span>
          </span>
        ) : (
          <span className="text-[13px] text-stone-300">미지정</span>
        )}
      </td>
      <td className="hidden w-28 border-l border-stone-200 px-3 py-2.5 sm:table-cell">
        {task.priority ? <PriorityTag value={task.priority} /> : <span className="text-[13px] text-stone-300">—</span>}
      </td>
      <td className="w-20 border-l border-stone-200 px-3 py-2.5 text-right sm:text-left">
        {task.due_date
          ? <span className={cn("text-[13px]", overdue ? "font-medium text-red-500" : "text-stone-500")}>{task.due_date.slice(5).replace("-", "/")}</span>
          : <span className="text-[13px] text-stone-300">—</span>}
      </td>
      {fields?.map((f) => (
        <td key={f.id} className="hidden w-28 border-l border-stone-200 px-3 py-2.5 text-[13px] lg:table-cell">
          {renderFieldValue(f, task.fields?.[f.id] ?? null)}
        </td>
      ))}
    </tr>
  );
}

export default function TaskList({ tasks, showStatus, fields }: { tasks: Task[]; showStatus?: boolean; fields?: ProjectField[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <table className="w-full table-fixed">
        <thead>
          <tr className="bg-stone-50 text-left text-[12px] text-stone-500">
            <th className="py-2 pl-4 pr-3 font-medium">태스크</th>
            {showStatus && <th className="hidden w-32 border-l border-stone-200 px-3 py-2 font-medium sm:table-cell">상태</th>}
            <th className="hidden w-40 border-l border-stone-200 px-3 py-2 font-medium md:table-cell">담당</th>
            <th className="hidden w-28 border-l border-stone-200 px-3 py-2 font-medium sm:table-cell">우선순위</th>
            <th className="w-20 border-l border-stone-200 px-3 py-2 font-medium">마감</th>
            {fields?.map((f) => <th key={f.id} className="hidden w-28 border-l border-stone-200 px-3 py-2 font-medium lg:table-cell">{f.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => <Row key={t.id} task={t} showStatus={showStatus} fields={fields} />)}
        </tbody>
      </table>
    </div>
  );
}
