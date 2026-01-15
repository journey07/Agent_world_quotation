# 트러블슈팅 가이드

## 문제: 첫 번째는 성공, 두 번째부터 실패

### 가능한 원인들

#### 1. Render Cold Start (가장 가능성 높음) ⭐

**증상:**
- 첫 번째 요청: 성공 (서버가 깨어남)
- 두 번째 요청: 실패 (서버가 다시 sleep되었거나 응답 지연)

**원인:**
- Render 무료 플랜은 15분 비활성 시 sleep
- 첫 요청으로 깨어났지만, 두 번째 요청 전에 문제 발생 가능
- 또는 첫 요청 후 서버가 불안정한 상태

**해결:**
1. **UptimeRobot 설정** (가장 확실한 방법)
   - https://uptimerobot.com
   - 5분마다 `/health` 엔드포인트 ping
   - Cold Start 완전 방지

2. **에러 메시지 개선** (사용자 경험)
   - "서버가 시작 중입니다. 잠시 후 다시 시도해주세요" 메시지
   - 자동 재시도 로직 추가

#### 2. CORS 문제

**증상:**
- 첫 번째 요청: 성공
- 두 번째 요청: CORS 에러

**원인:**
- `ALLOWED_ORIGINS`에 Frontend URL이 제대로 설정되지 않음
- 또는 프리플라이트 요청(OPTIONS) 실패

**해결:**
1. Render 대시보드 → Environment Variables
2. `ALLOWED_ORIGINS` 확인:
   ```
   https://your-frontend.vercel.app
   ```
3. 또는 모든 origin 허용 (임시):
   ```
   *
   ```
4. 서비스 재배포

#### 3. 환경 변수 미설정 (VITE_API_URL, VITE_API_3D_URL)

**증상:**
- 에러 메시지에 `localhost:3001` 표시
- 첫 번째는 우연히 작동했을 수도

**원인:**
- Vercel에서 환경 변수가 설정되지 않음
- 또는 설정했지만 재배포 안 함

**해결:**
1. Vercel → Settings → Environment Variables
2. 다음 환경 변수 추가:
   ```
   VITE_API_URL=https://your-backend.vercel.app/api/quote
   VITE_API_3D_URL=https://agent-world-quotation.onrender.com/api/quote
   ```
   - `VITE_API_URL`: Vercel backend (기본 API - 빠름)
   - `VITE_API_3D_URL`: Render backend (3D 생성만 - 타임아웃 100분)
3. **재배포 필수!** (Vite는 빌드 타임에 환경 변수 포함)

#### 4. 타임아웃 문제

**증상:**
- 첫 번째 요청: 성공 (빠름)
- 두 번째 요청: 타임아웃

**원인:**
- Render 서버가 느리게 응답
- 네트워크 지연

**해결:**
- 타임아웃 시간 늘리기
- 재시도 로직 추가

## 빠른 진단 방법

### 1. 브라우저 개발자 도구 확인

**Console 탭:**
```javascript
// 환경 변수 확인
console.log(import.meta.env.VITE_API_URL)
```

**Network 탭:**
- 실제 요청 URL 확인
- `localhost:3001`이면 환경 변수 문제
- `agent-world-quotation.onrender.com`이면 다른 문제

### 2. Render 로그 확인

1. Render 대시보드 → Logs
2. 요청이 들어오는지 확인
3. 에러 메시지 확인

### 3. Backend Health Check

브라우저에서 직접 확인:
```
https://agent-world-quotation.onrender.com/health
```

## 즉시 해결 방법

### 방법 1: UptimeRobot 설정 (Cold Start 방지)

1. https://uptimerobot.com 가입
2. 새 모니터 생성:
   - URL: `https://agent-world-quotation.onrender.com/health`
   - Monitoring Interval: 5분
3. 완료!

### 방법 2: 환경 변수 확인 및 재배포

**Frontend (Vercel):**
1. Settings → Environment Variables
2. `VITE_API_URL` 확인/추가
3. **재배포** (중요!)

**Backend (Render):**
1. Environment Variables
2. `ALLOWED_ORIGINS` 확인:
   ```
   https://your-frontend.vercel.app
   ```
   또는
   ```
   *
   ```
3. 재배포

### 방법 3: 에러 처리 개선

Frontend 코드에 재시도 로직 추가:
- 첫 실패 시 자동 재시도
- 사용자에게 "서버 시작 중..." 메시지 표시

## 문제: 모든 기능이 로컬보다 훨씬 느림

### ⚠️ 중요: API 분리 필요!

**현재 문제:**
- 모든 API가 Render로 가고 있어서 느림
- 기본 견적 생성도 Render의 느린 성능 영향

**해결책: API 분리** ⭐
- **기본 API** (calculate, preview-image, excel 등) → **Vercel** (빠름)
- **3D 생성만** → **Render** (타임아웃 100분 필요)

### 가능한 원인들

#### 1. 모든 API가 Render로 가고 있음 (가장 가능성 높음) ⭐

**증상:**
- 견적 계산, 견적서 다운로드 등 모든 기능이 로컬보다 느림
- Cold Start는 해결했지만 여전히 느림

**원인:**
- 모든 API 요청이 Render로 가고 있음
- Render 무료 플랜 제한:
  - **메모리**: 512MB (제한적)
  - **CPU**: 공유 CPU (다른 서비스와 공유)
  - **네트워크**: Vercel → Render 간 지리적 거리

**해결:**
1. **Vercel에 Backend 추가 배포** (가장 확실한 방법) ⭐
   - 기본 API는 Vercel Serverless Functions 사용
   - Vercel은 Edge Network로 빠른 응답
   - 무료 플랜으로도 충분 (60초 제한, 기본 API는 충분)

2. **Frontend 환경 변수 분리**
   - `VITE_API_URL` → Vercel backend (기본 API)
   - `VITE_API_3D_URL` → Render backend (3D 생성만)

#### 2. Render 무료 플랜 성능 제한

**증상:**
- 3D 이미지 생성이 특히 느림

**원인:**
- Render 무료 플랜 제한 (3D 생성에만 영향)
- Gemini API 호출 자체가 느림 (30초~2분)

**해결:**
- 3D 생성은 Render 사용 (타임아웃 100분)
- 기본 API는 Vercel로 분리하여 성능 개선

#### 3. 네트워크 지연

**증상:**
- API 응답 시간이 느림

**원인:**
- Vercel (프론트엔드) → Render (백엔드) 간 네트워크 지연

**해결:**
- 기본 API는 Vercel로 분리 (같은 플랫폼, 빠름)
- 3D 생성만 Render 사용

#### 3. 타임아웃 설정 없음

**증상:**
- 요청이 오래 걸리거나 실패
- 사용자 경험 저하

**원인:**
- 프론트엔드에서 타임아웃 설정이 없음
- 긴 작업 시 사용자가 기다려야 함

**해결:**
- 프론트엔드에 타임아웃 및 재시도 로직 추가

#### 4. 순차적 API 호출

**증상:**
- 견적 생성 시 여러 단계가 순차적으로 실행됨
- 전체 시간이 길어짐

**원인:**
- `calculate` → `preview-image` 순차 호출
- 병렬 처리 불가

**해결:**
- 가능한 부분은 병렬 처리
- 또는 서버 사이드에서 한 번에 처리

#### 5. 큰 이미지 처리

**증상:**
- 3D 이미지 생성이 특히 느림
- Base64 인코딩/디코딩 오버헤드

**원인:**
- Base64 이미지가 크면 전송/처리 시간 증가
- Gemini API 호출 자체가 느림 (30초~2분)

**해결:**
- 이미지 압축
- 진행 상황 표시 (사용자 경험 개선)

### 즉시 개선 방법

#### 방법 1: 프론트엔드 타임아웃 및 재시도 추가

```javascript
// App.jsx에 추가
const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60초 타임아웃
      
      const res = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 지수 백오프
    }
  }
};
```

#### 방법 2: 로딩 상태 개선

- 진행 상황 표시
- "서버 응답 대기 중..." 메시지
- 예상 시간 표시

#### 방법 3: Render 유료 플랜 고려

- Starter 플랜 ($7/월): 성능 향상
- 또는 Vercel Pro 플랜으로 전체 이동

### 성능 비교

| 환경 | 메모리 | CPU | 예상 응답 시간 | 용도 |
|------|--------|-----|---------------|------|
| 로컬 | 제한 없음 | 전용 | < 1초 | 개발 |
| Vercel Serverless | 1024MB | Edge | 0.5-2초 | 기본 API (권장) ⭐ |
| Render 무료 | 512MB | 공유 | 2-5초 | 3D 생성만 |
| Render Starter | 1GB | 전용 | 1-2초 | 3D 생성 (선택사항) |

**권장 구조:**
- 기본 API (calculate, preview-image, excel) → **Vercel** (빠름, 무료)
- 3D 생성 → **Render** (타임아웃 100분, 무료)

## 체크리스트

- [ ] Vercel에 Backend 프로젝트 추가 배포 (Root Directory: `backend`)
- [ ] Vercel Backend 환경 변수 설정 (`GEMINI_API_KEY`, `DASHBOARD_API_URL`, `ACCOUNT_EMAIL`, `ALLOWED_ORIGINS`)
- [ ] Vercel Frontend 환경 변수 설정:
  - [ ] `VITE_API_URL` → Vercel backend URL (기본 API)
  - [ ] `VITE_API_3D_URL` → Render backend URL (3D 생성만)
- [ ] Vercel Frontend 재배포 완료
- [ ] Render `ALLOWED_ORIGINS` 설정 확인
- [ ] Render 재배포 완료
- [ ] UptimeRobot 설정 (Render Cold Start 방지)
- [ ] 브라우저 개발자 도구에서 실제 요청 URL 확인
- [ ] 성능 최적화 (타임아웃, 재시도 로직 추가)
- [ ] Render 유료 플랜 고려 (선택사항)
