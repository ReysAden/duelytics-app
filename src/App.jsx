import { supabase } from './lib/supabase'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { Background } from './components/Background'
import SessionSelector from './pages/SessionSelector/SessionSelector'
import DuelRecords from './pages/DuelRecords/DuelRecords'
import ArchiveDuelRecords from './pages/DuelRecords/ArchiveDuelRecords'
import DiscordVerification from './pages/DiscordVerification/DiscordVerification'
import Titlebar from './components/Titlebar'
import { useAuth } from './contexts/AuthContext'
import UpdateNotification from './components/UpdateNotification'
import { useBackgroundPreference } from './hooks/useBackgroundPreference'

function App() {
  const { t } = useTranslation(['common'])
  const [loginLoading, setLoginLoading] = useState(false)
  const [backgroundUrl, setBackgroundUrl] = useState('https://onamlvzviwqkqlaejlra.supabase.co/storage/v1/object/public/backgrounds/Default_Background.jpg')
  const { user, userRoles, loading } = useAuth()
  
  // Fetch and cache user's background preference on login
  useBackgroundPreference(user)

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
      toast.error('Login failed: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <div className="loading-spinner" style={{ width: '64px', height: '64px' }}></div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '0.05em' }}>Duelytics</h1>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{
          style: {
            background: 'rgba(10, 10, 20, 0.95)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#0a0a14'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#0a0a14'
            }
          }
        }} />
        <Background backgroundUrl={backgroundUrl} />
        <UpdateNotification />
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: '32px' }}>
          <Titlebar />
        </div>
        <Router>
          <Routes>
            <Route path="/verify-discord" element={<DiscordVerification />} />
            <Route path="/sessions" element={<SessionSelector user={user} userRoles={userRoles} />} />
            <Route path="/" element={<Navigate to="/verify-discord" replace />} />
            <Route path="/session/:sessionId" element={<DuelRecords />} />
            <Route path="/archive/:sessionId" element={<ArchiveDuelRecords />} />
          </Routes>
        </Router>
      </>
    )
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: 'rgba(10, 10, 20, 0.95)',
          color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        },
        success: {
          iconTheme: {
            primary: '#4ade80',
            secondary: '#0a0a14'
          }
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#0a0a14'
          }
        }
      }} />
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
