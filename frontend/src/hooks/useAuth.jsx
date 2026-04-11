import { createContext, startTransition, useContext, useEffect, useState } from 'react'
import {
  signInWithGoogle,
  signInWithPassword,
  signOutSession,
  signUpWithPassword,
} from '../services/auth.js'
import { fetchMyProfile } from '../services/api.js'
import { supabase } from '../services/supabase.js'

const AuthContext = createContext(null)

async function resolveProfile(session) {
  if (!session?.access_token) {
    return null
  }

  try {
    return await fetchMyProfile(session.access_token)
  } catch {
    return session.user
      ? {
          id: session.user.id,
          email: session.user.email,
          has_sms: false,
        }
      : null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function initializeAuth() {
      const { data, error } = await supabase.auth.getSession()

      if (!active) {
        return
      }

      if (error) {
        setSession(null)
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      const nextSession = data.session ?? null
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setProfile(await resolveProfile(nextSession))
      setLoading(false)
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      startTransition(() => {
        setSession(nextSession ?? null)
        setUser(nextSession?.user ?? null)
      })

      resolveProfile(nextSession).then((nextProfile) => {
        if (active) {
          setProfile(nextProfile)
          setLoading(false)
        }
      })
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function login(email, password) {
    setLoading(true)
    try {
      const data = await signInWithPassword({ email, password })
      setSession(data.session ?? null)
      setUser(data.user ?? null)
      setProfile(await resolveProfile(data.session))
      return data
    } finally {
      setLoading(false)
    }
  }

  async function register(email, password) {
    setLoading(true)
    try {
      const data = await signUpWithPassword({ email, password })
      setSession(data.session ?? null)
      setUser(data.user ?? null)
      setProfile(await resolveProfile(data.session))
      return data
    } finally {
      setLoading(false)
    }
  }

  async function loginWithGoogle() {
    setLoading(true)
    try {
      return await signInWithGoogle()
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    setLoading(true)
    try {
      await signOutSession()
      setSession(null)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
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