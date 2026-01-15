import { getStatsForDashboard } from '../../src/services/statsService.js';
import { setCorsHeaders, handleOptions } from '../../src/utils/cors.js';

export default async function handler(req, res) {
  // CORS 헤더 설정
  setCorsHeaders(req, res);

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const stats = await getStatsForDashboard();
    return res.status(200).json(stats);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
