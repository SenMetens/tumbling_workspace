import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { FullPageSpinner } from "./components/ui";
import { useAuth } from "./context/AuthContext";
import { isSupabaseConfigured } from "./lib/supabase";

const Login = lazy(() => import("./pages/Login"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/projects/Projects"));
const ProjectDetail = lazy(() => import("./pages/projects/ProjectDetail"));
const MyTasks = lazy(() => import("./pages/tasks/MyTasks"));
const Calendar = lazy(() => import("./pages/calendar/Calendar"));
const Docs = lazy(() => import("./pages/docs/Docs"));
const Snippets = lazy(() => import("./pages/snippets/Snippets"));
const Team = lazy(() => import("./pages/team/Team"));
const Settings = lazy(() => import("./pages/settings/Settings"));

function ConfigMissing() {
  return (
    <div className="flex h-dvh items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-stone-200 bg-white p-6 text-sm leading-6 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold">환경 설정이 필요합니다</h1>
        <p className="text-stone-500">
          프로젝트 루트에 <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[13px]">.env</code> 파일을
          만들고 Supabase 프로젝트의 URL과 anon key를 입력한 뒤 다시 실행하세요.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-stone-900 p-3 text-xs text-stone-100">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
        </pre>
        <p className="mt-3 text-stone-500">
          자세한 절차는 <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[13px]">README.md</code>를 참고하세요.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { loading, session, workspace } = useAuth();

  if (!isSupabaseConfigured) return <ConfigMissing />;
  if (loading) return <FullPageSpinner />;

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {!session ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : !workspace ? (
          <>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </>
        ) : (
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/my-tasks" element={<MyTasks />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/docs/:id" element={<Docs />} />
            <Route path="/snippets" element={<Snippets />} />
            <Route path="/team" element={<Team />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </Suspense>
  );
}
