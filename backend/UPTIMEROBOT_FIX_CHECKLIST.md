# UptimeRobot 문제 해결 체크리스트

## 🔴 현재 상황
- UptimeRobot 대시보드는 "Up" 상태로 표시
- 하지만 Render 로그에 `GET /health` 요청이 없음
- Render가 15분 비활성 후 스핀다운됨

## ✅ 즉시 확인할 사항

### 1. UptimeRobot 모니터 설정 확인

**확인 사항:**
- [ ] Monitor Type이 **"HTTP(s)"** 인지 확인 (Ping이 아님!)
- [ ] URL이 정확히 `https://agent-world-quotation.onrender.com/health` 인지 확인
- [ ] Monitoring Interval이 **5분**으로 설정되어 있는지 확인
- [ ] 모니터 상태가 **"Up"**이고 **"Paused"**가 아닌지 확인

**주의:** 
- Monitor Type이 "Ping"으로 설정되어 있으면 작동하지 않습니다!
- 반드시 "HTTP(s)" 타입이어야 합니다.

### 2. UptimeRobot 로그 확인

1. UptimeRobot 대시보드에서 모니터 클릭
2. **"Logs"** 탭 확인
3. 최근 1시간 내 ping 기록 확인:
   - ✅ 성공: 녹색 체크마크
   - ❌ 실패: 빨간색 X
4. 실패한 경우 오류 메시지 확인:
   - "Connection timeout"
   - "HTTP 500"
   - "DNS resolution failed"
   - "SSL certificate error"

### 3. Health Check 엔드포인트 직접 테스트

터미널에서 직접 테스트:

```bash
curl -v https://agent-world-quotation.onrender.com/health
```

**예상 응답:**
```json
{"status":"ok","timestamp":"2024-01-15T14:00:00.000Z"}
```

**문제가 있다면:**
- 서버가 스핀다운 상태 → Cold start 발생 (1분 정도 대기)
- 오류 응답 → 서버 문제 확인 필요

### 4. Render 로그에서 UptimeRobot 확인

코드를 업데이트했으므로, 이제 Render 로그에서:
- `🤖 UPTIMEROBOT` 표시가 보이면 → UptimeRobot이 실제로 ping을 보내고 있음
- `GET /health` 요청이 보이면 → Health check 요청이 들어오고 있음
- 둘 다 없으면 → UptimeRobot이 실제로 ping을 보내지 않음

## 🔧 해결 방법

### 방법 1: UptimeRobot 모니터 재설정

1. **기존 모니터 삭제**
2. **새 모니터 생성:**
   - Monitor Type: **HTTP(s)** (중요!)
   - Friendly Name: `Agent World Quotation Health`
   - URL: `https://agent-world-quotation.onrender.com/health`
   - Monitoring Interval: **5 minutes**
   - Alert Contacts: (선택사항)

### 방법 2: UptimeRobot 모니터 수정

1. 기존 모니터 클릭 → "Edit" 버튼
2. 다음 사항 확인:
   - Monitor Type: **HTTP(s)** 확인
   - URL: `https://agent-world-quotation.onrender.com/health` 정확한지 확인
   - Monitoring Interval: **5 minutes** 확인
3. "Save" 클릭

### 방법 3: 대안 서비스 사용

UptimeRobot이 계속 문제가 있다면:

#### cron-job.org 사용
1. https://cron-job.org 가입
2. 새 Cron Job 생성:
   - URL: `https://agent-world-quotation.onrender.com/health`
   - Schedule: `*/10 * * * *` (10분마다)
   - Method: GET

#### GitHub Actions 사용
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

## 📊 확인 방법

### Render 로그에서 확인할 내용

코드 업데이트 후, Render 로그에서 다음을 확인:

1. **UptimeRobot ping이 오는 경우:**
   ```
   [2024-01-15T14:00:00.000Z] GET /health | IP: xxx.xxx.xxx.xxx | UA: UptimeRobot/2.0 🤖 UPTIMEROBOT
   ✅ UptimeRobot ping received from xxx.xxx.xxx.xxx at 2024-01-15T14:00:00.000Z
   ```

2. **일반 요청인 경우:**
   ```
   [2024-01-15T14:00:00.000Z] GET /health | IP: xxx.xxx.xxx.xxx | UA: Mozilla/5.0...
   ```

3. **요청이 없는 경우:**
   - 아무 로그도 없음 → UptimeRobot이 ping을 보내지 않음

## ⚠️ 주의사항

1. **Monitor Type 확인 필수:**
   - ❌ "Ping" 타입 → 작동하지 않음
   - ✅ "HTTP(s)" 타입 → 작동함

2. **URL 정확성:**
   - `https://agent-world-quotation.onrender.com/health` (정확)
   - `https://agent-world-quotation.onrender.com` (부정확 - /health 없음)
   - `http://agent-world-quotation.onrender.com/health` (부정확 - http가 아님)

3. **Monitoring Interval:**
   - 5분: 안전 (권장)
   - 10분: 안전
   - 15분: 위험 (타이밍에 따라 15분을 넘길 수 있음)

## 🎯 다음 단계

1. [ ] 코드 변경사항 배포 (이미 완료)
2. [ ] UptimeRobot 모니터 설정 확인
3. [ ] UptimeRobot 로그에서 최근 ping 성공/실패 확인
4. [ ] Render 로그에서 `🤖 UPTIMEROBOT` 표시 확인
5. [ ] 10-15분 대기 후 Render 로그 다시 확인
6. [ ] 문제가 계속되면 모니터 재설정 또는 대안 서비스 사용

## 📝 참고

- Render 무료 플랜: 15분 비활성 시 스핀다운
- UptimeRobot 무료 플랜: 5분 간격 (최소값)
- Health check 엔드포인트: `/health` (루트 레벨)
