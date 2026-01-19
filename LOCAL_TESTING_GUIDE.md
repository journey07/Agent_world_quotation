# 로컬 테스트 가이드

## 로컬에서 확인 가능한 범위

### ✅ 완전히 확인 가능한 항목

1. **로그인 API 동작**
   - 로그인 요청/응답 확인
   - user 객체 구조 확인 (name, username 필드)
   - Base64 인코딩/디코딩 확인

2. **사용자명 헤더 전송**
   - `X-User-Name` 헤더 전송 여부
   - Base64 인코딩 결과 확인
   - 백엔드에서 디코딩 결과 확인

3. **Dashboard API 호출**
   - `sendActivityLog` 함수 호출 확인
   - `trackApiCall` 함수 호출 확인
   - Dashboard API로의 HTTP 요청 성공/실패 확인

4. **디버그 로그 확인**
   - 모든 단계의 상세 로그 확인
   - `.cursor/debug.log` 파일 분석

### ⚠️ Dashboard 서버 실행 필요

**Dashboard가 로컬에서 실행 중이어야 확인 가능:**

5. **Dashboard API 수신 및 DB 저장**
   - Dashboard API가 로그를 받는지 확인
   - Supabase DB에 `user_name` 필드로 저장되는지 확인

6. **Dashboard UI 표시**
   - Dashboard 웹 페이지에서 로그 확인
   - 사용자명이 올바르게 표시되는지 확인

---

## 로컬 테스트 설정 방법

### 1. Dashboard 서버 실행 (필수)

```bash
cd /Users/Injeon/Desktop/IJ/coding/Agent/Dashboard
npm run dev
```

이 명령은 다음을 실행합니다:
- Dashboard Brain Server (포트 5001) - `/api/stats` 엔드포인트 제공
- Vite 개발 서버 (포트 5173) - Dashboard UI

**확인:**
- `http://localhost:5001/api/stats` 접근 가능해야 함
- 콘솔에 "🧠 Dashboard Brain Server starting on http://localhost:5001" 메시지 확인

### 2. world_quotation 백엔드 실행

```bash
cd /Users/Injeon/Desktop/IJ/coding/Agent/world_quotation/backend
npm start
```

**확인:**
- `http://localhost:3001/api/quote/health` 접근 가능해야 함

### 3. world_quotation 프론트엔드 실행

```bash
cd /Users/Injeon/Desktop/IJ/coding/Agent/world_quotation/frontend
npm run dev
```

**확인:**
- 로그인 페이지 접근 가능해야 함

### 4. 환경 변수 확인

**world_quotation/backend/.env:**
```env
DASHBOARD_API_URL=http://localhost:5001/api/stats
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Dashboard/.env.local:**
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 로컬 테스트 시나리오

### 시나리오 1: 로그인 및 사용자명 확인

1. **프론트엔드에서 로그인**
   - 브라우저 콘솔 열기 (F12)
   - 로그인 시도
   - 콘솔에서 다음 확인:
     - `📤 Sending request with user name (encoded): 권인전 -> [Base64 문자열]`
     - `getHeadersWithUser called` 로그 확인

2. **백엔드 콘솔 확인**
   - `Login API called` 로그 확인
   - `loginWithUsername result` 로그에서 `userName` 필드 확인
   - `sendActivityLog called` 로그 확인

3. **디버그 로그 파일 확인**
   ```bash
   cat /Users/Injeon/Desktop/IJ/coding/Agent/world_quotation/.cursor/debug.log
   ```
   - 모든 단계의 로그 확인

### 시나리오 2: API 호출 시 사용자명 전송 확인

1. **레이아웃 계산 버튼 클릭**
   - 브라우저 콘솔에서 헤더 전송 확인

2. **백엔드 콘솔 확인**
   - `extractUserMiddleware called` 로그 확인
   - `Base64 decoded` 로그에서 디코딩 결과 확인
   - `Calculate API with userName` 로그 확인

3. **Dashboard API 콘솔 확인**
   - Dashboard 서버 콘솔에서:
     - `📥 Incoming API Call: agent-worldlocker-001 - calculate [User: 권인전]` 확인

### 시나리오 3: Dashboard UI에서 로그 확인

1. **Dashboard 웹 페이지 열기**
   - `http://localhost:5173` 접근
   - 로그인 (Dashboard 자체 로그인)

2. **Recent Activity 확인**
   - 메인 대시보드 페이지에서
   - "견적 에이전트 - 권인전" 형식으로 표시되는지 확인

3. **Agent Detail 페이지 확인**
   - 특정 에이전트 클릭
   - Activity Feed 탭에서
   - 로그 액션 옆에 사용자명이 표시되는지 확인

---

## 문제 해결 체크리스트

### 로그인 로그가 Dashboard에 안 쌓일 때

1. ✅ Dashboard 서버가 실행 중인가?
   ```bash
   curl http://localhost:5001/api/stats
   ```

2. ✅ `DASHBOARD_API_URL` 환경 변수가 올바른가?
   - `backend/.env` 파일 확인
   - 기본값: `http://localhost:5001/api/stats`

3. ✅ `sendActivityLog` 함수가 호출되는가?
   - 백엔드 콘솔에서 `sendActivityLog called` 로그 확인
   - `.cursor/debug.log` 파일 확인

4. ✅ Dashboard API가 요청을 받는가?
   - Dashboard 서버 콘솔에서 `📥 Incoming API Call` 로그 확인

5. ✅ Supabase DB에 저장되는가?
   - Dashboard 서버 콘솔에서 에러 메시지 확인
   - Supabase 대시보드에서 `activity_logs` 테이블 직접 확인

### 사용자명이 이상하게 표시될 때

1. ✅ DB에 `name` 필드가 있는가?
   - `authService.js`의 `loginWithUsername` 로그 확인
   - `allUserFields` 배열에 `name`이 포함되는지 확인

2. ✅ Base64 인코딩이 올바른가?
   - 프론트엔드 콘솔에서 `Base64 encoded with TextEncoder` 로그 확인
   - 인코딩된 문자열 확인

3. ✅ Base64 디코딩이 올바른가?
   - 백엔드 콘솔에서 `Base64 decoded` 로그 확인
   - 디코딩된 결과 확인

4. ✅ 헤더가 전송되는가?
   - `extractUserMiddleware called` 로그 확인
   - `encodedName` 값 확인

---

## 디버그 로그 분석 방법

### 로그 파일 위치
```
/Users/Injeon/Desktop/IJ/coding/Agent/world_quotation/.cursor/debug.log
```

### 로그 형식
각 로그는 NDJSON 형식 (한 줄에 하나의 JSON 객체):
```json
{"location":"auth.js:27","message":"Login API called","data":{"hasBody":true,"username":"testuser"},"timestamp":1234567890,"sessionId":"debug-session","runId":"run1","hypothesisId":"A"}
```

### 주요 hypothesisId 매핑
- **A**: 로그인 API 호출 및 user 객체 확인
- **B**: Dashboard API URL 및 호출 확인
- **C**: Dashboard API 응답 확인
- **D**: 네트워크 오류 확인
- **F**: user.name 필드 존재 여부 확인
- **G**: Base64 인코딩 확인
- **H**: Base64 디코딩 확인
- **I**: 헤더 전송 확인
- **J**: localStorage 저장 확인

### 로그 분석 명령어
```bash
# 특정 hypothesisId로 필터링
cat .cursor/debug.log | grep '"hypothesisId":"A"' | jq

# 특정 location으로 필터링
cat .cursor/debug.log | grep '"location":"auth.js' | jq

# 시간순으로 정렬
cat .cursor/debug.log | jq -s 'sort_by(.timestamp)'
```

---

## 배포 전 최종 체크리스트

- [ ] 로컬에서 로그인 성공
- [ ] 로컬에서 사용자명이 올바르게 인코딩/디코딩됨
- [ ] 로컬에서 Dashboard API로 로그 전송 성공
- [ ] 로컬에서 Dashboard UI에 사용자명 표시됨
- [ ] 디버그 로그에 에러 없음
- [ ] 환경 변수 설정 확인 (로컬 및 배포 환경)

---

## 주의사항

1. **Dashboard 서버가 실행 중이 아니면**
   - Dashboard API 호출은 실패합니다
   - 하지만 백엔드 로그에서는 호출 시도는 확인 가능합니다

2. **Supabase 연결**
   - Dashboard와 world_quotation 모두 같은 Supabase 프로젝트를 사용해야 합니다
   - 환경 변수 확인 필수

3. **포트 충돌**
   - Dashboard: 5001 (Brain Server), 5173 (Vite)
   - world_quotation backend: 3001
   - 다른 서비스와 포트 충돌 시 변경 필요
