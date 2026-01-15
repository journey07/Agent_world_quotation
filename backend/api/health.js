import { setCorsHeaders, handleOptions } from './utils/cors.js';

/**
 * 루트 레벨 헬스체크 엔드포인트
 * 기존 Express 서버의 /health와 동일한 기능
 */
export default async function handler(req, res) {
  // CORS 헤더 설정
  setCorsHeaders(res);

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'locker-quote-api',
  });
}
