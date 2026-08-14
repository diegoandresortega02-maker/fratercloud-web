import { supabase } from './supabaseClient'

/**
 * La membresía de la propia fraternidad: qué plan tiene, hasta cuándo, y los
 * comprobantes que subió para renovar.
 *
 * Es distinto de `api.ts`, que maneja lo que la fraternidad le cobra a sus
 * fraternos. Acá se trata de lo que la fraternidad le paga a FraterCloud.
 */

export type BillingCycle = 'anual' | 'semestral' | 'trimestral'

export interface MiPlan {
  code: string
  name: string
  description: string | null
  price_annual: number
  included_members: number
  extra_member_price: number
  max_extra_members: number | null
  max_admins: number
  features: Record<string, boolean>
}

export interface MiSuscripcion {
  status: 'prueba' | 'activa' | 'vencida' | 'cancelada'
  cycle: BillingCycle
  expires_at: string | null
  extra_members: number
  plans: MiPlan | null
}

export interface PagoMembresia {
  id: string
  amount: number
  cycle: BillingCycle
  status: 'pendiente' | 'aprobado' | 'rechazado'
  proof_url: string | null
  submitted_at: string
  reviewed_at: string | null
  review_notes: string | null
}

export interface DatosDeCobro {
  bank_name: string | null
  account_holder: string | null
  account_number: string | null
  qr_url: string | null
  qr_expires_on: string | null
  instructions: string | null
}

/**
 * A dónde le paga la fraternidad a FraterCloud.
 *
 * Vive en la base y no en el código porque el QR del banco caduca y la cuenta
 * puede cambiar: así se actualiza sin desplegar. La imagen del QR sí está en el
 * repositorio, así que reemplazarla es lo único que todavía pide un despliegue.
 */
export async function getDatosDeCobro(): Promise<DatosDeCobro | null> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('bank_name, account_holder, account_number, qr_url, qr_expires_on, instructions')
    .maybeSingle()
  if (error) throw error
  return (data as DatosDeCobro) ?? null
}

export interface CupoFraternos {
  cupo: number | null
  activos: number
}

/** Los planes públicos, para que una fraternidad nueva pueda elegir uno. */
export async function getPlanesDisponibles(): Promise<MiPlan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('code,name,description,price_annual,included_members,extra_member_price,max_extra_members,max_admins,features')
    .eq('is_public', true)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as MiPlan[]
}

/** Solo el administrador puede leerla: la política RLS lo exige. */
export async function getMiSuscripcion(): Promise<MiSuscripcion | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'status, cycle, expires_at, extra_members, plans(code,name,description,price_annual,included_members,extra_member_price,max_extra_members,max_admins,features)',
    )
    .maybeSingle()
  if (error) throw error
  return (data as unknown as MiSuscripcion) ?? null
}

export async function getMisPagosMembresia(): Promise<PagoMembresia[]> {
  const { data, error } = await supabase
    .from('subscription_payments')
    .select('id, amount, cycle, status, proof_url, submitted_at, reviewed_at, review_notes')
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PagoMembresia[]
}

export async function getCupoFraternos(): Promise<CupoFraternos> {
  const { data, error } = await supabase.rpc('my_member_quota')
  if (error) throw error
  return (data as CupoFraternos) ?? { cupo: null, activos: 0 }
}

/**
 * Sube el comprobante y registra el pago para que la plataforma lo revise.
 *
 * El archivo va al mismo bucket privado que usan los comprobantes de los
 * fraternos, pero bajo `membresia/` para no mezclarlos: son cosas distintas y
 * las revisa gente distinta.
 */
export async function registrarPagoMembresia(
  monto: number,
  ciclo: BillingCycle,
  archivo: File | null,
  planCode?: string,
): Promise<void> {
  const { data: frat } = await supabase.from('fraternities').select('id').maybeSingle()
  if (!frat) throw new Error('No se pudo identificar la fraternidad')

  let proofUrl: string | null = null
  if (archivo) {
    const ext = archivo.name.split('.').pop() || 'jpg'
    const path = `${frat.id}/membresia/${crypto.randomUUID()}.${ext}`
    const { error: errSubida } = await supabase.storage.from('payment-proofs').upload(path, archivo)
    if (errSubida) throw errSubida
    proofUrl = path
  }

  // El plan que se está pagando: el elegido si es un alta, o el vigente si es
  // una renovación. Va guardado en el pago porque es lo que la aprobación usa
  // para crear o actualizar la suscripción.
  let planId: string | null = null
  if (planCode) {
    const { data: p } = await supabase.from('plans').select('id').eq('code', planCode).maybeSingle()
    planId = p?.id ?? null
  } else {
    const { data: sus } = await supabase.from('subscriptions').select('plan_id').maybeSingle()
    planId = sus?.plan_id ?? null
  }

  const { error } = await supabase.from('subscription_payments').insert({
    fraternity_id: frat.id,
    plan_id: planId,
    amount: monto,
    cycle: ciclo,
    proof_url: proofUrl,
    status: 'pendiente',
  })
  if (error) throw error
}

export async function getUrlComprobante(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 600)
  if (error) throw error
  return data.signedUrl
}

/** Recargo de cada ciclo sobre el precio anual. */
export const RECARGOS: Record<BillingCycle, { pagos: number; factor: number; etiqueta: string }> = {
  anual: { pagos: 1, factor: 1, etiqueta: 'Anual' },
  semestral: { pagos: 2, factor: 1.1, etiqueta: 'Semestral (+10%)' },
  trimestral: { pagos: 4, factor: 1.2, etiqueta: 'Trimestral (+20%)' },
}

/** Mismo redondeo que la página pública, para que los montos coincidan. */
export function importePorPago(anual: number, ciclo: BillingCycle): number {
  const { factor, pagos } = RECARGOS[ciclo]
  return Math.round((anual * factor) / pagos / 5) * 5
}
