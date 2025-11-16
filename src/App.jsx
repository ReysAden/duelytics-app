import { supabase } from './lib/supabase'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Background } from './components/Background'
import SessionSelector from './pages/SessionSelector/SessionSelector'
import DuelRecords from './pages/DuelRecords/DuelRecords'
import Titlebar from './components/Titlebar'

function App() {
  const { t } = useTranslation(['common'])
  const [user, setUser] = useState(null)
  const [userRoles, setUserRoles] = useState({ isAdmin: false, isSupporter: false })
  const [loading, setLoading] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [backgroundUrl, setBackgroundUrl] = useState('https://onamlvzviwqkqlaejlra.supabase.co/storage/v1/object/public/backgrounds/Default_Background.jpg')

  // Function to sync user roles from backend
  const syncUserRoles = async (session) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.user) {
        setUserRoles({
          isAdmin: data.user.is_admin || false,
          isSupporter: data.user.is_supporter || false
        })
      }
    } catch (error) {
      console.error('Failed to sync user roles:', error)
    }
  }

  useEffect(() => {
    // Handle OAuth callback manually
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      
      // Check if we have OAuth callback params
      if (urlParams.get('code') || hashParams.get('access_token')) {
        try {
          const { data, error } = await supabase.auth.getSession()
          
          if (data.session) {
            setUser(data.session.user)
            await syncUserRoles(data.session)
            window.history.replaceState({}, document.title, window.location.pathname)
            setLoading(false)
            return
          }
        } catch (err) {
          console.error('Session recovery error:', err)
        }
      }
      
      // Regular session check
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        await syncUserRoles(session)
      }
      
      setUser(session?.user ?? null)
      setLoading(false)
    }
    
    handleAuthCallback()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        syncUserRoles(session)
      }
      
      if (event === 'SIGNED_OUT') {
        setUserRoles({ isAdmin: false, isSupporter: false })
      }
      
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleDiscordLogin = async () => {
    setLoginLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          skipBrowserRedirect: false,
          redirectTo: window.location.origin
        }
      })
      
      if (error) {
        console.error('Login error:', error)
        setLoginLoading(false)
        throw error
      }
    } catch (error) {
      console.error('Login failed:', error)
      setLoginLoading(false)
      alert('Login failed: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-950 to-slate-900">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-white rounded-full animate-spin"></div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Duelytics</h1>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <>
        <Background backgroundUrl={backgroundUrl} />
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: '32px' }}>
          <Titlebar />
        </div>
        <Router>
          <Routes>
            <Route path="/" element={<SessionSelector user={user} userRoles={userRoles} />} />
            <Route path="/session/:sessionId" element={<DuelRecords />} />
          </Routes>
        </Router>
      </>
    )
  }

  return (
    <>
      <Background backgroundUrl={backgroundUrl} />
    <div style={{ position: 'relative', height: '100vh' }}>
      {/* Background handled by useBackground hook */}
      
      {/* White Card - Centered */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          height: '320px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          justifyContent: 'space-between'
        }}
      >
        <div>
          {/* Title */}
          <h1 style={{ margin: '0 0 20px 0', textAlign: 'center', color: '#000', fontSize: '24px', fontWeight: 'bold' }}>Duelytics</h1>
          
          {/* Tab Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            {/* Sign-in Tab */}
            <button
              style={{
                padding: '8px 0',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: '2px solid #ff4444',
                color: '#000',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Sign-in
            </button>
          </div>
          
          {/* Login Button */}
          <button
            onClick={handleDiscordLogin}
            disabled={loginLoading}
            style={{
              width: '100%',
              padding: '10px 20px',
              backgroundColor: loginLoading ? '#666' : '#000',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: loginLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loginLoading ? 0.7 : 1
            }}
          >
            {loginLoading ? (
              <>
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                {t('auth.loggingIn')}
              </>
            ) : (
              <>
                <img src="/src/public/Discord.svg" alt="Discord" style={{ width: '14px', height: '14px' }} />
                {t('auth.loginWithDiscord')}
              </>
            )}
          </button>
        </div>
        
        {/* Copyright */}
        <footer style={{
          textAlign: 'center',
          fontSize: '10px',
          color: '#000000',
          marginTop: '12px'
        }}>
          © 2025 Duelytics. All rights reserved.
        </footer>
      </div>
      
      {/* Titlebar overlays on top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <Titlebar />
      </div>
    </div>
    </>
  )
}

export default App
