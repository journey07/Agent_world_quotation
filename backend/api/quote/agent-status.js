import { setAgentStatus } from '../../src/services/statsService.js';
import { setCorsHeaders, handleOptions } from '../utils/cors.js';

export default async function handler(req, res) {
  // CORS 헤더 설정
  setCorsHeaders(res);

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { status } = req.body || {};

    if (!['online', 'offline', 'error', 'processing'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const newStatus = await setAgentStatus(status);
    return res.status(200).json({ status: newStatus });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
