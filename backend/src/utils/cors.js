/**
 * CORS 헤더 설정 유틸리티
 * 간헐적인 CORS 오류를 방지하기 위해 단순화된 로직 사용
 */
export function setCorsHeaders(req, res) {
  // 프로덕션 환경에서 Vercel 도메인들 자동 허용
  const productionOrigins = [
    'https://agent-world-quotation.vercel.app',
    'https://agent-world-quotation-frontend.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ];

  // 환경 변수에서 허용된 origin 가져오기
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

  // 모든 허용된 origin 목록 (환경 변수 + 프로덕션 origin)
  const allowedOrigins = envOrigins.length > 0 
    ? [...new Set([...envOrigins, ...productionOrigins])]
    : productionOrigins;

  // 요청의 Origin 헤더 가져오기 (Vercel 서버리스 함수 호환)
  let requestOrigin = req.headers.origin || req.headers.Origin;
  
  // referer에서 origin 추출 (에러 처리 포함)
  if (!requestOrigin && req.headers.referer) {
    try {
      requestOrigin = new URL(req.headers.referer).origin;
    } catch (e) {
      // referer 파싱 실패 시 무시
      requestOrigin = null;
    }
  }
  
  // Origin에서 슬래시 제거 (정규화)
  if (requestOrigin && requestOrigin.endsWith('/')) {
    requestOrigin = requestOrigin.slice(0, -1);
  }

  // 허용된 origin 결정 (단순화된 로직)
  let allowedOrigin = null;

  // 1. 요청 origin이 허용 목록에 있으면 사용
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    allowedOrigin = requestOrigin;
  }
  // 2. 환경 변수에 *가 있으면 요청 origin 허용
  else if (envOrigins.includes('*') && requestOrigin) {
    allowedOrigin = requestOrigin;
  }
  // 3. 요청 origin이 프로덕션 origin 중 하나와 일치하면 허용
  else if (requestOrigin && productionOrigins.includes(requestOrigin)) {
    allowedOrigin = requestOrigin;
  }
  // 4. 요청 origin이 있지만 허용 목록에 없으면, 프로덕션 환경에서는 기본 origin 사용
  else if (requestOrigin && requestOrigin.includes('vercel.app')) {
    allowedOrigin = productionOrigins[0]; // 기본 프로덕션 origin
  }
  // 5. 요청 origin이 localhost면 허용 (개발 환경)
  else if (requestOrigin && requestOrigin.includes('localhost')) {
    allowedOrigin = requestOrigin;
  }
  // 6. fallback: 첫 번째 프로덕션 origin 사용
  else {
    allowedOrigin = productionOrigins[0] || requestOrigin || '*';
  }

  // 최종 origin 정규화 (슬래시 제거)
  if (allowedOrigin && allowedOrigin !== '*' && allowedOrigin.endsWith('/')) {
    allowedOrigin = allowedOrigin.slice(0, -1);
  }

  // CORS 헤더 설정 (항상 설정 - 간헐적 오류 방지)
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24시간
}

/**
 * OPTIONS 요청 처리
 */
export function handleOptions(req, res) {
  try {
    setCorsHeaders(req, res);
    // Vercel 서버리스 함수에서는 200 상태 코드와 함께 응답
    // 204는 일부 브라우저에서 헤더를 무시할 수 있음
    return res.status(200).end();
  } catch (err) {
    // 에러 발생 시에도 CORS 헤더는 설정
    console.error('CORS Options error:', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return res.status(200).end();
  }
}
