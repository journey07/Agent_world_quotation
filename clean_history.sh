#!/bin/bash

# Git 히스토리에서 API 키 제거 스크립트
# ⚠️ 주의: 이 스크립트는 Git 히스토리를 영구적으로 수정합니다!

set -e

echo "🔍 현재 상태 확인..."
git status

echo ""
echo "⚠️  경고: 이 작업은 Git 히스토리를 영구적으로 수정합니다!"
echo "⚠️  진행하기 전에 반드시 백업을 만드세요!"
echo ""
read -p "계속하시겠습니까? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "취소되었습니다."
    exit 1
fi

echo ""
echo "📦 백업 생성 중..."
BACKUP_DIR="../world_quotation-backup-$(date +%Y%m%d-%H%M%S)"
git clone --mirror . "$BACKUP_DIR"
echo "✅ 백업 완료: $BACKUP_DIR"

echo ""
echo "🧹 Git 히스토리에서 API 키 제거 중..."

# 방법 1: git filter-branch로 특정 파일의 특정 내용만 제거
# (더 복잡하지만 히스토리 구조 유지)

# 방법 2: 해당 파일을 완전히 제거하고 다시 추가 (더 간단)
# 현재 버전의 파일을 저장
cp backend/src/services/geminiService.js /tmp/geminiService.js.backup

# 히스토리에서 해당 파일 제거
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/src/services/geminiService.js" \
  --prune-empty --tag-name-filter cat -- --all

# 파일을 다시 추가 (현재 환경 변수 버전)
git checkout HEAD -- backend/src/services/geminiService.js 2>/dev/null || \
  cp /tmp/geminiService.js.backup backend/src/services/geminiService.js

git add backend/src/services/geminiService.js
git commit -m "Restore geminiService.js with environment variable (cleaned)" || echo "이미 최신 상태입니다."

echo ""
echo "🧹 히스토리 정리 중..."
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d 2>/dev/null || true
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ 완료!"
echo ""
echo "🔍 확인: 히스토리에서 키 검색..."
if git log --all --full-history -p -S "YOUR_LEAKED_API_KEY" | grep -q "YOUR_LEAKED"; then
    echo "❌ 아직 키가 남아있습니다!"
else
    echo "✅ 키가 완전히 제거되었습니다!"
fi

echo ""
echo "📤 다음 단계:"
echo "   1. git push --force origin main  (또는 현재 브랜치)"
echo "   2. Google Cloud Console에서 유출된 키 삭제"
echo "   3. 새 API 키 생성 후 .env 파일 업데이트"
