# World Quotation Project

B2B 락커 견적 시스템 - 고객 문의 기반 견적 계산 → 2D 레이아웃 → 3D 설치사진 → Excel 견적서

---

## Claude 행동 규칙

### 프롬프트 저장 (CRITICAL)
**사용자의 모든 프롬프트를 `prompt.md` 파일에 저장할 것.**

- 사용자가 새 프롬프트를 입력할 때마다 `prompt.md`에 append
- 형식: 타임스탬프 + 프롬프트 내용
- 파일 위치: 프로젝트 루트 (`/Users/Injeon/Desktop/IJ/coding/Agent/world_quotation/prompt.md`)

### CSS/Flexbox 규칙 (CRITICAL)
**Flex 레이아웃에서 요소가 찌그러지거나 줄바꿈되는 문제 방지:**

1. **버튼/라벨 텍스트 줄바꿈 방지**
   ```css
   white-space: nowrap;  /* 필수 - 텍스트 한 줄 유지 */
   ```

2. **Flex 자식 요소 축소 방지**
   ```css
   flex-shrink: 0;  /* 필수 - 공간 부족해도 축소 안 함 */
   ```

3. **Input 너비 지정**
   ```css
   /* BAD - 남은 공간 다 차지하려 해서 다른 요소 압박 */
   min-width: 160px;

   /* GOOD - 고정 너비로 예측 가능한 레이아웃 */
   width: 140px;
   ```

4. **컨테이너 너비 인식**
   - `option-group` 등 제한된 컨테이너 안에 넣으면 너비 제한됨
   - 전체 너비 필요한 요소는 상위 컨테이너 밖으로 배치

5. **인라인 요소 그룹 패턴**
   ```css
   .inline-group {
     display: flex;
     align-items: center;
     gap: 10px;
   }
   .inline-group > * {
     flex-shrink: 0;      /* 모든 자식 축소 방지 */
     white-space: nowrap; /* 텍스트 줄바꿈 방지 */
   }
   ```

## 프로젝트 개요

```
[고객 문의] → [옵션 선택] → [가격 계산] → [2D 그리드] → [3D 렌더링] → [Excel 견적서]
```

## 프로젝트 구조

```
world_quotation/
├── frontend/                    # React + Vite (port 5174)
│   └── src/
│       ├── App.jsx              # 메인 UI (1675줄) ⚠️ 대용량
│       └── components/          # Login, WorkflowModal 등
├── backend/                     # Express (Vercel serverless)
│   ├── config/
│   │   └── pricing.json         # 💰 가격/옵션 설정
│   └── src/
│       ├── services/
│       │   ├── pricingService.js    # 가격 계산 로직
│       │   ├── excelService.js      # Excel 생성 (937줄) ⚠️ 대용량
│       │   ├── imageService.js      # 2D 그리드 렌더링
│       │   └── geminiService.js     # 3D AI 렌더링
│       └── routes/
│           └── quote.js             # 견적 API 라우트
├── database/                    # Supabase 스키마
└── package.json                 # 루트 (동시 실행)
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 19, Vite, styled-components |
| Backend | Node.js, Express, Vercel Serverless |
| Database | Supabase (PostgreSQL + RLS) |
| AI | Google Gemini (3D 설치 이미지 생성) |
| 문서 생성 | ExcelJS, PDFKit, Canvas/Jimp |

## 주요 명령어

```bash
npm run install:all    # 전체 의존성 설치
npm run dev            # 프론트 + 백엔드 동시 실행
npm run dev:backend    # 백엔드만 (localhost:3001)
npm run dev:frontend   # 프론트만 (localhost:5174)
```

---

## Skills

프로젝트 전용 Claude Code skills (`.claude/skills/`)

| Skill | 용도 | 호출 예시 |
|-------|------|-----------|
| `/skill-creator` | 새 skill 생성 | `/skill-creator my-skill` |
| `/test-quote` | 견적 API 테스트 | `/test-quote 5 8` |
| `/gen-excel` | Excel 견적서 생성 | `/gen-excel` |
| `/add-option` | 새 옵션 추가 가이드 | `/add-option 손잡이` |
| `/db-check` | Supabase DB 확인 | `/db-check users` |
| `/ui-ux-pro-max` | UI/UX 디자인 가이드 | UI 작업 시 자동 참조 |

### ⚠️ UI/UX 작업 필수 규칙 (CRITICAL)

**UI/UX 관련 작업 시 아무리 작은 변경이라도 반드시 `/ui-ux-pro-max` 스킬을 먼저 호출할 것.**

적용 대상 (예외 없음):
- 스타일링 변경 (색상, 폰트, 간격, 정렬 등)
- 레이아웃 수정
- 컴포넌트 추가/수정
- CSS 변경
- 반응형 조정
- 호버/포커스 상태

이 스킬은 다음을 포함:
- 컴포넌트 사이징 (버튼, 인풋 등)
- 스페이싱 스케일 (4px, 8px, 12px, 16px, 24px, 32px)
- 색상 대비 및 접근성 규칙
- 호버/포커스 상태 가이드라인
- 레이아웃 및 반응형 체크리스트
- 아이콘 사용 규칙 (이모지 X, SVG O)

### Skill 구조
```
.claude/skills/[skill-name]/
└── SKILL.md
```

### SKILL.md 템플릿
```markdown
---
name: [skill-name]
description: [용도와 호출 시점]
---
# [Title]
[개요]
## 실행 절차
## 입력
## 출력
## 예시
```

---

## 옵션 체계

### 현재 구현됨
| 옵션 | 값 | 가격 영향 |
|------|-----|----------|
| 재료 | steel, stainless, plastic | 배수 (1.0, 1.5, 0.8) |
| 색상 | standard, custom | +0원, +5,000원/셀 |
| 수량 할인 | 10+, 25+, 50+ | -5%, -10%, -15% |

### 고도화 예정
| 옵션 | 예상 값 | 설명 |
|------|---------|------|
| 색상 확장 | 화이트, 그레이, 블랙, RAL커스텀 | 세분화된 색상 |
| 손잡이 | on / off | 손잡이 유무 |
| 제어부 타입 | 키패드, 카드, 지문, QR, 기계식 | 잠금장치 종류 |
| 칸 구성 | 균등, 2:1, 1:2, 커스텀 | 행별 높이 비율 |
| 도어 타입 | 일반, 유리, 메쉬 | 문 재질 |

---

## 가격 계산 로직

### 핵심 파일
- `backend/config/pricing.json` - 가격 데이터
- `backend/src/services/pricingService.js` - 계산 로직

### 계산 공식
```
셀 가격 = basePricePerCell × 재료배수 + 색상추가비
총 가격 = (셀 가격 × 셀 수) × (1 - 수량할인)
최종가 = 총 가격 + 제어부비 + 설치비
```

### pricing.json 구조
```json
{
  "basePricePerCell": 25000,
  "materialModifiers": { "steel": 1.0, "stainless": 1.5, "plastic": 0.8 },
  "colorModifiers": { "standard": 0, "custom": 5000 },
  "quantityDiscounts": [
    { "minQty": 10, "discount": 0.05 },
    { "minQty": 25, "discount": 0.10 },
    { "minQty": 50, "discount": 0.15 }
  ]
}
```

---

## Excel 견적서 구조

### 현재 구조 (excelService.js)
- 회사 정보 헤더
- 고객 정보
- 견적 요약 (수량, 단가, 총액)
- 기본 할인 표시

### 고도화 목표
```
[헤더] 회사 로고, 견적번호, 발행일
[고객] 상호명, 담당자, 연락처
[제품] 모델명, 규격 (열×단)
[옵션 상세]
  - 재료: ○○ (+XX원)
  - 색상: ○○ (+XX원)
  - 제어부: ○○ (+XX원)
  - 손잡이: ○○
  - 칸 구성: ○○
[가격 내역]
  - 본체: XXX원
  - 옵션: XXX원
  - 설치비: XXX원
  - 할인: -XXX원
  - 합계: XXX원
[2D 레이아웃 이미지]
[3D 설치 이미지]
[약관/조건]
```

---

## API 엔드포인트

### 인증 (`/api/auth`)
- `POST /login` - 로그인
- `GET /verify` - 세션 확인

### 견적 (`/api/quote`)
- `POST /calculate` - 가격 계산
- `POST /excel` - Excel 생성 ⭐ 핵심
- `POST /pdf` - PDF 생성
- `POST /preview-image` - 2D 그리드 미리보기
- `POST /generate-3d-installation` - AI 3D 렌더링

---

## 파일 수정 가이드

### 옵션 추가 시
1. `pricing.json` - 새 옵션 데이터 추가
2. `pricingService.js` - 계산 로직 수정
3. `App.jsx` - UI 컴포넌트 추가
4. `excelService.js` - 견적서 출력 반영

### Excel 양식 수정 시
- `excelService.js` 937줄 → offset/limit으로 부분 읽기
- 주요 섹션:
  - 1~100줄: 헤더/설정
  - 100~300줄: 회사/고객 정보
  - 300~600줄: 가격 테이블
  - 600~900줄: 이미지 삽입/스타일링

### 대용량 파일 읽기
```
Read file_path offset=0 limit=100    # 첫 100줄
Read file_path offset=300 limit=100  # 300~400줄
```

---

## 환경 변수

### Backend (.env)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
DASHBOARD_API_URL
ALLOWED_ORIGINS
```

### Frontend (.env)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_URL
VITE_API_3D_URL
```

---

## 배포

| 컴포넌트 | 플랫폼 | 도메인 |
|----------|--------|--------|
| Frontend | Vercel | agent-world-quotation.vercel.app |
| Backend | Vercel | (API routes, ICN1 Seoul) |
| Custom | - | wl-agent1.supersquad.kr |

---

## 고도화 로드맵

### Phase 1: 옵션 데이터 구조
- [ ] pricing.json 확장 (제어부, 손잡이, 칸구성)
- [ ] Supabase 옵션 테이블 (필요시)

### Phase 2: 프론트엔드 UI
- [ ] 옵션 선택 컴포넌트
- [ ] 실시간 가격 미리보기

### Phase 3: 가격 계산
- [ ] pricingService.js 로직 확장
- [ ] 옵션별 가격 breakdown

### Phase 4: Excel 양식
- [ ] 옵션 상세 섹션 추가
- [ ] 레이아웃 개선
- [ ] 이미지 배치 최적화

---

## 코딩 컨벤션

- Backend: ES Modules (`import/export`)
- Frontend: React functional components + hooks
- 스타일: styled-components
- 에러 처리: try-catch + HTTP status
- 가격: 원 단위, 천단위 콤마 표시

## Git

- `main` - 프로덕션
- PR 생성 시 `main` 기준
