/**
 * CORS 헤더 설정 유틸리티
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
  let requestOrigin = req.headers.origin || req.headers.Origin || 
    (req.headers.referer ? new URL(req.headers.referer).origin : null);
  
  // Origin에서 슬래시 제거 (정규화)
  if (requestOrigin && requestOrigin.endsWith('/')) {
    requestOrigin = requestOrigin.slice(0, -1);
  }

  // 허용된 origin 결정
  let allowedOrigin = null;

  if (requestOrigin) {
    // 요청 origin이 허용 목록에 있으면 해당 origin 사용
    if (allowedOrigins.includes(requestOrigin)) {
      allowedOrigin = requestOrigin;
    } else if (envOrigins.includes('*')) {
      // 환경 변수에 *가 있으면 모든 origin 허용
      allowedOrigin = requestOrigin;
    }
  }

  // origin이 설정되지 않았고 환경 변수에 *가 있으면 요청 origin 허용
  if (!allowedOrigin && envOrigins.includes('*') && requestOrigin) {
    allowedOrigin = requestOrigin;
  }

  // origin이 여전히 없으면 기본값으로 첫 번째 프로덕션 origin 사용 (fallback)
  if (!allowedOrigin && allowedOrigins.length > 0) {
    allowedOrigin = allowedOrigins[0];
  }

  // 최종적으로 origin이 없으면 요청 origin 사용 (개발 환경 fallback)
  if (!allowedOrigin && requestOrigin) {
    allowedOrigin = requestOrigin;
  }

  // 프로덕션 origin이 요청 origin과 일치하면 허용 (추가 체크)
  if (!allowedOrigin && requestOrigin && productionOrigins.includes(requestOrigin)) {
    allowedOrigin = requestOrigin;
  }

  // credentials를 사용할 때는 *를 사용할 수 없으므로, 실제 origin을 사용해야 함
  // origin이 없으면 기본적으로 요청 origin 사용 (보안상 완벽하지 않지만 CORS 오류 방지)
  if (!allowedOrigin) {
    allowedOrigin = requestOrigin || productionOrigins[0] || '*';
  }

  // 최종 origin 정규화 (슬래시 제거)
  if (allowedOrigin && allowedOrigin !== '*' && allowedOrigin.endsWith('/')) {
    allowedOrigin = allowedOrigin.slice(0, -1);
  }

  // CORS 헤더 설정 (항상 설정)
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
  setCorsHeaders(req, res);
  // Vercel 서버리스 함수에서는 .end() 대신 .json() 또는 .send() 사용
  return res.status(204).send('');
}
