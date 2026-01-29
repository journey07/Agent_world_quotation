---
name: skill-creator
description: 새로운 Claude Code skill을 생성합니다. /skill-creator [skill-name] 형태로 호출하면 skill 디렉토리와 SKILL.md 템플릿을 만들어줍니다.
---

# Skill Creator

새로운 skill을 생성할 때 이 가이드를 따릅니다.

## 실행 절차

1. **skill 이름 확인**: 사용자가 제공한 skill 이름을 확인합니다. 없으면 물어봅니다.

2. **용도 파악**: skill이 무엇을 해야 하는지 간단히 물어봅니다.
   - 어떤 상황에서 호출되는지
   - 무엇을 수행하는지
   - 어떤 출력이 필요한지

3. **디렉토리 생성**:
   ```
   .claude/skills/[skill-name]/
   └── SKILL.md
   ```

4. **SKILL.md 작성**: 아래 템플릿을 기반으로 작성합니다.

## SKILL.md 템플릿

```markdown
---
name: [skill-name]
description: [한 문장으로 skill의 용도와 호출 시점을 설명]
---

# [Skill Name]

[skill이 수행하는 작업에 대한 개요]

## 실행 절차

1. [첫 번째 단계]
2. [두 번째 단계]
3. ...

## 입력

- [필요한 입력 파라미터나 컨텍스트]

## 출력

- [생성되는 결과물]

## 예시

[사용 예시가 필요한 경우]
```

## 작성 원칙

### 간결함 우선
- 컨텍스트 윈도우는 공공 자산입니다
- 불필요한 설명 제거
- 핵심 지시사항만 포함

### 명확한 트리거
- description에 언제 이 skill을 사용해야 하는지 명시
- `/skill-name` 또는 `/skill-name [args]` 형태로 호출

### 실행 가능한 단계
- 각 단계는 구체적이고 실행 가능해야 함
- 애매한 지시 대신 명확한 액션

## 이 프로젝트용 skill 아이디어

| Skill | 용도 |
|-------|------|
| `/test-quote` | 샘플 데이터로 견적 API 테스트 |
| `/gen-excel` | 테스트 Excel 파일 생성 |
| `/add-option` | pricing.json에 새 옵션 추가 |
| `/db-check` | Supabase 테이블/데이터 확인 |

## 완료 후

1. skill 디렉토리와 SKILL.md 생성 완료를 알림
2. `/[skill-name]`으로 테스트할 수 있음을 안내
