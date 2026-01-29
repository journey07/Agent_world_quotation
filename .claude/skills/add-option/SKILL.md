---
name: add-option
description: 새 견적 옵션을 추가합니다. /add-option [옵션명]으로 호출하면 관련 파일들을 순차적으로 수정합니다.
---

# Add Option

새로운 견적 옵션을 시스템에 추가합니다.

## 실행 절차

1. 옵션 정보 확인 (이름, 타입, 가격, 기본값)
2. `pricingService.js` - PRICING.options에 추가, 계산 로직 수정
3. `App.jsx` - state 추가, UI 컴포넌트 추가
4. `excelService.js` - 견적서 출력에 반영
5. `/test-quote`로 테스트

## 입력

- 옵션 이름 (한글/영문)
- 타입: boolean (on/off) 또는 select (선택형)
- 가격: 고정 금액 또는 셀당 금액
- 기본값

## 출력

- 수정된 파일 목록
- 테스트 결과

## 예시

```
/add-option 손잡이
/add-option 제어부타입
```
