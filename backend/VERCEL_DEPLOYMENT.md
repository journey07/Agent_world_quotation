# Vercel 배포 가이드

## 프로젝트 구조

이 프로젝트는 Vercel Serverless Functions로 변환되었습니다.

### API 엔드포인트

모든 API 엔드포인트는 `/api/quote/*` 경로로 제공됩니다:

- `POST /api/quote/calculate` - 견적 계산
- `POST /api/quote/pdf` - PDF 견적서 생성
- `POST /api/quote/excel` - Excel 견적서 생성
- `POST /api/quote/preview-image` - 2D 프리뷰 이미지 생성
- `POST /api/quote/generate-3d-installation` - 3D 설치 시각화 생성
- `GET /api/quote/inquiries` - 문의 내역 조회
- `GET /api/quote/dashboard-stats` - 대시보드 통계
- `POST /api/quote/agent-toggle` - 에이전트 상태 토글
- `POST /api/quote/agent-status` - 에이전트 상태 설정
- `GET /api/quote/health` - 헬스체크
- `POST /api/quote/verify-api` - API 연결 확인

## Vercel 배포 방법

### 1. Vercel CLI 설치 (선택사항)

```bash
npm i -g vercel
```

### 2. Vercel 프로젝트 설정

**중요**: Vercel에 배포할 때는 **`backend` 폴더를 루트로 설정**해야 합니다.

#### 방법 A: Vercel 웹 대시보드 사용

1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. "Add New Project" 클릭
3. Git 저장소 연결 (GitHub/GitLab/Bitbucket)
4. **Root Directory를 `backend`로 설정**
5. Build Settings:
   - Framework Preset: "Other"
   - Build Command: (비워두기 - API만 있으므로 빌드 불필요)
   - Output Directory: (비워두기)
   - Install Command: `npm install`

#### 방법 B: Vercel CLI 사용

```bash
cd backend
vercel
```

프롬프트에서:
- Set up and deploy? **Y**
- Which scope? (본인 계정 선택)
- Link to existing project? **N**
- Project name? (원하는 이름 입력)
- Directory? **./** (현재 디렉토리)
- Override settings? **N**

### 3. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정해야 합니다:

**필수 환경 변수:**
- `GEMINI_API_KEY` - Google Gemini API 키
- `DASHBOARD_API_URL` - 대시보드 API URL (예: `https://your-dashboard.vercel.app/api/stats`)
- `ACCOUNT_EMAIL` - 계정 이메일 (예: `admin@worldlocker.com`)

**설정 방법:**
1. Vercel 대시보드 → 프로젝트 선택
2. Settings → Environment Variables
3. 각 변수 추가:
   - Key: `GEMINI_API_KEY`
   - Value: (실제 API 키)
   - Environment: Production, Preview, Development 모두 선택

### 4. 배포 확인

배포 후 다음 URL로 헬스체크:

```
https://your-project.vercel.app/api/quote/health
```

응답 예시:
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T12:00:00.000Z"
}
```

## 로컬 개발

로컬에서 Vercel 개발 서버로 테스트:

```bash
cd backend
npm install -g vercel
vercel dev
```

이렇게 하면 `http://localhost:3000`에서 API가 실행됩니다.

## 주의사항

### 1. 파일 시스템 제약

Vercel Serverless Functions는 **읽기 전용 파일 시스템**을 사용합니다. 

**영향받는 기능:**
- `inquiryService.js`의 `inquiries.json` 파일 쓰기
- 로그 파일 쓰기

**해결 방법:**
- 데이터베이스 사용 (Supabase, MongoDB 등)
- 외부 스토리지 사용 (S3, Cloud Storage 등)

### 2. 함수 실행 시간 제한 ⚠️ 중요

**플랜별 제한:**
- **Hobby 플랜 (무료)**: 기본 10초, **최대 60초** (설정 필요)
  - ⚠️ Fluid Compute 사용 불가
  - ⚠️ 3D 이미지 생성(30초~2분)에는 부족할 수 있음
- **Pro 플랜 ($20/월)**: 기본 15초, 최대 300초 (Fluid Compute 없이) 또는 기본 300초, 최대 800초 (Fluid Compute 활성화 시)
- **Enterprise 플랜**: 최대 900초

**영향받는 기능:**
- `generate-3d-installation` - **Gemini API 호출로 30초~2분 이상 소요 가능**

**현재 설정:**
- 일반 함수: 60초 (Hobby 플랜에서도 작동)
- 3D 생성 함수: **300초 (5분)** - ⚠️ **Pro 플랜에서만 작동!**
  - Hobby 플랜에서는 60초로 자동 제한됨

**해결 방법:**
1. **Pro 플랜 필수** - 3D 이미지 생성 기능 사용 시 반드시 필요
2. **Fluid Compute 활성화** (권장):
   - Vercel 대시보드 → 프로젝트 설정 → Functions
   - "Enable Fluid Compute" 활성화
   - 활성화 시 최대 800초까지 가능
3. **비동기 처리** (대안):
   - 큐 시스템 사용 (예: Vercel Queue, Upstash)
   - 클라이언트에서 폴링 또는 웹소켓 사용

### 3. 메모리 제한

- Hobby: 1024 MB
- Pro: 3008 MB

**현재 설정:**
- 일반 함수: 1024 MB
- 3D 생성 함수: **2048 MB** - Pro 플랜 필요

**영향받는 기능:**
- PDF/Excel 생성 (이미지 포함 시 메모리 사용량 증가)
- 3D 이미지 생성 (큰 이미지 처리 시 메모리 사용량 증가)

### 4. 네이티브 모듈

`canvas`, `jimp` 같은 네이티브 모듈은 Vercel에서 빌드 시 문제가 발생할 수 있습니다.

**해결 방법:**
- `vercel.json`에 빌드 설정 추가
- 또는 Docker 이미지 사용 (Vercel Enterprise)

### 5. CORS 설정

프론트엔드에서 API를 호출할 때 CORS 오류가 발생할 수 있습니다.

**해결 방법:**
각 API 함수에서 CORS 헤더 추가:

```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

또는 `vercel.json`에 CORS 설정 추가.

## 프론트엔드 연동

### 환경 변수 설정

프론트엔드 프로젝트 루트(`frontend/`)에 `.env` 파일 생성:

```bash
# 개발 환경: 로컬 Express 서버
VITE_API_URL=http://localhost:3001/api/quote

# 프로덕션 환경: Vercel 배포 URL
# VITE_API_URL=https://your-backend.vercel.app/api/quote
```

### 코드에서 사용

`App.jsx`에서 이미 환경 변수를 사용하도록 설정되어 있습니다:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/quote';
```

### Vercel에 프론트엔드 배포 시

프론트엔드를 별도로 Vercel에 배포하는 경우:

1. Vercel 대시보드에서 프론트엔드 프로젝트 설정
2. Environment Variables에 `VITE_API_URL` 추가
3. Value: `https://your-backend.vercel.app/api/quote`

## 모니터링

Vercel 대시보드에서:
- Functions 탭에서 각 함수의 실행 시간, 에러율 확인
- Logs 탭에서 실시간 로그 확인

## 트러블슈팅

### 빌드 실패

1. `package.json`의 의존성 확인
2. 네이티브 모듈 빌드 문제인 경우 `vercel.json`에 빌드 설정 추가

### 함수 실행 오류

1. Vercel Logs 확인
2. 환경 변수 설정 확인
3. 함수 타임아웃 확인

### CORS 오류

1. API 함수에 CORS 헤더 추가
2. `vercel.json`에 CORS 설정 추가

## ⚠️ 필수 요구사항

### 3D 이미지 생성 기능 사용 시

#### 옵션 1: Vercel Pro 플랜 (권장) 💰

**반드시 Pro 플랜이 필요합니다!**

1. **Vercel Pro 플랜 구독** (월 $20)
2. **Fluid Compute 활성화** (권장):
   - 프로젝트 설정 → Functions → "Enable Fluid Compute"
   - 최대 800초까지 실행 가능
3. **현재 설정 확인**:
   - `vercel.json`에서 `generate-3d-installation.js`는 300초로 설정됨
   - Fluid Compute 활성화 시 800초까지 늘릴 수 있음

#### 옵션 2: 무료 플랜 + Render (3D 생성만) 🆓⭐

**Hobby 플랜에서는 3D 이미지 생성이 타임아웃됩니다!**

**Render 무료 플랜 사용 (추천!):**
- ✅ **완전 무료**
- ✅ **타임아웃 100분** (3D 생성에 충분!)
- ✅ 750시간/월 (거의 24/7 가능)
- ⚠️ 15분 비활성 시 cold start (~1분)

**구성:**
- 3D 이미지 생성만 Render에 배포
- 나머지 API는 Vercel Hobby 플랜 사용
- 또는 전체를 Render로 이동 (완전 무료)

#### 옵션 3: 비동기 처리 (복잡함) ⚙️

**무료 플랜에서도 가능하지만 구현이 복잡합니다:**

1. **요청 즉시 반환** (10초 이내):
   - 작업 ID 생성 및 반환
   - 큐에 작업 추가 (Upstash Redis 무료 티어 사용 가능)
   
2. **별도 워커 함수**:
   - Vercel Cron Job 또는 외부 서비스로 주기적 실행
   - 큐에서 작업 가져와서 처리
   - 결과를 데이터베이스/스토리지에 저장
   
3. **클라이언트 폴링**:
   - 작업 ID로 주기적으로 결과 조회
   - 완료되면 결과 반환

**단점:**
- 구현 복잡도 높음
- 클라이언트 코드 수정 필요
- 추가 인프라 필요 (큐, DB 등)

**추천: 옵션 1 (Pro 플랜) 또는 옵션 2 (3D만 별도 서버)**

## 다음 단계

1. **데이터베이스 마이그레이션**: `inquiries.json` 파일 시스템 대신 데이터베이스 사용
2. **에러 핸들링 강화**: 더 상세한 에러 로깅 및 모니터링
3. **캐싱 전략**: 자주 사용되는 데이터 캐싱
4. **플랜 선택**: 
   - Pro 플랜 구독 (3D 생성 포함 전체 기능)
   - 또는 3D 생성만 별도 서버로 분리 (무료 플랜 사용)
