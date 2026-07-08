import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check, ChevronsUpDown, LayoutDashboard, FolderKanban, SquareCheckBig, CalendarDays,
  FileText, Code2, Users, Settings, LogOut, Mail, Menu, Plus, Search, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import CommandPalette from "../CommandPalette";
import { useAuth } from "../../context/AuthContext";
import { useDocs, useMembers, useMyTasks, useProjects, useRealtimeSync, useSnippets } from "../../hooks/data";
import { supabase } from "../../lib/supabase";
import { cn, projectColorSet } from "../../lib/utils";
import type { Invitation, Workspace } from "../../types/db";
import { useIsActiveStatus } from "../ProjectStatuses";
import { AppIcon, Avatar, Button, Input, Modal, projectIconEl } from "../ui";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Project", icon: FolderKanban },
  { to: "/my-tasks", label: "My Task", icon: SquareCheckBig },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/docs", label: "Docs", icon: FileText },
  { to: "/snippets", label: "Code", icon: Code2 },
  { to: "/team", label: "Team", icon: Users },
];

const MOBILE_TABS = NAV.slice(0, 4);
const MOBILE_MORE = [...NAV.slice(4), { to: "/settings", label: "설정", icon: Settings }];

function useNavCounts(): Record<string, number | undefined> {
  const { data: projects } = useProjects();
  const { data: myTasks } = useMyTasks();
  const { data: docs } = useDocs();
  const { data: snippets } = useSnippets();
  const { data: members } = useMembers();
  return {
    "/projects": projects?.length,
    "/my-tasks": myTasks?.filter((t) => !t.completed_at).length,
    "/docs": docs?.length,
    "/snippets": snippets?.length,
    "/team": members?.length,
  };
}

function NavItem({ to, label, icon: Icon, count, compact }: {
  to: string; label: string; icon: typeof Menu; count?: number; compact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
          compact && "justify-center px-2",
          isActive
            ? "border border-stone-200 bg-white text-stone-900 shadow-sm"
            : "border border-transparent text-stone-500 hover:bg-stone-200/50 hover:text-stone-700",
        )
      }
      title={label}
    >
      <Icon size={17} className="shrink-0" />
      {!compact && <span className="flex-1">{label}</span>}
      {!compact && count !== undefined && count > 0 && (
        <span className="rounded bg-stone-200/80 px-1.5 py-0.5 text-[11px] font-semibold text-stone-500">{count}</span>
      )}
    </NavLink>
  );
}

/* ---------- 사이드바 프로젝트 섹션 (레퍼런스: 플랫 앱 아이콘 목록) ---------- */
function SidebarProjects({ filter }: { filter?: string }) {
  const { data: projects } = useProjects();
  const nav = useNavigate();
  const isActiveStatus = useIsActiveStatus();
  let active = (projects ?? []).filter((p) => isActiveStatus(p.status));
  if (filter) active = active.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));
  active = active.slice(0, 6);
  if (filter && active.length === 0) return null;
  return (
    <div className="pt-4">
      <div className="mb-1 flex items-center justify-between px-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">진행 중 프로젝트</p>
        <button onClick={() => nav("/projects")} className="rounded p-0.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-600" title="프로젝트 전체">
          <Plus size={13} />
        </button>
      </div>
      {active.length === 0 ? (
        <button onClick={() => nav("/projects")} className="block w-full rounded-lg border border-dashed border-stone-200 px-2.5 py-1.5 text-left text-[12px] text-stone-400 hover:bg-stone-200/40">
          첫 프로젝트 만들기
        </button>
      ) : (
        active.map((p) => (
          <NavLink
            key={p.id}
            to={`/projects/${p.id}`}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-colors",
                isActive ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200" : "text-stone-500 hover:bg-stone-200/50 hover:text-stone-700",
              )
            }
          >
            <AppIcon label={p.name} color={projectColorSet(p.color)} icon={projectIconEl(p.icon, 12)} size={20} className="rounded-md" />
            <span className="truncate">{p.name}</span>
          </NavLink>
        ))
      )}
    </div>
  );
}

/* ---------- 워크스페이스 전환 모달 ---------- */
interface PendingInvite extends Invitation {
  workspace?: Pick<Workspace, "id" | "name">;
}

function WorkspaceSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, workspaces, workspace, switchWorkspace, refresh } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = session?.user.email?.toLowerCase();
  const { data: invites } = useQuery({
    queryKey: ["my-invites", email],
    enabled: open && Boolean(email),
    queryFn: async () => {
      const { data } = await supabase
        .from("invitations")
        .select("*, workspace:workspaces(id, name)")
        .eq("email", email!)
        .is("accepted_at", null);
      return (data ?? []) as PendingInvite[];
    },
  });

  function choose(id: string) {
    switchWorkspace(id);
    onClose();
    nav("/");
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const wsId = crypto.randomUUID();
      const { error: e1 } = await supabase.from("workspaces").insert({ id: wsId, name: name.trim() });
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("memberships")
        .insert({ workspace_id: wsId, user_id: session.user.id, role: "owner" });
      if (e2) throw e2;
      localStorage.setItem("ws:current", wsId);
      await refresh();
      setName("");
      setCreating(false);
      onClose();
      nav("/");
    } catch (err) {
      setError((err as { message?: string })?.message ?? "생성 실패");
    } finally {
      setBusy(false);
    }
  }

  async function accept(inv: PendingInvite) {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const { error: e1 } = await supabase
        .from("memberships")
        .insert({ workspace_id: inv.workspace_id, user_id: session.user.id, role: inv.role });
      if (e1) throw e1;
      await supabase.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id);
      localStorage.setItem("ws:current", inv.workspace_id);
      await refresh();
      qc.invalidateQueries({ queryKey: ["my-invites"] });
      onClose();
      nav("/");
    } catch (err) {
      setError((err as { message?: string })?.message ?? "수락 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="워크스페이스">
      <div className="space-y-4">
        <ul className="space-y-1">
          {workspaces.map((e) => (
            <li key={e.workspace.id}>
              <button
                onClick={() => choose(e.workspace.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  e.workspace.id === workspace?.id
                    ? "border-stone-900 bg-stone-50"
                    : "border-stone-200 hover:bg-stone-50",
                )}
              >
                <AppIcon label={e.workspace.name} size={32} className="rounded-lg bg-stone-900 text-white" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.workspace.name}</span>
                  <span className="text-xs text-stone-400">{e.role === "owner" ? "소유자" : e.role === "admin" ? "관리자" : "멤버"}</span>
                </span>
                {e.workspace.id === workspace?.id && <Check size={16} className="shrink-0 text-stone-900" />}
              </button>
            </li>
          ))}
        </ul>

        {invites && invites.length > 0 && (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-stone-500">받은 초대</p>
            <ul className="space-y-1">
              {invites.map((inv) => (
                <li key={inv.id} className="flex items-center gap-2.5 rounded-xl border border-dashed border-stone-300 px-3 py-2.5">
                  <Mail size={16} className="shrink-0 text-stone-400" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{inv.workspace?.name ?? "워크스페이스"}</span>
                  <Button size="sm" disabled={busy} onClick={() => accept(inv)}>수락</Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}

        {creating ? (
          <form onSubmit={create} className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 워크스페이스 이름" autoFocus required />
            <Button type="submit" disabled={busy || !name.trim()} className="shrink-0">만들기</Button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50"
          >
            <Plus size={15} /> 새 워크스페이스
          </button>
        )}
      </div>
    </Modal>
  );
}

/* ---------- 셸 ---------- */
export default function AppShell() {
  const { workspace, profile, session, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const counts = useNavCounts();
  useRealtimeSync();

  // ⌘K / ⌘F 로 전역 검색 팔레트 열기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "f")) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const moreActive = MOBILE_MORE.some((t) => location.pathname.startsWith(t.to));
  const g1 = NAV.slice(0, 4);
  const g2 = NAV.slice(4);

  return (
    <div className="flex h-dvh bg-stone-100">
      {/* 사이드바 */}
      <aside className="hidden shrink-0 flex-col md:flex md:w-16 lg:w-60">
        <button
          onClick={() => setSwitcherOpen(true)}
          className="mx-2 mt-3 flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-2 py-2 text-left transition-colors hover:bg-stone-50 lg:mx-3 lg:px-2.5"
          title="워크스페이스 전환"
        >
          <AppIcon label={workspace?.name ?? "W"} size={32} className="bg-stone-900 text-white" />
          <span className="hidden min-w-0 flex-1 lg:block leading-tight">
            <span className="block text-[11px] text-stone-400">워크스페이스</span>
            <span className="block truncate text-sm font-semibold">{workspace?.name}</span>
          </span>
          <ChevronsUpDown size={14} className="hidden shrink-0 text-stone-400 lg:block" />
        </button>

        {/* 검색 (lg) → 전역 명령 팔레트 */}
        <div className="mx-3 mt-3 hidden lg:block">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-8 w-full items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 text-[13px] text-stone-400 hover:bg-stone-50"
          >
            <Search size={14} />
            <span className="flex-1 text-left">검색</span>
            <span className="rounded border border-stone-200 bg-stone-50 px-1 py-0.5 text-[10px] font-medium">⌘K</span>
          </button>
        </div>

        <nav className="mt-2 flex-1 overflow-y-auto px-2 lg:px-3">
          {/* lg: 그룹형 */}
          <div className="hidden space-y-0.5 lg:block">
            {g1.map((n) => <NavItem key={n.to} {...n} count={counts[n.to]} />)}
            {g1.length > 0 && g2.length > 0 && <div className="mx-2 my-2 h-px bg-stone-200/70" />}
            {g2.map((n) => <NavItem key={n.to} {...n} count={counts[n.to]} />)}
            <SidebarProjects />
          </div>
          {/* md 축소: 아이콘만 */}
          <div className="space-y-0.5 lg:hidden">
            {NAV.map((n) => <NavItem key={n.to} {...n} compact />)}
          </div>
        </nav>

        {/* 하단: 유저 카드 + 푸터 */}
        <div className="px-2 pb-3 pt-2 lg:px-3">
          <div className="mb-2 lg:hidden">
            <NavItem to="/settings" label="설정" icon={Settings} compact />
          </div>
          <div className="hidden items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-2 py-1.5 lg:flex">
            <Avatar profile={profile} size={30} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-medium">{profile?.name}</p>
              <p className="truncate text-[11px] text-stone-400">{session?.user.email ?? profile?.job_title ?? "팀 멤버"}</p>
            </div>
            <NavLink to="/settings" className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600" title="설정">
              <Settings size={15} />
            </NavLink>
            <button onClick={signOut} className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600" title="로그아웃">
              <LogOut size={15} />
            </button>
          </div>
          <button onClick={signOut} className="flex w-full items-center justify-center rounded-lg py-2 text-stone-400 hover:bg-stone-200/50 hover:text-stone-600 lg:hidden" title="로그아웃">
            <LogOut size={17} />
          </button>
          <p className="mt-2 hidden px-1 text-[10px] text-stone-300 lg:block">Workspace · v0.1</p>
        </div>
      </aside>

      {/* 본문 */}
      <div className="flex min-w-0 flex-1 flex-col md:py-3 md:pr-3">
        {/* 모바일 탑바 */}
        <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 md:hidden">
          <button onClick={() => setSwitcherOpen(true)} className="flex items-center gap-2">
            <AppIcon label={workspace?.name ?? "W"} size={28} className="rounded-lg bg-stone-900 text-white" />
            <span className="text-[15px] font-semibold">{workspace?.name}</span>
            <ChevronsUpDown size={13} className="text-stone-400" />
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setPaletteOpen(true)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" title="검색">
              <Search size={18} />
            </button>
            <NavLink to="/settings"><Avatar profile={profile} size={30} /></NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-stone-50 px-4 py-4 pb-24 sm:px-5 md:rounded-2xl md:border md:border-stone-200 md:pb-6 lg:px-7">
          <Outlet />
        </main>
      </div>

      {/* 모바일 하단 탭바 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white pb-safe md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  isActive && !moreOpen ? "text-stone-900" : "text-stone-400",
                )
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
              moreOpen || moreActive ? "text-stone-900" : "text-stone-400",
            )}
          >
            {moreOpen ? <X size={20} /> : <Menu size={20} />}
            더보기
          </button>
        </div>
      </nav>

      {/* 더보기 시트 */}
      {moreOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] rounded-t-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-2">
              {MOBILE_MORE.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium",
                      isActive ? "bg-stone-100 text-stone-900" : "text-stone-500",
                    )
                  }
                >
                  <Icon size={22} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <WorkspaceSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
