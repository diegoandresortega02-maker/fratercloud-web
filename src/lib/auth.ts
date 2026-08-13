import { supabase } from './supabaseClient'
import type { FraternityUser } from './types'

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/** ¿La sesión actual es la del dueño del sistema? */
export async function amIPlatformAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_platform_admin')
  if (error) {
    console.error('No se pudo verificar el rol de plataforma', error)
    return false
  }
  return data === true
}

/** Envía el correo con el enlace para elegir una contraseña nueva. */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/restablecer-password`,
  })
  if (error) throw error
}

/** Fija la contraseña nueva. Requiere la sesión que crea el enlace del correo. */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

/** Interruptores del plan de mi fraternidad. */
export type PlanFeatures = Record<string, boolean>

/**
 * Qué funciones tiene habilitadas mi fraternidad según su plan.
 *
 * Va por RPC y no leyendo `subscriptions` a propósito: la suscripción solo la
 * puede leer el administrador, pero el encargado del bar también necesita saber
 * si su módulo está habilitado. Esto le da los interruptores sin mostrarle
 * cuánto paga la fraternidad ni cuándo vence.
 */
export async function getMyPlanFeatures(): Promise<PlanFeatures> {
  const { data, error } = await supabase.rpc('my_plan_features')
  if (error) throw error
  return (data as PlanFeatures) ?? {}
}

export interface SubscriptionState {
  estado: string
  vigente: boolean
  vence?: string | null
  dias_restantes?: number | null
}

/** Estado de la suscripción, para avisar antes de que una operación falle. */
export async function getMySubscriptionState(): Promise<SubscriptionState> {
  const { data, error } = await supabase.rpc('my_subscription_state')
  if (error) throw error
  return (data as SubscriptionState) ?? { estado: 'desconocido', vigente: true }
}

export type EmailAccountStatus = 'unknown' | 'has_account' | 'no_account'

/** Deja constancia de un intento fallido. Nunca debe romper el flujo de login. */
export async function recordFailedLogin(email: string) {
  try {
    await supabase.rpc('record_failed_login', { p_email: email })
  } catch (err) {
    console.error('No se pudo registrar el intento fallido', err)
  }
}

/**
 * Pregunta si el correo tiene cuenta. El servidor solo responde algo distinto
 * de 'unknown' después de 4 intentos fallidos recientes con ese mismo correo,
 * así que no sirve para averiguar quién está registrado sin fallar antes.
 */
export async function getEmailAccountStatus(email: string): Promise<EmailAccountStatus> {
  try {
    const { data, error } = await supabase.rpc('email_account_status', { p_email: email })
    if (error) throw error
    return (data as EmailAccountStatus) ?? 'unknown'
  } catch (err) {
    console.error('No se pudo consultar el estado del correo', err)
    return 'unknown'
  }
}

export async function getMyFraternityUser(): Promise<FraternityUser | null> {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) return null

  const { data, error } = await supabase
    .from('fraternity_users')
    .select('*')
    .eq('user_id', sessionData.session.user.id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function registerFraternity(fraternityName: string, adminFullName: string, termsAccepted: boolean) {
  const { data, error } = await supabase.rpc('register_fraternity', {
    p_fraternity_name: fraternityName,
    p_admin_full_name: adminFullName,
    p_terms_accepted: termsAccepted,
  })
  if (error) throw error
  return data
}

export async function joinFraternityWithCode(
  code: string,
  fullName: string,
  birthDate: string | null,
  termsAccepted: boolean,
) {
  const { data, error } = await supabase.rpc('join_fraternity_with_code', {
    p_code: code,
    p_full_name: fullName,
    p_birth_date: birthDate,
    p_terms_accepted: termsAccepted,
  })
  if (error) throw error
  return data
}
