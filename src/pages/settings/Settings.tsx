import { Building2, Flag, ListChecks, LogOut, Shield, SlidersHorizontal, Tags as TagsIcon, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { PriorityManager } from "../../components/Priorities";
import { ProjectStatusManager } from "../../components/ProjectStatuses";
import { TagManager } from "../../components/Tags";
import { Avatar, Button, Field, Input, PageHeader, Select } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { usePref } from "../../hooks/usePref";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

type ProjView = "board" | "list" | "table" | "calendar";

function SettingsSection({ icon, color, title, description, children }: {
  icon: ReactNode; color: string; title: string; description?: string; children: ReactNode;
}) {
  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center gap-3 border-b border-stone-100 bg-stone-50/50 px-5 py-3">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white", color)}>
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
          {description && <p className="text-xs text-stone-400">{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function Settings() {
  const { profile, workspace, role, refresh, signOut } = useAuth();
  const [name, setName] = useState(profile?.name ?? "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? "");
  const [wsName, setWsName] = useState(workspace?.name ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [defaultView, setDefaultView] = usePref<ProjView>("projectView", "board");
  const [projectsView, setProjectsView] = usePref<"grid" | "list">("projectsView", "grid");

  const isAdmin = role === "owner" || role === "admin";

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), job_title: jobTitle.trim() || null })
      .eq("id", profile.id);
    setMsg(error ? error.message : "프로필이 저장되었습니다.");
    await refresh();
    setBusy(false);
  }

  async function saveWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from("workspaces").update({ name: wsName.trim() }).eq("id", workspace.id);
    setMsg(error ? error.message : "워크스페이스 이름이 저장되었습니다.");
    await refresh();
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="설정" subtitle="프로필과 워크스페이스를 관리하세요" />

      {msg && <p className="mb-4 rounded-lg bg-stone-100 px-3 py-2 text-[13px] text-stone-600">{msg}</p>}

      <SettingsSection icon={<UserRound size={16} />} color="bg-stone-700" title="내 프로필" description="팀원에게 표시되는 정보입니다.">
        <div className="mb-4 flex items-center gap-3">
          <Avatar profile={profile} size={48} />
          <div>
            <p className="font-medium">{profile?.name}</p>
            <p className="text-[13px] text-stone-400">{profile?.job_title ?? "팀 멤버"}</p>
          </div>
        </div>
        <form onSubmit={saveProfile} className="space-y-3">
          <Field label="이름">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="직함">
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="예: 프론트엔드 개발자" />
          </Field>
          <Button type="submit" disabled={busy || !name.trim()}>프로필 저장</Button>
        </form>
      </SettingsSection>

      <SettingsSection icon={<SlidersHorizontal size={16} />} color="bg-stone-700" title="환경설정" description="이 계정에서만 적용되는 화면 설정입니다.">
        <div className="space-y-3">
          <Field label="기본 프로젝트 뷰">
            <Select value={defaultView} onChange={(e) => setDefaultView(e.target.value as ProjView)}>
              <option value="board">보드</option>
              <option value="list">리스트</option>
              <option value="table">테이블</option>
              <option value="calendar">캘린더</option>
            </Select>
          </Field>
          <Field label="프로젝트 목록 기본 보기">
            <Select value={projectsView} onChange={(e) => setProjectsView(e.target.value as "grid" | "list")}>
              <option value="grid">그리드</option>
              <option value="list">리스트</option>
            </Select>
          </Field>
          <p className="text-xs text-stone-400">앱에서 뷰를 바꾸면 이 값도 자동으로 업데이트됩니다.</p>
        </div>
      </SettingsSection>

      <SettingsSection icon={<TagsIcon size={16} />} color="bg-stone-700" title="태그 관리" description="문서·스니펫·태스크에 공용으로 쓰는 태그입니다.">
        <TagManager />
      </SettingsSection>

      <SettingsSection icon={<Flag size={16} />} color="bg-stone-700" title="우선순위 관리" description="태스크·프로젝트 우선순위 단계입니다.">
        <PriorityManager />
      </SettingsSection>

      <SettingsSection icon={<ListChecks size={16} />} color="bg-stone-700" title="프로젝트 상태 관리" description="상태 단계와 '진행 중'·'완료' 성격(대시보드 집계)을 관리합니다.">
        <ProjectStatusManager />
      </SettingsSection>

      {isAdmin && (
        <SettingsSection icon={<Building2 size={16} />} color="bg-stone-700" title="워크스페이스" description="관리자만 변경할 수 있습니다.">
          <form onSubmit={saveWorkspace} className="space-y-3">
            <Field label="워크스페이스 이름">
              <Input value={wsName} onChange={(e) => setWsName(e.target.value)} required />
            </Field>
            <Button type="submit" disabled={busy || !wsName.trim()}>저장</Button>
          </form>
        </SettingsSection>
      )}

      <SettingsSection icon={<Shield size={16} />} color="bg-stone-700" title="계정" description={`현재 역할: ${role === "owner" ? "소유자" : role === "admin" ? "관리자" : "멤버"}`}>
        <Button variant="secondary" onClick={signOut}><LogOut size={15} /> 로그아웃</Button>
      </SettingsSection>
    </div>
  );
}
