# UptimeRobot 스핀다운 문제 해결 가이드

## 문제 상황

Render에서 "15분 비활성 후 스핀다운" 메일을 받았지만, UptimeRobot이 설정되어 있다고 생각하는 경우

## 가능한 원인들

### 1. ⚠️ Ping 간격이 너무 길거나 15분에 가까움

**문제:**
- UptimeRobot의 Monitoring Interval이 **15분**으로 설정되어 있으면, 타이밍에 따라 15분을 넘길 수 있습니다
- Render는 정확히 15분 비활성 시 스핀다운하므로, 15분 간격은 위험합니다

**해결:**
- ✅ **5분 간격**으로 설정 (무료 플랜 최소값)
- ✅ 또는 **10분 간격**으로 설정 (더 안전)

**확인 방법:**
1. UptimeRobot 대시보드 접속
2. 해당 모니터 클릭
3. "Monitoring Interval" 확인
4. 5분 또는 10분으로 변경

### 2. ⚠️ Ping이 실패하고 있음

**문제:**
- UptimeRobot이 ping을 보내고 있지만, 서버가 응답하지 않거나 오류가 발생
- 네트워크 문제, 타임아웃, 서버 오류 등

**확인 방법:**
1. UptimeRobot 대시보드에서 모니터 상태 확인
   - 🟢 "Up" 상태인지 확인
   - 🔴 "Down" 또는 ⚠️ "Paused" 상태인지 확인
2. UptimeRobot 로그 확인
   - 모니터 클릭 → "Logs" 탭
   - 최근 ping 성공/실패 기록 확인
   - 실패한 경우 오류 메시지 확인

**해결:**
- Health check 엔드포인트가 제대로 작동하는지 확인
- Render 서비스가 실제로 실행 중인지 확인
- URL이 정확한지 확인 (https://agent-world-quotation.onrender.com/health)

### 3. ⚠️ 모니터가 일시정지(Paused) 상태

**문제:**
- UptimeRobot 모니터가 수동으로 일시정지되었거나
- 무료 플랜 제한으로 인해 일시정지됨

**확인 방법:**
- UptimeRobot 대시보드에서 모니터 상태 확인
- "Paused" 상태라면 "Resume" 클릭

### 4. ⚠️ Render가 요청을 인식하지 못함

**문제:**
- Health check 엔드포인트가 너무 느리거나
- Render가 요청을 "실제 트래픽"으로 인식하지 않음

**해결:**
- Health check 엔드포인트가 빠르게 응답하는지 확인 (< 1초)
- 단순 JSON 응답만 반환하는지 확인

### 5. ⚠️ Render 정책 변경

**문제:**
- Render가 무료 플랜 정책을 변경했을 수 있음
- 또는 특정 패턴의 요청을 "keep-alive"로 간주하여 무시할 수 있음

**해결:**
- Render 공식 문서 확인
- 다른 keep-alive 방법 시도 (cron-job.org, GitHub Actions 등)

## 즉시 확인해야 할 사항

### ✅ 1단계: UptimeRobot 설정 확인

1. **UptimeRobot 대시보드 접속**: https://uptimerobot.com
2. **모니터 목록 확인**
   - `agent-world-quotation` 또는 관련 모니터 찾기
3. **모니터 클릭하여 상세 확인**
   - **Status**: 🟢 "Up"인지 확인
   - **Monitoring Interval**: **5분** 또는 **10분**인지 확인
   - **URL**: `https://agent-world-quotation.onrender.com/health` 정확한지 확인
   - **Type**: "HTTP(s)" 인지 확인

### ✅ 2단계: UptimeRobot 로그 확인

1. 모니터 상세 페이지에서 **"Logs"** 탭 클릭
2. 최근 1시간 내 ping 기록 확인
   - ✅ 성공: 녹색 체크마크
   - ❌ 실패: 빨간색 X
3. 실패한 경우 오류 메시지 확인
   - "Connection timeout"
   - "HTTP 500"
   - "DNS resolution failed" 등

### ✅ 3단계: Health Check 엔드포인트 직접 테스트

터미널에서 직접 테스트:

```bash
curl https://agent-world-quotation.onrender.com/health
```

**예상 응답:**
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

**문제가 있다면:**
- 서버가 스핀다운 상태 → Cold start 발생 (1분 정도 대기)
- 오류 응답 → 서버 문제 확인 필요

### ✅ 4단계: Render 로그 확인

1. Render 대시보드 접속
2. `agent-world-quotation` 서비스 클릭
3. **"Logs"** 탭 확인
4. 최근 요청 로그 확인
   - UptimeRobot의 ping 요청이 들어오는지 확인
   - 요청 간격 확인

## 권장 설정

### UptimeRobot 최적 설정

```
Monitor Type: HTTP(s)
URL: https://agent-world-quotation.onrender.com/health
Monitoring Interval: 5 minutes (무료 플랜 최소값)
Alert Contacts: (선택사항)
```

### Health Check 엔드포인트 확인

현재 설정된 엔드포인트:
- `/health` (루트 레벨)
- `/api/quote/health` (라우터 레벨)

둘 다 작동해야 합니다.

## 대안 방법

UptimeRobot이 계속 문제가 있다면:

### 방법 1: cron-job.org 사용

1. https://cron-job.org 가입
2. 새 Cron Job 생성:
   - URL: `https://agent-world-quotation.onrender.com/health`
   - Schedule: `*/10 * * * *` (10분마다)
   - Method: GET

### 방법 2: GitHub Actions 사용

`.github/workflows/keep-alive.yml` 파일 생성:

```yaml
name: Keep Render Alive

on:
  schedule:
    - cron: '*/10 * * * *'  # 10분마다
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Render Service
        run: |
          curl -f https://agent-world-quotation.onrender.com/health || exit 1
```

### 방법 3: Cloudflare Workers

GitHub 프로젝트 사용: https://github.com/ByteTrix/cloudflare-render-ping

## 체크리스트

- [ ] UptimeRobot 모니터가 "Up" 상태인지 확인
- [ ] Monitoring Interval이 5-10분인지 확인
- [ ] URL이 정확한지 확인
- [ ] UptimeRobot 로그에서 최근 ping 성공 기록 확인
- [ ] Health check 엔드포인트 직접 테스트 성공
- [ ] Render 로그에서 요청이 들어오는지 확인
- [ ] 필요시 Monitoring Interval을 5분으로 변경
- [ ] 문제가 계속되면 대안 방법 시도

## 결론

**가장 가능성 높은 원인:**
1. Monitoring Interval이 15분으로 설정되어 있음
2. UptimeRobot 모니터가 일시정지 상태
3. Ping이 실패하고 있지만 모니터링하지 않음

**즉시 조치:**
1. UptimeRobot 설정을 **5분 간격**으로 변경
2. 모니터 상태가 "Up"인지 확인
3. 로그에서 최근 ping 성공 기록 확인
