import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowLeft, Bold, CalendarDays, Check, Clock, Code, FolderKanban, Heading1, Heading2, Heading3, Italic,
  List, ListOrdered, Minus, Quote, Redo2, SquareCode, Strikethrough, Tag, Trash2, Undo2, User,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TagPicker } from "../../components/Tags";
import { AppIcon, Button, MetaRow, Select, Spinner } from "../../components/ui";
import { useDoc, useDocMutations, useMembers, useProjects } from "../../hooks/data";
import { cn, paletteFor } from "../../lib/utils";

type DocPatch = { title?: string; body?: string; tags?: string[]; project_id?: string | null };

function ToolbarButton({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 disabled:opacity-30",
        active && "bg-stone-900 text-white hover:bg-stone-700 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-0.5 rounded-xl border border-stone-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur">
      <ToolbarButton title="실행 취소" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 size={15} /></ToolbarButton>
      <ToolbarButton title="다시 실행" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 size={15} /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-stone-200" />
      <ToolbarButton title="제목 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={15} /></ToolbarButton>
      <ToolbarButton title="제목 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></ToolbarButton>
      <ToolbarButton title="제목 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-stone-200" />
      <ToolbarButton title="굵게" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></ToolbarButton>
      <ToolbarButton title="기울임" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolbarButton>
      <ToolbarButton title="취소선" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></ToolbarButton>
      <ToolbarButton title="인라인 코드" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}><Code size={15} /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-stone-200" />
      <ToolbarButton title="글머리 목록" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></ToolbarButton>
      <ToolbarButton title="번호 목록" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></ToolbarButton>
      <ToolbarButton title="인용" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></ToolbarButton>
      <ToolbarButton title="코드 블록" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><SquareCode size={15} /></ToolbarButton>
      <ToolbarButton title="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} /></ToolbarButton>
    </div>
  );
}

/** 문서 편집 패널 — Docs 페이지의 우측 영역에서 사용 */
export default function DocEditorPane({ docId, onBack, onDeleted }: {
  docId: string;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const { data: doc, isLoading } = useDoc(docId);
  const { update, remove } = useDocMutations();
  const { data: projects } = useProjects();
  const { data: members } = useMembers();

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [saved, setSaved] = useState(true);
  const loaded = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef<DocPatch | null>(null);

  const flush = useCallback(() => {
    if (!pending.current) return;
    const patch = pending.current;
    pending.current = null;
    update.mutate({ id: docId, ...patch }, { onSuccess: () => setSaved(true) });
  }, [docId, update]);

  const scheduleSave = useCallback(
    (patch: DocPatch) => {
      setSaved(false);
      pending.current = { ...pending.current, ...patch };
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
    },
    [flush],
  );

  // 다른 화면으로 이동(언마운트) 시 저장 대기분을 즉시 저장
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    return () => {
      clearTimeout(timer.current);
      flushRef.current();
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "내용을 입력하세요. 툴바 또는 마크다운 단축키(# 제목, - 목록 등)를 쓸 수 있습니다." }),
    ],
    editorProps: {
      attributes: { class: "prose-doc min-h-[55vh] outline-none", spellcheck: "false" },
    },
    onUpdate: ({ editor }) => scheduleSave({ body: editor.getHTML() }),
  });

  useEffect(() => {
    if (doc && editor && !loaded.current) {
      setTitle(doc.title);
      setTags(doc.tags);
      setProjectId(doc.project_id ?? "");
      editor.commands.setContent(doc.body || "", false);
      loaded.current = true;
    }
  }, [doc, editor]);

  function updateTags(next: string[]) {
    setTags(next);
    scheduleSave({ tags: next });
  }

  async function del() {
    if (!confirm("문서를 삭제할까요?")) return;
    pending.current = null;
    await remove.mutateAsync(docId);
    onDeleted();
  }

  if (isLoading || !doc) return <div className="flex justify-center py-20"><Spinner /></div>;

  const linkedProject = projects?.find((p) => p.id === projectId);
  const author = members?.find((m) => m.user_id === doc.created_by)?.profile;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5 sm:px-6">
        <button onClick={onBack} className="flex items-center gap-1 text-[13px] text-stone-400 hover:text-stone-600 lg:invisible">
          <ArrowLeft size={14} /> 문서 목록
        </button>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-stone-400">
            {saved ? <><Check size={13} className="text-stone-500" /> 저장됨</> : "저장 중..."}
          </span>
          <Button variant="ghost" size="sm" onClick={del}><Trash2 size={15} /></Button>
        </div>
      </div>

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_248px]">
        {/* 본문 */}
        <div className="min-w-0 p-4 sm:p-6">
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); scheduleSave({ title: e.target.value }); }}
            placeholder="제목 없음"
            spellCheck={false}
            className="mb-2 w-full bg-transparent text-2xl font-bold outline-none placeholder:text-stone-300"
          />

          <div className="mb-4">
            <TagPicker value={tags} onChange={updateTags} />
          </div>

          {editor && <Toolbar editor={editor} />}
          <div className="min-h-[55vh] cursor-text" onClick={() => editor?.chain().focus().run()}>
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* 우측 메타데이터 (레퍼런스: 문서 속성 패널) */}
        <aside className="hidden border-l border-stone-100 bg-stone-50/40 p-5 xl:block">
          <h3 className="mb-2 text-[13px] font-semibold text-stone-500">속성</h3>
          <div className="divide-y divide-stone-100">
            <MetaRow icon={<FolderKanban size={14} />} label="프로젝트">
              <Select
                value={projectId}
                onChange={(e) => { setProjectId(e.target.value); scheduleSave({ project_id: e.target.value || null }); }}
                className="h-8 text-[13px]"
              >
                <option value="">연결 안 함</option>
                {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </MetaRow>
            <MetaRow icon={<Tag size={14} />} label="태그">
              <span className="text-[13px] text-stone-600">{tags.length > 0 ? `${tags.length}개` : "없음"}</span>
            </MetaRow>
            <MetaRow icon={<Clock size={14} />} label="수정일">
              <span className="text-[13px] text-stone-600">{new Date(doc.updated_at).toLocaleDateString("ko-KR")}</span>
            </MetaRow>
            <MetaRow icon={<CalendarDays size={14} />} label="생성일">
              <span className="text-[13px] text-stone-600">{new Date(doc.created_at).toLocaleDateString("ko-KR")}</span>
            </MetaRow>
            <MetaRow icon={<User size={14} />} label="작성자">
              <span className="text-[13px] text-stone-600">{author?.name ?? "알 수 없음"}</span>
            </MetaRow>
          </div>
          {linkedProject && (
            <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-3">
              <AppIcon label={linkedProject.name} color={paletteFor(linkedProject.id)} size={26} className="rounded-lg" />
              <span className="min-w-0 truncate text-[13px] font-medium">{linkedProject.name}</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
