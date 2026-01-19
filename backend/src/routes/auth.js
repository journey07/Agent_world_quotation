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
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '아이디와 비밀번호를 입력해주세요.'
      })
    }

    const result = await loginWithUsername(username, password)

    if (!result.success) {
      return res.status(401).json(result)
    }

    // 로그인 성공 시 Dashboard로 로그 전송
    if (result.user) {
      const userName = result.user.name || result.user.username || 'Unknown'
      console.log(`🔐 Login successful for user: ${userName} (${result.user.username})`)
      console.log(`📤 Sending login log to Dashboard with userName: ${userName}`)
      
      // 로그 전송 (비동기 처리, 실패해도 로그인은 성공)
      sendActivityLog(
        `🔐 User login: ${userName}`,
        'success',
        0,
        userName
      ).then(() => {
        console.log(`✅ Login log sent successfully for user: ${userName}`)
      }).catch(err => {
        // 로그 전송 실패는 무시 (비동기 처리)
        console.error('❌ Failed to send login log to dashboard:', err.message)
        console.error('Full error:', err)
      })
    }

    // 로그인 성공
    res.json({
      success: true,
      user: result.user
    })
  } catch (error) {
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
