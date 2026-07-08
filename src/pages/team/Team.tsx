import { Briefcase, CalendarDays, Mail, Plus, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader,
  SegmentTabs, Select, Spinner,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useInvitations, useMembers } from "../../hooks/data";
import { supabase } from "../../lib/supabase";
import type { Role } from "../../types/db";

const ROLE_LABEL: Record<Role, string> = { owner: "소유자", admin: "관리자", member: "멤버" };
const ROLE_STYLE: Record<Role, string> = {
  owner: "bg-stone-200 text-stone-800",
  admin: "bg-stone-100 text-stone-600",
  member: "bg-stone-100 text-stone-500",
};
const ROLE_DOT: Record<Role, string> = {
  owner: "bg-stone-800",
  admin: "bg-stone-500",
  member: "bg-stone-400",
};

type Tab = "members" | "invites";

export default function Team() {
  const { workspace, profile, role } = useAuth();
  const { data: members, isLoading } = useMembers();
  const { data: invitations } = useInvitations();
  const qc = useQueryClient();
  const isAdmin = role === "owner" || role === "admin";

  const [tab, setTab] = useState<Tab>("members");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !profile) return;
    setBusy(true);
    setError(null);
    let invitationId: string | null = null;
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.from("invitations").insert({
        workspace_id: workspace.id,
        email: normalizedEmail,
        role: inviteRole,
        invited_by: profile.id,
      }).select("id").single();
      if (error) throw error;
      invitationId = data.id;

      const { error: mailError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          shouldCreateUser: true,
          data: { invited_workspace_id: workspace.id },
        },
      });
      if (mailError) {
        await supabase.from("invitations").delete().eq("id", invitationId);
        throw mailError;
      }

      setEmail("");
      setInviteOpen(false);
      qc.invalidateQueries({ queryKey: ["invitations", workspace.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "초대 메일 발송 실패");
    } finally {
      setBusy(false);
    }
  }

  async function cancelInvite(id: string) {
    await supabase.from("invitations").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["invitations", workspace?.id] });
  }

  async function changeRole(userId: string, newRole: Role) {
    await supabase.from("memberships").update({ role: newRole }).eq("workspace_id", workspace!.id).eq("user_id", userId);
    qc.invalidateQueries({ queryKey: ["members", workspace?.id] });
  }

  async function removeMember(userId: string, name: string) {
    if (!confirm(`${name} 님을 워크스페이스에서 제외할까요?`)) return;
    await supabase.from("memberships").delete().eq("workspace_id", workspace!.id).eq("user_id", userId);
    qc.invalidateQueries({ queryKey: ["members", workspace?.id] });
  }

  const inviteCount = invitations?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="팀"
        subtitle={`${members?.length ?? 0}명이 함께하고 있어요`}
        actions={isAdmin && <Button onClick={() => setInviteOpen(true)}><UserPlus size={15} /> 멤버 초대</Button>}
      />

      {isAdmin && (
        <div className="mb-5">
          <SegmentTabs<Tab>
            tabs={[
              { key: "members", label: `멤버 ${members?.length ?? 0}`, icon: <Users size={14} /> },
              { key: "invites", label: `대기 초대 ${inviteCount}`, icon: <Mail size={14} /> },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : tab === "members" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members?.map((m) => {
            const p = m.profile;
            if (!p) return null;
            const isSelf = p.id === profile?.id;
            return (
              <Card key={m.user_id} className="p-3.5">
                <div className="mb-3 flex items-start justify-between">
                  <Avatar profile={p} size={40} />
                  <Badge className={ROLE_STYLE[m.role]} dot={ROLE_DOT[m.role]}>
                    {m.role !== "member" && <Shield size={11} />}
                    {ROLE_LABEL[m.role]}
                  </Badge>
                </div>
                <p className="text-sm font-semibold">{p.name}{isSelf && <span className="ml-1 text-xs font-normal text-stone-400">(나)</span>}</p>
                <div className="mt-2 space-y-1 border-t border-stone-100 pt-2.5 text-xs text-stone-500">
                  <p className="flex items-center gap-1.5">
                    <Briefcase size={12} className="text-stone-300" /> {p.job_title ?? "팀 멤버"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CalendarDays size={12} className="text-stone-300" /> {new Date(m.created_at).toLocaleDateString("ko-KR")} 합류
                  </p>
                </div>
                {isAdmin && !isSelf && m.role !== "owner" && (
                  <div className="mt-3 flex items-center gap-2">
                    <Select value={m.role} onChange={(e) => changeRole(m.user_id, e.target.value as Role)} className="h-8 flex-1 text-[13px]">
                      <option value="member">멤버</option>
                      <option value="admin">관리자</option>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => removeMember(m.user_id, p.name)}><Trash2 size={14} /></Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        // 대기 초대 탭
        inviteCount === 0 ? (
          <EmptyState
            icon={<Mail size={32} />}
            title="대기 중인 초대가 없습니다"
            description="멤버를 초대하면 여기에 표시됩니다."
            action={<Button size="sm" onClick={() => setInviteOpen(true)}><Plus size={14} /> 멤버 초대</Button>}
          />
        ) : (
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            {invitations!.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                  <Mail size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{inv.email}</span>
                <Badge className={ROLE_STYLE[inv.role]} dot={ROLE_DOT[inv.role]}>{ROLE_LABEL[inv.role]}</Badge>
                <Button variant="ghost" size="sm" onClick={() => cancelInvite(inv.id)}>취소</Button>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === "members" && members && members.length <= 1 && (
        <div className="mt-8">
          <EmptyState
            icon={<Users size={34} />}
            title="아직 혼자네요"
            description="팀원을 초대해 함께 사용해 보세요. 초대받은 사람은 메일 링크로 로그인한 뒤 초대를 수락할 수 있습니다."
            action={isAdmin && <Button size="sm" onClick={() => setInviteOpen(true)}><Plus size={14} /> 멤버 초대</Button>}
          />
        </div>
      )}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="멤버 초대">
        <form onSubmit={invite} className="space-y-3">
          <Field label="이메일">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="teammate@team.com" />
          </Field>
          <Field label="역할">
            <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}>
              <option value="member">멤버</option>
              <option value="admin">관리자</option>
            </Select>
          </Field>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}
          <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-500">
            초대 메일의 링크로 로그인하면 온보딩 화면에서 이 워크스페이스 초대를 수락할 수 있습니다.
          </p>
          <Button type="submit" className="w-full" disabled={busy || !email.trim()}>
            {busy ? "초대 메일 보내는 중..." : "초대 메일 보내기"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
