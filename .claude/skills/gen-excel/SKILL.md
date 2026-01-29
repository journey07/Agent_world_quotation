---
name: gen-excel
description: 테스트용 Excel 견적서를 생성합니다. /gen-excel로 호출하면 샘플 데이터로 Excel 파일을 만듭니다.
---

# Generate Excel

테스트용 Excel 견적서를 생성하고 파일로 저장합니다.

## 실행 절차

1. 백엔드 헬스체크
2. `/api/quote/excel` POST 요청 (샘플 customerInfo 포함)
3. 응답을 `/tmp/test-quote.xlsx`로 저장
4. 파일 존재 확인 (`ls -la`)
5. `open /tmp/test-quote.xlsx` 안내

## 입력

- `columns`, `tiers`: 락커 규격 (기본값: 4열 6단)
- `customerInfo`: 고객 정보 (테스트 데이터 사용)
- `options`: 옵션 설정

## 출력

- `/tmp/test-quote.xlsx` 파일
- 파일 크기, 생성 시간

## 예시

```
/gen-excel
/gen-excel 5 8
```
