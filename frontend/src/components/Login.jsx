import { useState } from 'react'
import './Login.css'

// API URL 가져오기 (Vercel Backend 사용)
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api/quote', '').replace('/api/auth', '')
  }
  // 프로덕션 환경에서는 Vercel Backend URL 사용
  if (import.meta.env.PROD || window.location.hostname.includes('vercel.app') || window.location.hostname.includes('supersquad.kr')) {
    return 'https://world-quotation-backend.vercel.app'
  }
  return 'http://localhost:3001'
}

const API_URL = getApiUrl()

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      // 네트워크 에러 확인
      if (!response.ok && response.status === 0) {
        throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.')
      }

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '로그인에 실패했습니다.')
      }

      if (data.user) {
        // 사용자 정보를 localStorage에 저장
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('userId', data.user.id)
        onLoginSuccess(data.user)
      }
    } catch (err) {
      console.error('Login error:', err)
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        setError('서버에 연결할 수 없습니다. 백엔드 서버(http://localhost:3001)가 실행 중인지 확인해주세요.')
      } else {
        setError(err.message || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">월드락커 견적 에이전트</h1>
          <p className="login-subtitle">World Locker Quotation Agent</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">아이디</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                로그인 중...
              </>
            ) : (
              'Start'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
