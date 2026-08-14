import { supabase } from './supabaseClient'

/**
 * Grupos dentro de una fraternidad.
 *
 * Cada grupo tiene su propia caja, aparte de la de la fraternidad: los aportes
 * y gastos de un grupo no entran ni salen de las arcas generales, igual que
 * pasa con la caja del bar.
 */

export interface Grupo {
  id: string
  name: string
  description: string | null
  opening_balance: number
  integrantes: number
  soyMiembro: boolean
  soyAdmin: boolean
  saldo: number | null
}

export interface IntegranteGrupo {
  member_id: string
  nombre: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface MovimientoGrupo {
  id: string
  type: 'ingreso' | 'egreso'
  amount: number
  description: string | null
  category: string | null
  member_id: string | null
  nombreMiembro: string | null
  date: string
}

/**
 * Si esta fraternidad organiza a sus fraternos en grupos.
 *
 * No es una función del plan sino algo que se habilita fraternidad por
 * fraternidad: solo tiene sentido donde la gente ya está dividida en grupos
 * (por barrio, por turnos), y en las demás sería una pantalla vacía.
 */
export async function gruposHabilitados(): Promise<boolean> {
  const { data, error } = await supabase.from('fraternities').select('groups_enabled').maybeSingle()
  if (error) throw error
  return data?.groups_enabled === true
}

/**
 * Todos los grupos de la fraternidad, con mi situación en cada uno.
 *
 * El saldo solo viene de los grupos a los que pertenezco: la política de la
 * base no deja leer los movimientos de un grupo ajeno, así que pedirlo para
 * todos devolvería ceros engañosos.
 */
export async function listarGrupos(): Promise<Grupo[]> {
  const [{ data: grupos, error }, { data: yo }] = await Promise.all([
    supabase
      .from('member_groups')
      .select('id, name, description, opening_balance, member_group_members(member_id, role)')
      .order('name'),
    supabase.rpc('get_my_member_id'),
  ])
  if (error) throw error

  const miId = yo as string | null

  const resultado: Grupo[] = (grupos ?? []).map((g) => {
    const integrantes = (g.member_group_members ?? []) as { member_id: string; role: string }[]
    const mio = integrantes.find((i) => i.member_id === miId)
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      opening_balance: Number(g.opening_balance),
      integrantes: integrantes.length,
      soyMiembro: !!mio,
      soyAdmin: mio?.role === 'admin',
      saldo: null,
    }
  })

  // El saldo se pide solo donde se puede leer.
  await Promise.all(
    resultado
      .filter((g) => g.soyMiembro)
      .map(async (g) => {
        const { data } = await supabase.rpc('member_group_balance', { p_group: g.id })
        g.saldo = data == null ? null : Number(data)
      }),
  )

  return resultado
}

export async function crearGrupo(
  nombre: string,
  descripcion: string,
  saldoInicial: number,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_member_group', {
    p_name: nombre,
    p_description: descripcion || null,
    p_opening_balance: saldoInicial || 0,
  })
  if (error) throw error
  return data as string
}

export async function unirmeAGrupo(grupoId: string): Promise<void> {
  const { error } = await supabase.rpc('join_member_group', { p_group: grupoId })
  if (error) throw error
}

export async function salirDelGrupo(grupoId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from('member_group_members')
    .delete()
    .eq('group_id', grupoId)
    .eq('member_id', memberId)
  if (error) throw error
}

export async function listarIntegrantes(grupoId: string): Promise<IntegranteGrupo[]> {
  const { data, error } = await supabase
    .from('member_group_members')
    .select('member_id, role, joined_at, fraternity_users(full_name)')
    .eq('group_id', grupoId)
  if (error) throw error

  return (data ?? [])
    .map((i) => ({
      member_id: i.member_id,
      role: i.role as 'admin' | 'member',
      joined_at: i.joined_at,
      nombre: (i as { fraternity_users?: { full_name?: string } }).fraternity_users?.full_name ?? '—',
    }))
    .sort((a, b) => (a.role === b.role ? a.nombre.localeCompare(b.nombre) : a.role === 'admin' ? -1 : 1))
}

/** Nombrar o quitar administrador dentro del grupo. */
export async function cambiarRolEnGrupo(
  grupoId: string,
  memberId: string,
  role: 'admin' | 'member',
): Promise<void> {
  const { error } = await supabase
    .from('member_group_members')
    .update({ role })
    .eq('group_id', grupoId)
    .eq('member_id', memberId)
  if (error) throw error
}

export async function listarMovimientos(grupoId: string): Promise<MovimientoGrupo[]> {
  const { data, error } = await supabase
    .from('member_group_transactions')
    // La tabla apunta dos veces a fraternity_users (a quién corresponde y quién
    // lo cargó), así que hay que nombrar la relación o PostgREST no sabe cuál.
    .select(
      'id, type, amount, description, category, member_id, date, fraternity_users!member_group_transactions_member_id_fkey(full_name)',
    )
    .eq('group_id', grupoId)
    .order('date', { ascending: false })
  if (error) throw error

  return (data ?? []).map((m) => ({
    id: m.id,
    type: m.type as 'ingreso' | 'egreso',
    amount: Number(m.amount),
    description: m.description,
    category: m.category,
    member_id: m.member_id,
    date: m.date,
    nombreMiembro:
      (m as { fraternity_users?: { full_name?: string } }).fraternity_users?.full_name ?? null,
  }))
}

export async function registrarMovimiento(
  grupoId: string,
  datos: {
    type: 'ingreso' | 'egreso'
    amount: number
    description: string
    category: string
    member_id: string | null
    date: string
  },
): Promise<void> {
  const { data: frat } = await supabase.from('fraternities').select('id').maybeSingle()
  if (!frat) throw new Error('No se pudo identificar la fraternidad')

  const { error } = await supabase.from('member_group_transactions').insert({
    fraternity_id: frat.id,
    group_id: grupoId,
    type: datos.type,
    amount: datos.amount,
    description: datos.description || null,
    category: datos.category || null,
    member_id: datos.member_id,
    date: datos.date,
  })
  if (error) throw error
}

export async function borrarMovimiento(id: string): Promise<void> {
  const { error } = await supabase.from('member_group_transactions').delete().eq('id', id)
  if (error) throw error
}
