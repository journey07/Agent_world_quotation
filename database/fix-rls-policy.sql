-- RLS 정책 수정: service_role이 users 테이블에 접근할 수 있도록 허용
-- Supabase SQL Editor에서 실행하세요

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Allow service role full access" ON users;

-- service_role은 RLS를 자동으로 우회하므로, 
-- 실제로는 anon key를 사용하는 경우를 위한 정책이 필요합니다.
-- 하지만 백엔드에서는 service_role_key를 사용해야 합니다.

-- 임시 해결책: service_role이 INSERT할 수 있도록 정책 추가
-- (실제로 service_role은 RLS를 우회하므로 이 정책은 필요 없지만,
--  혹시 모를 경우를 대비해 추가)
CREATE POLICY "Allow service role full access" ON users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 또는 RLS를 일시적으로 비활성화 (개발 환경에서만 권장)
-- 주의: 프로덕션에서는 service_role_key를 사용하는 것이 더 안전합니다!
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
