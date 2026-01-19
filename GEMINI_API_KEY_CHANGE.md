# Gemini API Key 변경 가이드

## 📍 Gemini API Key가 사용되는 곳

Gemini API Key는 **3D 이미지 생성**에만 사용됩니다:
- ✅ **Render 서비스** (3D 이미지 생성 전용) - **필수**
- ❌ **Vercel Backend** (world_quotation_backend) - **불필요** (3D 생성 기능 없음)
- ❌ **Frontend** - **불필요**

---

## 🖥️ 로컬 환경에서 변경

### 1. Backend 디렉토리의 .env 파일 수정

**파일 위치**: `/backend/.env`

```bash
# 기존
GEMINI_API_KEY=AIzaSy...old_key...

# 변경
GEMINI_API_KEY=AIzaSy...new_key...
```

### 2. 서버 재시작

```bash
cd backend
npm start
# 또는
node src/index.js
```

**참고**: 
- 로컬에서 3D 이미지 생성 기능을 테스트할 때만 필요합니다
- 일반 API (calculate, inquiries 등)는 GEMINI_API_KEY가 없어도 작동합니다

---

## 🚀 배포 환경에서 변경

### 1. Render (3D 이미지 생성 서비스) - 필수

**Render 대시보드에서 변경:**

1. **Render 대시보드** 접속: https://dashboard.render.com
2. **world-quotation-backend** 서비스 선택 (또는 3D 이미지 생성용 서비스)
3. **Environment** 탭 클릭
4. **GEMINI_API_KEY** 환경 변수 찾기
5. **Edit** 클릭 → 새 API Key 입력
6. **Save Changes** 클릭
7. **Manual Deploy** → **Deploy latest commit** (자동 재배포 안 될 경우)

**또는 Render CLI 사용:**
```bash
render env:set GEMINI_API_KEY=AIzaSy...new_key...
```

### 2. Vercel Backend (world_quotation_backend) - 불필요

**⚠️ 주의**: Vercel Backend에는 GEMINI_API_KEY가 **필요 없습니다**
- 3D 이미지 생성 기능이 없으므로 설정하지 않아도 됩니다
- 만약 설정되어 있다면 제거해도 됩니다

**Vercel 대시보드에서 확인:**
1. **Vercel 대시보드** 접속: https://vercel.com/dashboard
2. **world-quotation-backend** 프로젝트 선택
3. **Settings** → **Environment Variables**
4. `GEMINI_API_KEY`가 있다면:
   - 제거해도 됩니다 (3D 생성 기능 없음)
   - 또는 그대로 두어도 무방합니다 (사용되지 않음)

---

## 🔑 새 Gemini API Key 발급 방법

1. **Google AI Studio** 접속: https://aistudio.google.com/app/apikey
2. Google 계정으로 로그인
3. **Create API Key** 클릭
4. 프로젝트 선택 (또는 새로 생성)
5. 생성된 키 복사 (형식: `AIzaSy...`)

---

## ✅ 변경 확인 방법

### 로컬 환경

1. **Backend 서버 시작**
   ```bash
   cd backend
   npm start
   ```

2. **콘솔 로그 확인**
   - API Key가 없으면: `GEMINI_API_KEY environment variable is not set` 에러
   - API Key가 있으면: 정상적으로 서버 시작

3. **3D 이미지 생성 테스트**
   - Frontend에서 3D 이미지 생성 버튼 클릭
   - 성공하면 새 API Key가 정상 작동하는 것

### 배포 환경 (Render)

1. **Render 대시보드에서 확인**
   - **Environment** 탭에서 `GEMINI_API_KEY` 값 확인
   - 마스킹되어 표시됨 (보안상 전체 키는 보이지 않음)

2. **서비스 로그 확인**
   - **Logs** 탭에서 서비스 재배포 확인
   - 에러가 없으면 정상

3. **실제 테스트**
   - Frontend에서 3D 이미지 생성 테스트
   - 성공하면 새 API Key가 정상 작동

---

## 🔄 API Key 변경 후 필요한 작업

### Render 서비스
- ✅ 환경 변수 변경 후 **자동 재배포** (보통 즉시 반영)
- ⚠️ 자동 재배포가 안 되면 **Manual Deploy** 필요

### Vercel Backend
- ✅ GEMINI_API_KEY는 사용하지 않으므로 변경 불필요

---

## 📝 환경 변수 위치 요약

| 환경 | 파일/위치 | 필수 여부 |
|------|----------|----------|
| **로컬** | `backend/.env` | 3D 테스트 시만 필요 |
| **Render** | Render 대시보드 → Environment | ✅ 필수 |
| **Vercel Backend** | Vercel 대시보드 → Environment Variables | ❌ 불필요 |

---

## 🚨 주의사항

1. **API Key 보안**
   - `.env` 파일은 `.gitignore`에 포함되어 있어야 합니다
   - 공개 저장소에 절대 커밋하지 마세요

2. **API Key 형식**
   - Google Gemini API Key는 `AIzaSy...` 형식입니다
   - 공백이나 따옴표 없이 그대로 입력하세요

3. **변경 후 테스트**
   - API Key 변경 후 반드시 3D 이미지 생성 기능 테스트
   - 실패 시 API Key가 올바른지 확인
