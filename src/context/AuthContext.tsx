import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { Profile, Workspace, Role } from "../types/db";

export interface WorkspaceEntry {
  role: Role;
  workspace: Workspace;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** 내가 속한 모든 워크스페이스 */
  workspaces: WorkspaceEntry[];
  /** 현재 선택된 워크스페이스 */
  workspace: Workspace | null;
  role: Role | null;
  switchWorkspace: (id: string) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const LS_KEY = "ws:current";

const AuthContext = createContext<AuthState>({
  loading: true,
  session: null,
  profile: null,
  workspaces: [],
  workspace: null,
  role: null,
  switchWorkspace: () => {},
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceEntry[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const applyCurrent = useCallback((entries: WorkspaceEntry[], preferredId?: string | null) => {
    const wanted = preferredId ?? localStorage.getItem(LS_KEY);
    const entry = entries.find((e) => e.workspace.id === wanted) ?? entries[0] ?? null;
    setWorkspace(entry?.workspace ?? null);
    setRole(entry?.role ?? null);
    if (entry) localStorage.setItem(LS_KEY, entry.workspace.id);
  }, []);

  const loadContext = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setWorkspaces([]);
      setWorkspace(null);
      setRole(null);
      return;
    }
    const [{ data: prof }, { data: mems }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
      supabase
        .from("memberships")
        .select("role, workspace:workspaces(*)")
        .eq("user_id", s.user.id)
        .order("created_at", { ascending: true }),
    ]);
    setProfile((prof as Profile) ?? null);
    const entries: WorkspaceEntry[] = (mems ?? [])
      .map((m) => {
        const row = m as unknown as { role: Role; workspace: Workspace | null };
        return row.workspace ? { role: row.role, workspace: row.workspace } : null;
      })
      .filter((e): e is WorkspaceEntry => e !== null);
    setWorkspaces(entries);
    applyCurrent(entries);
  }, [applyCurrent]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await loadContext(data.session);
  }, [loadContext]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadContext(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        loadContext(s);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadContext]);

  const switchWorkspace = useCallback(
    (id: string) => {
      localStorage.setItem(LS_KEY, id);
      applyCurrent(workspaces, id);
    },
    [workspaces, applyCurrent],
  );

  const signOut = useCallback(async () => {
    localStorage.removeItem(LS_KEY);
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ loading, session, profile, workspaces, workspace, role, switchWorkspace, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** workspace가 보장된 컨텍스트에서 사용 */
export function useWorkspace() {
  const { workspace, profile, role } = useAuth();
  if (!workspace || !profile) throw new Error("workspace not loaded");
  return { workspace, profile, role: role as Role };
}
