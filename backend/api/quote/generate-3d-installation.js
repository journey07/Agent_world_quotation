import { generate3DInstallation } from '../../src/services/geminiService.js';
import {
  trackApiCall,
  sendActivityLog,
  setAgentStatus,
} from '../../src/services/statsService.js';
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
    const { image, mimeType, frameType, columns, tiers, installationBackground } =
      req.body || {};

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Send start log
    await sendActivityLog('🎨 Starting 3D Installation Image Generation', 'info');

    // Set status to processing
    await setAgentStatus('processing');

    // Log background info
    const backgroundMap = {
      office_lobby: 'Modern Office Lobby',
      gym_locker: 'Fitness Center Locker Room',
      school_hallway: 'School Hallway',
      subway_storage: 'Subway Storage Area',
      sauna_entrance: 'Sauna Entrance',
      library: 'Library Lounge',
    };
    const bgText =
      backgroundMap[installationBackground] ||
      installationBackground ||
      'Default Background';
    await sendActivityLog(`🖼️ Requested Background: ${bgText}`, 'info');

    // Calculate and log image size
    if (image) {
      // Base64 string length * 0.75 is approx byte size
      const sizeInBytes = image.length * 0.75;
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
      await sendActivityLog(`📊 Image Size: ${sizeInMB} MB`, 'info');
    }

    // Send API call log
    await sendActivityLog('⏳ Calling Gemini API...', 'info');

    // Generate 3D visualization using Gemini API
    const generated3DImage = await generate3DInstallation(
      image,
      mimeType || 'image/png',
      frameType || 'none',
      columns,
      tiers,
      installationBackground,
    );

    const responseTime = Date.now() - startTime;

    // Send completion log
    await sendActivityLog(
      `✅ 3D Generation Complete (${(responseTime / 1000).toFixed(1)}s)`,
      'success',
      responseTime,
    );

    // Track API call (this is the main 3D generation task)
    await trackApiCall('generate-3d-installation', responseTime, false);

    // Set status back to online
    await setAgentStatus('online');

    return res.status(200).json({
      image: generated3DImage,
      mimeType: 'image/png',
      message: '3D installation visualization generated successfully',
    });
  } catch (err) {
    const responseTime = Date.now() - startTime;

    // Check for API key leak error
    const isApiKeyLeaked = err.message && err.message.includes('API_KEY_LEAKED');
    
    // Send error log with specific message for leaked keys
    if (isApiKeyLeaked) {
      await sendActivityLog(
        '🔑 API Key Leaked: Please generate a new API key from Google AI Studio',
        'error',
        responseTime,
      );
    } else {
      await sendActivityLog(`❌ 3D Generation Failed: ${err.message}`, 'error', responseTime);
    }

    await trackApiCall('generate-3d-installation', responseTime, true);

    // Set status to error
    await setAgentStatus('error');

    console.error('3D generation error:', err);
    
    // Return specific error for leaked API key
    if (isApiKeyLeaked) {
      return res.status(403).json({
        error: 'API Key Leaked',
        message: 'Your Gemini API key was reported as leaked and has been revoked.',
        action: 'Please generate a new API key from Google AI Studio (https://aistudio.google.com/app/apikey) and update the GEMINI_API_KEY environment variable.',
        details: err.message,
      });
    }

    return res.status(500).json({
      error: 'Failed to generate 3D visualization',
      details: err.message,
    });
  }
}

