import { useEffect, useState } from "react";
import { Button, Input, Field, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Invitation, Workspace } from "../types/db";

interface PendingInvite extends Invitation {
  workspace?: Pick<Workspace, "id" | "name">;
}

export default function Onboarding() {
  const { session, refresh, signOut } = useAuth();
  const [wsName, setWsName] = useState("");
  const [invites, setInvites] = useState<PendingInvite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("invitations")
        .select("*, workspace:workspaces(id, name)")
        .is("accepted_at", null);
      setInvites((data as PendingInvite[]) ?? []);
    })();
  }, []);

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      // 생성 직후에는 아직 멤버가 아니라 RLS 때문에 되읽기(select)가 불가능하므로
      // id를 클라이언트에서 생성하고 반환 없이 insert한다.
      const wsId = crypto.randomUUID();
      const { error: e1 } = await supabase
        .from("workspaces")
        .insert({ id: wsId, name: wsName.trim() });
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("memberships")
        .insert({ workspace_id: wsId, user_id: session.user.id, role: "owner" });
      if (e2) throw e2;
      await refresh();
    } catch (err) {
      const msg = (err as { message?: string })?.message;
      setError(msg ?? "생성 실패");
      setBusy(false);
    }
  }

  async function acceptInvite(inv: PendingInvite) {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const { error: e1 } = await supabase
        .from("memberships")
        .insert({ workspace_id: inv.workspace_id, user_id: session.user.id, role: inv.role });
      if (e1) throw e1;
      await supabase.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", inv.id);
      await refresh();
    } catch (err) {
      const msg = (err as { message?: string })?.message;
      setError(msg ?? "수락 실패");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-100 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-stone-900 text-lg font-bold text-white">W</span>
          <h1 className="text-xl font-bold">워크스페이스 시작하기</h1>
          <p className="mt-1 text-sm text-stone-400">새로 만들거나, 받은 초대를 수락하세요.</p>
        </div>

        {invites === null ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : invites.length > 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">받은 초대</h2>
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2.5">
                  <span className="text-sm font-medium">{inv.workspace?.name ?? "워크스페이스"}</span>
                  <Button size="sm" disabled={busy} onClick={() => acceptInvite(inv)}>수락</Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <form onSubmit={createWorkspace} className="space-y-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">새 워크스페이스 만들기</h2>
          <Field label="워크스페이스 이름">
            <Input value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="예: 푸드나무 개발팀" required />
          </Field>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}
          <Button type="submit" disabled={busy || !wsName.trim()} className="w-full">
            {busy ? "생성 중..." : "만들기"}
          </Button>
        </form>

        <p className="text-center">
          <button onClick={signOut} className="text-sm text-stone-400 underline">로그아웃</button>
        </p>
      </div>
    </div>
  );
}
