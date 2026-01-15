# Dashboard 연동 단계별 가이드

## 🎯 연동 목표

Quotation Agent의 통계를 Dashboard에 전송하여 모니터링

## 📋 단계별 설정

### 1단계: Dashboard URL 확인 ✅

**Dashboard URL:**
- Dashboard URL: `https://agenthub-tau.vercel.app`
- API 엔드포인트: `https://agenthub-tau.vercel.app/api/stats`

### 2단계: Render 환경 변수 설정

Render 대시보드 → Environment Variables에 추가:

#### 필수 환경 변수

```
DASHBOARD_API_URL=https://agenthub-tau.vercel.app/api/stats
```

#### 권장 환경 변수

```
BASE_URL=https://agent-world-quotation.onrender.com
ACCOUNT_EMAIL=admin@worldlocker.com
```

**설정 방법:**
1. Render 대시보드 → 서비스 선택
2. Environment 탭
3. "Add Environment Variable" 클릭
4. 위 변수들 추가
5. 서비스 재배포 (자동 또는 수동)

### 3단계: Supabase에 Agent 등록 확인

Dashboard의 Supabase에 Agent가 등록되어 있어야 합니다.

**자동 등록** (권장):
- Heartbeat를 보내면 자동으로 등록/업데이트됩니다
- 별도 작업 불필요

**수동 등록** (필요시):
Supabase Dashboard → SQL Editor에서 실행:

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
SET 
    base_url = 'https://agent-world-quotation.onrender.com',
    model = 'gemini-3-pro-image-preview';
```

### 4단계: 코드 변경사항 확인

✅ **이미 완료된 수정:**
- `statsService.js`: `BASE_URL` 환경 변수 사용하도록 수정
- `render.yaml`: `BASE_URL` 환경 변수 추가

### 5단계: 연동 테스트

1. **Render 재배포**:
   - 환경 변수 설정 후 재배포
   - 또는 코드 변경사항 푸시 후 자동 재배포

2. **Render 로그 확인**:
   - Dashboard에 heartbeat가 전송되는지 확인
   - 에러 메시지 확인

3. **Dashboard 확인**:
   - Dashboard UI에서 `agent-worldlocker-001` Agent 확인
   - 상태가 "online"으로 표시되는지 확인

4. **통계 테스트**:
   - Quotation Agent에서 견적 계산
   - Dashboard에서 API 호출 수 증가 확인
   - Activity Log에 기록되는지 확인

## 🔍 확인 체크리스트

- [ ] Dashboard URL 확인
- [ ] Render 환경 변수 설정 (`DASHBOARD_API_URL`, `BASE_URL`)
- [ ] Render 재배포 완료
- [ ] Render 로그에서 heartbeat 확인
- [ ] Dashboard에서 Agent 확인
- [ ] 통계 업데이트 확인

## 📝 환경 변수 정리

### Render (Quotation Agent)

```
GEMINI_API_KEY=your_gemini_api_key
DASHBOARD_API_URL=https://agenthub-tau.vercel.app/api/stats
BASE_URL=https://agent-world-quotation.onrender.com
ACCOUNT_EMAIL=admin@worldlocker.com
ALLOWED_ORIGINS=https://your-frontend.vercel.app
NODE_ENV=production
```

## 🐛 트러블슈팅

### Agent가 Dashboard에 나타나지 않음
1. `DASHBOARD_API_URL` 확인
2. Render 로그에서 heartbeat 에러 확인
3. Dashboard API가 정상 작동하는지 확인:
   ```
   curl https://your-dashboard.vercel.app/api/stats
   ```

### 통계가 업데이트되지 않음
1. `DASHBOARD_API_URL`이 올바른지 확인
2. Render 로그에서 통계 전송 에러 확인
3. Dashboard API 로그 확인 (Vercel Functions)

### Heartbeat는 성공하지만 통계가 안 보임
1. Supabase에 agent가 등록되어 있는지 확인
2. Dashboard UI 새로고침
3. Supabase Realtime 연결 확인
