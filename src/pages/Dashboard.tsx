import { addDays, format, parseISO, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import {
  AlertCircle, ArrowRight, CalendarClock, CalendarDays, FileText,
  FolderKanban, SquareCheckBig,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import TaskPanel from "../components/TaskPanel";
import { AppIcon, Card, PageHeader, StatTile, projectIconEl } from "../components/ui";
import { PriorityTag } from "../components/Priorities";
import { useIsActiveStatus } from "../components/ProjectStatuses";
import { useAuth } from "../context/AuthContext";
import { useDocs, useEvents, useMyTasks, useProjects, useWorkspaceTasks } from "../hooks/data";
import { cn, projectColorSet, EVENT_COLORS } from "../lib/utils";

/* 섹션 컨테이너: 제목 헤더 + 본문이 한 카드 안에 묶임 */
function Section({ icon, title, to, children }: { icon: ReactNode; title: string; to: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/80 px-3.5 py-2">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-700">
          <span className="text-stone-400">{icon}</span> {title}
        </h2>
        <Link to={to} className="flex items-center gap-0.5 text-[11px] font-medium text-stone-400 hover:text-stone-600">
          전체 보기 <ArrowRight size={11} />
        </Link>
      </div>
      {children}
    </Card>
  );
}

function SectionEmpty({ children }: { children: ReactNode }) {
  return <p className="px-3.5 py-7 text-center text-xs text-stone-400">{children}</p>;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const { data: myTasks } = useMyTasks();
  const { data: allTasks } = useWorkspaceTasks();
  const { data: projects } = useProjects();
  const { data: docs } = useDocs();
  const { data: events } = useEvents(startOfDay(today).toISOString(), addDays(startOfDay(today), 7).toISOString());

  const isActiveStatus = useIsActiveStatus();
  const open = (myTasks ?? []).filter((t) => !t.completed_at);
  const dueToday = open.filter((t) => t.due_date === todayStr);
  const overdue = open.filter((t) => t.due_date && t.due_date < todayStr);
  const activeProjects = (projects ?? []).filter((p) => isActiveStatus(p.status));

  const stats = [
    { label: "진행 중 태스크", value: open.length, to: "/my-tasks", icon: <SquareCheckBig size={15} /> },
    { label: "오늘 마감", value: dueToday.length, to: "/my-tasks", icon: <CalendarClock size={15} /> },
    { label: "지연", value: overdue.length > 0 ? <span className="text-red-500">{overdue.length}</span> : 0, to: "/my-tasks", icon: <AlertCircle size={15} /> },
    { label: "진행 중 프로젝트", value: activeProjects.length, to: "/projects", icon: <FolderKanban size={15} /> },
  ];

  const upcoming = useMemo(() => (events ?? []).slice(0, 5), [events]);
  const recentDocs = (docs ?? []).slice(0, 5);
  const focusTasks = [...overdue, ...open.filter((t) => !overdue.includes(t))].slice(0, 7);

  return (
    <div>
      <PageHeader
        title={`안녕하세요, ${profile?.name ?? ""}님`}
        subtitle={format(today, "M월 d일 EEEE", { locale: ko })}
      />

      {/* 요약 스탯 */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} icon={s.icon} onClick={() => nav(s.to)} />
        ))}
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-3">
        {/* 좌측 2/3 */}
        <div className="space-y-3 lg:col-span-2">
          <Section icon={<SquareCheckBig size={14} />} title="내 태스크" to="/my-tasks">
            {focusTasks.length === 0 ? (
              <SectionEmpty>할 일이 없습니다. 수고하셨어요!</SectionEmpty>
            ) : (
              <ul className="divide-y divide-stone-200">
                {focusTasks.map((t) => {
                  const late = t.due_date && t.due_date < todayStr;
                  const proj = projects?.find((p) => p.id === t.project_id);
                  return (
                    <li
                      key={t.id}
                      onClick={() => nav(`/my-tasks?task=${t.id}`)}
                      className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 hover:bg-stone-50"
                    >
                      {proj ? (
                        <AppIcon label={proj.name} color={projectColorSet(proj.color)} icon={projectIconEl(proj.icon, 12)} size={20} className="rounded-md" />
                      ) : (
                        <span className="h-5 w-5 shrink-0 rounded-md bg-stone-100" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{t.title}</span>
                      {t.priority && <PriorityTag value={t.priority} />}
                      {t.due_date && (
                        <span className={cn("shrink-0 text-[11px]", late ? "font-medium text-red-500" : "text-stone-400")}>
                          {late ? "지연 · " : ""}{t.due_date.slice(5).replace("-", "/")}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section icon={<FolderKanban size={14} />} title="진행 중 프로젝트" to="/projects">
            {activeProjects.length === 0 ? (
              <SectionEmpty>진행 중인 프로젝트가 없습니다.</SectionEmpty>
            ) : (
              <div className="grid gap-2.5 p-3 sm:grid-cols-2">
                {activeProjects.slice(0, 4).map((p) => {
                  const list = (allTasks ?? []).filter((t) => t.project_id === p.id);
                  const done = list.filter((t) => t.completed_at).length;
                  const pct = list.length ? Math.round((done / list.length) * 100) : 0;
                  const c = projectColorSet(p.color);
                  return (
                    <button
                      key={p.id}
                      onClick={() => nav(`/projects/${p.id}`)}
                      className="rounded-lg border border-stone-200 p-2.5 text-left transition-colors hover:bg-stone-50"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <AppIcon label={p.name} color={c} icon={projectIconEl(p.icon, 13)} size={22} className="rounded-md" />
                        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{p.name}</p>
                      </div>
                      <div className="mb-1 flex justify-between text-[11px] text-stone-400">
                        <span>{done}/{list.length} 태스크</span><span className="font-medium text-stone-500">{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div className={cn("h-full rounded-full transition-all", c?.solid ?? "bg-stone-700")} style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        {/* 우측 1/3 */}
        <div className="space-y-3">
          <Section icon={<CalendarDays size={14} />} title="다가오는 일정" to="/calendar">
            {upcoming.length === 0 ? (
              <SectionEmpty>7일 내 일정이 없습니다.</SectionEmpty>
            ) : (
              <ul className="divide-y divide-stone-200">
                {upcoming.map((e) => {
                  const dot = (EVENT_COLORS.find((c) => c.value === e.color) ?? EVENT_COLORS[0]).bg;
                  return (
                    <li key={e.id} className="flex items-center gap-2.5 px-3.5 py-2">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{e.title}</span>
                        <span className="text-[11px] text-stone-400">
                          {format(parseISO(e.starts_at), "M/d (EEE)", { locale: ko })}
                          {!e.all_day && ` · ${format(parseISO(e.starts_at), "HH:mm")}`}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section icon={<FileText size={14} />} title="최근 문서" to="/docs">
            {recentDocs.length === 0 ? (
              <SectionEmpty>문서가 없습니다.</SectionEmpty>
            ) : (
              <ul className="divide-y divide-stone-200">
                {recentDocs.map((d) => (
                  <li key={d.id} onClick={() => nav(`/docs/${d.id}`)} className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 hover:bg-stone-50">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-400">
                      <FileText size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{d.title || "제목 없음"}</span>
                      <span className="text-[11px] text-stone-400">{new Date(d.updated_at).toLocaleDateString("ko-KR")} 수정</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <TaskPanel tasks={myTasks ?? []} />
    </div>
  );
}
