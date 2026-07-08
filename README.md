# Workspace

소규모 팀용 워크스페이스 웹앱. PC·모바일 브라우저 반응형.
프로젝트 / 태스크·칸반 / 캘린더 / 문서 / 코드 스니펫 / 팀 관리를 제공한다.

기획·설계 문서: [`docs/01-기획서.md`](docs/01-기획서.md) · [`docs/02-설계서.md`](docs/02-설계서.md)

## 기술 스택

React 18 + TypeScript + Vite · Tailwind CSS · TanStack Query · @dnd-kit · CodeMirror 6 · Supabase (Auth / PostgreSQL / Realtime)

## 시작하기

### 1. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. **SQL Editor**를 열고 `supabase/migrations/0001_init.sql` 내용 전체를 붙여넣어 실행
3. **Project Settings → API**에서 `Project URL`과 `anon public` 키 복사
4. (선택) **Authentication → Providers → Email**에서 "Confirm email"을 끄면 이메일 인증 없이 바로 가입 가능

### 2. 로컬 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정
copy .env.example .env    # Windows (macOS/Linux: cp)
# .env에 Supabase URL/키 입력

# 개발 서버
npm run dev
```

`http://localhost:5173` 접속 → 회원가입 → 워크스페이스 생성.

### 3. 팀원 초대

팀 메뉴 → 멤버 초대 → 이메일 입력. 초대받은 사람이 **같은 이메일로 가입/로그인**하면 온보딩 화면에서 초대를 수락할 수 있다.

## 배포 (Vercel 권장)

1. GitHub에 푸시 후 Vercel에서 Import
2. Framework Preset: **Vite** (자동 감지)
3. 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록
4. Deploy — SPA 라우팅은 `vercel.json`이 처리

## 프로젝트 구조

```
src/
├── App.tsx               # 라우팅 + 인증 가드
├── context/AuthContext   # 세션·프로필·워크스페이스 상태
├── hooks/data.ts         # Supabase 쿼리/뮤테이션 + Realtime 구독
├── components/
│   ├── ui.tsx            # 디자인 시스템 (Button, Badge, Card, Modal...)
│   ├── layout/AppShell   # 사이드바(PC) / 하단 탭바(모바일)
│   ├── board/Board.tsx   # 칸반 (드래그앤드롭)
│   ├── TaskList.tsx      # 태스크 리스트 뷰
│   └── TaskPanel.tsx     # 태스크 상세 (?task=<id>)
└── pages/                # 라우트별 화면 (lazy 로딩)
supabase/migrations/      # DB 스키마 + RLS + 트리거
```

## 동작 메모

- **칸반 모바일**: 카드 롱프레스(0.2초) 후 드래그. 태스크 상세의 상태 드롭다운으로도 변경 가능
- **실시간**: 태스크·컬럼·코멘트 변경은 팀원 화면에 자동 반영 (Supabase Realtime)
- **진행률**: 프로젝트 진행률 = Done 컬럼(is_done) 태스크 비율, 자동 계산
- **권한**: 데이터 접근은 전부 RLS로 통제. admin/owner만 멤버 관리·워크스페이스 수정
- Snippets 라우트는 CodeMirror 포함으로 청크가 큼(~240KB gzip) — 해당 페이지 진입 시에만 로드됨
