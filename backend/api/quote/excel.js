import { calculateQuote } from '../../src/services/pricingService.js';
import {
  generateQuoteExcel,
  generateQuoteExcelBase64,
} from '../../src/services/excelService.js';
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
      controlPanelColumn,
      options,
      region,
      companyName,
      contact,
      email,
      detailedLocation,
      previewImage,
      generatedImage,
    } = req.body;

    const quote = calculateQuote({
      columns,
      tiers,
      quantity,
      controlPanelTiers: controlPanelTiers || 4,
      options: options || {},
      region: region || 'seoul',
    });

    // Customer info for excel
    const customerInfo = {
      companyName: companyName || '',
      contact: contact || '',
      email: email || '',
      detailedLocation: detailedLocation || '',
    };

    // Extract base64 data from data URLs if present
    const previewImageBase64 = previewImage
      ? previewImage.replace(/^data:image\/\w+;base64,/, '')
      : null;
    const generatedImageBase64 = generatedImage
      ? generatedImage.replace(/^data:image\/\w+;base64,/, '')
      : null;

    // Extract user name from header
    const userName = req.headers['x-user-name'] || null;

    // base64 형식 요청 여부
    if (req.query?.format === 'base64') {
      const base64 = await generateQuoteExcelBase64(
        quote,
        previewImageBase64,
        generatedImageBase64,
        customerInfo,
      );

      await trackApiCall(
        'excel',
        Date.now() - startTime,
        false,
        false,
        true,
        `Generated Excel Quote for ${companyName || 'Unknown Company'} (${quote.input.columns}x${quote.input.tiers}) ${
          generatedImage ? 'with 3D Image' : ''
        }`,
        userName,
      );

      return res.status(200).json({
        excel: base64,
        filename: `견적서_${companyName || 'WorldLocker'}_${Date.now()}.xlsx`,
      });
    }

    // 파일 다운로드 응답
    const excelBuffer = await generateQuoteExcel(
      quote,
      previewImageBase64,
      generatedImageBase64,
      customerInfo,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(
        `견적서_${companyName || 'WorldLocker'}_${Date.now()}.xlsx`,
      )}`,
    );

    const has3D = !!generatedImage;
    const logMsg = `Generated Excel Quote for ${companyName || 'Unknown Company'} (${quote.input.columns}x${quote.input.tiers}) ${
      has3D ? 'with 3D Image' : ''
    }`;

    await trackApiCall('excel', Date.now() - startTime, false, false, true, logMsg, userName);

    return res.status(200).send(excelBuffer);
  } catch (err) {
    console.error('Excel generation error:', err);
    const userName = req.headers['x-user-name'] || null;
    await trackApiCall('excel', Date.now() - startTime, true, false, true, null, userName);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

