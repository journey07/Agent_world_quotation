# Git 히스토리에서 유출된 API 키 제거 가이드

## ⚠️ 중요: 유출된 키는 이미 공개되었습니다

Git 히스토리에 키가 커밋되었다면, 이미 공개된 것으로 간주해야 합니다.
**즉시 Google Cloud Console에서 해당 키를 삭제/비활성화하고 새 키를 생성하세요.**

## Git 히스토리에서 키 제거 방법

### 방법 1: git filter-branch 사용 (권장)

```bash
cd /Users/Injeon/Desktop/IJ/coding/Agent/world_quotation

# 1. 백업 생성
git clone --mirror . ../world_quotation-backup.git

# 2. Git 히스토리에서 키 제거
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/src/services/geminiService.js" \
  --prune-empty --tag-name-filter cat -- --all

# 3. 파일을 다시 추가 (환경 변수 버전)
git checkout HEAD -- backend/src/services/geminiService.js
git add backend/src/services/geminiService.js
git commit -m "Restore geminiService.js with environment variable"

# 4. 히스토리 정리
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### 방법 2: BFG Repo-Cleaner 사용 (더 빠름)

```bash
# 1. BFG 다운로드
# https://rtyley.github.io/bfg-repo-cleaner/

# 2. 키가 포함된 파일 내용을 환경 변수 버전으로 교체
# (이미 환경 변수 버전이므로, 단순히 히스토리에서 제거)

# 3. BFG 실행
java -jar bfg.jar --replace-text passwords.txt backend/src/services/geminiService.js

# passwords.txt 내용:
# YOUR_LEAKED_API_KEY==>GEMINI_API_KEY_REMOVED
```

### 방법 3: 새 저장소로 마이그레이션 (가장 안전)

```bash
# 1. 현재 코드를 새 저장소로 복사
cd ..
git clone world_quotation world_quotation-clean
cd world_quotation-clean

# 2. Git 히스토리 초기화
rm -rf .git
git init
git add .
git commit -m "Initial commit (cleaned history)"

# 3. 원격 저장소 연결 및 강제 푸시
git remote add origin <your-repo-url>
git push -f origin main
```

## ⚠️ 주의사항

1. **협업 중이라면**: 팀원들에게 미리 알리고 함께 작업해야 합니다.
2. **원격 저장소**: 히스토리를 수정한 후 `git push --force`가 필요합니다.
3. **포크/클론**: 다른 사람이 이미 저장소를 클론했다면, 그들의 로컬에도 키가 남아있을 수 있습니다.
4. **키 회전**: 히스토리 정리와 별개로 **반드시 새 키를 생성**해야 합니다.

## 확인 방법

```bash
# 히스토리에서 키가 완전히 제거되었는지 확인
git log --all --full-history -p -S "AIzaSyAHVTA7-9gasYw_il_XrDKTpySyFxZRW6Q"

# 결과가 없어야 합니다!
```

## 추가 보안 조치

1. ✅ `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
2. ✅ `pre-commit` 훅으로 키 패턴 검사 추가
3. ✅ GitHub Secret Scanning 활성화
4. ✅ 정기적으로 `git-secrets` 같은 도구로 스캔
