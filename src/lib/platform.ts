import { supabase } from './supabaseClient'

/* Consultas del panel de plataforma (el dueño del sistema).
   Todo lo de acá depende de is_platform_admin(): si la sesión no es la del
   dueño, las políticas RLS devuelven cero filas en vez de error. */

export type EstadoSuscripcion = 'prueba' | 'activa' | 'vencida' | 'cancelada'
export type Ciclo = 'anual' | 'semestral' | 'trimestral'

export interface Plan {
  id: string
  code: string
  name: string
  description: string | null
  price_annual: number
  included_members: number
  extra_member_price: number
  max_extra_members: number | null
  max_admins: number
  features: Record<string, boolean>
  is_public: boolean
  sort_order: number
}

export interface FraternidadCliente {
  id: string
  nombre: string
  creada: string
  plan: string
  planCode: string
  estado: EstadoSuscripcion
  ciclo: Ciclo
  vence: string | null
  diasRestantes: number | null
  activos: number
  invitados: number
  retirados: number
  incluidos: number
  extras: number
  precioExtra: number
  /** Lo que corresponde cobrar en la próxima renovación. */
  aCobrar: number
}

export interface PagoMembresia {
  id: string
  fraternity_id: string
  fraternidad: string
  amount: number
  cycle: Ciclo
  proof_url: string | null
  status: 'pendiente' | 'aprobado' | 'rechazado'
  submitted_at: string
  reviewed_at: string | null
  review_notes: string | null
}

export interface FraternoDeCliente {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  birth_date: string | null
  role: string
  status: string
  entry_date: string | null
  acepto_terminos: boolean
  tiene_cuenta: boolean
}

function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const v = new Date(fecha + 'T00:00:00')
  return Math.round((v.getTime() - hoy.getTime()) / 86400000)
}

export async function listarPlanes(): Promise<Plan[]> {
  const { data, error } = await supabase.from('plans').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as Plan[]
}

export async function listarFraternidades(): Promise<FraternidadCliente[]> {
  // Se piden las tres piezas por separado y se cruzan acá: `fraternity_users`
  // no tiene relación declarada con `subscriptions`, así que un select anidado
  // no sirve para contar los miembros.
  const [frats, subs, planes, miembros] = await Promise.all([
    supabase.from('fraternities').select('id, name, created_at'),
    supabase.from('subscriptions').select('fraternity_id, plan_id, status, cycle, expires_at, extra_members'),
    listarPlanes(),
    supabase.from('fraternity_users').select('fraternity_id, status'),
  ])
  if (frats.error) throw frats.error
  if (subs.error) throw subs.error
  if (miembros.error) throw miembros.error

  const porPlan = new Map(planes.map((p) => [p.id, p]))
  const porFrat = new Map((subs.data ?? []).map((s) => [s.fraternity_id, s]))

  const conteo = new Map<string, { activo: number; invitado: number; retirado: number }>()
  for (const m of miembros.data ?? []) {
    const c = conteo.get(m.fraternity_id) ?? { activo: 0, invitado: 0, retirado: 0 }
    if (m.status === 'activo') c.activo++
    else if (m.status === 'invitado') c.invitado++
    else c.retirado++
    conteo.set(m.fraternity_id, c)
  }

  return (frats.data ?? [])
    .map((f) => {
      const s = porFrat.get(f.id)
      const plan = s ? porPlan.get(s.plan_id) : undefined
      const c = conteo.get(f.id) ?? { activo: 0, invitado: 0, retirado: 0 }
      const incluidos = plan?.included_members ?? 0
      // Solo los activos se cobran: invitados y retirados no cuentan.
      const extras = Math.max(0, c.activo - incluidos)
      const precioExtra = plan?.extra_member_price ?? 0

      return {
        id: f.id,
        nombre: f.name,
        creada: f.created_at,
        plan: plan?.name ?? '—',
        planCode: plan?.code ?? '',
        estado: (s?.status ?? 'prueba') as EstadoSuscripcion,
        ciclo: (s?.cycle ?? 'anual') as Ciclo,
        vence: s?.expires_at ?? null,
        diasRestantes: diasHasta(s?.expires_at ?? null),
        activos: c.activo,
        invitados: c.invitado,
        retirados: c.retirado,
        incluidos,
        extras,
        precioExtra,
        aCobrar: (plan?.price_annual ?? 0) + extras * precioExtra,
      }
    })
    .sort((a, b) => (a.diasRestantes ?? 99999) - (b.diasRestantes ?? 99999))
}

export async function listarPagos(): Promise<PagoMembresia[]> {
  // La relación se nombra explícitamente: subscription_payments tiene más de
  // una clave foránea hacia otras tablas y el join sin calificar es ambiguo.
  const { data, error } = await supabase
    .from('subscription_payments')
    .select('id, fraternity_id, amount, cycle, proof_url, status, submitted_at, reviewed_at, review_notes, fraternities(name)')
    .order('submitted_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map((p) => {
    const { fraternities, ...resto } = p as typeof p & { fraternities: { name: string } | null }
    return { ...resto, fraternidad: fraternities?.name ?? '—' } as PagoMembresia
  })
}

export async function listarFraternos(fraternityId: string): Promise<FraternoDeCliente[]> {
  const { data, error } = await supabase
    .from('fraternity_users')
    .select('id, full_name, email, phone, birth_date, role, status, entry_date, terms_accepted_at, user_id')
    .eq('fraternity_id', fraternityId)
    .order('full_name')
  if (error) throw error

  return (data ?? []).map((u) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    phone: u.phone,
    birth_date: u.birth_date,
    role: u.role,
    status: u.status,
    entry_date: u.entry_date,
    acepto_terminos: u.terms_accepted_at != null,
    tiene_cuenta: u.user_id != null,
  }))
}

/**
 * Avisa por correo al administrador de la fraternidad.
 *
 * Nunca hace fallar la revisión: si el correo no sale, el pago igual quedó
 * aprobado o rechazado en la base. Perder el aviso es molesto; perder la
 * aprobación sería grave.
 */
async function avisarPorCorreo(paymentId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('avisar-pago-membresia', {
      body: { paymentId },
    })
    if (error) throw error
    if (data && data.enviado === false) console.warn('Aviso no enviado:', data)
  } catch (err) {
    console.error('No se pudo enviar el aviso por correo', err)
  }
}

export async function aprobarPago(id: string, notas?: string) {
  const { error } = await supabase.rpc('approve_subscription_payment', {
    p_payment_id: id,
    p_notes: notas ?? null,
  })
  if (error) throw error
  await avisarPorCorreo(id)
}

export async function rechazarPago(id: string, notas?: string) {
  const { error } = await supabase.rpc('reject_subscription_payment', {
    p_payment_id: id,
    p_notes: notas ?? null,
  })
  if (error) throw error
  await avisarPorCorreo(id)
}

export async function ajustarSuscripcion(args: {
  fraternityId: string
  planCode: string
  ciclo: Ciclo
  vence: string
  extras?: number
  estado?: EstadoSuscripcion
}) {
  const { error } = await supabase.rpc('set_fraternity_subscription', {
    p_fraternity_id: args.fraternityId,
    p_plan_code: args.planCode,
    p_cycle: args.ciclo,
    p_expires_at: args.vence,
    p_extra_members: args.extras ?? 0,
    p_status: args.estado ?? 'activa',
  })
  if (error) throw error
}
