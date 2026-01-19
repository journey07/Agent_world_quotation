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
        setUser(JSON.parse(savedUser))
      } catch (err) {
        console.error('Failed to parse user data:', err)
        localStorage.removeItem('user')
        localStorage.removeItem('userId')
      }
    }
    setLoading(false)
  }, [])

  const handleLoginSuccess = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('userId')
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
