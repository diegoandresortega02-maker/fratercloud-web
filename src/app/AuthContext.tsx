import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { getMyFraternityUser, amIPlatformAdmin } from '../lib/auth'
import type { FraternityUser } from '../lib/types'

interface AuthState {
  session: Session | null
  fraternityUser: FraternityUser | null
  /** El dueño del sistema. No pertenece a ninguna fraternidad. */
  isPlatformAdmin: boolean
  loading: boolean
  refreshFraternityUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [fraternityUser, setFraternityUser] = useState<FraternityUser | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function refreshFraternityUser() {
    // El dueño de la plataforma no tiene fila en fraternity_users, así que las
    // dos consultas son independientes: una sin resultado no invalida la otra.
    const [fu, plataforma] = await Promise.all([getMyFraternityUser(), amIPlatformAdmin()])
    setFraternityUser(fu)
    setIsPlatformAdmin(plataforma)
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
          setIsPlatformAdmin(false)
        }
      } else {
        setFraternityUser(null)
        setIsPlatformAdmin(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, fraternityUser, isPlatformAdmin, loading, refreshFraternityUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
