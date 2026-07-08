import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { Task } from "../../types/db";
import { usePriorityDot } from "../../components/Priorities";

/* 프로젝트 태스크를 마감일 기준 월간 달력에 표시 */
export default function ProjectCalendar({ tasks }: { tasks: Task[] }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [, setParams] = useSearchParams();
  const priorityDot = usePriorityDot();

  const rangeStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const rangeEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  const days = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart.getTime(), rangeEnd.getTime()], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const open = (id: string) => setParams((p) => { p.set("task", id); return p; });
  const noDue = tasks.filter((t) => !t.due_date);
  const tasksOn = (day: Date) => tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => setCursor((c) => addMonths(c, -1))} className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-500 hover:bg-stone-50"><ChevronLeft size={16} /></button>
        <button onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-500 hover:bg-stone-50"><ChevronRight size={16} /></button>
        <h3 className="ml-1 text-sm font-semibold">{format(cursor, "yyyy년 M월", { locale: ko })}</h3>
        <button onClick={() => setCursor(new Date())} className="ml-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[13px] font-medium text-stone-600 hover:bg-stone-50">오늘</button>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div className="grid grid-cols-7 border-b border-stone-200 text-center text-[11px] font-medium text-stone-400">
          {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
            <div key={d} className={cn("py-1.5", i === 0 && "text-red-400")}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const items = tasksOn(day);
            const dim = !isSameMonth(day, cursor);
            return (
              <div key={day.toISOString()} className={cn("min-h-[92px] border-b border-r border-stone-100 p-1 last:border-r-0", dim && "bg-stone-50/60")}>
                <div className="mb-0.5 flex justify-end">
                  <span className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                    isToday(day) ? "bg-stone-800 font-semibold text-white" : dim ? "text-stone-300" : "text-stone-500",
                  )}>{format(day, "d")}</span>
                </div>
                <div className="space-y-0.5">
                  {items.slice(0, 3).map((t) => (
                    <button key={t.id} onClick={() => open(t.id)} className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-stone-100">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", priorityDot(t.priority))} />
                      <span className="truncate text-[11px] text-stone-600">{t.title}</span>
                    </button>
                  ))}
                  {items.length > 3 && <p className="px-1 text-[10px] text-stone-400">+{items.length - 3}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {noDue.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[13px] font-medium text-stone-500">마감일 미정 <span className="text-stone-400">{noDue.length}</span></p>
          <div className="flex flex-wrap gap-1.5">
            {noDue.map((t) => (
              <button key={t.id} onClick={() => open(t.id)} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2 py-1 text-[12px] text-stone-600 hover:bg-stone-50">
                <span className={cn("h-1.5 w-1.5 rounded-full", priorityDot(t.priority))} />
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
