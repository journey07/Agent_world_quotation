---
name: test-quote
description: 로컬 견적 API를 테스트합니다. /test-quote 또는 /test-quote [열] [단]으로 호출합니다.
---

# Test Quote

견적 계산 API를 샘플 데이터로 테스트합니다.

## 실행 절차

1. 백엔드 헬스체크 (`curl http://localhost:3001/health`)
2. 실패 시 `npm run dev:backend` 안내
3. `/api/quote/calculate` POST 요청
4. 응답의 breakdown, total 검증
5. 결과 요약 출력

## 입력

- `columns`: 열 수 (기본값: 4)
- `tiers`: 단 수 (기본값: 6)
- `region`: 지역 (기본값: seoul)

## 출력

- API 응답 상태
- 총 가격 (total)
- 주요 breakdown 항목

## 예시

```
/test-quote
/test-quote 5 8
/test-quote 제주
```
