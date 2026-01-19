import { Router } from 'express';
import { calculateQuote } from '../services/pricingService.js';
import { generateQuotePDF, generateQuotePDFBase64 } from '../services/pdfService.js';
import { generateQuoteExcel, generateQuoteExcelBase64 } from '../services/excelService.js';
import { generateLockerGridBase64 } from '../services/imageService.js';
import { generate3DInstallation } from '../services/geminiService.js';
import { saveInquiry, getAllInquiries } from '../services/inquiryService.js';
import { trackApiCall, sendActivityLog, getStatsForDashboard, toggleAgentStatus, setAgentStatus } from '../services/statsService.js';
import { verifyConnection } from '../services/geminiService.js';

const router = Router();

/**
 * Validate locker configuration input
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

    if (controlPanelTiers && (typeof controlPanelTiers !== 'number' || controlPanelTiers < 1 || controlPanelTiers > 10)) {
        errors.push('controlPanelTiers must be a number between 1 and 10');
    }

    const validRegions = ['seoul', 'gyeonggi', 'incheon', 'chungcheong', 'gangwon', 'jeolla', 'gyeongsang', 'jeju'];
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

/**
 * POST /api/quote/calculate
 * Calculate price based on locker configuration
 */
router.post('/calculate', async (req, res) => {
    const startTime = Date.now();
    try {
        const errors = validateInput(req.body);
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
            deliveryLocation
        } = req.body;

        const quote = calculateQuote({
            columns,
            tiers,
            quantity,
            controlPanelTiers: controlPanelTiers || 4,
            options: options || {},
            region: region || 'seoul'
        });

        // Add optional customer info to response
        // Optional info for response only
        if (customerName) quote.customerName = customerName;
        if (deliveryLocation) quote.deliveryLocation = deliveryLocation;

        // Optional info for response only
        if (customerName) quote.customerName = customerName;
        if (deliveryLocation) quote.deliveryLocation = deliveryLocation;

        // Create descriptive log message
        const summary = `Calculated Quote: ${quote.input.columns}x${quote.input.tiers} Set:${quote.breakdown.quantity} ${quote.summary.total.toLocaleString()}KRW`;

        // Log and count as Task (Interactive feedback)
        const userName = req.userName || null;
        console.log(`📊 Calculate API - userName: ${userName || 'null'}`);
        trackApiCall('calculate', Date.now() - startTime, false, false, true, summary, userName);

        res.json(quote);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/quote/inquiries
 * Fetch all inquiry history
 */
router.get('/inquiries', async (req, res) => {
    try {
        const userName = req.userName || null;
        console.log(`📋 Inquiries API - userName: ${userName || 'null'}`);
        const inquiries = await getAllInquiries();
        res.json(inquiries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/quote/pdf
 * Generate and return PDF quote
 * Query param: ?format=base64 returns base64 string, otherwise downloads PDF
 */
router.post('/pdf', async (req, res) => {
    const startTime = Date.now();
    try {
        const errors = validateInput(req.body);
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
            deliveryLocation
        } = req.body;

        const quote = calculateQuote({
            columns,
            tiers,
            quantity,
            controlPanelTiers: controlPanelTiers || 4,
            options: options || {},
            region: region || 'seoul'
        });

        if (customerName) quote.customerName = customerName;
        if (deliveryLocation) quote.deliveryLocation = deliveryLocation;

        // Check if base64 format requested
        if (req.query.format === 'base64') {
            const base64 = await generateQuotePDFBase64(quote);
            return res.json({
                pdf: base64,
                filename: `quote-${Date.now()}.pdf`
            });
        }

        // Otherwise return as downloadable file
        const pdfBuffer = await generateQuotePDF(quote);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="quote-${Date.now()}.pdf"`);
        // Log activity, count as Task, not API Call
        trackApiCall('pdf', Date.now() - startTime, false, false, true, null, req.userName || null);

        res.send(pdfBuffer);
    } catch (err) {
        console.error('PDF generation error:', err);
        trackApiCall('pdf', Date.now() - startTime, true, false, true, null, req.userName || null);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/quote/excel
 * Generate and return Excel quote document
 * Query param: ?format=base64 returns base64 string, otherwise downloads Excel file
 */
router.post('/excel', async (req, res) => {
    const startTime = Date.now();
    try {
        const errors = validateInput(req.body);
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
            generatedImage
        } = req.body;

        const quote = calculateQuote({
            columns,
            tiers,
            quantity,
            controlPanelTiers: controlPanelTiers || 4,
            options: options || {},
            region: region || 'seoul'
        });

        // Customer info for excel
        const customerInfo = {
            companyName: companyName || '',
            contact: contact || '',
            email: email || '',
            detailedLocation: detailedLocation || ''
        };

        // Extract base64 data from data URLs if present
        const previewImageBase64 = previewImage ? previewImage.replace(/^data:image\/\w+;base64,/, '') : null;
        const generatedImageBase64 = generatedImage ? generatedImage.replace(/^data:image\/\w+;base64,/, '') : null;

        // Check if base64 format requested
        if (req.query.format === 'base64') {
            const base64 = await generateQuoteExcelBase64(quote, previewImageBase64, generatedImageBase64, customerInfo);
            return res.json({
                excel: base64,
                filename: `견적서_${companyName || 'WorldLocker'}_${Date.now()}.xlsx`
            });
        }

        // Otherwise return as downloadable file
        const excelBuffer = await generateQuoteExcel(quote, previewImageBase64, generatedImageBase64, customerInfo);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`견적서_${companyName || 'WorldLocker'}_${Date.now()}.xlsx`)}`);

        // Create descriptive log message
        const has3D = !!generatedImage;
        const logMsg = `Generated Excel Quote for ${companyName || 'Unknown Company'} (${quote.input.columns}x${quote.input.tiers}) ${has3D ? 'with 3D Image' : ''}`;

        // Log activity, count as Task
        trackApiCall('excel', Date.now() - startTime, false, false, true, logMsg, req.userName || null);

        res.send(excelBuffer);
    } catch (err) {
        console.error('Excel generation error:', err);
        trackApiCall('excel', Date.now() - startTime, true, false, true, null, req.userName || null);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/quote/preview-image
 * Generate locker grid preview image
 * Options: controlPanelColumn (0 = none, 1..columns = index), controlPanelTiers (tier count), frameType
 */
router.post('/preview-image', async (req, res) => {
    const startTime = Date.now();
    try {
        const { columns, tiers, controlPanelColumn, controlPanelTiers, frameType } = req.body;

        if (!columns || columns < 1 || columns > 20) {
            return res.status(400).json({ error: 'columns must be between 1 and 20' });
        }
        if (!tiers || tiers < 1 || tiers > 10) {
            return res.status(400).json({ error: 'tiers must be between 1 and 10' });
        }

        const base64 = await generateLockerGridBase64(columns, tiers, {
            controlPanelColumn: controlPanelColumn || 0,
            controlPanelTiers: controlPanelTiers || 4,
            frameType: frameType || 'none'
        });

        // Create detailed log
        const logMsg = `Generated 2D Preview for ${columns}x${tiers} Locker (Frame: ${frameType || 'none'})`;

        // Log activity, don't count as Task (Calculate handled it)
        const userName = req.userName || null;
        console.log(`🖼️ Preview Image API - userName: ${userName || 'null'}`);
        trackApiCall('preview-image', Date.now() - startTime, false, false, false, logMsg, userName);

        res.json({
            image: base64,
            mimeType: 'image/png'
        });
    } catch (err) {
        trackApiCall('preview-image', Date.now() - startTime, true, false, true, null, req.userName || null);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/quote/generate-3d-installation
 * Generate 3D installation visualization from locker preview image
 * Body: { image: base64String, mimeType: 'image/png' }
 */
router.post('/generate-3d-installation', async (req, res) => {
    const startTime = Date.now();
    try {
        const { image, mimeType, frameType, columns, tiers, installationBackground } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        const userName = req.userName || null;

        // Send start log
        sendActivityLog('🎨 Starting 3D Installation Image Generation', 'info', 0, userName);

        // Set status to processing
        setAgentStatus('processing');

        // Log background info
        const backgroundMap = {
            'office_lobby': 'Modern Office Lobby',
            'gym_locker': 'Fitness Center Locker Room',
            'school_hallway': 'School Hallway',
            'subway_storage': 'Subway Storage Area',
            'sauna_entrance': 'Sauna Entrance',
            'library': 'Library Lounge'
        };
        const bgText = backgroundMap[installationBackground] || installationBackground || 'Default Background';
        sendActivityLog(`🖼️ Requested Background: ${bgText}`, 'info', 0, userName);

        // Calculate and log image size
        if (image) {
            // Base64 string length * 0.75 is approx byte size
            const sizeInBytes = image.length * 0.75;
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
            sendActivityLog(`📊 Image Size: ${sizeInMB} MB`, 'info', 0, userName);
        }

        // Send API call log
        sendActivityLog('⏳ Calling Gemini API...', 'info', 0, userName);

        // Generate 3D visualization using Gemini API
        const generated3DImage = await generate3DInstallation(image, mimeType || 'image/png', frameType || 'none', columns, tiers, installationBackground);

        const responseTime = Date.now() - startTime;

        // Send completion log
        sendActivityLog(`✅ 3D Generation Completed (${(responseTime / 1000).toFixed(1)}s)`, 'success', responseTime, userName);

        // Track API call (this is the main 3D generation task)
        trackApiCall('generate-3d-installation', responseTime, false, true, true, null, userName);

        // Set status back to online
        setAgentStatus('online');

        res.json({
            image: generated3DImage,
            mimeType: 'image/png',
            message: '3D installation visualization generated successfully'
        });
    } catch (err) {
        const responseTime = Date.now() - startTime;
        const userName = req.userName || null;

        // Send error log
        sendActivityLog(`❌ 3D Generation Failed: ${err.message}`, 'error', responseTime, userName);

        trackApiCall('generate-3d-installation', responseTime, true, true, true, null, userName);

        // Set status to error
        setAgentStatus('error');

        console.error('3D generation error:', err);
        res.status(500).json({
            error: 'Failed to generate 3D visualization',
            details: err.message
        });
    }
});

/**
 * GET /api/quote/dashboard-stats
 * Get agent stats for dashboard consumption
 */
router.get('/dashboard-stats', async (req, res) => {
    try {
        const stats = getStatsForDashboard();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/quote/agent-toggle
 * Toggle agent status (on/off)
 */
router.post('/agent-toggle', async (req, res) => {
    try {
        const newStatus = toggleAgentStatus();
        res.json({ status: newStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/quote/agent-status
 * Set agent status explicitly
 */
router.post('/agent-status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['online', 'offline', 'error', 'processing'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const newStatus = setAgentStatus(status);
        res.json({ status: newStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/quote/health
 * Basic health check for the backend
 * Supports both GET and HEAD methods for monitoring services
 */
const healthCheckHandler = (req, res) => {
    const responseData = { status: 'ok', timestamp: new Date().toISOString() };
    
    // HEAD 요청은 body 없이 상태 코드만 반환
    if (req.method === 'HEAD') {
        res.status(200).end();
    } else {
        res.json(responseData);
    }
};

router.get('/health', healthCheckHandler);
router.head('/health', healthCheckHandler);

/**
 * POST /api/quote/verify-api
 * Verify LLM API connection without cost
 */
router.post('/verify-api', async (req, res) => {
    try {
        const result = await verifyConnection();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;

