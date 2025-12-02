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
      const isDesktopApp = window.location.protocol === 'file:'
      
      if (isDesktopApp) {
        // Desktop app OAuth flow - generate unique session ID
        const sessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
        
        // Store session ID in localStorage so we can identify this login attempt
        localStorage.setItem('pending_desktop_auth', sessionId)
        
        const redirectTo = `https://duelytics-app-production.up.railway.app/api/auth/callback?desktop=${sessionId}`
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'discord',
          options: {
            skipBrowserRedirect: false,
            redirectTo: redirectTo
          }
        })
        
        if (error) throw error
        
        // OAuth URL opens in browser, now poll for session
        let attempts = 0
        const maxAttempts = 60 // 2 minutes (2 seconds * 60)
        
        const pollInterval = setInterval(async () => {
          attempts++
          
          try {
            const response = await fetch(`https://duelytics-app-production.up.railway.app/api/auth/desktop-session/${sessionId}`)
            
            if (response.ok) {
              const callbackData = await response.json()
              clearInterval(pollInterval)
              localStorage.removeItem('pending_desktop_auth')
              
              // Exchange the code for a session using Supabase (it has the code_verifier)
              const { data, error } = await supabase.auth.exchangeCodeForSession(callbackData.code)
              
              if (error) {
                console.error('Code exchange error:', error)
                setLoginLoading(false)
                toast.error('Login failed: ' + error.message)
                return
              }
              
              setLoginLoading(false)
              toast.success('Login successful!')
            } else if (attempts >= maxAttempts) {
              clearInterval(pollInterval)
              localStorage.removeItem('pending_desktop_auth')
              setLoginLoading(false)
              toast.error('Login timeout. Please try again.')
            }
          } catch (err) {
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval)
              localStorage.removeItem('pending_desktop_auth')
              setLoginLoading(false)
              toast.error('Login failed. Please try again.')
            }
          }
        }, 2000)
      } else {
        // Web app flow
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
                <svg width="14" height="14" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '14px', height: '14px' }}>
                  <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white"/>
                </svg>
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
