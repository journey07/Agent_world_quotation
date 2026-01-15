# API 엔드포인트 목록

모든 엔드포인트는 `/api/quote/*` 경로로 제공됩니다.

## 견적 관련

### POST /api/quote/calculate
견적 계산

**Request Body:**
```json
{
  "columns": 5,
  "tiers": 6,
  "quantity": 1,
  "controlPanelTiers": 4,
  "region": "seoul",
  "options": {
    "frameType": "none",
    "dualController": false,
    "acrylic": false
  },
  "customerName": "회사명",
  "deliveryLocation": "배송지"
}
```

**Response:**
```json
{
  "input": { ... },
  "breakdown": { ... },
  "summary": {
    "subtotal": 1000000,
    "discount": 0,
    "total": 1000000
  }
}
```

### POST /api/quote/pdf
PDF 견적서 생성

**Request Body:** (calculate와 동일)

**Query Parameters:**
- `format=base64`: base64 문자열로 반환 (기본값: 파일 다운로드)

**Response (base64):**
```json
{
  "pdf": "base64_string...",
  "filename": "quote-1234567890.pdf"
}
```

**Response (파일):**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="quote-1234567890.pdf"`

### POST /api/quote/excel
Excel 견적서 생성

**Request Body:**
```json
{
  "columns": 5,
  "tiers": 6,
  "quantity": 1,
  "controlPanelTiers": 4,
  "region": "seoul",
  "options": { ... },
  "companyName": "회사명",
  "contact": "연락처",
  "email": "이메일",
  "detailedLocation": "상세 주소",
  "previewImage": "data:image/png;base64,...",
  "generatedImage": "data:image/png;base64,..."
}
```

**Query Parameters:**
- `format=base64`: base64 문자열로 반환 (기본값: 파일 다운로드)

## 이미지 생성

### POST /api/quote/preview-image
2D 프리뷰 이미지 생성

**Request Body:**
```json
{
  "columns": 5,
  "tiers": 6,
  "controlPanelColumn": 2,
  "controlPanelTiers": 4,
  "frameType": "none"
}
```

**Response:**
```json
{
  "image": "base64_string...",
  "mimeType": "image/png"
}
```

### POST /api/quote/generate-3d-installation
3D 설치 시각화 생성

**Request Body:**
```json
{
  "image": "base64_string...",
  "mimeType": "image/png",
  "frameType": "none",
  "columns": 5,
  "tiers": 6,
  "installationBackground": "office_lobby"
}
```

**Response:**
```json
{
  "image": "base64_string...",
  "mimeType": "image/png",
  "message": "3D installation visualization generated successfully"
}
```

## 데이터 조회

### GET /api/quote/inquiries
문의 내역 조회

**Response:**
```json
[
  {
    "id": 1234567890,
    "timestamp": "2026-01-15T12:00:00.000Z",
    ...
  }
]
```

### GET /api/quote/dashboard-stats
대시보드 통계

**Response:**
```json
{
  "id": "agent-worldlocker-001",
  "stats": { ... }
}
```

## 에이전트 관리

### POST /api/quote/agent-toggle
에이전트 상태 토글

**Response:**
```json
{
  "status": "online"
}
```

### POST /api/quote/agent-status
에이전트 상태 설정

**Request Body:**
```json
{
  "status": "online" // "online" | "offline" | "error" | "processing"
}
```

**Response:**
```json
{
  "status": "online"
}
```

## 유틸리티

### GET /api/quote/health
헬스체크

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T12:00:00.000Z"
}
```

### POST /api/quote/verify-api
API 연결 확인

**Response:**
```json
{
  "success": true,
  "message": "API connection verified"
}
```

## CORS

모든 엔드포인트는 CORS를 지원합니다:
- `Access-Control-Allow-Origin: *` (또는 환경 변수로 설정)
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

OPTIONS 요청도 지원합니다.
