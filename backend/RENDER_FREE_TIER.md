# Render 무료 플랜 정확한 정보

## ✅ Render 무료 플랜은 실제로 무료입니다!

이미지에서 본 "$0 USD per month"는 **Static Sites**에 대한 것이지만, **Web Services도 무료 티어**가 있습니다!

## Render 무료 플랜 (Web Services)

### 제공 사항

| 항목 | 제한 |
|------|------|
| **비용** | **완전 무료** ✅ |
| **인스턴스 시간** | **750시간/월** (약 31일) |
| **HTTP 요청 타임아웃** | **최대 100분** ⭐ (매우 충분!) |
| **메모리** | 512MB (Free tier) |
| **CPU** | 공유 CPU |
| **자동 배포** | ✅ 지원 |
| **Custom Domain** | ✅ 지원 |
| **SSL/TLS** | ✅ 자동 |

### 제한사항

| 항목 | 제한 |
|------|------|
| **비활성 타임아웃** | 15분 비활성 시 spin-down |
| **Cold Start** | spin-down 후 첫 요청 시 ~1분 지연 |
| **파일 시스템** | Ephemeral (재시작 시 사라짐) |
| **Persistent Disk** | ❌ 없음 (유료 플랜 필요) |
| **Scaling** | ❌ 단일 인스턴스만 |
| **SSH Shell** | ❌ 없음 (유료 플랜 필요) |
| **Edge Caching** | ❌ 없음 |
| **SMTP 포트** | ❌ 차단됨 (25, 465, 587) |

### 3D 이미지 생성에 완벽한 이유

- ✅ **타임아웃 100분**: Gemini API 호출(30초~2분)에 충분
- ✅ **완전 무료**: 750시간/월로 거의 24/7 운영 가능
- ✅ **자동 배포**: GitHub 연결 시 자동 배포
- ⚠️ **Cold Start**: 15분 비활성 후 첫 요청 시 ~1분 지연

## Static Sites vs Web Services

### Static Sites (이미지에서 본 것)

- ✅ **완전 무료**
- ✅ 항상 활성화 (spin-down 없음)
- ✅ 글로벌 CDN
- ❌ 백엔드 로직 불가 (정적 파일만)

### Web Services (우리가 필요한 것)

- ✅ **완전 무료** (750시간/월)
- ✅ **타임아웃 100분** (매우 충분!)
- ⚠️ 15분 비활성 시 spin-down
- ✅ 백엔드 API, 데이터베이스 연결 등 가능

## 실제 사용 시나리오

### 시나리오 1: 3D 생성만 Render로 분리

**구성:**
- 나머지 API: Vercel Hobby 플랜 (무료, 60초 제한)
- 3D 생성: Render 무료 플랜 (무료, 100분 제한)

**장점:**
- ✅ 완전 무료
- ✅ 3D 생성은 타임아웃 걱정 없음
- ✅ Vercel의 빠른 응답 속도 유지

**단점:**
- ⚠️ 3D 생성만 cold start 지연 가능 (~1분)

### 시나리오 2: 전체를 Render로 이동

**구성:**
- 전체 백엔드: Render 무료 플랜

**장점:**
- ✅ 완전 무료
- ✅ 모든 API 타임아웃 걱정 없음 (100분)
- ✅ 단일 플랫폼으로 관리 간단

**단점:**
- ⚠️ Cold start 지연 (15분 비활성 후)
- ⚠️ Vercel의 Edge Functions 같은 기능 없음

## 750시간 제한 계산

- **1개 서비스 24/7**: 744시간/월 → ✅ 가능
- **2개 서비스 24/7**: 1,488시간/월 → ❌ 초과 (각각 ~15일만 가능)
- **1개 서비스 + 간헐적 사용**: ✅ 여유 있음

**결론**: 1개 서비스는 거의 24/7 운영 가능!

## Cold Start 피하는 방법

### ⚠️ 중요: Health Check는 Cold Start를 막지 않습니다!

Render의 내장 Health Check는 서비스 상태 모니터링용이며, **15분 비활성 시 여전히 sleep됩니다**.

### ✅ Cold Start를 피하는 실제 방법

#### 방법 1: 외부 Ping 서비스 사용 (무료) ⭐

**추천 서비스:**
- **UptimeRobot** (무료): 50개 모니터, 5분 간격
- **cron-job.org** (무료): 주기적 HTTP 요청
- **FastCron** (무료): 간단한 cron 서비스

**설정:**
1. `/health` 엔드포인트 생성 (빠른 응답)
2. 외부 서비스로 **10-14분마다** GET 요청
3. 15분 타임아웃 전에 요청이 들어오므로 sleep 방지

**예시:**
```javascript
// backend/src/routes/quote.js 또는 api/health.js
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});
```

#### 방법 2: Cloudflare Workers (무료) ⭐

**GitHub 프로젝트**: [ByteTrix/cloudflare-render-ping](https://github.com/ByteTrix/cloudflare-render-ping)

- Cloudflare Workers 무료 티어 사용
- 14분마다 자동 ping
- 완전 무료

#### 방법 3: GitHub Actions (무료)

**`.github/workflows/keep-alive.yml`**:
```yaml
name: Keep Render Alive
on:
  schedule:
    - cron: '*/10 * * * *'  # 10분마다
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Render
        run: curl https://your-app.onrender.com/health
```

### ⚠️ 주의사항

1. **750시간 소모**: 24/7로 깨어있으면 750시간을 빠르게 소모
   - 1개 서비스 24/7 = 744시간/월 → ✅ 가능
   - 하지만 ping으로 계속 깨어있으면 시간 소모

2. **Render 정책**: 과도한 "keep-alive" 패턴은 정책 위반 가능
   - 적절한 간격(10-14분) 사용 권장
   - 사용자 트래픽과 구분되는 패턴 주의

3. **Cold Start는 여전히 발생 가능**:
   - Ping이 실패하거나
   - 15분 이상 간격이 벌어지면
   - 여전히 cold start 발생

### 대안: Cold Start를 감수하되 UX 개선

**Cold start를 피하지 않고 사용자 경험 개선:**

```javascript
// 프론트엔드에서
const generate3D = async (imageData) => {
  try {
    // 첫 요청 시 로딩 표시
    setLoading(true);
    setMessage('3D 이미지 생성 중... (서비스 시작 중일 수 있습니다)');
    
    const res = await fetch(`${API_3D_URL}/generate-3d-installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imageData),
      // 타임아웃을 길게 설정
      signal: AbortSignal.timeout(180000) // 3분
    });
    
    return res.json();
  } catch (err) {
    if (err.name === 'TimeoutError') {
      // 타임아웃 시 재시도
      return generate3D(imageData);
    }
    throw err;
  }
};
```

### 결론 및 추천

| 방법 | 비용 | Cold Start | 추천도 |
|------|------|-----------|--------|
| **외부 Ping 서비스** | 무료 | ✅ 피함 | ⭐⭐⭐⭐ |
| **Cloudflare Workers** | 무료 | ✅ 피함 | ⭐⭐⭐⭐ |
| **Cold Start 감수 + UX 개선** | 무료 | ⚠️ 발생 | ⭐⭐⭐ |
| **Vercel Pro 플랜** | $20/월 | ✅ 없음 | ⭐⭐⭐⭐⭐ |

**실용적 추천:**
1. **외부 Ping 서비스 사용** (UptimeRobot 등) - 무료 + Cold Start 없음
2. **Cold Start 감수** - 무료이지만 첫 요청 시 지연
3. **Vercel Pro 플랜** - 비용 있지만 가장 안정적

## 결론

**Render 무료 플랜은 실제로 무료이며, 3D 이미지 생성에 완벽합니다!**

- ✅ 타임아웃 100분 (충분)
- ✅ 750시간/월 (거의 24/7)
- ✅ 완전 무료
- ⚠️ Cold start만 주의

**추천**: Render로 3D 생성만 분리하거나, 전체를 Render로 이동하는 것이 무료로 사용하기에 가장 좋은 방법입니다!
