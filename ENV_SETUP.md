# 환경변수 설정 가이드

## 📋 개요

이 프로젝트는 **세 개의 배포 환경**으로 구성됩니다:
1. **world_quotation** (Frontend - Vercel)
2. **world_quotation_backend** (Backend - Vercel)
3. **render** (3D 이미지 제작용 - Render)

각 플랫폼에 필요한 환경변수를 아래와 같이 설정하세요.

---

## ❓ 왜 Frontend와 Backend에 각각 DB 설정이 필요한가요?

### 1. **완전히 분리된 서비스**
- **Frontend (Vercel)**: 정적 파일과 클라이언트 사이드 코드만 배포
- **Backend (Render)**: 서버 사이드 API만 배포
- **서로 다른 플랫폼**: Vercel과 Render는 완전히 독립적인 서비스입니다
- **독립적인 환경변수 공간**: 각 플랫폼은 자신만의 환경변수 저장소를 가집니다

### 2. **보안상의 이유 - 다른 키를 사용해야 함**

#### Frontend (Vercel)
- **`VITE_SUPABASE_ANON_KEY`** 사용 (공개 키)
- 브라우저에서 실행되므로 **누구나 볼 수 있는** 키만 사용 가능
- RLS (Row Level Security) 정책에 따라 제한된 권한만 가짐
- 사용자 인증, 데이터 조회 등 **제한된 작업**만 수행

#### Backend (Render)
- **`SUPABASE_SERVICE_ROLE_KEY`** 사용 (비밀 키)
- 서버에서만 실행되므로 **절대 노출되면 안 되는** 강력한 키 사용
- RLS를 우회하여 **모든 데이터에 접근** 가능
- 사용자 생성, 비밀번호 검증, 관리자 작업 등 **모든 작업** 수행 가능

### 3. **Vercel이 자동으로 해주지 않는 이유**

#### 기술적 제약
1. **플랫폼 간 통신 불가**: Vercel과 Render는 서로 다른 회사의 서비스입니다
   - Vercel은 Render의 환경변수에 접근할 수 없습니다
   - Render도 Vercel의 환경변수에 접근할 수 없습니다
   - 각 플랫폼은 자신의 환경변수만 관리합니다

2. **보안 정책**: 각 플랫폼은 보안상의 이유로 다른 플랫폼의 환경변수를 공유하지 않습니다
   - 환경변수는 민감한 정보이므로 플랫폼 간 공유는 보안 위험
   - 각 서비스는 자신이 배포한 코드에만 환경변수를 제공

3. **아키텍처 설계**: 분리된 배포는 의도적인 설계입니다
   - Frontend와 Backend를 분리하면 독립적으로 스케일링 가능
   - 각 서비스의 장애가 다른 서비스에 영향을 주지 않음
   - 하지만 그만큼 각각 환경변수를 설정해야 함

#### 만약 같은 플랫폼이라면?
- **같은 Vercel 프로젝트 내**에서 Frontend와 Backend를 배포한다면:
  - 같은 환경변수를 공유할 수 있습니다
  - 하지만 이 프로젝트는 Backend를 Render에 배포하므로 불가능합니다

### 4. **실제 동작 방식**

```
┌─────────────────┐         ┌─────────────────┐
│  Frontend       │         │  Backend        │
│  (Vercel)       │         │  (Render)       │
│                 │         │                 │
│  환경변수:      │         │  환경변수:      │
│  - VITE_        │         │  - SUPABASE_    │
│    SUPABASE_URL │         │    URL          │
│  - VITE_        │         │  - SUPABASE_    │
│    SUPABASE_    │         │    SERVICE_     │
│    ANON_KEY     │         │    ROLE_KEY     │
│                 │         │                 │
│  (공개 키)      │         │  (비밀 키)      │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
              ┌──────────────┐
              │   Supabase   │
              │   Database   │
              └──────────────┘
```

### 5. **해결 방법**

현재 구조에서는 **각 플랫폼에 환경변수를 수동으로 설정**하는 것이 유일한 방법입니다.

#### 대안 (구조 변경 시)
1. **모두 Vercel에 배포**: Frontend와 Backend를 모두 Vercel에 배포하면 환경변수를 공유할 수 있습니다
2. **환경변수 관리 도구 사용**: AWS Secrets Manager, HashiCorp Vault 등 사용 (복잡도 증가)
3. **설정 파일 공유**: Git에 환경변수 템플릿을 저장하고 배포 스크립트로 복사 (보안 위험)

**결론**: 현재 구조에서는 각 플랫폼에 환경변수를 설정하는 것이 정상이며, 보안상 올바른 방법입니다.

---

## 📦 세 개 배포 환경별 필수 환경변수 요약

> **⚠️ Service Role Key 제공 상황 기준으로 정리**

| 배포 환경 | 플랫폼 | 역할 | 필수 환경변수 | 선택 환경변수 |
|----------|--------|------|--------------|--------------|
| **1️⃣ world_quotation** | Vercel (Frontend) | UI만 제공 | • `VITE_SUPABASE_URL`<br>• `VITE_SUPABASE_ANON_KEY` | • `VITE_API_URL` (권장)<br>• `VITE_API_3D_URL` (권장) |
| **2️⃣ world_quotation_backend** | Vercel (Backend) | 빠른 API만<br>(calculate, inquiries, excel, preview-image 등) | • `SUPABASE_URL`<br>• `SUPABASE_SERVICE_ROLE_KEY` ⚠️<br>• `ALLOWED_ORIGINS` | • `NODE_ENV`<br>• `BASE_URL`<br>• `DASHBOARD_API_URL`<br>• `ACCOUNT_EMAIL` |
| **3️⃣ render** | Render (3D 이미지) | 3D 이미지 생성 전용<br>(시간이 오래 걸리는 작업) | • `SUPABASE_URL`<br>• `SUPABASE_SERVICE_ROLE_KEY` ⚠️<br>• `GEMINI_API_KEY` ⚠️<br>• `ALLOWED_ORIGINS` | • `NODE_ENV`<br>• `PORT`<br>• `BASE_URL`<br>• `DASHBOARD_API_URL`<br>• `ACCOUNT_EMAIL` |

### 🔑 핵심 포인트

1. **Frontend (world_quotation)**: 
   - `VITE_SUPABASE_ANON_KEY`만 사용 (공개 키)
   - Service Role Key는 **절대 사용하지 않음** (보안 위험)

2. **world_quotation_backend (Vercel)**:
   - **빠른 API만 제공** (calculate, inquiries, excel, preview-image 등)
   - **3D 이미지 생성 기능 없음** (Vercel 타임아웃 제한 때문)
   - `SUPABASE_SERVICE_ROLE_KEY` **필수** (RLS 우회 및 users 테이블 접근)
   - **`GEMINI_API_KEY` 불필요** (3D 생성 기능 없음)

3. **render (Render)**:
   - **3D 이미지 생성 전용** (시간이 오래 걸리는 작업)
   - Vercel의 타임아웃 제한을 피하기 위해 Render로 분리
   - `SUPABASE_SERVICE_ROLE_KEY` **필수** (통계/로그용)
   - **`GEMINI_API_KEY` 필수** (3D 이미지 생성에 사용)

---

## 🚀 1. world_quotation (Frontend - Vercel)

### 필수 환경변수

| 변수명 | 설명 | 예시 값 |
|--------|------|---------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | `https://gxkwhbwklvwhqehwpfpt.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon (Public) Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### 선택적 환경변수

| 변수명 | 설명 | 예시 값 | 비고 |
|--------|------|---------|------|
| `VITE_API_URL` | Backend API URL (설정하지 않으면 Render URL 자동 사용) | `https://agent-world-quotation.onrender.com/api/quote` | **권장**: 명시적으로 설정 |
| `VITE_API_3D_URL` | 3D 생성 API URL (설정하지 않으면 Render URL 자동 사용) | `https://agent-world-quotation.onrender.com/api/quote` | **권장**: 명시적으로 설정 |

### Vercel 설정 방법

1. Vercel 대시보드 → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 위의 환경변수들을 추가
4. **Production**, **Preview**, **Development** 환경에 모두 적용

---

## ⚙️ 2. world_quotation_backend (Backend - Vercel)

### 역할
- **빠른 API만 제공**: calculate, inquiries, excel, preview-image, auth 등
- **3D 이미지 생성 제외**: Vercel의 타임아웃 제한(최대 60초) 때문에 3D 생성은 Render로 분리
- Frontend는 `API_URL`로 이 서비스를 호출하고, `API_3D_URL`로 Render를 호출

### 필수 환경변수

| 변수명 | 설명 | 예시 값 | 비고 |
|--------|------|---------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | `https://gxkwhbwklvwhqehwpfpt.supabase.co` | **필수**: Service Role Key와 함께 사용 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | **필수**: Service Role Key 제공됨 → 반드시 설정 |
| `ALLOWED_ORIGINS` | CORS 허용 Origin 목록 (쉼표로 구분) | `https://agent-world-quotation.vercel.app,https://wl-agent1.supersquad.kr` | **필수**: 프론트엔드 도메인 포함 |

### 선택적 환경변수

| 변수명 | 설명 | 예시 값 | 비고 |
|--------|------|---------|------|
| `NODE_ENV` | 실행 환경 | `production` | 기본값: production |
| `BASE_URL` | Backend 공개 URL | `https://world-quotation-backend.vercel.app` | Heartbeat 및 통계용 |
| `DASHBOARD_API_URL` | 대시보드 통계 API URL | `https://your-dashboard.vercel.app/api/stats` | 선택사항 |
| `ACCOUNT_EMAIL` | 계정 이메일 (통계용) | `admin@worldlocker.com` | 기본값: `admin@worldlocker.com` |

### ⚠️ 중요 사항

- **`SUPABASE_SERVICE_ROLE_KEY`는 필수입니다**: Service Role Key가 제공되므로 반드시 설정해야 합니다
- **`SUPABASE_ANON_KEY`는 사용하지 않습니다**: Service Role Key가 있으므로 Anon Key는 필요 없습니다
- **RLS 우회**: Service Role Key를 사용하면 Row Level Security를 우회하여 users 테이블에 직접 접근 가능합니다
- **`GEMINI_API_KEY`는 불필요합니다**: 
  - world_quotation_backend는 **3D 이미지 생성 기능을 제공하지 않습니다**
  - 3D 생성은 Render로 분리되어 있습니다 (Vercel 타임아웃 제한 때문)
  - 따라서 GEMINI_API_KEY는 **설정하지 않아도 됩니다**

### Vercel 설정 방법

1. Vercel 대시보드 → **world_quotation_backend** 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 위의 환경변수들을 추가
4. **Production**, **Preview**, **Development** 환경에 모두 적용

---

## ⚙️ 3. render (3D 이미지 제작용 - Render)

### 역할
- **3D 이미지 생성 전용**: 시간이 오래 걸리는 작업 (수십 초 ~ 수분)
- **Vercel 타임아웃 회피**: Vercel은 최대 60초 타임아웃이 있어, 오래 걸리는 3D 생성 작업을 Render로 분리
- Frontend는 `API_3D_URL`로 이 서비스를 직접 호출합니다

### 필수 환경변수

| 변수명 | 설명 | 예시 값 | 비고 |
|--------|------|---------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | `https://gxkwhbwklvwhqehwpfpt.supabase.co` | **필수**: Service Role Key와 함께 사용 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | **필수**: Service Role Key 제공됨 → 반드시 설정 |
| `GEMINI_API_KEY` | Google Gemini API 키 | `AIza...` | **필수**: 3D 이미지 생성에 사용 (Google AI Studio에서 발급) |
| `ALLOWED_ORIGINS` | CORS 허용 Origin 목록 (쉼표로 구분) | `https://agent-world-quotation.vercel.app,https://wl-agent1.supersquad.kr` | **필수**: 프론트엔드 도메인 포함 |

### 선택적 환경변수

| 변수명 | 설명 | 예시 값 | 비고 |
|--------|------|---------|------|
| `NODE_ENV` | 실행 환경 | `production` | 기본값: production |
| `PORT` | 서버 포트 | `10000` | Render가 자동 할당하므로 보통 설정 불필요 |
| `BASE_URL` | Backend 공개 URL | `https://agent-world-quotation.onrender.com` | Heartbeat 및 통계용 |
| `DASHBOARD_API_URL` | 대시보드 통계 API URL | `https://your-dashboard.vercel.app/api/stats` | 선택사항 |
| `ACCOUNT_EMAIL` | 계정 이메일 (통계용) | `admin@worldlocker.com` | 기본값: `admin@worldlocker.com` |

### ⚠️ 중요 사항

- **`SUPABASE_SERVICE_ROLE_KEY`는 필수입니다**: Service Role Key가 제공되므로 반드시 설정해야 합니다
- **`SUPABASE_ANON_KEY`는 사용하지 않습니다**: Service Role Key가 있으므로 Anon Key는 필요 없습니다
- **`GEMINI_API_KEY`는 필수입니다**: 
  - 이 서비스는 **3D 이미지 생성 전용**입니다
  - Gemini API를 사용하여 2D 레이아웃을 3D 설치 이미지로 변환합니다
  - 시간이 오래 걸리는 작업이므로 Render의 긴 타임아웃을 활용합니다

### Render 설정 방법

1. Render 대시보드 → **render** 서비스 선택
2. **Environment** 탭
3. 위의 환경변수들을 **Add Environment Variable**로 추가
4. **Save Changes** 후 서비스 재배포

---

## 🔐 Supabase 키 발급 방법

### 1. Supabase 대시보드 접속
- https://supabase.com/dashboard 접속
- 프로젝트 선택

### 2. API Keys 확인
- **Settings** → **API** 메뉴
- **Project URL**: `SUPABASE_URL`에 사용
- **anon public**: `VITE_SUPABASE_ANON_KEY` (Frontend 전용)
- **service_role secret**: `SUPABASE_SERVICE_ROLE_KEY` (Backend 필수, **절대 노출 금지**)
  - ⚠️ **중요**: Backend에서는 Service Role Key를 사용해야 RLS를 우회하고 users 테이블에 직접 접근할 수 있습니다
  - Anon Key는 Service Role Key가 없을 때만 대체로 사용되지만, RLS 정책에 따라 제한될 수 있어 권장하지 않습니다

---

## 🔑 Google Gemini API 키 발급 방법

1. **Google AI Studio** 접속: https://aistudio.google.com/app/apikey
2. Google 계정으로 로그인
3. **Create API Key** 클릭
4. 생성된 키를 `GEMINI_API_KEY`에 설정

---

## ✅ 환경변수 체크리스트

### 1️⃣ world_quotation (Frontend - Vercel)
- [ ] `VITE_SUPABASE_URL` 설정
- [ ] `VITE_SUPABASE_ANON_KEY` 설정
- [ ] **`VITE_API_URL` 설정** (권장: world_quotation_backend URL)
- [ ] **`VITE_API_3D_URL` 설정** (권장: render URL)

### 2️⃣ world_quotation_backend (Backend - Vercel)
- [ ] `SUPABASE_URL` 설정
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 설정 (Service Role Key 제공됨)
- [ ] **`ALLOWED_ORIGINS` 설정** (프론트엔드 도메인 포함)
- [ ] ~~`GEMINI_API_KEY`~~ **불필요** (3D 생성 기능 없음)
- [ ] (선택) `BASE_URL` 설정 (Backend 공개 URL)
- [ ] (선택) `DASHBOARD_API_URL` 설정
- [ ] (선택) `ACCOUNT_EMAIL` 설정

### 3️⃣ render (3D 이미지 제작용 - Render)
- [ ] `SUPABASE_URL` 설정
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 설정 (Service Role Key 제공됨)
- [ ] `GEMINI_API_KEY` 설정
- [ ] **`ALLOWED_ORIGINS` 설정** (프론트엔드 도메인 포함)
- [ ] (선택) `NODE_ENV=production` 설정
- [ ] (선택) `BASE_URL` 설정 (Render 공개 URL)
- [ ] (선택) `DASHBOARD_API_URL` 설정
- [ ] (선택) `ACCOUNT_EMAIL` 설정

---

## 🚨 보안 주의사항

1. **`SUPABASE_SERVICE_ROLE_KEY`** (Backend 전용): 
   - RLS를 우회하는 강력한 권한을 가진 키입니다
   - **절대** 프론트엔드 코드나 공개 저장소에 노출하지 마세요
   - **world_quotation_backend**와 **render**에서만 사용하세요
   - **필수**: Backend에서 users 테이블에 직접 접근하려면 반드시 필요합니다
   - Service Role Key가 제공되므로 **반드시 설정**해야 합니다

2. **`VITE_SUPABASE_ANON_KEY`** (Frontend 전용):
   - Frontend (world_quotation)에서만 사용하는 공개 키입니다
   - 브라우저에서 노출되므로 공개되어도 안전합니다
   - RLS 정책에 따라 제한된 권한만 가집니다
   - **절대** Service Role Key를 Frontend에서 사용하지 마세요

3. **`SUPABASE_ANON_KEY` (Backend)**:
   - Service Role Key가 제공되므로 **사용하지 않습니다**
   - Service Role Key가 있으면 Anon Key는 필요 없습니다
   - 이전에는 대체로 사용되었지만, 현재는 Service Role Key를 사용합니다

4. **`GEMINI_API_KEY`**:
   - API 사용량에 따라 비용이 발생할 수 있습니다
   - 키가 유출되면 즉시 재발급하세요
   - **world_quotation_backend**와 **render** 모두에서 필요합니다

5. **환경변수 확인**:
   - 배포 후 로그를 확인하여 환경변수가 제대로 로드되는지 확인하세요
   - `.env` 파일은 `.gitignore`에 포함되어 있는지 확인하세요
   - 각 배포 환경별로 환경변수가 올바르게 설정되었는지 확인하세요

---

## 📝 참고사항

- **Supabase 키 사용 (Service Role Key 제공 상황)**:
  - **world_quotation_backend**와 **render**: `SUPABASE_SERVICE_ROLE_KEY` **필수** 사용
  - Service Role Key가 제공되므로 `SUPABASE_ANON_KEY`는 **사용하지 않습니다**
  - Service Role Key를 사용하면 RLS를 우회하여 users 테이블에 직접 접근 가능합니다
  - **world_quotation** (Frontend): `VITE_SUPABASE_ANON_KEY`만 사용 (공개 키)

- **CORS 설정**: `ALLOWED_ORIGINS`에 프론트엔드 도메인을 정확히 입력해야 합니다
  - 예: `https://wl-agent1.supersquad.kr,https://agent-world-quotation.vercel.app`
  - Render에 이 환경변수를 설정하지 않으면 기본값이 사용되지만, 커스텀 도메인을 사용하는 경우 반드시 추가해야 합니다
- **API URL 설정**: Frontend에서 `VITE_API_URL`을 설정하지 않으면 프로덕션 환경에서 자동으로 Render URL을 사용합니다
  - 하지만 **명시적으로 설정하는 것을 강력히 권장**합니다
  - 값: `https://agent-world-quotation.onrender.com/api/quote`
- **기본값**: 일부 환경변수는 코드에 기본값이 설정되어 있지만, 프로덕션에서는 명시적으로 설정하는 것을 권장합니다
