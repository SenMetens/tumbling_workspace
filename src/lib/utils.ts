import type { Priority, ProjectStatus } from "../types/db";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  low: "bg-green-50 text-green-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-600",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  backlog: "백로그",
  active: "진행 중",
  done: "완료",
  archived: "보관됨",
};

export const PROJECT_STATUS_STYLE: Record<ProjectStatus, string> = {
  backlog: "bg-stone-100 text-stone-500",
  active: "bg-stone-200 text-stone-700",
  done: "bg-stone-100 text-stone-500",
  archived: "bg-stone-100 text-stone-400",
};

export const EVENT_COLORS = [
  { value: "blue", bg: "bg-blue-500", soft: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "green", bg: "bg-green-500", soft: "bg-green-50 text-green-700 border-green-200" },
  { value: "amber", bg: "bg-amber-500", soft: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "red", bg: "bg-red-500", soft: "bg-red-50 text-red-600 border-red-200" },
  { value: "purple", bg: "bg-purple-500", soft: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "stone", bg: "bg-stone-500", soft: "bg-stone-100 text-stone-600 border-stone-200" },
];

export function eventColorSoft(color: string | null) {
  return (EVENT_COLORS.find((c) => c.value === color) ?? EVENT_COLORS[0]).soft;
}

export const SNIPPET_LANGUAGES = [
  "plaintext",
  "javascript",
  "typescript",
  "python",
  "sql",
  "html",
  "css",
  "json",
  "markdown",
  "bash",
  "java",
  "go",
  "rust",
];

/** 컬럼 내 정렬용 fractional index */
export function midPosition(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return 1000;
  if (before === undefined) return (after as number) - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

export function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

/** 아바타 폴백: 무채색 통일 (기본 톤은 그레이) */
export function avatarColor(_id: string) {
  return "bg-stone-200 text-stone-600";
}

/** 칸반 컬럼 상태 도트/텍스트: 무채색 단계 (색은 우선순위에만) */
export function columnTone(column: { is_done: boolean; position: number }) {
  if (column.is_done) return { dot: "bg-stone-800", text: "text-stone-600" };
  if (column.position === 0) return { dot: "bg-stone-300", text: "text-stone-500" };
  if (column.position === 1) return { dot: "bg-stone-500", text: "text-stone-600" };
  return { dot: "bg-stone-400", text: "text-stone-500" };
}

/* ---------- 우선순위 도트 ---------- */
export const PRIORITY_DOT: Record<Priority, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-rose-500",
};

/* ---------- 컬러 팔레트 (앱 아이콘·프로젝트·아바타 식별) ----------
   레퍼런스의 컬러 앱 아이콘 톤: 그라데이션 솔리드 + 소프트 배경 세트 */
export interface ColorSet {
  grad: string;   // 아이콘 배경(그라데이션)
  solid: string;  // 단색 배경
  soft: string;   // 소프트 배경 + 텍스트
  softBg: string; // 소프트 배경만
  text: string;   // 텍스트 컬러
  dot: string;    // 도트
  ring: string;   // 링/보더
}

export const PALETTE: ColorSet[] = [
  { grad: "bg-gradient-to-br from-blue-500 to-indigo-600", solid: "bg-blue-500", soft: "bg-blue-50 text-blue-700", softBg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500", ring: "ring-blue-500/25" },
  { grad: "bg-gradient-to-br from-emerald-500 to-teal-600", solid: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700", softBg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500", ring: "ring-emerald-500/25" },
  { grad: "bg-gradient-to-br from-amber-500 to-orange-600", solid: "bg-amber-500", soft: "bg-amber-50 text-amber-700", softBg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500", ring: "ring-amber-500/25" },
  { grad: "bg-gradient-to-br from-rose-500 to-pink-600", solid: "bg-rose-500", soft: "bg-rose-50 text-rose-700", softBg: "bg-rose-50", text: "text-rose-600", dot: "bg-rose-500", ring: "ring-rose-500/25" },
  { grad: "bg-gradient-to-br from-violet-500 to-purple-600", solid: "bg-violet-500", soft: "bg-violet-50 text-violet-700", softBg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-500", ring: "ring-violet-500/25" },
  { grad: "bg-gradient-to-br from-teal-500 to-cyan-600", solid: "bg-teal-500", soft: "bg-teal-50 text-teal-700", softBg: "bg-teal-50", text: "text-teal-600", dot: "bg-teal-500", ring: "ring-teal-500/25" },
  { grad: "bg-gradient-to-br from-sky-500 to-blue-600", solid: "bg-sky-500", soft: "bg-sky-50 text-sky-700", softBg: "bg-sky-50", text: "text-sky-600", dot: "bg-sky-500", ring: "ring-sky-500/25" },
  { grad: "bg-gradient-to-br from-fuchsia-500 to-pink-600", solid: "bg-fuchsia-500", soft: "bg-fuchsia-50 text-fuchsia-700", softBg: "bg-fuchsia-50", text: "text-fuchsia-600", dot: "bg-fuchsia-500", ring: "ring-fuchsia-500/25" },
];

export function hashIndex(id: string, mod: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}

/** id로부터 안정적인 컬러 세트 선택 */
export function paletteFor(id: string): ColorSet {
  return PALETTE[hashIndex(id, PALETTE.length)];
}

/* ---------- 사용자 지정 프로젝트 색 (기본은 무채색) ---------- */
export const PALETTE_KEYS = ["blue", "emerald", "amber", "rose", "violet", "teal", "sky", "fuchsia"] as const;

const PALETTE_BY_KEY: Record<string, ColorSet> = Object.fromEntries(
  PALETTE_KEYS.map((k, i) => [k, PALETTE[i]]),
);

/** 저장된 색 키 → ColorSet. 없으면 undefined = 무채색 기본 */
export function projectColorSet(color?: string | null): ColorSet | undefined {
  if (!color) return undefined;
  return PALETTE_BY_KEY[color];
}

/* ---------- 언어별 컬러 (스니펫 타일) ---------- */
export const LANG_COLOR: Record<string, ColorSet> = {
  javascript: PALETTE[2], // amber
  typescript: PALETTE[0], // blue
  python: PALETTE[6],     // sky
  sql: PALETTE[5],        // teal
  html: PALETTE[3],       // rose
  css: PALETTE[4],        // violet
  json: PALETTE[1],       // emerald
  markdown: PALETTE[7],   // fuchsia
  bash: PALETTE[1],       // emerald
  java: PALETTE[3],       // rose
  go: PALETTE[6],         // sky
  rust: PALETTE[2],       // amber
  plaintext: PALETTE[0],
};

export function langColor(lang: string): ColorSet {
  return LANG_COLOR[lang] ?? paletteFor(lang);
}
