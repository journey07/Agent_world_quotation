# UptimeRobot 405 Method Not Allowed 오류 해결

## 🔴 문제 상황

UptimeRobot을 "Ping"에서 "HTTP"로 변경했더니 **405 Method Not Allowed** 오류가 발생합니다.

**원인:**
- UptimeRobot의 HTTP 모니터는 기본적으로 **HEAD** 메서드를 사용합니다
- 서버의 `/health` 엔드포인트는 **GET**만 지원했기 때문에 405 오류 발생

## ✅ 해결 방법

### 방법 1: 서버에서 HEAD 메서드 지원 (완료 ✅)

코드를 수정하여 HEAD 메서드도 지원하도록 했습니다:
- `/health` 엔드포인트: GET과 HEAD 모두 지원
- `/api/quote/health` 엔드포인트: GET과 HEAD 모두 지원

**이제 HEAD 요청도 정상적으로 처리됩니다!**

### 방법 2: UptimeRobot 설정에서 GET으로 변경 (선택사항)

서버가 HEAD를 지원하므로 필수는 아니지만, 원한다면 UptimeRobot 설정을 변경할 수 있습니다:

1. UptimeRobot 대시보드 접속
2. 모니터 클릭 → **"Edit"** 버튼
3. **"Advanced Settings"** 또는 **"HTTP Method"** 옵션 찾기
4. Method를 **"GET"**으로 변경
5. 저장

**참고:** 일부 UptimeRobot 플랜에서는 HTTP Method를 변경할 수 없을 수 있습니다. 이 경우 서버에서 HEAD를 지원하는 것이 더 나은 해결책입니다.

## 📊 확인 방법

### 1. 서버 로그 확인

코드 배포 후, Render 로그에서 다음을 확인:

**HEAD 요청인 경우:**
```
[2024-01-15T14:00:00.000Z] HEAD /health | IP: xxx.xxx.xxx.xxx | UA: UptimeRobot/2.0 🤖 UPTIMEROBOT
✅ UptimeRobot ping received (HEAD) from xxx.xxx.xxx.xxx at 2024-01-15T14:00:00.000Z
```

**GET 요청인 경우:**
```
[2024-01-15T14:00:00.000Z] GET /health | IP: xxx.xxx.xxx.xxx | UA: UptimeRobot/2.0 🤖 UPTIMEROBOT
✅ UptimeRobot ping received (GET) from xxx.xxx.xxx.xxx at 2024-01-15T14:00:00.000Z
```

### 2. UptimeRobot 대시보드 확인

- 모니터 상태가 **"Up"**으로 변경되었는지 확인
- 최근 로그에서 성공 기록 확인

### 3. 직접 테스트

터미널에서 HEAD 요청 테스트:

```bash
# HEAD 요청 테스트
curl -I https://agent-world-quotation.onrender.com/health

# 예상 응답:
# HTTP/1.1 200 OK
# ...
```

```bash
# GET 요청 테스트
curl https://agent-world-quotation.onrender.com/health

# 예상 응답:
# {"status":"ok","timestamp":"2024-01-15T14:00:00.000Z"}
```

## 🎯 다음 단계

1. [x] 서버 코드 수정 (HEAD 메서드 지원 추가)
2. [ ] 코드 배포
3. [ ] UptimeRobot 대시보드에서 상태 확인
4. [ ] Render 로그에서 UptimeRobot ping 확인
5. [ ] 10-15분 후에도 서비스가 스핀다운되지 않는지 확인

## 📝 참고사항

### HTTP 메서드 차이

- **GET**: 리소스를 가져올 때 사용, 응답 body 포함
- **HEAD**: GET과 동일하지만 응답 body 없음, 헤더만 확인
- **POST**: 데이터를 전송할 때 사용

### UptimeRobot의 기본 동작

- **HTTP(s) 모니터**: 기본적으로 HEAD 메서드 사용 (더 효율적)
- **Ping 모니터**: ICMP ping 사용 (HTTP 엔드포인트에는 작동하지 않음)

### 왜 HEAD를 사용하나?

- HEAD 메서드는 응답 body가 없어서 더 빠르고 효율적
- 헤더만 확인하면 되므로 네트워크 대역폭 절약
- Health check에는 충분함 (상태 코드만 확인)

## ✅ 결론

**서버에서 HEAD 메서드를 지원하도록 수정했으므로, 이제 UptimeRobot의 HTTP 모니터가 정상적으로 작동할 것입니다!**

코드를 배포한 후 UptimeRobot 대시보드에서 상태가 "Up"으로 변경되는지 확인하세요.
