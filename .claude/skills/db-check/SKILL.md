---
name: db-check
description: Supabase DB 상태를 확인합니다. /db-check로 테이블 목록과 스키마를 조회합니다.
---

# Database Check

Supabase 데이터베이스 상태를 MCP로 확인합니다.

## 실행 절차

1. `mcp__supabase__list_projects` - 프로젝트 ID 확인
2. `mcp__supabase__list_tables` - 테이블 목록 조회
3. 필요시 `mcp__supabase__execute_sql` - 상세 스키마/데이터 조회
4. 결과 요약

## 입력

- `tables`: 테이블 목록만
- `[테이블명]`: 특정 테이블 상세
- `schema`: 전체 스키마

## 출력

- 테이블 목록
- 컬럼 구조 (이름, 타입)
- 데이터 건수

## 예시

```
/db-check
/db-check tables
/db-check users
```
