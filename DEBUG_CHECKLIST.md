# 사용자 이름 전달 디버깅 체크리스트

## ✅ 프론트엔드 확인 (정상)

프론트엔드 콘솔 로그:
```
📤 Sending request with user name (encoded): 권인전
```

**확인 사항**:
- ✅ `getHeadersWithUser(user)` 함수가 정상 작동
- ✅ 헤더에 `X-User-Name` (Base64 인코딩) 전송
- ✅ 헤더에 `X-User-Name-Encoded: base64` 전송

## 🔍 백엔드 확인 필요

### 1. 헤더 수신 확인
백엔드 콘솔에서 다음 로그가 나타나야 함:
```
👤 User name decoded from Base64: 권인전
👤 User name extracted from header: 권인전
```

**확인 위치**: `backend/src/utils/userMiddleware.js`

### 2. API 호출 시 사용자 이름 확인
각 API 호출 시 다음 로그가 나타나야 함:

**Calculate API**:
```
📊 Calculate API - userName: 권인전
📤 Sending API call to Dashboard: calculate, userName: 권인전
📦 API call payload: { ... "userName": "권인전" ... }
✅ Stats reported to Brain: calculate, userName: 권인전
```

**Inquiries API**:
```
📋 Inquiries API - userName: 권인전
```

**Preview Image API**:
```
🖼️ Preview Image API - userName: 권인전
```

### 3. 로그인 로그 확인
로그인 성공 시 다음 로그가 나타나야 함:
```
🔐 Login successful for user: 권인전 (username)
📤 Sending login log to Dashboard with userName: 권인전
📤 Sending activity log to Dashboard: 🔐 User login: 권인전, userName: 권인전
📦 Activity log payload: { ... "userName": "권인전" ... }
✅ Activity log sent successfully: 🔐 User login: 권인전, userName: 권인전
✅ Login log sent successfully for user: 권인전
```

## 🔍 Dashboard API 확인 필요

### Dashboard API 콘솔 로그
다음 로그가 나타나야 함:
```
📥 Incoming API Call: agent-worldlocker-001 - calculate (Log: Calculated Quote: ...) [User: 권인전]
📝 Inserting log to activity_logs: { ... "user_name": "권인전" ... }
✅ Logged successfully: agent-worldlocker-001 - Calculated Quote: ... [User: 권인전]
```

### 로그인 로그
```
📥 Incoming API Call: agent-worldlocker-001 - activity_log (Log: 🔐 User login: 권인전) [User: 권인전]
📝 Inserting log to activity_logs: { ... "user_name": "권인전" ... }
✅ Logged successfully: agent-worldlocker-001 - 🔐 User login: 권인전 [User: 권인전]
```

## 🗄️ 데이터베이스 확인

### Supabase activity_logs 테이블
다음 쿼리로 확인:
```sql
SELECT 
  id,
  agent_id,
  action,
  user_name,
  timestamp,
  status
FROM activity_logs
WHERE user_name IS NOT NULL
ORDER BY timestamp DESC
LIMIT 10;
```

**예상 결과**:
- `user_name` 컬럼에 "권인전" 값이 있어야 함
- 로그인 로그에 `action: "🔐 User login: 권인전"` 있어야 함
- API 호출 로그에 `user_name: "권인전"` 있어야 함

## 🐛 문제 해결 가이드

### 문제 1: 백엔드에서 헤더를 받지 못함
**증상**: `⚠️ No user name found in headers` 로그

**해결**:
1. CORS 설정 확인: `allowedHeaders`에 `x-user-name`, `x-user-name-encoded` 포함 확인
2. 프론트엔드에서 헤더 전송 확인: 브라우저 개발자 도구 Network 탭에서 Request Headers 확인
3. 헤더 이름 확인: 대소문자 구분 없이 처리되지만, 정확한 이름 확인

### 문제 2: Dashboard로 전송되지 않음
**증상**: 백엔드 로그는 정상이지만 Dashboard에 로그가 없음

**해결**:
1. `DASHBOARD_API_URL` 환경 변수 확인
2. Dashboard API 응답 확인: `✅ Stats reported to Brain` 로그 확인
3. 네트워크 오류 확인: `❌ Error reporting to Dashboard Brain` 로그 확인

### 문제 3: 데이터베이스에 저장되지 않음
**증상**: Dashboard API 로그는 정상이지만 DB에 없음

**해결**:
1. Supabase 연결 확인
2. `activity_logs` 테이블 스키마 확인: `user_name` 컬럼 존재 확인
3. RLS (Row Level Security) 정책 확인

## 📊 전체 흐름도

```
1. 사용자 로그인
   ↓
2. 프론트엔드: localStorage에 user 저장
   ↓
3. API 호출 시: getHeadersWithUser(user) → X-User-Name 헤더 전송
   ↓
4. 백엔드: extractUserMiddleware → req.userName에 저장
   ↓
5. API 핸들러: req.userName 사용
   ↓
6. statsService: trackApiCall/sendActivityLog → userName 전달
   ↓
7. Dashboard API: userName 받아서 user_name 필드에 저장
   ↓
8. Supabase: activity_logs 테이블에 저장
   ↓
9. Dashboard: activity_logs에서 조회하여 표시
```

## ✅ 최종 확인 사항

- [ ] 프론트엔드에서 헤더 전송 확인 (✅ 완료)
- [ ] 백엔드에서 헤더 수신 확인 (백엔드 로그 확인 필요)
- [ ] Dashboard API로 전송 확인 (Dashboard 로그 확인 필요)
- [ ] 데이터베이스에 저장 확인 (Supabase 쿼리 확인 필요)
- [ ] Dashboard UI에 표시 확인 (브라우저에서 확인 필요)
