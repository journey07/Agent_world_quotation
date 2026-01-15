/**
 * CORS 헤더 설정 유틸리티
 */
export function setCorsHeaders(res) {
  // 프로덕션에서는 특정 도메인만 허용하도록 설정 가능
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['*'];

  const origin = allowedOrigins.includes('*')
    ? '*'
    : allowedOrigins[0]; // 간단하게 첫 번째 origin 사용

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24시간
}

/**
 * OPTIONS 요청 처리
 */
export function handleOptions(req, res) {
  setCorsHeaders(res);
  return res.status(204).end();
}
