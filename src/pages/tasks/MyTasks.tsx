import { ArrowRight, SquareCheckBig } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TaskList from "../../components/TaskList";
import TaskPanel from "../../components/TaskPanel";
import { usePriorityRank } from "../../components/Priorities";
import { AppIcon, Breadcrumb, EmptyState, PageHeader, projectIconEl, SectionHeader, SegmentTabs, Spinner, ToolbarSearch } from "../../components/ui";
import { useMyTasks, useProjects } from "../../hooks/data";
import { usePref } from "../../hooks/usePref";
import { projectColorSet } from "../../lib/utils";

type Filter = "open" | "overdue" | "done";

export default function MyTasks() {
  const { data: tasks, isLoading } = useMyTasks();
  const { data: projects } = useProjects();
  const nav = useNavigate();
  const priorityRank = usePriorityRank();
  const [filter, setFilter] = usePref<Filter>("myTasksFilter", "open");
  const [q, setQ] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const counts = useMemo(() => {
    const list = tasks ?? [];
    return {
      open: list.filter((t) => !t.completed_at).length,
      overdue: list.filter((t) => !t.completed_at && t.due_date && t.due_date < today).length,
      done: list.filter((t) => t.completed_at).length,
    };
  }, [tasks, today]);

  const filtered = useMemo(() => {
    let list = tasks ?? [];
    if (filter === "open") list = list.filter((t) => !t.completed_at);
    else if (filter === "overdue") list = list.filter((t) => !t.completed_at && t.due_date && t.due_date < today);
    else list = list.filter((t) => t.completed_at);
    if (q.trim()) list = list.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [tasks, filter, today, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((t) => {
      const key = t.project_id ?? "none";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    // 그룹 내 정렬: 우선순위 → 마감일
    for (const list of map.values()) {
      list.sort((a, b) => {
        const pr = priorityRank(b.priority) - priorityRank(a.priority);
        if (pr) return pr;
        return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
      });
    }
    return map;
  }, [filtered, priorityRank]);

  return (
    <div>
      <PageHeader
        title="내 태스크"
        eyebrow={<Breadcrumb items={["내 태스크", filter === "open" ? "진행 중" : filter === "overdue" ? "지연" : "완료"]} count={filtered.length} />}
      />

      {/* 툴바 */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentTabs<Filter>
          tabs={[
            { key: "open", label: `진행 중 ${counts.open}` },
            { key: "overdue", label: `지연 ${counts.overdue}` },
            { key: "done", label: `완료 ${counts.done}` },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <ToolbarSearch value={q} onChange={setQ} placeholder="태스크 검색..." className="w-full sm:w-64" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SquareCheckBig size={34} />}
          title={q ? "검색 결과가 없습니다" : filter === "done" ? "완료한 태스크가 없습니다" : "할 일이 없습니다"}
          description={!q && filter === "open" ? "프로젝트 보드에서 태스크를 자신에게 할당해 보세요." : undefined}
        />
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([projectId, list]) => {
            const project = projects?.find((p) => p.id === projectId);
            return (
              <section key={projectId}>
                <SectionHeader
                  icon={
                    project ? (
                      <AppIcon label={project.name} color={projectColorSet(project.color)} icon={projectIconEl(project.icon, 12)} size={22} className="rounded-md" />
                    ) : (
                      <span className="h-[22px] w-[22px] rounded-md bg-stone-200" />
                    )
                  }
                  title={project?.name ?? "프로젝트 없음"}
                  count={list.length}
                  action={
                    project && (
                      <button
                        onClick={() => nav(`/projects/${project.id}`)}
                        className="flex items-center gap-0.5 text-xs font-medium text-stone-400 hover:text-stone-600"
                      >
                        프로젝트 <ArrowRight size={12} />
                      </button>
                    )
                  }
                />
                <TaskList tasks={list} showStatus />
              </section>
            );
          })}
        </div>
      )}

      <TaskPanel tasks={tasks ?? []} />
    </div>
  );
}
