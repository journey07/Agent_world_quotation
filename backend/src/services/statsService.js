import dotenv from 'dotenv';
dotenv.config();
import { MODEL_NAME } from './geminiService.js';

const AGENT_ID = 'agent-worldlocker-001';
const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || 'http://localhost:5001/api/stats';

/**
 * Track an API call by reporting to the central Dashboard Brain
 * @param {string} apiType - Type of API call
 * @param {number} responseTime - Response time in ms
 * @param {boolean} isError - Whether the call resulted in an error
 * @param {boolean} shouldCountApi - Whether to count as API call
 * @param {boolean} shouldCountTask - Whether to count as task
 * @param {string} logMessage - Optional log message
 * @param {string} userName - Optional user name (from users table name column)
 */
export async function trackApiCall(apiType, responseTime = 0, isError = false, shouldCountApi = true, shouldCountTask = true, logMessage = null, userName = null) {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'statsService.js:18',message:'trackApiCall called',data:{apiType,userName,dashboardUrl:DASHBOARD_API_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
        console.log(`📤 Sending API call to Dashboard: ${apiType}, userName: ${userName || 'null'}, URL: ${DASHBOARD_API_URL}`);
        
        const payload = {
            agentId: AGENT_ID,
            apiType,
            responseTime,
            isError,
            shouldCountApi,
            shouldCountTask,
            model: MODEL_NAME,
            account: process.env.ACCOUNT_EMAIL || 'admin@worldlocker.com',
            apiKey: process.env.GEMINI_API_KEY ? `sk-...${process.env.GEMINI_API_KEY.slice(-4)}` : 'sk-unknown',
            logMessage: logMessage,
            userName: userName
        };
        
        console.log(`📦 API call payload:`, JSON.stringify(payload, null, 2));
        
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'statsService.js:38',message:'About to fetch Dashboard API',data:{url:DASHBOARD_API_URL,payload},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        const response = await fetch(DASHBOARD_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'statsService.js:46',message:'Dashboard API response',data:{ok:response.ok,status:response.status,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'statsService.js:48',message:'Dashboard API failed',data:{status:response.status,statusText:response.statusText,errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            console.error(`❌ Failed to report stats to Brain: ${response.status} ${response.statusText}`, errorData);
        } else {
            const result = await response.json().catch(() => ({}));
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'statsService.js:51',message:'Dashboard API success',data:{result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            console.log(`✅ Stats reported to Brain: ${apiType}, userName: ${userName || 'null'}`);
        }

        // Return dummy or fetch from brain if needed. 
        // For efficiency, we just return true/false or a simple object.
        return { success: response.ok };
    } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'statsService.js:58',message:'trackApiCall exception',data:{error:error.message,stack:error.stack,code:error.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        console.error(`❌ Error reporting to Dashboard Brain (${DASHBOARD_API_URL}):`, error.message);
        console.error('Full error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send a detailed activity log to the Dashboard Brain
 * @param {string} action - Human-readable action description
 * @param {string} logType - Type of log: 'info', 'success', 'error', 'warning'
 * @param {number} responseTime - Optional response time in ms
 * @param {string} userName - Optional user name (from users table name column)
 */
export async function sendActivityLog(action, logType = 'info', responseTime = 0, userName = null) {
    // Validate required parameters FIRST - before any async operations
    if (!action) {
        console.error('❌ [LOGIN LOG] sendActivityLog called without action parameter');
        return { success: false, error: 'action parameter is required' };
    }
    
    if (!AGENT_ID) {
        console.error('❌ [LOGIN LOG] AGENT_ID is not set');
        return { success: false, error: 'AGENT_ID is not set' };
    }
    
    if (!DASHBOARD_API_URL) {
        console.error('❌ [LOGIN LOG] DASHBOARD_API_URL is not set');
        return { success: false, error: 'DASHBOARD_API_URL is not set' };
    }
    
    console.log(`🚀 [LOGIN LOG] ========== START sendActivityLog ==========`);
    console.log(`📋 [LOGIN LOG] Parameters: action="${action}", logType="${logType}", userName="${userName || 'null'}"`);
    console.log(`📋 [LOGIN LOG] AGENT_ID: ${AGENT_ID}`);
    console.log(`📋 [LOGIN LOG] DASHBOARD_API_URL: ${DASHBOARD_API_URL}`);
    
    try {
        const payload = {
            agentId: AGENT_ID,
            apiType: 'activity_log',
            logAction: action,  // This is the key field - must be present
            logType: logType || 'info',
            responseTime: responseTime || 0,
            shouldCountApi: false,
            shouldCountTask: false,
            model: MODEL_NAME,
            account: process.env.ACCOUNT_EMAIL || 'admin@worldlocker.com',
            userName: userName || null
        };
        
        console.log(`📦 [LOGIN LOG] Payload to send:`, JSON.stringify(payload, null, 2));
        console.log(`🌐 [LOGIN LOG] Sending POST request to: ${DASHBOARD_API_URL}`);
        
        const startTime = Date.now();
        const response = await fetch(DASHBOARD_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const duration = Date.now() - startTime;

        console.log(`📡 [LOGIN LOG] Response received (${duration}ms): status=${response.status}, ok=${response.ok}`);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error(`❌ [LOGIN LOG] ========== FAILED ==========`);
            console.error(`❌ [LOGIN LOG] Status: ${response.status} ${response.statusText}`);
            console.error(`❌ [LOGIN LOG] Error response body: ${errorText}`);
            console.error(`❌ [LOGIN LOG] Payload that failed:`, JSON.stringify(payload, null, 2));
            return { success: false, error: `HTTP ${response.status}: ${errorText}` };
        } else {
            const result = await response.json().catch(() => ({}));
            console.log(`✅ [LOGIN LOG] ========== SUCCESS ==========`);
            console.log(`✅ [LOGIN LOG] Dashboard response:`, JSON.stringify(result, null, 2));
            console.log(`✅ [LOGIN LOG] Activity log sent successfully: "${action}", userName: ${userName || 'null'}`);
            return { success: true, result };
        }
    } catch (error) {
        console.error(`❌ [LOGIN LOG] ========== EXCEPTION ==========`);
        console.error(`❌ [LOGIN LOG] Exception type: ${error.constructor.name}`);
        console.error(`❌ [LOGIN LOG] Error message: ${error.message}`);
        console.error(`❌ [LOGIN LOG] Error code: ${error.code || 'N/A'}`);
        console.error(`❌ [LOGIN LOG] Error stack:`, error.stack);
        console.error(`❌ [LOGIN LOG] Full error:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * The following functions are now "Legacy" or "Proxy" 
 * as the Dashboard UI should fetch directly from the Brain.
 */

export async function getStats() {
    try {
        const response = await fetch(`${DASHBOARD_API_URL}?agentId=${AGENT_ID}`);
        if (response.ok) {
            const allStats = await response.json();
            return allStats.find(a => a.id === AGENT_ID) || {};
        }
    } catch (error) {
        console.error('Error fetching stats from Brain:', error);
    }
    return {};
}

export async function getStatsForDashboard() {
    return await getStats();
}

export async function toggleAgentStatus() {
    // Currently status toggle is also a state change that should be centralized.
    // In a full implementation, this would be a PATCH to the Brain.
    console.log('Toggle requested - this should be handled by the Dashboard Brain UI.');
    return 'online';
}

export async function setAgentStatus(status) {
    // Reporting status change to Brain
    try {
        await fetch(DASHBOARD_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentId: AGENT_ID,
                apiType: 'status_change',
                status,
                model: 'gemini-3-pro-image-preview',
                apiKey: process.env.GEMINI_API_KEY ? `sk-...${process.env.GEMINI_API_KEY.slice(-4)}` : 'sk-unknown'
            })
        });
    } catch (e) { }
    return status;
}

export function startHeartbeat(port) {
    if (process.env.NODE_ENV === 'test') return;

    // 프로덕션에서는 환경 변수 사용, 개발에서는 localhost
    const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
    console.log(`💓 Registering Agent ${AGENT_ID} to Dashboard Brain at ${baseUrl}`);

    // Send immediate registration request (once) - 서버 시작 시 한 번만
    sendHeartbeat(baseUrl);
}

/**
 * Send heartbeat manually (called from status check or other manual triggers)
 */
export async function sendManualHeartbeat(port) {
    if (process.env.NODE_ENV === 'test') return;
    
    const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
    await sendHeartbeat(baseUrl);
}

async function sendHeartbeat(baseUrl) {
    try {
        const response = await fetch(DASHBOARD_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentId: AGENT_ID,
                apiType: 'heartbeat',
                baseUrl: baseUrl,
                shouldCountApi: false,
                shouldCountTask: false,
                model: MODEL_NAME,
                account: process.env.ACCOUNT_EMAIL || 'admin@worldlocker.com',
                apiKey: process.env.GEMINI_API_KEY ? `sk-...${process.env.GEMINI_API_KEY.slice(-4)}` : 'sk-unknown'
            })
        });

        if (response.ok) {
            console.log(`💓 Heartbeat sent successfully`);
        } else {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error(`❌ Heartbeat failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
    } catch (error) {
        // Silent fail for heartbeat to avoid cluttering logs if dashboard is down
        // Only log if it's not a network error (dashboard might be down)
        if (error.code !== 'ECONNREFUSED' && error.code !== 'ENOTFOUND') {
            console.error(`❌ Heartbeat error: ${error.message}`);
        }
    }
}
