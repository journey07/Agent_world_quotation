import { calculateQuote } from '../../src/services/pricingService.js';
import { trackApiCall } from '../../src/services/statsService.js';
import { setCorsHeaders, handleOptions } from '../../src/utils/cors.js';

/**
 * Validate locker configuration input
 * (복사본: src/routes/quote.js 의 validateInput 과 동일한 로직)
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

    // Optional info for response only
    if (customerName) quote.customerName = customerName;
    if (deliveryLocation) quote.deliveryLocation = deliveryLocation;

    // Create descriptive log message
    const summary = `Quote: ${quote.input.columns}x${quote.input.tiers} Set:${quote.breakdown.quantity} ${quote.summary.total.toLocaleString()}KRW`;

    // Log and count as Task (Interactive feedback)
    await trackApiCall('calculate', Date.now() - startTime, false, false, true, summary);

    return res.status(200).json(quote);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

