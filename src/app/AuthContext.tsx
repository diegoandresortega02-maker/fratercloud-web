import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { getMyFraternityUser, amIPlatformAdmin, getMyPlanFeatures, type PlanFeatures } from '../lib/auth'
import type { FraternityUser } from '../lib/types'

interface AuthState {
  session: Session | null
  fraternityUser: FraternityUser | null
  /** El dueño del sistema. No pertenece a ninguna fraternidad. */
  isPlatformAdmin: boolean
  /** Qué funciones habilita el plan de la fraternidad. */
  features: PlanFeatures
  loading: boolean
  refreshFraternityUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [fraternityUser, setFraternityUser] = useState<FraternityUser | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [features, setFeatures] = useState<PlanFeatures>({})
  const [loading, setLoading] = useState(true)

  async function refreshFraternityUser() {
    // El dueño de la plataforma no tiene fila en fraternity_users, así que las
    // consultas son independientes: una sin resultado no invalida a las otras.
    const [fu, plataforma, feats] = await Promise.all([
      getMyFraternityUser(),
      amIPlatformAdmin(),
      getMyPlanFeatures().catch(() => ({}) as PlanFeatures),
    ])
    setFraternityUser(fu)
    setIsPlatformAdmin(plataforma)
    setFeatures(feats)
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
          setFeatures({})
        }
      } else {
        setFraternityUser(null)
        setIsPlatformAdmin(false)
        setFeatures({})
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, fraternityUser, isPlatformAdmin, features, loading, refreshFraternityUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
