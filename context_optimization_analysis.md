# Context Token 사용 분석 및 최적화 방안

**분석 일시**: 2026-01-26
**현재 상태**: 123k/200k tokens (61% 사용)

---

## 📊 현재 Token 사용 현황

```
총 사용량: 123,000 / 200,000 tokens (61%)
├─ System prompt:      2,400 tokens (1.2%)
├─ System tools:      16,600 tokens (8.3%)
├─ MCP tools:            293 tokens (0.1%)
├─ Messages:         104,900 tokens (52.5%)  ⚠️ 최대 소비
├─ Free space:        31,000 tokens (15.4%)
└─ Autocompact buffer: 45,000 tokens (22.5%)
```

### 🔴 주요 문제점
- **Messages가 전체의 52.5% 차지** (104.9k tokens)
- 장기 대화로 인한 누적 증가
- 코드 파일 반복 읽기

---

## 🔍 Token 낭비 패턴 분석

### 1. **반복적인 파일 읽기**
```javascript
// 같은 파일을 여러 번 읽음
Read tool: excelService.js (offset 158-308)
Read tool: excelService.js (offset 280-380)
Read tool: excelService.js (offset 490-540)
```

**문제**: 파일 내용이 컨텍스트에 중복 저장됨

### 2. **긴 응답 메시지**
- 상세한 설명과 함께 코드 블록 포함
- 예시 코드와 이전 코드를 모두 표시
- 반복적인 "완료했습니다" + 상세 보고

### 3. **불필요한 System Reminders**
```xml
<system-reminder>
Whenever you read a file, you should consider...
</system-reminder>
```
매 파일 읽기마다 추가됨 (약 100 tokens/회)

### 4. **대규모 파일 전체 읽기**
- excelService.js: 약 900줄 파일
- 한 번에 200줄씩 읽으면서 누적

---

## ✅ Token 최적화 전략

### **전략 1: 효율적인 파일 읽기**

#### Before (비효율)
```
1. Read lines 1-200
2. Read lines 200-400
3. Read lines 400-600
→ 같은 내용이 컨텍스트에 중복 저장
```

#### After (효율)
```
1. Grep으로 함수 위치 찾기
2. 해당 함수만 정확히 읽기
3. Edit으로 직접 수정
→ 필요한 부분만 저장
```

**예시**:
```bash
# Bad: 전체 파일 읽기
Read(file_path, offset=0, limit=200)
Read(file_path, offset=200, limit=200)

# Good: 필요한 부분만 찾기
Grep(pattern="function createCoverSheet", output_mode="content", -n=true)
Read(file_path, offset=161, limit=50)  # 함수만
```

**예상 절감**: ~30% (30k tokens)

---

### **전략 2: 간결한 응답**

#### Before (장황)
```
완료했습니다! 에이전트가 문제를 해결했습니다.

## 📋 작업 완료 보고

### 🔍 문제 원인
**기존 방식**...
[긴 설명]

### ✅ 해결 방법
[코드 예시]

### 🎯 핵심 개선
1. ✅ 항목1
2. ✅ 항목2
...
```
**Token**: ~500

#### After (간결)
```
수정 완료:
1. 로고 좌측 상단 이동 (col: 0.3)
2. 공급자 정보 E-H열 병합 + 좌측 정렬
3. 2D 레이아웃 원본 비율 유지 (tl+ext)

서버 재시작 후 확인하세요.
```
**Token**: ~100

**예상 절감**: ~20% (20k tokens)

---

### **전략 3: Task Tool 활용**

현재는 대화로만 진행하지만, Task Tool을 사용하면:

```javascript
// 작업 목록 생성
TaskCreate({
  subject: "Excel 표지 로고 위치 조정",
  description: "좌측 상단으로 이동, 크기 120pt"
})

TaskCreate({
  subject: "상세견적서 공급자 정보 레이아웃",
  description: "E-H열 병합, 좌측 정렬"
})

// 진행 상황만 간단히 보고
TaskUpdate(taskId: "1", status: "completed")
```

**장점**:
- 진행 상황을 구조화
- 반복 설명 불필요
- 컨텍스트 절약

**예상 절감**: ~10% (10k tokens)

---

### **전략 4: 주기적인 컨텍스트 정리**

```bash
# 60% 도달 시 자동 요약
/compact

# 또는 수동으로 새 대화 시작
```

**현재**: 61% 도달 → **지금 정리 필요**

---

### **전략 5: Sub-Agent 활용**

대규모 작업은 별도 에이전트에게 위임:

```javascript
Task({
  subagent_type: "general-purpose",
  description: "Excel image centering fix",
  prompt: "간결한 지시문"
})
```

**장점**:
- 메인 대화와 분리
- 에이전트 작업은 압축된 결과만 전달
- 메인 컨텍스트 보호

**예상 절감**: 대규모 작업 시 ~40%

---

## 🎯 즉시 실행 가능한 최적화

### 1. **지금 당장 실행**
```bash
/compact
```
→ 기존 대화 요약하여 30-40k tokens 절약

### 2. **다음 작업부터 적용**

#### 파일 수정 시:
```javascript
// ❌ 비효율
Read(file_path, offset=0, limit=200)
Read(file_path, offset=200, limit=200)
Edit(...)

// ✅ 효율
Grep(pattern="function_name")  // 위치 찾기
Read(file_path, offset=X, limit=50)  // 최소한만
Edit(...)  // 직접 수정
```

#### 응답 작성 시:
```
❌ 긴 보고서 + 코드 예시 + 이전/이후 비교
✅ 핵심만: "수정 완료: 1) 항목1, 2) 항목2. 재시작하세요."
```

#### Task 관리:
```javascript
// 복잡한 작업 시
TaskCreate()  // 작업 목록화
TaskUpdate()  // 간단히 상태만
```

### 3. **예방 전략**

- **파일 크기 확인**: 500줄 이상이면 Grep 먼저
- **중복 읽기 방지**: 이미 읽은 내용은 기억에 의존
- **응답 길이 제한**: 핵심만 3-5줄로

---

## 📈 예상 효과

| 전략 | 절감 예상 | 적용 난이도 |
|------|----------|-----------|
| /compact 실행 | 30-40k (25-33%) | ⭐ 매우 쉬움 |
| 효율적 파일 읽기 | 20-30k (16-25%) | ⭐⭐ 쉬움 |
| 간결한 응답 | 15-20k (12-16%) | ⭐⭐ 쉬움 |
| Task Tool 활용 | 10-15k (8-12%) | ⭐⭐⭐ 보통 |
| Sub-Agent 위임 | 20-30k (16-25%) | ⭐⭐⭐ 보통 |

**총 절감 가능량**: **최대 95-135k tokens (77-110%)**

---

## 🚀 실행 계획

### Phase 1: 즉시 (지금)
1. `/compact` 실행 → 30-40k 절약
2. 새 대화에서 효율적 패턴 적용

### Phase 2: 다음 작업부터
1. 파일 읽기 전 Grep으로 위치 찾기
2. 응답은 3-5줄로 요약
3. 복잡한 작업은 Task Tool 사용

### Phase 3: 습관화
1. 50% 도달 시마다 /compact
2. 불필요한 상세 설명 자제
3. Sub-Agent 적극 활용

---

## 💡 베스트 프랙티스

### ✅ 효율적인 대화 예시
```
User: "excelService.js에서 createCoverSheet 함수 수정해"

Agent:
  Grep(pattern="createCoverSheet")  // 함수 위치 찾기
  Read(file_path, offset=161, limit=80)  // 필요한 부분만
  Edit(...)  // 수정
  "완료. 재시작하세요."  // 간결한 응답
```

### ❌ 비효율적인 대화 예시
```
User: "excelService.js에서 createCoverSheet 함수 수정해"

Agent:
  Read(file_path, offset=0, limit=200)  // 처음부터
  Read(file_path, offset=200, limit=200)  // 계속 읽기
  Read(file_path, offset=400, limit=200)  // 또 읽기
  "완료했습니다! 에이전트가... [500줄 보고서]"
```

---

## 🎓 학습된 교훈

### 이번 세션에서 발견한 패턴

1. **반복 읽기 문제**
   - 같은 파일을 8-10회 읽음
   - 누적 token: ~8,000

2. **상세한 보고서**
   - 매 작업마다 긴 보고서 작성
   - 평균 400-500 tokens/응답
   - 총 20회 → 8,000-10,000 tokens

3. **System Reminders**
   - 파일 읽기마다 추가되는 경고
   - 누적 ~2,000 tokens

**총 낭비**: ~18,000-20,000 tokens (14-16%)

---

## 📝 결론

### 현재 상태
- 123k/200k (61%) 사용
- Messages가 52.5% 차지
- 최적화 여지 충분

### 권장 조치
1. **지금 즉시**: `/compact` 실행
2. **다음부터**: Grep → Read(최소) → Edit 패턴
3. **응답**: 핵심만 3-5줄
4. **주기적**: 50% 도달 시마다 정리

### 기대 효과
- **즉시**: 30-40k 절약 (25-33%)
- **장기**: 60-90k 절약 (50-75%)
- **지속 가능한 대화** 유지 가능

---

## 🔧 구현 체크리스트

### 매 작업 시
- [ ] 파일 읽기 전 Grep으로 위치 확인
- [ ] 필요한 최소 범위만 Read
- [ ] 응답은 핵심만 3-5줄
- [ ] 불필요한 코드 예시 제거

### 주기적
- [ ] 50% 도달 시 /compact
- [ ] 대규모 작업은 Sub-Agent 활용
- [ ] Task Tool로 작업 구조화

### 모니터링
- [ ] /context로 주기적 확인
- [ ] 60% 넘으면 즉시 조치
- [ ] 패턴 분석 및 개선

---

**작성일**: 2026-01-26
**다음 리뷰**: 작업 완료 후 또는 60% 재도달 시
**버전**: 1.0