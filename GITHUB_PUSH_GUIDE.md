# GitHub 푸시 가이드

## 🎯 왜 GitHub에 먼저 올려야 하나요?

**Vercel과 Render는 모두 GitHub 저장소와 연결해서 배포합니다!**

- Vercel: GitHub 저장소 연결 → 자동 배포
- Render: GitHub 저장소 연결 → 자동 배포

따라서 **배포 전에 반드시 GitHub에 코드를 푸시**해야 합니다!

## 📋 현재 상태

### Git 저장소 확인
```bash
cd /Users/Injeon/Desktop/IJ/coding/Agent/world_quotation
git status
```

### GitHub Remote 확인
- 저장소: `https://github.com/journey07/world_quotation-agent.git`
- 이미 연결되어 있음 ✅

## 🚀 푸시 단계

### 1. 변경사항 확인
```bash
git status
```

**현재 변경사항:**
- ✅ Backend: `render.yaml`, `vercel.json`, CORS 설정 수정
- ✅ Frontend: `vercel.json`, 환경 변수 설정
- ✅ 문서: 배포 가이드 등

### 2. 모든 파일 추가
```bash
# 모든 변경사항 추가
git add .
```

**또는 선택적으로:**
```bash
# Backend 관련
git add backend/

# Frontend 관련
git add frontend/

# 문서
git add DEPLOYMENT_*.md
git add backend/*.md
```

### 3. 커밋 메시지 작성
```bash
git commit -m "feat: Vercel + Render 배포 준비

- Backend: Render 배포 설정 추가 (render.yaml)
- Frontend: Vercel 배포 설정 추가 (vercel.json)
- CORS 설정 개선 (프로덕션 URL 지원)
- 배포 가이드 및 문서 추가"
```

**또는 간단하게:**
```bash
git commit -m "배포 준비: Vercel + Render 설정 추가"
```

### 4. GitHub에 푸시
```bash
git push origin main
```

### 5. GitHub에서 확인
1. 브라우저에서 열기: https://github.com/journey07/world_quotation-agent.git
2. 다음 파일들이 있는지 확인:
   - ✅ `backend/render.yaml`
   - ✅ `frontend/vercel.json`
   - ✅ `DEPLOYMENT_GUIDE.md`
   - ✅ `backend/src/index.js` (CORS 수정)

## ⚠️ 주의사항

### 환경 변수 파일은 올라가지 않습니다!

`.gitignore`에 포함되어 있어서:
- ❌ `backend/.env`
- ❌ `frontend/.env`

이 파일들은 **GitHub에 올라가지 않습니다**. 이는 정상입니다!

**환경 변수는 각 플랫폼에서 직접 설정합니다:**
- Render: Dashboard → Environment Variables
- Vercel: Dashboard → Settings → Environment Variables

### 민감한 정보 확인

다음 정보가 코드에 포함되어 있지 않은지 확인:
- ❌ API 키 (GEMINI_API_KEY 등)
- ❌ 비밀번호
- ❌ 개인 정보

모든 민감한 정보는 환경 변수로 관리합니다!

## ✅ 푸시 완료 후

GitHub에 푸시가 완료되면:

1. **Backend 배포**: Render에서 GitHub 저장소 연결
2. **Frontend 배포**: Vercel에서 GitHub 저장소 연결

자세한 배포 방법은 `DEPLOYMENT_GUIDE.md`를 참고하세요!

## 🐛 문제 해결

### "origin/main"이 없다는 에러
```bash
# 브랜치 확인
git branch

# main 브랜치로 전환
git checkout -b main

# 또는 master 브랜치 사용
git push origin master
```

### 충돌 발생
```bash
# 최신 코드 가져오기
git pull origin main

# 충돌 해결 후
git add .
git commit -m "충돌 해결"
git push origin main
```

### 파일이 너무 큼
```bash
# 큰 파일 확인
git ls-files | xargs ls -lh | sort -k5 -hr | head -10

# .gitignore에 추가 필요할 수 있음
```

## 📝 커밋 메시지 예시

### 좋은 커밋 메시지
```
feat: Vercel + Render 배포 준비

- Backend: Render 배포 설정 추가
- Frontend: Vercel 배포 설정 추가
- CORS 설정 개선
- 배포 가이드 문서 추가
```

### 간단한 커밋 메시지
```
배포 준비 완료
```

### 상세한 커밋 메시지
```
feat: Vercel + Render 배포 준비

Backend:
- render.yaml 추가 (Render 배포 설정)
- CORS 설정 개선 (프로덕션 URL 지원)
- vercel.json 추가 (Vercel Serverless Functions용)

Frontend:
- vercel.json 추가 (Vercel Static Sites 배포 설정)
- 환경 변수 설정 (VITE_API_URL)

문서:
- DEPLOYMENT_GUIDE.md: 배포 가이드
- DEPLOYMENT_STRUCTURE.md: 구조 설명
- RENDER_COLD_START_SOLUTION.md: Cold Start 해결 방법
```

## 🎉 완료!

GitHub에 푸시가 완료되면 다음 단계로 진행하세요:
→ `DEPLOYMENT_GUIDE.md` 참고
