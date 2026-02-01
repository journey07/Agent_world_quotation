// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useState, useEffect } from 'react'
import './index.css'
import App from './App.jsx'
import Login from './components/Login.jsx'

function Root() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // localStorage에서 사용자 정보 확인
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        // 세션 만료 체크 (매일 00시 KST 자동 로그아웃)
        const sessionExpiry = localStorage.getItem('sessionExpiry')
        if (sessionExpiry && Date.now() > parseInt(sessionExpiry)) {
          // 만료됨 - 자동 로그아웃
          console.log('🔒 세션 만료 - 자동 로그아웃')
          localStorage.removeItem('user')
          localStorage.removeItem('userId')
          localStorage.removeItem('sessionExpiry')
          setLoading(false)
          return
        }
        setUser(JSON.parse(savedUser))
      } catch (err) {
        console.error('Failed to parse user data:', err)
        localStorage.removeItem('user')
        localStorage.removeItem('userId')
        localStorage.removeItem('sessionExpiry')
      }
    }
    setLoading(false)
  }, [])

  const handleLoginSuccess = (userData) => {
    // 다음 날 00시(KST) 만료 시간 계산 및 저장
    const tomorrow = new Date()
    tomorrow.setHours(24, 0, 0, 0) // 다음 날 00:00:00
    localStorage.setItem('sessionExpiry', tomorrow.getTime().toString())
    console.log('🔐 세션 만료 시간 설정:', tomorrow.toLocaleString('ko-KR'))

    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('userId')
    localStorage.removeItem('sessionExpiry')
    setUser(null)
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--app-bg, #f8fafc)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="btn-spinner" style={{ 
            width: '32px', 
            height: '32px', 
            border: '3px solid rgba(30, 58, 138, 0.3)',
            borderTopColor: '#1e3a8a',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: 'var(--text-secondary, #475569)' }}>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return <App user={user} onLogout={handleLogout} />
}

console.log('🚀 Main entry point executing');

createRoot(document.getElementById('root')).render(
  <Root />
)
