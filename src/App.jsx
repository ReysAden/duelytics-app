import { supabase } from './lib/supabase'
import { useState, useEffect } from 'react'
import SessionSelector from './pages/SessionSelector/SessionSelector'

function App() {
  const [user, setUser] = useState(null)
  const [userRoles, setUserRoles] = useState({ isAdmin: false, isSupporter: false })
  const [loading, setLoading] = useState(true)

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
        throw error
      }
    } catch (error) {
      console.error('Login failed:', error)
      alert('Login failed: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="login-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <h1 className="loading-text">Duelytics</h1>
        </div>
      </div>
    )
  }

  if (user) {
    return <SessionSelector user={user} userRoles={userRoles} />
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="title">Duelytics</h1>
        <button className="discord-btn" onClick={handleDiscordLogin}>
          <img src="/src/public/Discord.svg" alt="Discord" className="discord-icon" />
          Login with Discord
        </button>
      </div>
      <footer className="footer">
        © 2025 Duelytics. All rights reserved.
      </footer>
    </div>
  )
}

export default App
