import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { getMyFraternityUser } from '../lib/auth'
import type { FraternityUser } from '../lib/types'

interface AuthState {
  session: Session | null
  fraternityUser: FraternityUser | null
  loading: boolean
  refreshFraternityUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [fraternityUser, setFraternityUser] = useState<FraternityUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshFraternityUser() {
    const fu = await getMyFraternityUser()
    setFraternityUser(fu)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      let activeSession = data.session
      if (activeSession) {
        try {
          await refreshFraternityUser()
        } catch {
          const { data: refreshed } = await supabase.auth.refreshSession()
          if (refreshed.session) {
            activeSession = refreshed.session
            try {
              await refreshFraternityUser()
            } catch {
              activeSession = null
            }
          } else {
            activeSession = null
          }
        }
      }
      setSession(activeSession)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        try {
          await refreshFraternityUser()
        } catch {
          setFraternityUser(null)
        }
      } else {
        setFraternityUser(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, fraternityUser, loading, refreshFraternityUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
