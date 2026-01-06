import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { API_URL } from '../config/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRoles, setUserRoles] = useState({ isAdmin: false, isSupporter: false })
  const [loading, setLoading] = useState(true)
  const [guildMemberVerified, setGuildMemberVerified] = useState(null)
  const [verificationLoading, setVerificationLoading] = useState(false)

  // Sync user roles from backend
  const syncUserRoles = async (session) => {
    try {
      const response = await fetch(`${API_URL}/auth/sync`, {
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

  // Verify guild membership - only call if not already verified
  const verifyGuildMembership = async (session) => {
    // Check memory cache first
    if (guildMemberVerified !== null) {
      return guildMemberVerified
    }

    // Check localStorage cache (persists across page reloads)
    const cachedResult = localStorage.getItem(`guild_verified_${session.user.id}`)
    if (cachedResult !== null) {
      const isVerified = cachedResult === 'true'
      setGuildMemberVerified(isVerified)
      return isVerified
    }

    setVerificationLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/check-guild`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        console.error('Guild check failed:', response.status)
        setGuildMemberVerified(false)
        return false
      }
      
      const data = await response.json()
      
      // Cache result in memory AND localStorage
      setGuildMemberVerified(data.isGuildMember)
      localStorage.setItem(`guild_verified_${session.user.id}`, String(data.isGuildMember))
      
      return data.isGuildMember
    } catch (error) {
      console.error('Failed to verify guild membership:', error)
      setGuildMemberVerified(false)
      return false
    } finally {
      setVerificationLoading(false)
    }
  }

  // Reset verification when user logs out
  const resetVerification = () => {
    setGuildMemberVerified(null)
    // Clear localStorage cache for all users
    Object.keys(localStorage)
      .filter(key => key.startsWith('guild_verified_'))
      .forEach(key => localStorage.removeItem(key))
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
    
    // Handle deep link OAuth callback (for Electron)
    const handleDeepLink = async (url) => {
      // Extract the full callback URL from the deep link
      // Format: duelytics://auth/callback?code=...&...  
      const callbackUrl = url.replace('duelytics://auth/callback', 'https://temp.com')
      const urlObj = new URL(callbackUrl)
      
      // Check if we have OAuth params
      if (urlObj.searchParams.get('code') || urlObj.searchParams.get('access_token')) {
        try {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(urlObj.searchParams.get('code'))
          
          if (error) throw error
          
          if (data.session) {
            setUser(data.session.user)
            await syncUserRoles(data.session)
          }
        } catch (err) {
          console.error('Deep link auth error:', err)
        }
      }
    }
    
    // Listen for deep links from Electron
    if (window.electron && window.electronAPI?.onDeepLink) {
      const removeListener = window.electronAPI.onDeepLink(handleDeepLink)
      return () => {
        removeListener()
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        syncUserRoles(session)
        resetVerification() // Reset verification on new sign-in
      }
      
      if (event === 'SIGNED_OUT') {
        setUserRoles({ isAdmin: false, isSupporter: false })
        resetVerification()
      }
      
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        userRoles,
        loading,
        guildMemberVerified,
        verificationLoading,
        verifyGuildMembership,
        resetVerification
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
