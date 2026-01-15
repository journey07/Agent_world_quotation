import { generateLockerGridBase64 } from '../../src/services/imageService.js';
import { trackApiCall } from '../../src/services/statsService.js';
import { setCorsHeaders, handleOptions } from '../../src/utils/cors.js';

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

  const startTime = Date.now();

  try {
    const { columns, tiers, controlPanelColumn, controlPanelTiers, frameType } = req.body || {};

    if (!columns || columns < 1 || columns > 20) {
      return res.status(400).json({ error: 'columns must be between 1 and 20' });
    }
    if (!tiers || tiers < 1 || tiers > 10) {
      return res.status(400).json({ error: 'tiers must be between 1 and 10' });
    }

    const base64 = await generateLockerGridBase64(columns, tiers, {
      controlPanelColumn: controlPanelColumn || 0,
      controlPanelTiers: controlPanelTiers || 4,
      frameType: frameType || 'none',
    });

    const logMsg = `Generated 2D Preview for ${columns}x${tiers} Locker (Frame: ${
      frameType || 'none'
    })`;

    // preview 이미지는 Task 로는 카운트하지 않던 기존 로직 유지
    await trackApiCall('preview-image', Date.now() - startTime, false, false, false, logMsg);

    return res.status(200).json({
      image: base64,
      mimeType: 'image/png',
    });
  } catch (err) {
    await trackApiCall('preview-image', Date.now() - startTime, true, false, true);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

