# Render Cold Start 해결 방법

## 문제

Render 무료 플랜은 **15분 비활성 시 sleep**되고, 첫 요청 시 **~1분 cold start 지연**이 발생합니다.

## 해결 방법

### 방법 1: 외부 Ping 서비스 (가장 간단) ⭐

#### UptimeRobot 사용 (무료)

1. **UptimeRobot 가입**: https://uptimerobot.com
2. **새 모니터 생성**:
   - Monitor Type: HTTP(s)
   - URL: `https://your-app.onrender.com/health`
   - Monitoring Interval: **5분** (무료 플랜)
   - Alert Contacts: 선택사항

3. **Health 엔드포인트 확인**:
   ```javascript
   // 이미 api/health.js에 있음
   export default async function handler(req, res) {
     return res.status(200).json({ status: 'ok' });
   }
   ```

**장점:**
- ✅ 완전 무료
- ✅ 설정 간단
- ✅ 5분마다 자동 ping
- ✅ 15분 타임아웃 전에 요청

**단점:**
- ⚠️ 750시간 소모 (하지만 1개 서비스는 24/7 가능)

#### cron-job.org 사용 (무료)

1. **cron-job.org 가입**: https://cron-job.org
2. **새 Cron Job 생성**:
   - URL: `https://your-app.onrender.com/health`
   - Schedule: `*/10 * * * *` (10분마다)
   - Method: GET

### 방법 2: Cloudflare Workers (고급)

**GitHub 프로젝트 사용**: https://github.com/ByteTrix/cloudflare-render-ping

1. Cloudflare Workers 무료 계정 생성
2. 프로젝트 클론 및 설정
3. Render URL 설정
4. 자동 배포

**장점:**
- ✅ 완전 무료
- ✅ 더 세밀한 제어 가능

### 방법 3: GitHub Actions (개발자용)

**`.github/workflows/keep-alive.yml`**:
```yaml
name: Keep Render Alive

on:
  schedule:
    - cron: '*/10 * * * *'  # 10분마다
  workflow_dispatch:  # 수동 실행 가능

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Render Service
        run: |
          curl -f https://your-app.onrender.com/health || exit 1
```

**장점:**
- ✅ 완전 무료
- ✅ 코드로 관리 가능
- ✅ GitHub 저장소에 포함

### 방법 4: Cold Start 감수 + UX 개선

**Ping 없이 사용하되, 사용자 경험 개선:**

```javascript
// 프론트엔드 App.jsx
const generate3D = async (imageData) => {
  setGenerating3D(true);
  setError(null);
  
  // Cold start 가능성 알림
  const startTime = Date.now();
  let retryCount = 0;
  const maxRetries = 2;
  
  const attemptRequest = async () => {
    try {
      const res = await fetch(`${API_3D_URL}/generate-3d-installation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imageData),
        signal: AbortSignal.timeout(180000) // 3분 타임아웃
      });
      
      if (!res.ok) throw new Error('Request failed');
      return res.json();
    } catch (err) {
      // Cold start일 가능성 - 재시도
      if (retryCount < maxRetries && Date.now() - startTime < 120000) {
        retryCount++;
        console.log(`Retrying... (${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기
        return attemptRequest();
      }
      throw err;
    }
  };
  
  return attemptRequest();
};
```

## 비교표

| 방법 | 비용 | 설정 난이도 | Cold Start | 추천도 |
|------|------|------------|-----------|--------|
| **UptimeRobot** | 무료 | ⭐ 쉬움 | ✅ 없음 | ⭐⭐⭐⭐⭐ |
| **cron-job.org** | 무료 | ⭐ 쉬움 | ✅ 없음 | ⭐⭐⭐⭐ |
| **Cloudflare Workers** | 무료 | ⭐⭐ 보통 | ✅ 없음 | ⭐⭐⭐⭐ |
| **GitHub Actions** | 무료 | ⭐⭐ 보통 | ✅ 없음 | ⭐⭐⭐ |
| **Cold Start 감수** | 무료 | ⭐ 쉬움 | ⚠️ 발생 | ⭐⭐⭐ |
| **Vercel Pro** | $20/월 | ⭐ 쉬움 | ✅ 없음 | ⭐⭐⭐⭐⭐ |

## 추천

**가장 간단하고 효과적인 방법: UptimeRobot**

1. 무료
2. 설정 5분
3. Cold Start 완전 방지
4. 모니터링 기능도 제공

**설정 단계:**
1. UptimeRobot 가입
2. 새 모니터 추가
3. URL: `https://your-app.onrender.com/health`
4. 5분 간격 설정
5. 완료!

## 주의사항

1. **750시간 제한**: Ping으로 계속 깨어있으면 시간 소모
   - 하지만 1개 서비스는 24/7 가능 (744시간/월)

2. **Render 정책**: 과도한 keep-alive는 정책 위반 가능
   - 적절한 간격(5-14분) 사용
   - 사용자 트래픽과 구분

3. **Health Check 엔드포인트**: 빠르고 가벼워야 함
   - DB 쿼리 없음
   - 단순 JSON 응답만

## 결론

**Cold Start는 피할 수 있습니다!**

- ✅ **UptimeRobot** 사용 (가장 간단)
- ✅ 또는 **cron-job.org** 사용
- ✅ 또는 **Cold Start 감수** + 재시도 로직

**추천**: UptimeRobot으로 5분마다 ping → Cold Start 없음!
