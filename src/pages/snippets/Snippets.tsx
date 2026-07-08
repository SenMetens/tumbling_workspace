import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import CodeMirror from "@uiw/react-codemirror";
import { ArrowLeft, Check, Code2, Copy, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { TagList, TagPicker } from "../../components/Tags";
import { Badge, Button, EmptyState, Input, PageHeader, Select, Spinner, ToolbarSearch } from "../../components/ui";
import { useSnippetMutations, useSnippets } from "../../hooks/data";
import { cn, SNIPPET_LANGUAGES } from "../../lib/utils";
import type { Snippet } from "../../types/db";

const LANG_ABBR: Record<string, string> = {
  javascript: "JS", typescript: "TS", python: "PY", sql: "SQL", html: "<>",
  css: "CSS", json: "{}", markdown: "MD", bash: "SH", java: "JV", go: "GO",
  rust: "RS", plaintext: "TXT",
};

function langExtension(lang: string) {
  switch (lang) {
    case "javascript":
    case "typescript":
      return [javascript({ typescript: lang === "typescript" })];
    case "python": return [python()];
    case "sql": return [sql()];
    case "html": return [html()];
    case "css": return [css()];
    case "json": return [json()];
    case "markdown": return [markdown()];
    default: return [];
  }
}

function LangIcon({ language, size = 44 }: { language: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.3 }}
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-stone-100 font-mono font-semibold text-stone-600"
    >
      {LANG_ABBR[language] ?? language.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function Snippets() {
  const { data: snippets, isLoading } = useSnippets();
  const { create, update, remove } = useSnippetMutations();
  const [q, setQ] = useState("");
  const [lang, setLang] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const languages = useMemo(
    () => [...new Set((snippets ?? []).map((s) => s.language))].sort(),
    [snippets],
  );

  const filtered = useMemo(
    () =>
      (snippets ?? []).filter(
        (s) =>
          (s.title.toLowerCase().includes(q.toLowerCase()) ||
            (s.description ?? "").toLowerCase().includes(q.toLowerCase()) ||
            s.tags.some((t) => t.includes(q.toLowerCase()))) &&
          (!lang || s.language === lang),
      ),
    [snippets, q, lang],
  );

  const selected = snippets?.find((s) => s.id === selectedId) ?? null;

  async function newSnippet() {
    const s = await create.mutateAsync(undefined);
    setSelectedId(s.id);
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

  // 편집 화면 (스니펫 선택 시 전체 폭)
  if (selected) {
    return (
      <div>
        <button onClick={() => setSelectedId(null)} className="mb-3 flex items-center gap-1 text-[13px] text-stone-400 hover:text-stone-600">
          <ArrowLeft size={14} /> 스니펫 목록
        </button>
        <SnippetEditor
          key={selected.id}
          snippet={selected}
          onDelete={async () => {
            if (!confirm("스니펫을 삭제할까요?")) return;
            await remove.mutateAsync(selected.id);
            setSelectedId(null);
          }}
          onSave={(patch) => update.mutate({ id: selected.id, ...patch })}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="코드 스니펫"
        subtitle={`${snippets?.length ?? 0}개의 스니펫`}
        actions={<Button onClick={newSnippet} disabled={create.isPending}><Plus size={15} /> 새 스니펫</Button>}
      />

      {/* 툴바 + 언어 카테고리 탭 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          <button
            onClick={() => setLang("")}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
              lang === "" ? "border-stone-300 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50",
            )}
          >
            전체
          </button>
          {languages.map((l) => (
            <button
              key={l}
              onClick={() => setLang(lang === l ? "" : l)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                lang === l ? "border-stone-300 bg-stone-100 text-stone-800" : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50",
              )}
            >
              <span className="h-2 w-2 rounded-full bg-stone-400" />
              {l}
            </button>
          ))}
        </div>
        <ToolbarSearch value={q} onChange={setQ} placeholder="스니펫 검색..." className="w-full sm:w-60" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Code2 size={32} />}
          title={q || lang ? "검색 결과가 없습니다" : "스니펫이 없습니다"}
          description={q || lang ? undefined : "자주 쓰는 코드 조각을 저장해두고 팀과 공유해 보세요."}
          action={!q && !lang && <Button size="sm" onClick={newSnippet}><Plus size={14} /> 새 스니펫</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className="flex flex-col rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-start gap-3">
                <LangIcon language={s.language} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-snug">{s.title || "제목 없음"}</p>
                  <Badge className="mt-1 bg-stone-100 font-mono text-stone-500">{s.language}</Badge>
                </div>
              </div>
              {s.description && <p className="mb-3 line-clamp-2 text-[13px] text-stone-500">{s.description}</p>}
              {s.tags.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1 pt-1">
                  <TagList names={s.tags} max={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SnippetEditor({ snippet, onDelete, onSave }: {
  snippet: Snippet;
  onDelete: () => void;
  onSave: (patch: Partial<Snippet>) => void;
}) {
  const [title, setTitle] = useState(snippet.title);
  const [description, setDescription] = useState(snippet.description ?? "");
  const [language, setLanguage] = useState(snippet.language);
  const [code, setCode] = useState(snippet.code);
  const [tags, setTags] = useState<string[]>(snippet.tags);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  function debounceSave(patch: Partial<Snippet>) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave(patch), 800);
  }

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
        <LangIcon language={language} size={38} />
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); debounceSave({ title: e.target.value }); }}
          placeholder="스니펫 제목"
          spellCheck={false}
          className="min-w-0 flex-1 text-lg font-semibold outline-none placeholder:text-stone-300"
        />
        <span className="w-36 shrink-0">
          <Select
            value={language}
            onChange={(e) => { setLanguage(e.target.value); onSave({ language: e.target.value }); }}
            className="h-8 text-[13px]"
          >
            {SNIPPET_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        </span>
        <Button variant="secondary" size="sm" onClick={copy}>
          {copied ? <><Check size={13} className="text-stone-500" /> 복사됨</> : <><Copy size={13} /> 복사</>}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 size={15} /></Button>
      </div>

      <div className="space-y-2 px-4 py-3">
        <Input
          value={description}
          onChange={(e) => { setDescription(e.target.value); debounceSave({ description: e.target.value || null }); }}
          placeholder="설명 (선택)"
          className="h-8 border-none px-0 text-[13px] focus:border-none"
        />
        <TagPicker value={tags} onChange={(next) => { setTags(next); onSave({ tags: next }); }} />
      </div>

      <div className="border-t border-stone-100">
        <CodeMirror
          value={code}
          onChange={(v) => { setCode(v); debounceSave({ code: v }); }}
          extensions={langExtension(language)}
          theme="light"
          minHeight="420px"
          style={{ fontSize: 13 }}
        />
      </div>
    </div>
  );
}
