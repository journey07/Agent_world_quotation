# Dashboard 연동 가이드

## 🎯 연동 구조

```
┌─────────────────┐         통계 전송          ┌─────────────────┐
│                 │ ────────────────────────> │                 │
│  Quotation      │                           │  Dashboard      │
│  Agent          │                           │  (Vercel)       │
│  (Render)       │ <─────────────────────── │                 │
│                 │      상태 확인            │  (Supabase)     │
└─────────────────┘                           └─────────────────┘
```

## 📋 연동 단계

### 1단계: Dashboard URL 확인 ✅

Dashboard URL:
- Dashboard URL: `https://agenthub-tau.vercel.app`
- API 엔드포인트: `https://agenthub-tau.vercel.app/api/stats`

### 2단계: Render 환경 변수 설정

Render 대시보드 → Environment Variables에 추가:

```
DASHBOARD_API_URL=https://agenthub-tau.vercel.app/api/stats
ACCOUNT_EMAIL=admin@worldlocker.com
BASE_URL=https://agent-world-quotation.onrender.com
```

**중요**: `BASE_URL`은 프로덕션 URL을 사용해야 합니다!

### 3단계: 코드 수정

`startHeartbeat` 함수가 프로덕션 URL을 사용하도록 수정 필요:

현재 문제:
- `baseUrl = http://localhost:${port}` (하드코딩됨)
- 프로덕션에서는 Render URL 사용해야 함

### 4단계: Supabase에 Agent 등록

Dashboard의 Supabase에 Agent가 등록되어 있어야 합니다.

**자동 등록**: Heartbeat를 보내면 자동으로 등록/업데이트됩니다.

**수동 등록** (필요시):
```sql
INSERT INTO agents (id, name, model, client_name, client_id, status, base_url)
VALUES (
    'agent-worldlocker-001',
    '견적 에이전트',
    'gemini-3-pro-image-preview',
    'World Locker',
    'client-worldlocker',
    'offline',
    'https://agent-world-quotation.onrender.com'
) ON CONFLICT (id) DO UPDATE
SET base_url = 'https://agent-world-quotation.onrender.com';
```

## 🔧 필요한 코드 수정

### statsService.js 수정

`startHeartbeat` 함수에서 프로덕션 URL 사용:

```javascript
export function startHeartbeat(port) {
  if (process.env.NODE_ENV === 'test') return;

  // 프로덕션에서는 환경 변수 사용, 개발에서는 localhost
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
  console.log(`💓 Registering Agent ${AGENT_ID} to Dashboard Brain at ${baseUrl}`);

  sendHeartbeat(baseUrl);
}
```

## ✅ 연동 확인

1. **Render 로그 확인**:
   - Dashboard에 heartbeat가 전송되는지 확인
   - 에러 메시지 확인

2. **Dashboard 확인**:
   - Dashboard UI에서 `agent-worldlocker-001` Agent가 보이는지 확인
   - 상태가 "online"으로 표시되는지 확인
   - 통계가 업데이트되는지 확인

3. **테스트**:
   - Quotation Agent에서 견적 계산
   - Dashboard에서 API 호출 수 증가 확인
   - Activity Log에 기록되는지 확인

## 📝 환경 변수 정리

### Render (Quotation Agent)

```
GEMINI_API_KEY=your_gemini_api_key
DASHBOARD_API_URL=https://agenthub-tau.vercel.app/api/stats
ACCOUNT_EMAIL=admin@worldlocker.com
BASE_URL=https://agent-world-quotation.onrender.com
ALLOWED_ORIGINS=https://your-frontend.vercel.app
NODE_ENV=production
```

## 🐛 트러블슈팅

### Agent가 Dashboard에 나타나지 않음
- `DASHBOARD_API_URL` 확인
- Render 로그에서 heartbeat 에러 확인
- Supabase에 agent가 등록되어 있는지 확인

### 통계가 업데이트되지 않음
- `DASHBOARD_API_URL`이 올바른지 확인
- Dashboard API가 정상 작동하는지 확인
- Render 로그에서 통계 전송 에러 확인
