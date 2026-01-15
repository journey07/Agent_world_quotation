# 배포 가이드: Frontend (Vercel) + Backend (Render)

## 🎯 배포 구조

- **Frontend**: Vercel (무료 Static Sites)
- **Backend**: Render (무료 Web Services)

## 📋 배포 순서

1. ✅ **GitHub에 코드 푸시** (먼저 해야 함!) 
   - 자세한 방법: `GITHUB_PUSH_GUIDE.md` 참고
2. Backend를 Render에 배포
3. Frontend를 Vercel에 배포
4. 환경 변수 설정
5. CORS 설정

## 📋 배포 전 체크리스트

### Backend 준비
- [x] Express 서버 구조 확인
- [x] `render.yaml` 생성 완료
- [x] CORS 설정 수정 완료
- [ ] 환경 변수 준비

### Frontend 준비
- [x] Vite + React 구조 확인
- [x] `vercel.json` 생성 완료
- [x] 환경 변수 사용 중 (`VITE_API_URL`)
- [ ] 환경 변수 준비

## 🚀 배포 단계

### 0단계: GitHub에 코드 푸시 (필수!) ⭐

**Vercel과 Render는 모두 GitHub 저장소와 연결해서 배포합니다!**

#### 1. 변경사항 확인
```bash
cd /Users/Injeon/Desktop/IJ/coding/Agent/world_quotation
git status
```

#### 2. 모든 변경사항 추가
```bash
# 모든 파일 추가 (새 파일 + 수정된 파일)
git add .

# 또는 선택적으로 추가
git add backend/
git add frontend/
git add DEPLOYMENT_*.md
```

#### 3. 커밋
```bash
git commit -m "feat: Vercel + Render 배포 준비

- Backend: Render 배포 설정 (render.yaml)
- Frontend: Vercel 배포 설정 (vercel.json)
- CORS 설정 개선 (프로덕션 URL 지원)
- 배포 가이드 문서 추가"
```

#### 4. GitHub에 푸시
```bash
git push origin main
```

#### 5. GitHub에서 확인
- https://github.com/journey07/world_quotation-agent.git
- 모든 파일이 올라갔는지 확인

**⚠️ 중요**: 환경 변수 파일(.env)은 `.gitignore`에 포함되어 있어서 올라가지 않습니다. 
이는 정상입니다! 환경 변수는 각 플랫폼(Vercel, Render)에서 직접 설정합니다.

### 1단계: Backend를 Render에 배포

#### 방법 A: Render 대시보드 사용

1. **Render 계정 생성**: https://render.com
2. **새 Web Service 생성**:
   - "New" → "Web Service"
   - GitHub 저장소 연결
   - **Root Directory**: `backend` 설정 ⚠️ 중요!
   - **Name**: `world-quotation-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

3. **환경 변수 설정**:
   ```
   NODE_ENV=production
   PORT=10000
   GEMINI_API_KEY=your_gemini_api_key
   DASHBOARD_API_URL=your_dashboard_url
   ACCOUNT_EMAIL=admin@worldlocker.com
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```

4. **Health Check 설정**:
   - Health Check Path: `/health`

5. **배포 확인**:
   - URL: `https://your-backend.onrender.com`
   - Health Check: `https://your-backend.onrender.com/health`

#### 방법 B: render.yaml 사용 (GitHub 연결 시)

1. GitHub에 `render.yaml` 파일이 있으면 자동으로 설정됨
2. Render 대시보드에서 환경 변수만 추가 설정

### 2단계: Frontend를 Vercel에 배포

1. **Vercel 계정 생성**: https://vercel.com
2. **새 프로젝트 생성**:
   - "Add New Project"
   - GitHub 저장소 연결
   - **Root Directory**: `frontend` 설정 ⚠️ 중요!
   - **Framework Preset**: Vite (자동 감지)
   - **Build Command**: `npm run build` (자동)
   - **Output Directory**: `dist` (자동)

3. **환경 변수 설정**:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api/quote
   ```

4. **배포 확인**:
   - URL: `https://your-frontend.vercel.app`

### 3단계: CORS 설정 업데이트

Backend 배포 후, Frontend URL을 Backend의 `ALLOWED_ORIGINS`에 추가:

1. Render 대시보드 → Environment Variables
2. `ALLOWED_ORIGINS` 수정:
   ```
   https://your-frontend.vercel.app,https://your-frontend-*.vercel.app
   ```
   또는 모든 origin 허용:
   ```
   *
   ```

3. 서비스 재배포 (자동 또는 수동)

### 4단계: Cold Start 방지 (선택사항)

Render 무료 플랜은 15분 비활성 시 sleep됩니다.

**UptimeRobot 설정**:
1. https://uptimerobot.com 가입
2. 새 모니터 생성:
   - URL: `https://your-backend.onrender.com/health`
   - Monitoring Interval: 5분
3. 완료!

## 🔍 배포 확인

### Backend 확인
```bash
# Health Check
curl https://your-backend.onrender.com/health

# 예상 응답
{"status":"ok","timestamp":"2026-01-15T12:00:00.000Z"}
```

### Frontend 확인
1. 브라우저에서 `https://your-frontend.vercel.app` 접속
2. 견적 계산 테스트
3. 브라우저 개발자 도구 → Network 탭에서 API 요청 확인

### CORS 확인
브라우저 개발자 도구 → Console에서 CORS 에러가 없는지 확인

## 🐛 트러블슈팅

### Backend가 응답하지 않음
- Health Check 확인: `/health` 엔드포인트 작동 여부
- Render 로그 확인: Dashboard → Logs
- 환경 변수 확인: 모든 필수 변수 설정되었는지

### CORS 에러
- `ALLOWED_ORIGINS`에 Frontend URL이 포함되어 있는지 확인
- 브라우저 Console에서 정확한 에러 메시지 확인
- Backend 재배포 (환경 변수 변경 후)

### Frontend에서 API 호출 실패
- `VITE_API_URL` 환경 변수 확인
- Vercel에서 환경 변수 설정 후 재배포 필요
- 브라우저 개발자 도구 → Network 탭에서 요청 URL 확인

### Cold Start 지연
- UptimeRobot 설정 확인
- Health Check 엔드포인트가 빠르게 응답하는지 확인

## 📝 환경 변수 정리

### Backend (Render)
```
NODE_ENV=production
PORT=10000
GEMINI_API_KEY=your_gemini_api_key
DASHBOARD_API_URL=your_dashboard_url
ACCOUNT_EMAIL=admin@worldlocker.com
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend.onrender.com/api/quote
```

## 🎉 완료!

배포가 완료되면:
- Frontend: `https://your-frontend.vercel.app`
- Backend: `https://your-backend.onrender.com`

모두 무료 플랜으로 운영됩니다!
