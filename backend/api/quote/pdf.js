import { calculateQuote } from '../../src/services/pricingService.js';
import {
  generateQuotePDF,
  generateQuotePDFBase64,
} from '../../src/services/pdfService.js';
import { trackApiCall } from '../../src/services/statsService.js';
import { setCorsHeaders, handleOptions } from '../../src/utils/cors.js';

/**
 * Validate locker configuration input
 * (src/routes/quote.js 의 validateInput 과 동일한 로직 복사)
 */
function validateInput(body) {
  const errors = [];

  const { columns, tiers, quantity, controlPanelTiers, region, options } = body;

  if (!columns || typeof columns !== 'number' || columns < 1 || columns > 20) {
    errors.push('columns must be a number between 1 and 20');
  }

  if (!tiers || typeof tiers !== 'number' || tiers < 1 || tiers > 10) {
    errors.push('tiers must be a number between 1 and 10');
  }

  if (!quantity || typeof quantity !== 'number' || quantity < 1) {
    errors.push('quantity must be a positive number');
  }

  if (
    controlPanelTiers &&
    (typeof controlPanelTiers !== 'number' ||
      controlPanelTiers < 1 ||
      controlPanelTiers > 10)
  ) {
    errors.push('controlPanelTiers must be a number between 1 and 10');
  }

  const validRegions = [
    'seoul',
    'gyeonggi',
    'incheon',
    'chungcheong',
    'gangwon',
    'jeolla',
    'gyeongsang',
    'jeju',
  ];
  if (region && !validRegions.includes(region)) {
    errors.push(`region must be one of: ${validRegions.join(', ')}`);
  }

  if (options && options.frameType) {
    const validFrameTypes = ['none', 'fullSet', 'topOnly', 'sideOnly', 'topAndSide'];
    if (!validFrameTypes.includes(options.frameType)) {
      errors.push(`frameType must be one of: ${validFrameTypes.join(', ')}`);
    }
  }

  return errors;
}

export default async function handler(req, res) {
  // CORS 헤더 설정
  setCorsHeaders(req, res);

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
    const errors = validateInput(req.body || {});
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const {
      columns,
      tiers,
      quantity,
      controlPanelTiers,
      options,
      region,
      customerName,
      deliveryLocation,
    } = req.body;

    const quote = calculateQuote({
      columns,
      tiers,
      quantity,
      controlPanelTiers: controlPanelTiers || 4,
      options: options || {},
      region: region || 'seoul',
    });

    if (customerName) quote.customerName = customerName;
    if (deliveryLocation) quote.deliveryLocation = deliveryLocation;

    // Extract user name from header
    const userName = req.headers['x-user-name'] || null;

    // base64 형식 요청 여부
    if (req.query?.format === 'base64') {
      const base64 = await generateQuotePDFBase64(quote);
      await trackApiCall('pdf', Date.now() - startTime, false, false, true, null, userName);

      return res.status(200).json({
        pdf: base64,
        filename: `quote-${Date.now()}.pdf`,
      });
    }

    // 파일 다운로드 응답
    const pdfBuffer = await generateQuotePDF(quote);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="quote-${Date.now()}.pdf"`,
    );

    await trackApiCall('pdf', Date.now() - startTime, false, false, true, null, userName);

    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    const userName = req.headers['x-user-name'] || null;
    await trackApiCall('pdf', Date.now() - startTime, true, false, true, null, userName);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

