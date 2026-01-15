# API 키 교체 가이드 (API Key Replacement Guide)

## 🔑 문제 상황

Gemini API 키가 유출되어 Google에서 차단되었습니다. 다음 오류가 발생할 수 있습니다:
- `403 PERMISSION_DENIED`
- `Your API key was reported as leaked. Please use another API key.`

## ✅ 해결 방법

### 1. 새로운 API 키 생성

1. **Google AI Studio 접속**
   - https://aistudio.google.com/app/apikey 방문
   - Google 계정으로 로그인

2. **새 API 키 생성**
   - "Create API Key" 버튼 클릭
   - 프로젝트 선택 (또는 새 프로젝트 생성)
   - API 키 복사

3. **기존 키 삭제 (선택사항)**
   - 유출된 키는 자동으로 비활성화되지만, 보안을 위해 Google AI Studio에서 삭제 권장

### 2. 환경 변수 업데이트

#### 로컬 개발 환경

1. **`.env` 파일 수정**
   ```bash
   cd backend
   # .env 파일 열기
   GEMINI_API_KEY=your_new_api_key_here
   ```

2. **서버 재시작**
   ```bash
   npm start
   # 또는
   node src/index.js
   ```

#### Vercel 배포 환경

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 프로젝트 선택

2. **환경 변수 설정**
   - Settings → Environment Variables
   - `GEMINI_API_KEY` 찾기
   - "Edit" 클릭
   - 새 API 키 입력
   - "Save" 클릭

3. **재배포**
   - Deployments 탭에서 최신 배포 선택
   - "Redeploy" 클릭
   - 또는 새 커밋 푸시 시 자동 재배포

#### Render 배포 환경

1. **Render 대시보드 접속**
   - https://dashboard.render.com
   - 서비스 선택

2. **환경 변수 설정**
   - Environment 탭
   - `GEMINI_API_KEY` 찾기
   - "Edit" 클릭
   - 새 API 키 입력
   - "Save Changes" 클릭

3. **서비스 재시작**
   - Manual Deploy → Clear build cache & deploy

#### 기타 배포 환경

환경 변수 `GEMINI_API_KEY`를 새 API 키로 업데이트하고 서비스를 재시작하세요.

### 3. API 키 확인

배포 후 다음 엔드포인트로 API 연결을 확인할 수 있습니다:

```
GET /api/quote/verify-api
```

성공 응답:
```json
{
  "success": true,
  "message": "API Connection OK"
}
```

## 🔒 보안 권장사항

1. **API 키는 절대 코드에 하드코딩하지 마세요**
   - ✅ 환경 변수 사용
   - ❌ 코드에 직접 작성

2. **Git에 커밋하지 마세요**
   - `.env` 파일은 `.gitignore`에 포함되어 있는지 확인
   - 이미 커밋된 경우 Git 히스토리에서 제거 필요

3. **API 키 제한 설정**
   - Google Cloud Console에서 API 키 사용 제한 설정
   - 특정 IP 또는 도메인에서만 사용 가능하도록 제한

4. **정기적인 키 교체**
   - 보안을 위해 주기적으로 API 키 교체 고려

## 📝 관련 파일

- `backend/src/services/geminiService.js` - Gemini API 클라이언트
- `backend/api/quote/generate-3d-installation.js` - 3D 생성 엔드포인트
- `backend/.env` - 로컬 환경 변수 (Git에 커밋하지 않음)

## 🆘 문제 해결

### 여전히 403 오류가 발생하는 경우

1. **API 키가 올바르게 설정되었는지 확인**
   ```bash
   # 로컬에서 확인
   echo $GEMINI_API_KEY
   ```

2. **환경 변수가 로드되었는지 확인**
   - 서버 재시작 확인
   - 배포 환경에서 환경 변수 저장 후 재배포 확인

3. **API 키 권한 확인**
   - Google AI Studio에서 API 키가 활성화되어 있는지 확인
   - Gemini API가 활성화되어 있는지 확인

4. **쿼터 확인**
   - Google Cloud Console에서 API 사용량 및 쿼터 확인

### 추가 도움이 필요한 경우

- Google AI Studio 문서: https://ai.google.dev/docs
- Gemini API 문서: https://ai.google.dev/gemini-api/docs
