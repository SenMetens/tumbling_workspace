import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek,
  format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Field, Input, Modal, PageHeader, Select } from "../../components/ui";
import { useEventMutations, useEvents, useProjects, useWorkspaceTasks } from "../../hooks/data";
import { cn, EVENT_COLORS, eventColorSoft } from "../../lib/utils";
import type { CalendarEvent } from "../../types/db";

type ViewMode = "month" | "week";

interface DayItem {
  kind: "event" | "task";
  id: string;
  title: string;
  color: string | null;
  event?: CalendarEvent;
}

export default function Calendar() {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [showTasks, setShowTasks] = useState(true);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);

  const rangeStart = view === "month" ? startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }) : startOfWeek(cursor, { weekStartsOn: 0 });
  const rangeEnd = view === "month" ? endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }) : endOfWeek(cursor, { weekStartsOn: 0 });

  const { data: events } = useEvents(rangeStart.toISOString(), addDays(rangeEnd, 1).toISOString());
  const { data: tasks } = useWorkspaceTasks();

  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart.getTime(), rangeEnd.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  function itemsFor(day: Date): DayItem[] {
    const items: DayItem[] = [];
    (events ?? []).forEach((e) => {
      const s = parseISO(e.starts_at);
      const en = parseISO(e.ends_at);
      if (day >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) && day <= en) {
        items.push({ kind: "event", id: e.id, title: e.title, color: e.color, event: e });
      }
    });
    if (showTasks) {
      (tasks ?? []).forEach((t) => {
        if (t.due_date && isSameDay(parseISO(t.due_date), day) && !t.completed_at) {
          items.push({ kind: "task", id: t.id, title: t.title, color: "stone" });
        }
      });
    }
    return items;
  }

  function move(dir: 1 | -1) {
    setCursor((c) => (view === "month" ? addMonths(c, dir) : addWeeks(c, dir)));
  }

  const selectedItems = itemsFor(selectedDay);

  return (
    <div>
      <PageHeader
        title="캘린더"
        actions={
          <Button onClick={() => { setCreateDate(selectedDay); setCreateOpen(true); }}>
            <Plus size={15} /> 새 일정
          </Button>
        }
      />

      {/* 툴바 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-500 hover:bg-stone-50"><ChevronLeft size={16} /></button>
          <button onClick={() => move(1)} className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-500 hover:bg-stone-50"><ChevronRight size={16} /></button>
          <h2 className="ml-1 text-lg font-semibold">{format(cursor, "yyyy년 M월", { locale: ko })}</h2>
          <Button variant="secondary" size="sm" onClick={() => { setCursor(new Date()); setSelectedDay(new Date()); }}>오늘</Button>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[13px] text-stone-500">
            <input type="checkbox" checked={showTasks} onChange={(e) => setShowTasks(e.target.checked)} className="h-3.5 w-3.5 accent-stone-900" />
            태스크 마감일 표시
          </label>
          <div className="flex overflow-hidden rounded-lg border border-stone-200 bg-white text-[13px] font-medium">
            {(["month", "week"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn("px-3 py-1.5", view === v ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50")}
              >
                {v === "month" ? "월" : "주"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 그리드 */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-stone-100 text-center text-xs font-medium text-stone-400">
          {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
            <div key={d} className={cn("py-2", i === 0 && "text-red-400")}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const items = itemsFor(day);
            const dim = view === "month" && !isSameMonth(day, cursor);
            const selected = isSameDay(day, selectedDay);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                onDoubleClick={() => { setCreateDate(day); setCreateOpen(true); }}
                className={cn(
                  "flex min-h-[64px] flex-col items-stretch border-b border-r border-stone-100 p-1 text-left align-top last:border-r-0 sm:min-h-[96px] sm:p-1.5",
                  dim && "bg-stone-50/60",
                  selected && "bg-stone-100/80",
                )}
              >
                <span
                  className={cn(
                    "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isToday(day) ? "bg-stone-900 font-semibold text-white" : dim ? "text-stone-300" : "text-stone-600",
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="hidden space-y-0.5 sm:block">
                  {items.slice(0, 3).map((it) => (
                    <div key={`${it.kind}-${it.id}`} className={cn("truncate rounded border px-1 py-0.5 text-[11px] leading-tight", eventColorSoft(it.color), it.kind === "task" && "border-dashed")}>
                      {it.title}
                    </div>
                  ))}
                  {items.length > 3 && <p className="px-1 text-[10px] text-stone-400">+{items.length - 3}</p>}
                </div>
                {items.length > 0 && (
                  <div className="flex gap-0.5 sm:hidden">
                    {items.slice(0, 4).map((it) => (
                      <span key={`${it.kind}-${it.id}`} className={cn("h-1.5 w-1.5 rounded-full", (EVENT_COLORS.find((c) => c.value === it.color) ?? EVENT_COLORS[0]).bg)} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택일 상세 */}
      <section className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-stone-600">
          {format(selectedDay, "M월 d일 (EEE)", { locale: ko })}
        </h3>
        {selectedItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-200 py-6 text-center text-[13px] text-stone-400">일정이 없습니다. 날짜를 더블클릭하거나 '새 일정'으로 추가하세요.</p>
        ) : (
          <ul className="space-y-1.5">
            {selectedItems.map((it) => (
              <li key={`${it.kind}-${it.id}`}>
                <button
                  onClick={() => it.event && setEditing(it.event)}
                  disabled={!it.event}
                  className={cn("flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white py-2.5 pl-2.5 pr-3 text-left shadow-sm", it.event && "hover:bg-stone-50")}
                >
                  <span className={cn("h-8 w-1.5 shrink-0 rounded-full", (EVENT_COLORS.find((c) => c.value === it.color) ?? EVENT_COLORS[0]).bg)} />
                  <span className="flex-1 text-sm font-medium">{it.title}</span>
                  <span className="text-xs text-stone-400">
                    {it.kind === "task"
                      ? "태스크 마감"
                      : it.event!.all_day
                        ? "종일"
                        : `${format(parseISO(it.event!.starts_at), "HH:mm")} - ${format(parseISO(it.event!.ends_at), "HH:mm")}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EventModal
        open={createOpen || Boolean(editing)}
        onClose={() => { setCreateOpen(false); setEditing(null); }}
        initialDate={createDate ?? selectedDay}
        event={editing}
      />
    </div>
  );
}

/* ---------- 일정 생성/수정 모달 ---------- */
function EventModal({ open, onClose, initialDate, event }: { open: boolean; onClose: () => void; initialDate: Date; event: CalendarEvent | null }) {
  const { data: projects } = useProjects();
  const { create, update, remove } = useEventMutations();

  const init = () => ({
    title: event?.title ?? "",
    date: format(event ? parseISO(event.starts_at) : initialDate, "yyyy-MM-dd"),
    start: event && !event.all_day ? format(parseISO(event.starts_at), "HH:mm") : "09:00",
    end: event && !event.all_day ? format(parseISO(event.ends_at), "HH:mm") : "10:00",
    allDay: event?.all_day ?? false,
    color: event?.color ?? "blue",
    projectId: event?.project_id ?? "",
  });
  const [form, setForm] = useState(init);
  const [key, setKey] = useState("");

  const stateKey = `${event?.id ?? "new"}-${open}-${initialDate.toISOString()}`;
  if (open && key !== stateKey) {
    setKey(stateKey);
    setForm(init());
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const base = new Date(`${form.date}T00:00:00`);
    const starts_at = form.allDay ? base.toISOString() : new Date(`${form.date}T${form.start}:00`).toISOString();
    const ends_at = form.allDay
      ? new Date(base.getTime() + 24 * 3600 * 1000 - 1).toISOString()
      : new Date(`${form.date}T${form.end}:00`).toISOString();
    const payload = {
      title: form.title.trim(),
      starts_at,
      ends_at,
      all_day: form.allDay,
      color: form.color,
      project_id: form.projectId || null,
    };
    if (event) await update.mutateAsync({ id: event.id, ...payload });
    else await create.mutateAsync(payload);
    onClose();
  }

  async function del() {
    if (!event) return;
    if (!confirm("일정을 삭제할까요?")) return;
    await remove.mutateAsync(event.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={event ? "일정 수정" : "새 일정"}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="제목">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus placeholder="일정 제목" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="날짜">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </Field>
          <Field label="종일">
            <label className="flex h-9 items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} className="h-4 w-4 accent-stone-900" />
              하루 종일
            </label>
          </Field>
        </div>
        {!form.allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="시작">
              <Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </Field>
            <Field label="종료">
              <Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </Field>
          </div>
        )}
        <Field label="색상">
          <div className="flex gap-2">
            {EVENT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm({ ...form, color: c.value })}
                className={cn("h-7 w-7 rounded-full transition-transform", c.bg, form.color === c.value && "scale-110 ring-2 ring-stone-900 ring-offset-2")}
              />
            ))}
          </div>
        </Field>
        <Field label="프로젝트 연결 (선택)">
          <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
            <option value="">없음</option>
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <div className="flex gap-2">
          {event && (
            <Button type="button" variant="danger" onClick={del} className="shrink-0"><Trash2 size={14} /></Button>
          )}
          <Button type="submit" className="flex-1" disabled={!form.title.trim() || create.isPending || update.isPending}>
            {event ? "저장" : "추가"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
