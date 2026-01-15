# ⚠️ 중요 사항

## 3D 이미지 생성 기능 - Pro 플랜 필수

### 문제점

`generate-3d-installation` 엔드포인트는 Gemini API를 호출하여 3D 이미지를 생성합니다. 이 과정은 **최소 30초에서 최대 2분 이상** 소요될 수 있습니다.

### Vercel 플랜별 제한

| 플랜 | 기본 타임아웃 | 최대 타임아웃 (설정 가능) | Fluid Compute 활성화 시 |
|------|-------------|----------------------|----------------------|
| **Hobby (무료)** | 10초 | **60초** ⚠️ | Fluid Compute 없음 |
| **Pro ($20/월)** | 15초 | 300초 | 300초 (기본), **800초 (최대)** |
| **Enterprise** | 15초 | 900초 | 300초 (기본), 800초 (최대) |

**⚠️ Hobby 플랜은 Fluid Compute를 사용할 수 없습니다!**

### 현재 설정

`vercel.json`에서 `generate-3d-installation.js`는 **300초 (5분)**로 설정되어 있습니다.

**⚠️ 문제**: Hobby 플랜에서는 최대 60초만 가능하므로, 이 설정은 **Pro 플랜에서만 작동**합니다!

```json
{
  "functions": {
    "api/quote/generate-3d-installation.js": {
      "memory": 2048,
      "maxDuration": 300
    }
  }
}
```

### 해결 방법

#### 1. Pro 플랜 구독 (필수) ✅
- Vercel Pro 플랜 ($20/월) 구독
- 300초 타임아웃 사용 가능

#### 2. Fluid Compute 활성화 (Pro 플랜만 가능) ✅
**⚠️ Hobby 플랜에서는 사용 불가!**

1. Vercel 대시보드 → 프로젝트 선택
2. Settings → Functions
3. "Enable Fluid Compute" 활성화 (Pro 플랜 필요)
4. `vercel.json`에서 `maxDuration`을 800초로 증가 가능

```json
{
  "functions": {
    "api/quote/generate-3d-installation.js": {
      "memory": 2048,
      "maxDuration": 800  // 13분까지 가능
    }
  }
}
```

#### 3. 무료 플랜 + 별도 서버 (실용적 대안) 🆓
**3D 이미지 생성만 별도 서버로 분리:**

- **Render** (무료 티어): 750시간/월, 타임아웃 없음
- **Railway** (무료 티어): $5 크레딧/월
- **Fly.io** (무료 티): 제한적이지만 사용 가능
- **Google Cloud Functions** (무료 티어): 200만 호출/월
- **AWS Lambda** (무료 티어): 100만 요청/월

**구현 방법:**
1. 3D 생성 엔드포인트만 별도 서버에 배포
2. 프론트엔드에서 3D 생성 시 별도 서버 URL 사용
3. 나머지 API는 Vercel Hobby 플랜 사용

#### 4. 비동기 처리 (복잡한 대안) ⚙️
**무료 플랜에서도 가능하지만 구현이 복잡:**

1. 요청 즉시 반환 (작업 ID)
2. 큐 시스템 사용 (Upstash Redis 무료 티어)
3. 별도 워커 함수로 처리
4. 클라이언트에서 폴링

**단점:** 구현 복잡도 높음, 추가 인프라 필요

### 체크리스트

배포 전 확인:
- [ ] Vercel Pro 플랜 구독 확인
- [ ] Fluid Compute 활성화 (선택사항이지만 권장)
- [ ] `vercel.json`의 `maxDuration` 설정 확인 (300초 이상)
- [ ] 테스트: 3D 이미지 생성이 타임아웃 없이 완료되는지 확인

### Hobby 플랜 사용 시

**Hobby 플랜에서는 Vercel에서 3D 이미지 생성이 타임아웃됩니다!**

**실용적인 대안:**

1. **Pro 플랜으로 업그레이드** (가장 간단) 💰
   - 월 $20
   - 모든 기능 Vercel에서 사용 가능

2. **3D 생성만 별도 서버로 분리** (무료 가능) 🆓
   - Render, Railway 등 무료 티어 사용
   - 3D 생성 엔드포인트만 별도 배포
   - 나머지는 Vercel Hobby 플랜 사용

3. **비동기 처리 방식** (복잡함) ⚙️
   - 큐 시스템 + 워커 함수
   - 구현 복잡도 높음

4. **3D 이미지 생성 기능 비활성화** (최후의 수단)
   - 기능 제한
