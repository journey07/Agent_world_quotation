import { verifyConnection } from '../../src/services/geminiService.js';
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
    const result = await verifyConnection();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  }
}
