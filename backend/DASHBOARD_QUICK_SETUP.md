# Dashboard 연동 빠른 설정 가이드

## ✅ Dashboard URL 확인됨

- **Dashboard**: `https://agenthub-tau.vercel.app`
- **API 엔드포인트**: `https://agenthub-tau.vercel.app/api/stats`

## 🚀 Render 환경 변수 설정 (5분)

### Render 대시보드에서:

1. **서비스 선택**: `agent-world-quotation` (또는 Backend 서비스)
2. **Environment 탭** 클릭
3. **"Add Environment Variable"** 클릭

### 추가할 환경 변수:

#### 1. DASHBOARD_API_URL (필수)
```
Key: DASHBOARD_API_URL
Value: https://agenthub-tau.vercel.app/api/stats
```

#### 2. BASE_URL (필수)
```
Key: BASE_URL
Value: https://agent-world-quotation.onrender.com
```

#### 3. ACCOUNT_EMAIL (권장)
```
Key: ACCOUNT_EMAIL
Value: admin@worldlocker.com
```

### 재배포

환경 변수 추가 후:
- **자동 재배포**: 코드 변경 시 자동
- **수동 재배포**: "Manual Deploy" 버튼 클릭

## 🔍 연동 확인

### 1. Render 로그 확인

Render 대시보드 → Logs 탭에서:
```
💓 Registering Agent agent-worldlocker-001 to Dashboard Brain at https://agent-world-quotation.onrender.com
📡 Stats reported to Brain: calculate
```

이런 메시지가 보이면 성공!

### 2. Dashboard 확인

1. **Dashboard 접속**: https://agenthub-tau.vercel.app
2. **Agent 목록 확인**: `agent-worldlocker-001` 또는 "견적 에이전트" 확인
3. **상태 확인**: "online"으로 표시되는지 확인

### 3. 통계 테스트

1. **Quotation Agent에서 견적 계산**
2. **Dashboard에서 확인**:
   - API 호출 수 증가
   - Activity Log에 기록
   - 통계 업데이트

## 📋 최종 환경 변수 목록

Render에 설정해야 할 모든 환경 변수:

```
GEMINI_API_KEY=your_gemini_api_key
DASHBOARD_API_URL=https://agenthub-tau.vercel.app/api/stats
BASE_URL=https://agent-world-quotation.onrender.com
ACCOUNT_EMAIL=admin@worldlocker.com
ALLOWED_ORIGINS=https://your-frontend.vercel.app
NODE_ENV=production
```

## 🐛 문제 해결

### Agent가 Dashboard에 나타나지 않음

1. **환경 변수 확인**:
   - `DASHBOARD_API_URL`이 올바른지 확인
   - `BASE_URL`이 올바른지 확인

2. **Render 로그 확인**:
   - Heartbeat 에러 메시지 확인
   - Dashboard API 연결 실패 여부 확인

3. **Dashboard API 테스트**:
   ```bash
   curl https://agenthub-tau.vercel.app/api/stats
   ```

### 통계가 업데이트되지 않음

1. **Render 로그 확인**: 통계 전송 에러 확인
2. **Dashboard API 로그 확인**: Vercel Functions → `/api/stats` 로그
3. **Supabase 확인**: Agent가 등록되어 있는지 확인

## ✅ 완료 체크리스트

- [ ] Render 환경 변수 설정 완료
- [ ] Render 재배포 완료
- [ ] Render 로그에서 heartbeat 확인
- [ ] Dashboard에서 Agent 확인
- [ ] 통계 업데이트 확인

## 🎉 완료!

모든 설정이 완료되면:
- Quotation Agent의 모든 API 호출이 Dashboard에 기록됩니다
- Dashboard에서 실시간으로 통계를 확인할 수 있습니다
- Activity Log에서 상세한 활동 내역을 볼 수 있습니다
