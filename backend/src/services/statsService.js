import dotenv from 'dotenv';
dotenv.config();
import { MODEL_NAME } from './geminiService.js';

const AGENT_ID = 'agent-worldlocker-001';
const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || 'http://localhost:5001/api/stats';

/**
 * Track an API call by reporting to the central Dashboard Brain
 */
export async function trackApiCall(apiType, responseTime = 0, isError = false, shouldCountApi = true, shouldCountTask = true, logMessage = null) {
    try {
        const response = await fetch(DASHBOARD_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agentId: AGENT_ID,
                apiType,
                responseTime,
                isError,
                shouldCountApi,
                shouldCountTask,
                model: MODEL_NAME,
                account: process.env.ACCOUNT_EMAIL || 'admin@worldlocker.com',
                apiKey: process.env.GEMINI_API_KEY ? `sk-...${process.env.GEMINI_API_KEY.slice(-4)}` : 'sk-unknown',
                logMessage: logMessage
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Failed to report stats to Brain:', errorData.error);
        } else {
            console.log(`📡 Stats reported to Brain: ${apiType}`);
        }

        // Return dummy or fetch from brain if needed. 
        // For efficiency, we just return true/false or a simple object.
        return { success: response.ok };
    } catch (error) {
        console.error('❌ Error reporting to Dashboard Brain:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send a detailed activity log to the Dashboard Brain
 * @param {string} action - Human-readable action description
 * @param {string} logType - Type of log: 'info', 'success', 'error', 'warning'
 * @param {number} responseTime - Optional response time in ms
 */
export async function sendActivityLog(action, logType = 'info', responseTime = 0) {
    try {
        const response = await fetch(DASHBOARD_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agentId: AGENT_ID,
                apiType: 'activity_log',
                logAction: action,
                logType,
                responseTime,
                shouldCountApi: false,
                shouldCountTask: false,
                model: MODEL_NAME,
                account: process.env.ACCOUNT_EMAIL || 'admin@worldlocker.com'
            }),
        });

        if (!response.ok) {
            console.error('❌ Failed to send activity log to Brain');
        } else {
            console.log(`📋 Activity log sent: ${action}`);
        }
    } catch (error) {
        console.error('❌ Error sending activity log:', error.message);
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

    // Send immediate registration request (once)
    sendHeartbeat(baseUrl);
}

async function sendHeartbeat(baseUrl) {
    try {
        await fetch(DASHBOARD_API_URL, {
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
    } catch (error) {
        // Silent fail for heartbeat to avoid cluttering logs if dashboard is down
    }
}
