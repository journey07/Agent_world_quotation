-- users 테이블 생성
-- Supabase SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100), -- 사용자명 (표시용)
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- RLS (Row Level Security) 정책 설정
-- 보안: RLS 활성화 시 정책이 없으면 모든 anon key 접근이 차단됨
-- 백엔드의 service_role_key는 RLS를 우회하므로 정상 접근 가능
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Allow all operations for service role" ON users;

-- 정책을 만들지 않으면 anon key로는 모든 접근이 차단됨
-- service_role은 RLS를 우회하므로 백엔드 API는 정상 작동
-- 프론트엔드에서 users 테이블에 직접 접근하지 않으므로 이 설정이 가장 안전함

-- 기존 테이블에 name 컬럼 추가 (이미 테이블이 있는 경우)
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- 예시: 사용자 추가 (비밀번호는 bcrypt로 해싱된 값)
-- 비밀번호 해싱은 Node.js에서 bcrypt를 사용하여 생성하세요
-- 예: bcrypt.hashSync('your_password', 10)

-- 사용 예시:
-- INSERT INTO users (username, name, password_hash) 
-- VALUES ('admin', '관리자', '$2a$10$...'); -- bcrypt 해시된 비밀번호
