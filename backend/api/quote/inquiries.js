import { getAllInquiries } from '../../src/services/inquiryService.js';
import { setCorsHeaders, handleOptions } from '../../src/utils/cors.js';

export default async function handler(req, res) {
  // CORS 헤더 설정 (항상 먼저 설정)
  try {
    setCorsHeaders(req, res);
  } catch (corsErr) {
    // CORS 설정 실패 시 기본 헤더 설정
    console.error('CORS setup error:', corsErr);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const inquiries = await getAllInquiries();
    return res.status(200).json(inquiries);
  } catch (err) {
    // 에러 발생 시에도 CORS 헤더 유지
    console.error('Inquiries error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
