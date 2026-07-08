import { Code2, FileText, Search, SquareCheckBig } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useDocs, useProjects, useSnippets, useWorkspaceTasks } from "../hooks/data";
import { projectColorSet } from "../lib/utils";
import { AppIcon, projectIconEl } from "./ui";

/* 전역 명령 팔레트: 태스크·문서·프로젝트·스니펫 통합 검색 */
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const { data: projects } = useProjects();
  const { data: tasks } = useWorkspaceTasks();
  const { data: docs } = useDocs();
  const { data: snippets } = useSnippets();

  useEffect(() => { if (open) setQ(""); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const ql = q.trim().toLowerCase();
  const res = useMemo(() => {
    if (!ql) return null;
    return {
      projects: (projects ?? []).filter((p) => p.name.toLowerCase().includes(ql)).slice(0, 5),
      tasks: (tasks ?? []).filter((t) => t.title.toLowerCase().includes(ql)).slice(0, 6),
      docs: (docs ?? []).filter((d) => (d.title || "").toLowerCase().includes(ql)).slice(0, 5),
      snippets: (snippets ?? []).filter((s) => s.title.toLowerCase().includes(ql)).slice(0, 5),
    };
  }, [ql, projects, tasks, docs, snippets]);

  if (!open) return null;
  const empty = res && !res.projects.length && !res.tasks.length && !res.docs.length && !res.snippets.length;
  const go = (to: string) => { onClose(); nav(to); };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/30 px-4 pt-[12vh]" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-stone-200 px-3">
          <Search size={17} className="shrink-0 text-stone-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색..."
            className="h-11 flex-1 bg-transparent text-[15px] outline-none placeholder:text-stone-400"
          />
          <span className="shrink-0 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[11px] text-stone-400">Esc</span>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {!res && <p className="px-2 py-8 text-center text-[13px] text-stone-400">검색어를 입력하세요</p>}
          {empty && <p className="px-2 py-8 text-center text-[13px] text-stone-400">"{q}" 에 대한 결과가 없어요</p>}

          {res && res.projects.length > 0 && (
            <Group label="프로젝트">
              {res.projects.map((p) => (
                <Row key={p.id} onClick={() => go(`/projects/${p.id}`)}
                  icon={<AppIcon label={p.name} color={projectColorSet(p.color)} icon={projectIconEl(p.icon, 12)} size={22} className="rounded-md" />}
                  title={p.name}
                />
              ))}
            </Group>
          )}
          {res && res.tasks.length > 0 && (
            <Group label="태스크">
              {res.tasks.map((t) => (
                <Row key={t.id} onClick={() => go(t.project_id ? `/projects/${t.project_id}?task=${t.id}` : `/my-tasks?task=${t.id}`)}
                  icon={<span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-stone-100 text-stone-400"><SquareCheckBig size={13} /></span>}
                  title={t.title}
                  meta={projects?.find((p) => p.id === t.project_id)?.name}
                />
              ))}
            </Group>
          )}
          {res && res.docs.length > 0 && (
            <Group label="문서">
              {res.docs.map((d) => (
                <Row key={d.id} onClick={() => go(`/docs/${d.id}`)}
                  icon={<span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-stone-100 text-stone-400"><FileText size={13} /></span>}
                  title={d.title || "제목 없음"}
                />
              ))}
            </Group>
          )}
          {res && res.snippets.length > 0 && (
            <Group label="코드">
              {res.snippets.map((s) => (
                <Row key={s.id} onClick={() => go("/snippets")}
                  icon={<span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-stone-100 text-stone-400"><Code2 size={13} /></span>}
                  title={s.title || "제목 없음"}
                  meta={s.language}
                />
              ))}
            </Group>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-stone-400">{label}</p>
      {children}
    </div>
  );
}

function Row({ icon, title, meta, onClick }: { icon: ReactNode; title: string; meta?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-stone-100">
      {icon}
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{title}</span>
      {meta && <span className="shrink-0 truncate text-[11px] text-stone-400">{meta}</span>}
    </button>
  );
}
