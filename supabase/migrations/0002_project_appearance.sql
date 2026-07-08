-- ============================================================
-- 프로젝트 색·아이콘 사용자 지정
-- Supabase SQL Editor에 붙여넣어 실행하세요. (한 번만)
-- ============================================================

alter table projects add column if not exists color text;
alter table projects add column if not exists icon  text;
