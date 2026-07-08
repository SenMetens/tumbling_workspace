import {
  X, Search, Loader2, ChevronDown, ArrowUpDown, ListFilter, LayoutGrid, Rows3, Plus,
  Folder, Rocket, Code2, Target, Flag, Box, Layers, Zap, Bug, Compass, Star, Palette,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, useEffect } from "react";
import { cn, initials, avatarColor, projectColorSet, PALETTE_KEYS, type ColorSet } from "../lib/utils";
import type { Profile } from "../types/db";

/* ---------- Button ---------- */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
        variant === "primary" && "bg-stone-900 text-white hover:bg-stone-700",
        variant === "secondary" && "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
        variant === "ghost" && "text-stone-500 hover:bg-stone-100 hover:text-stone-700",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-500",
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Badge ---------- */
export function Badge({ className, children, dot }: { className?: string; children: ReactNode; dot?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
      {children}
    </span>
  );
}

/* ---------- Card ---------- */
export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-stone-200 bg-white",
        onClick && "cursor-pointer transition-colors hover:border-stone-300 hover:bg-stone-50/60",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ profile, size = 28 }: { profile?: Profile | null; size?: number }) {
  const name = profile?.name ?? "?";
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={name} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", avatarColor(profile?.id ?? "?"))}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ profiles, size = 24, max = 4 }: { profiles: Profile[]; size?: number; max?: number }) {
  const shown = profiles.slice(0, max);
  const rest = profiles.length - shown.length;
  return (
    <span className="inline-flex items-center">
      {shown.map((p, i) => (
        <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }} className="rounded-full ring-2 ring-white">
          <Avatar profile={p} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span
          style={{ width: size, height: size, marginLeft: -size * 0.3, fontSize: size * 0.36 }}
          className="inline-flex items-center justify-center rounded-full bg-stone-200 font-semibold text-stone-600 ring-2 ring-white"
        >
          +{rest}
        </span>
      )}
    </span>
  );
}

/* ---------- Form ---------- */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      spellCheck={false}
      className={cn(
        "h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm outline-none placeholder:text-stone-400 focus:border-stone-400",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      spellCheck={false}
      className={cn(
        "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-stone-400 focus:border-stone-400",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block w-full">
      <select
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-stone-200 bg-white pl-3 pr-8 text-sm outline-none focus:border-stone-400",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-stone-500">{label}</span>
      {children}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = "검색..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-stone-400 focus:border-stone-400"
      />
    </div>
  );
}

/* ---------- Modal (PC 중앙 / 모바일 하단 시트) ---------- */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div
        className={cn(
          "max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-safe shadow-2xl sm:rounded-xl sm:p-6",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-stone-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "relative whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
            value === t.key ? "text-stone-900" : "text-stone-400 hover:text-stone-600",
          )}
        >
          {t.label}
          {value === t.key && <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-stone-900" />}
        </button>
      ))}
    </div>
  );
}

/* ---------- 세그먼트 탭 (Base01 레퍼런스: 회색 트랙 + 흰색 활성 필) ---------- */
export function SegmentTabs<T extends string>({ tabs, value, onChange }: {
  tabs: { key: T; label: string; icon?: ReactNode }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-stone-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-all",
            value === t.key
              ? "border border-stone-200 bg-white text-stone-900 shadow-sm"
              : "border border-transparent text-stone-500 hover:text-stone-700",
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- 상태 도트 라벨 (컬러 점 + 텍스트) ---------- */
export function DotLabel({ dot, text, label }: { dot: string; text?: string; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium", text ?? "text-stone-500")}>
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

/* ---------- 상태 표시 ---------- */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 size={20} className={cn("animate-spin text-stone-400", className)} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 py-14 text-center">
      {icon && <div className="mb-3 text-stone-300">{icon}</div>}
      <p className="text-sm font-medium text-stone-600">{title}</p>
      {description && <p className="mt-1 max-w-xs text-[13px] text-stone-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- 페이지 헤더 ---------- */
export function PageHeader({ title, actions, subtitle, icon, eyebrow }: {
  title: string; actions?: ReactNode; subtitle?: string; icon?: ReactNode; eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex flex-wrap items-end justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <div className="min-w-0">
          {eyebrow && <div className="mb-0.5 text-xs text-stone-400">{eyebrow}</div>}
          <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-stone-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- 브레드크럼 (레퍼런스: 섹션 / 현재 · 카운트) ---------- */
export function Breadcrumb({ items, count }: { items: string[]; count?: number }) {
  return (
    <span className="flex items-center gap-1.5">
      {items.map((it, i) => (
        <span key={i} className={cn(i === items.length - 1 ? "font-medium text-stone-600" : "text-stone-400")}>
          {i > 0 && <span className="mr-1.5 text-stone-300">/</span>}
          {it}
        </span>
      ))}
      {count !== undefined && <span className="text-stone-400">· {count}</span>}
    </span>
  );
}

/* ---------- 컬러 앱 아이콘 (레퍼런스: 프로젝트/워크스페이스/언어 타일) ---------- */
export function AppIcon({ label, color, icon, size = 32, className }: {
  label?: string; color?: ColorSet; icon?: ReactNode; size?: number; className?: string;
}) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-semibold",
        color ? cn(color.solid, "text-white") : "bg-stone-100 text-stone-500",
        className,
      )}
    >
      {icon ?? label?.slice(0, 1).toUpperCase()}
    </span>
  );
}

/* ---------- 섹션 그룹 헤더 (레퍼런스: To Do · 3 cards + 추가 버튼) ---------- */
export function SectionHeader({ dot, icon, title, count, action, className }: {
  dot?: string; icon?: ReactNode; title: ReactNode; count?: number; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 px-1 py-1.5", className)}>
      {dot && <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dot)} />}
      {icon}
      <h2 className="text-[13px] font-semibold text-stone-700">{title}</h2>
      {count !== undefined && (
        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-500">{count}</span>
      )}
      <span className="flex-1" />
      {action}
    </div>
  );
}

/* ---------- 메타데이터 행 (아이콘 + 라벨 + 값) ---------- */
export function MetaRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="flex w-24 shrink-0 items-center gap-2 text-[13px] text-stone-400">
        <span className="text-stone-300">{icon}</span>
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ---------- 키보드 힌트 ---------- */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-stone-200 bg-stone-50 px-1 py-0.5 font-sans text-[10px] font-medium text-stone-400">
      {children}
    </kbd>
  );
}

/* ---------- 툴바 컨트롤 ---------- */
export function ToolButton({ icon, children, active, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode; active?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[13px] font-medium transition-colors",
        active ? "border-stone-300 bg-stone-100 text-stone-800" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function SortButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <ToolButton icon={<ArrowUpDown size={14} />} {...props}>정렬</ToolButton>;
}

export function FilterButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <ToolButton icon={<ListFilter size={14} />} {...props}>필터</ToolButton>;
}

/** 그리드/리스트 뷰 토글 */
export function ViewToggle({ value, onChange }: { value: "grid" | "list"; onChange: (v: "grid" | "list") => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-stone-200 bg-white p-0.5">
      {([["grid", LayoutGrid], ["list", Rows3]] as const).map(([v, Icon]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            value === v ? "bg-stone-100 text-stone-800" : "text-stone-400 hover:text-stone-600",
          )}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}

/** 검색 + ⌘ 힌트가 있는 툴바용 인풋 */
export function ToolbarSearch({ value, onChange, placeholder = "검색...", className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-9 text-sm outline-none placeholder:text-stone-400 focus:border-stone-400"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"><Kbd>⌘F</Kbd></span>
    </div>
  );
}

/* ---------- KPI 셀 (대시보드) — 플랫·컴팩트 ---------- */
export function StatTile({ label, value, icon, color, onClick, hint }: {
  label: string; value: ReactNode; icon: ReactNode; color?: ColorSet; onClick?: () => void; hint?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left transition-colors hover:bg-stone-50"
    >
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", color ? cn(color.softBg, color.text) : "bg-stone-100 text-stone-500")}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-stone-500">{label}</span>
        <span className="flex items-baseline gap-1 text-[17px] font-semibold leading-tight text-stone-900">
          {value}
          {hint && <span className="text-xs font-normal text-stone-400">{hint}</span>}
        </span>
      </span>
    </button>
  );
}

/* Plus 재노출 (섹션 추가 버튼 등에서 공용 사용) */
export function AddButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn("flex h-6 w-6 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700", className)}
      {...props}
    >
      <Plus size={15} />
    </button>
  );
}

/* ---------- 프로젝트 아이콘 (사용자 지정) ---------- */
export const PROJECT_ICON_OPTIONS: { key: string; Icon: LucideIcon }[] = [
  { key: "folder", Icon: Folder }, { key: "rocket", Icon: Rocket }, { key: "code", Icon: Code2 },
  { key: "palette", Icon: Palette }, { key: "target", Icon: Target }, { key: "flag", Icon: Flag },
  { key: "box", Icon: Box }, { key: "layers", Icon: Layers }, { key: "zap", Icon: Zap },
  { key: "bug", Icon: Bug }, { key: "compass", Icon: Compass }, { key: "star", Icon: Star },
];

/** 저장된 아이콘 키 → 엘리먼트. 없으면 null(이니셜 표시) */
export function projectIconEl(name: string | null | undefined, size = 16): ReactNode {
  const opt = PROJECT_ICON_OPTIONS.find((o) => o.key === name);
  return opt ? <opt.Icon size={size} /> : null;
}

/* ---------- 색·아이콘 선택기 ---------- */
export function AppearancePicker({ name, color, icon, onChange }: {
  name: string; color: string | null; icon: string | null;
  onChange: (patch: { color?: string | null; icon?: string | null }) => void;
}) {
  const swatch = (key: string | null) => {
    const active = (color ?? null) === key;
    const set = projectColorSet(key);
    return (
      <button
        type="button"
        key={key ?? "none"}
        onClick={() => onChange({ color: key })}
        title={key ?? "기본"}
        className={cn(
          "h-6 w-6 rounded-md border transition-transform",
          set ? cn(set.solid, "border-transparent") : "border-stone-300 bg-stone-200",
          active && "ring-2 ring-stone-900 ring-offset-1",
        )}
      />
    );
  };
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <AppIcon label={name || "P"} color={projectColorSet(color)} icon={projectIconEl(icon, 18)} size={38} />
        <div className="flex flex-wrap gap-1.5">
          {swatch(null)}
          {PALETTE_KEYS.map((k) => swatch(k))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ icon: null })}
          title="이니셜"
          className={cn("flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-[11px] font-semibold text-stone-500 hover:bg-stone-50", !icon && "ring-2 ring-stone-900 ring-offset-1")}
        >
          {(name || "P").slice(0, 1).toUpperCase()}
        </button>
        {PROJECT_ICON_OPTIONS.map(({ key, Icon }) => (
          <button
            type="button"
            key={key}
            onClick={() => onChange({ icon: key })}
            className={cn("flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50", icon === key && "ring-2 ring-stone-900 ring-offset-1")}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}
