import { useState } from "react";
import { Button, Input, Field } from "../components/ui";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim() || email.split("@")[0] } },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo("확인 이메일을 보냈습니다. 메일함에서 인증 후 로그인하세요.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-stone-900 text-lg font-bold text-white">W</span>
          <h1 className="text-xl font-bold">Workspace</h1>
          <p className="mt-1 text-sm text-stone-400">팀의 모든 일을 한곳에서</p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          {mode === "signup" && (
            <Field label="이름">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" required />
            </Field>
          )}
          <Field label="이메일">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@team.com" required autoComplete="email" />
          </Field>
          <Field label="비밀번호">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </Field>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}
          {info && <p className="rounded-lg bg-green-50 px-3 py-2 text-[13px] text-green-700">{info}</p>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-stone-500">
          {mode === "login" ? (
            <>계정이 없나요?{" "}
              <button className="font-medium text-stone-900 underline" onClick={() => setMode("signup")}>회원가입</button>
            </>
          ) : (
            <>이미 계정이 있나요?{" "}
              <button className="font-medium text-stone-900 underline" onClick={() => setMode("login")}>로그인</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
