-- Inquiries 테이블 생성
CREATE TABLE IF NOT EXISTS inquiries (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  status TEXT DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'quoted', 'ordered', 'completed', 'cancelled')),

  -- 고객 정보
  customer_name TEXT,
  customer_contact TEXT,
  customer_email TEXT,
  customer_company TEXT,
  product TEXT,

  -- 견적 정보
  columns INTEGER,
  rows INTEGER,
  material TEXT,
  color TEXT,

  -- 옵션
  handle BOOLEAN DEFAULT false,
  control_type TEXT,
  compartment_config TEXT,
  door_type TEXT,

  -- 가격 정보
  total_price INTEGER,
  discount_rate NUMERIC(5, 2),
  final_price INTEGER,

  -- 메모/노트
  notes TEXT,
  admin_notes TEXT,

  -- 원본 요청 데이터 (JSON)
  raw_data JSONB
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_customer_email ON inquiries(customer_email);

-- RLS 정책
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 관리자만 모든 작업 가능
CREATE POLICY "Admin full access to inquiries"
ON inquiries
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 서비스 역할은 모든 접근 가능
CREATE POLICY "Service role full access to inquiries"
ON inquiries
FOR ALL
TO service_role
USING (true);

-- 코멘트
COMMENT ON TABLE inquiries IS 'B2B 락커 견적 문의 내역';
COMMENT ON COLUMN inquiries.status IS '문의 상태: inquiry(문의중), quoted(견적완료), ordered(주문완료), completed(완료), cancelled(취소)';
COMMENT ON COLUMN inquiries.raw_data IS '프론트엔드에서 전송한 원본 데이터 (JSON)';
COMMENT ON COLUMN inquiries.product IS '제품명 (예: 스마트락커, 키패드락커 등)';
