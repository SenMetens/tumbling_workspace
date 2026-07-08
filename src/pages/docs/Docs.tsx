import { FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TagList } from "../../components/Tags";
import { Button, EmptyState, PageHeader, SearchInput, Spinner } from "../../components/ui";
import { useDocMutations, useDocs } from "../../hooks/data";
import { cn } from "../../lib/utils";
import DocEditorPane from "./DocEditor";

/* Cusana 레퍼런스 스타일: 좌측 문서 리스트 + 우측 에디터 */
export default function Docs() {
  const nav = useNavigate();
  const { id: selectedId } = useParams<{ id: string }>();
  const { data: docs, isLoading } = useDocs();
  const { create } = useDocMutations();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const allTags = useMemo(() => [...new Set((docs ?? []).flatMap((d) => d.tags))].sort(), [docs]);

  const filtered = useMemo(
    () =>
      (docs ?? []).filter(
        (d) =>
          d.title.toLowerCase().includes(q.toLowerCase()) &&
          (!tag || d.tags.includes(tag)),
      ),
    [docs, q, tag],
  );

  async function newDoc() {
    const d = await create.mutateAsync(undefined);
    nav(`/docs/${d.id}`);
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div>
      <PageHeader
        title="문서"
        subtitle={`${docs?.length ?? 0}개의 문서`}
        actions={<Button onClick={newDoc} disabled={create.isPending}><Plus size={15} /> 새 문서</Button>}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* 좌측: 문서 리스트 (모바일: 문서 선택 시 숨김) */}
        <div className={cn("space-y-3", selectedId && "hidden lg:block")}>
          <SearchInput value={q} onChange={setQ} placeholder="문서 검색..." />
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(tag === t ? null : t)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    tag === t ? "border-stone-800 bg-stone-800 text-white" : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50",
                  )}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<FileText size={30} />}
              title={q || tag ? "검색 결과가 없습니다" : "아직 문서가 없습니다"}
              action={!q && !tag && <Button size="sm" onClick={newDoc}><Plus size={14} /> 새 문서</Button>}
            />
          ) : (
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              {filtered.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => nav(`/docs/${d.id}`)}
                    className={cn(
                      "relative flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-stone-50",
                      selectedId === d.id && "bg-stone-100",
                    )}
                  >
                    {selectedId === d.id && <span className="absolute inset-y-0 left-0 w-0.5 bg-stone-800" />}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                      <FileText size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className={cn("truncate text-[13px] font-medium", selectedId === d.id && "text-stone-900")}>
                        {d.title || "제목 없음"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-stone-400">
                        {new Date(d.updated_at).toLocaleDateString("ko-KR")}
                        <TagList names={d.tags} max={2} />
                      </p>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 우측: 에디터 */}
        <div className={cn(!selectedId && "hidden lg:block")}>
          {selectedId ? (
            <DocEditorPane
              key={selectedId}
              docId={selectedId}
              onBack={() => nav("/docs")}
              onDeleted={() => nav("/docs")}
            />
          ) : (
            <EmptyState
              icon={<FileText size={34} />}
              title="문서를 선택하세요"
              description="왼쪽 목록에서 문서를 선택하거나 새로 만드세요."
              action={<Button size="sm" onClick={newDoc}><Plus size={14} /> 새 문서</Button>}
            />
          )}
        </div>
      </div>
    </div>
  );
}
