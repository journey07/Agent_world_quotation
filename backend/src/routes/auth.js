import express from 'express'
import { loginWithUsername, verifySession } from '../services/authService.js'
import { setCorsHeaders, handleOptions } from '../utils/cors.js'
import { sendActivityLog } from '../services/statsService.js'

const router = express.Router()

// CORS 설정
router.use((req, res, next) => {
  try {
    setCorsHeaders(req, res)
  } catch (corsErr) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-name, x-user-name-encoded')
  }
  next()
})

// OPTIONS 요청 처리
router.options('*', handleOptions)

/**
 * POST /api/auth/login
 * Username과 password로 로그인
 */
router.post('/login', async (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'auth.js:27', message: 'Login API called', data: { hasBody: !!req.body, username: req.body?.username }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
  // #endregion
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '아이디와 비밀번호를 입력해주세요.'
      })
    }

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'auth.js:38', message: 'Calling loginWithUsername', data: { username }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    const result = await loginWithUsername(username, password)

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'auth.js:40', message: 'loginWithUsername result', data: { success: result.success, hasUser: !!result.user, userName: result.user?.name, username: result.user?.username, userId: result.user?.id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    if (!result.success) {
      return res.status(401).json(result)
    }

    // 로그인 성공 시 Dashboard로 로그 전송
    if (result.user) {
      const userName = result.user.name || result.user.username || 'Unknown'
      const loginAction = 'User logged in'

      console.log(`🔐 [LOGIN] Login successful for user: ${userName} (${result.user.username})`)
      console.log(`📤 [LOGIN] Preparing to send login log to Dashboard`)
      console.log(`📦 [LOGIN] User object:`, JSON.stringify(result.user, null, 2))
      console.log(`📦 [LOGIN] Login action: "${loginAction}"`)

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'auth.js:52', message: 'About to call sendActivityLog', data: { userName, userNameSource: result.user.name ? 'name' : 'username', fullUser: result.user, loginAction }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion

      // 로그 전송 (비동기 처리, 실패해도 로그인은 성공)
      sendActivityLog(
        loginAction,
        'login',
        0,
        userName
      ).then((result) => {
        if (result && result.success) {
          console.log(`✅ [LOGIN] Login log sent successfully for user: ${userName}`)
        } else {
          console.error(`❌ [LOGIN] Login log send returned failure for user: ${userName}`)
          console.error(`❌ [LOGIN] Result:`, JSON.stringify(result, null, 2))
        }
      }).catch(err => {
        // 로그 전송 실패는 무시 (비동기 처리)
        console.error(`❌ [LOGIN] Exception in sendActivityLog promise for user: ${userName}`)
        console.error(`❌ [LOGIN] Error message:`, err.message)
        console.error(`❌ [LOGIN] Error stack:`, err.stack)
        console.error(`❌ [LOGIN] Full error:`, err)
      })
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'auth.js:66', message: 'No user object in result', data: { result }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion
      console.warn('⚠️ [LOGIN] Login successful but no user object in result')
      console.warn('⚠️ [LOGIN] Result object:', JSON.stringify(result, null, 2))
    }

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'auth.js:70', message: 'Sending login response', data: { hasUser: !!result.user, userName: result.user?.name, username: result.user?.username }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    // 로그인 성공
    res.json({
      success: true,
      user: result.user
    })
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/9ba8d60d-8408-44f9-930a-ad25fb3670fc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'auth.js:75', message: 'Login API error', data: { error: error.message, stack: error.stack }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    console.error('Login API error:', error)
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    })
  }
})

/**
 * GET /api/auth/verify
 * 세션 토큰 검증 (선택사항)
 */
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '인증 토큰이 필요합니다.'
      })
    }

    const result = await verifySession(token)

    if (!result.success) {
      return res.status(401).json(result)
    }

    res.json({
      success: true,
      user: result.user
    })
  } catch (error) {
    console.error('Verify API error:', error)
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    })
  }
})

export default router
