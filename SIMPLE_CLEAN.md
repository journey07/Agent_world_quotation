# 🧹 Git 히스토리에서 API 키 제거 (간단 버전)

## ⚠️ 중요 사전 준비

1. **백업 생성** (필수!)
2. **Google Cloud Console에서 유출된 키 삭제** (필수!)
3. **새 API 키 생성 준비**

---

## 방법 1: 스크립트 자동 실행 (추천)

```bash
cd /Users/Injeon/Desktop/IJ/coding/Agent/world_quotation
./clean_history.sh
```

스크립트가 자동으로:
- 백업 생성
- 히스토리에서 키 제거
- 정리 작업 수행

---

## 방법 2: 수동으로 단계별 실행

### 1단계: 백업 생성
```bash
cd /Users/Injeon/Desktop/IJ/coding/Agent/world_quotation
git clone --mirror . ../world_quotation-backup-$(date +%Y%m%d)
```

### 2단계: 히스토리에서 키 제거
```bash
# 현재 파일 백업
cp backend/src/services/geminiService.js /tmp/geminiService.js.backup

# 히스토리에서 파일 제거
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/src/services/geminiService.js" \
  --prune-empty --tag-name-filter cat -- --all

# 파일 복원 (환경 변수 버전)
git checkout HEAD -- backend/src/services/geminiService.js
git add backend/src/services/geminiService.js
git commit -m "Restore geminiService.js (cleaned)"
```

### 3단계: 히스토리 정리
```bash
# 임시 참조 제거
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d

# Reflog 정리
git reflog expire --expire=now --all

# 가비지 컬렉션
git gc --prune=now --aggressive
```

### 4단계: 확인
```bash
# 키가 완전히 제거되었는지 확인
git log --all --full-history -p -S "YOUR_LEAKED_API_KEY"
# 결과가 없어야 합니다!
```

### 5단계: GitHub에 푸시
```bash
# ⚠️ 주의: force push는 협업 중이라면 팀원에게 미리 알려야 합니다!
git push --force origin main
# 또는 현재 브랜치 이름
git push --force origin $(git branch --show-current)
```

---

## 방법 3: 새 히스토리로 시작 (가장 간단, 히스토리 손실)

만약 히스토리를 유지할 필요가 없다면:

```bash
cd /Users/Injeon/Desktop/IJ/coding/Agent/world_quotation

# 새 orphan 브랜치 생성 (히스토리 없음)
git checkout --orphan clean-main

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit (cleaned - removed API keys from history)"

# 기존 main 브랜치 백업
git branch -m main old-main

# 새 브랜치를 main으로
git branch -m clean-main main

# GitHub에 강제 푸시
git push --force origin main
```

---

## ✅ 완료 후 체크리스트

- [ ] Git 히스토리에서 키 제거 확인
- [ ] Google Cloud Console에서 유출된 키 삭제
- [ ] 새 API 키 생성
- [ ] `.env` 파일에 새 키 추가
- [ ] GitHub에 force push 완료
- [ ] 협업자들에게 알림 (필요시)

---

## 🆘 문제 발생 시

백업에서 복원:
```bash
cd ..
rm -rf world_quotation
git clone world_quotation-backup-YYYYMMDD world_quotation
```
