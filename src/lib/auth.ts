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
