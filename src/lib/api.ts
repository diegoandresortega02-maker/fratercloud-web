import { supabase } from './supabaseClient'
import type {
  BarCashCount,
  BarItem,
  BarMovement,
  BarMovementKind,
  BarPaymentMode,
  BarPendingMember,
  BarStockCount,
  BlockedDate,
  DueStatus,
  Fraternity,
  FraternityRole,
  FraternityUser,
  MemberStatus,
  MonthlyDue,
  PaymentPlan,
  PaymentPlanInstallment,
  PaymentSubmission,
  Receipt,
  Reservation,
  TargetKind,
  Transaction,
  TransactionAccount,
  TransactionCategory,
  TransactionType,
  Turn,
  TurnStatus,
  EventChargeMode,
  EventChargeRow,
  EventContribution,
  FraternityEvent,
} from './types'

async function getMyFraternityIdOrThrow(): Promise<string> {
  const { data, error } = await supabase.rpc('get_my_fraternity_id')
  if (error) throw error
  if (!data) throw new Error('El usuario no pertenece a ninguna fraternidad')
  return data
}

async function getMyMemberIdOrThrow(): Promise<string> {
  const { data, error } = await supabase.rpc('get_my_member_id')
  if (error) throw error
  if (!data) throw new Error('El usuario no pertenece a ninguna fraternidad')
  return data
}

// ---------- Fraternity ----------

export async function getMyFraternity(): Promise<Fraternity> {
  const fraternityId = await getMyFraternityIdOrThrow()
  const { data, error } = await supabase.from('fraternities').select('*').eq('id', fraternityId).single()
  if (error) throw error
  return data
}

export async function updateFraternityDueAmount(amount: number) {
  const fraternityId = await getMyFraternityIdOrThrow()
  const { error } = await supabase.from('fraternities').update({ monthly_due_amount: amount }).eq('id', fraternityId)
  if (error) throw error
}

export async function updateFraternitySettings(input: {
  gestion_name?: string | null
  gestion_start?: string | null
  debt_block_threshold?: number
}) {
  const fraternityId = await getMyFraternityIdOrThrow()
  const { error } = await supabase.from('fraternities').update(input).eq('id', fraternityId)
  if (error) throw error
}

export async function getFraternityMembers(): Promise<FraternityUser[]> {
  const { data, error } = await supabase.from('fraternity_users').select('*').order('full_name')
  if (error) throw error
  return data
}

export async function updateMemberRole(memberId: string, role: FraternityRole) {
  const { error } = await supabase.from('fraternity_users').update({ role }).eq('id', memberId)
  if (error) throw error
}

export interface MemberInput {
  full_name: string
  email?: string | null
  status?: MemberStatus
  entry_date?: string | null
  birth_date?: string | null
  monthly_due_override?: number | null
  notes?: string | null
}

export async function adminAddMember(input: MemberInput): Promise<string> {
  const { data, error } = await supabase.rpc('admin_add_member', {
    p_full_name: input.full_name,
    p_email: input.email ?? null,
    p_status: input.status ?? 'activo',
    p_entry_date: input.entry_date ?? null,
    p_birth_date: input.birth_date ?? null,
    p_monthly_due_override: input.monthly_due_override ?? null,
    p_notes: input.notes ?? null,
  })
  if (error) throw error
  return data
}

export async function adminUpdateMember(
  memberId: string,
  input: Omit<MemberInput, 'full_name'> & { clear_override?: boolean },
) {
  const { error } = await supabase.rpc('admin_update_member', {
    p_member_id: memberId,
    p_email: input.email ?? null,
    p_status: input.status ?? null,
    p_entry_date: input.entry_date ?? null,
    p_birth_date: input.birth_date ?? null,
    p_monthly_due_override: input.monthly_due_override ?? null,
    p_notes: input.notes ?? null,
    p_clear_override: input.clear_override ?? false,
  })
  if (error) throw error
}

// ---------- Cuotas extraordinarias ----------

export async function createAssessment(reason: string, amount: number, dueDate: string): Promise<number> {
  const { data, error } = await supabase.rpc('create_assessment', {
    p_reason: reason,
    p_amount: amount,
    p_due_date: dueDate,
  })
  if (error) throw error
  return data
}

// ---------- Turnos ----------

export async function getTurns(fromDate: string, toDate: string): Promise<Turn[]> {
  const { data, error } = await supabase
    .from('turns')
    .select('*, member:fraternity_users!turns_member_id_fkey(full_name), replacement:fraternity_users!turns_replacement_member_id_fkey(full_name), grupo:member_groups(name)')
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date')
  if (error) throw error
  return data
}

/** Un turno a crear: o le toca a un fraterno, o le toca a un grupo. */
export interface NuevoTurno {
  date: string
  member_id?: string | null
  group_id?: string | null
  notes?: string | null
}

/**
 * Crea turnos, de a uno o de a muchos.
 *
 * El calendario se arma en la pantalla y se guarda tal cual se ve: no hay un
 * generador en el servidor decidiendo por su cuenta a quién le toca cada fecha.
 */
export async function crearTurnos(turnos: NuevoTurno[]): Promise<number> {
  const { data: frat } = await supabase.from('fraternities').select('id').maybeSingle()
  if (!frat) throw new Error('No se pudo identificar la fraternidad')

  const { data, error } = await supabase
    .from('turns')
    .insert(
      turnos.map((t) => ({
        fraternity_id: frat.id,
        date: t.date,
        member_id: t.member_id ?? null,
        group_id: t.group_id ?? null,
        notes: t.notes ?? null,
      })),
    )
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}

/** Mover un turno de fecha. Si el día está tomado, los dos se intercambian. */
export async function moverTurno(
  turnId: string,
  fecha: string,
): Promise<{ intercambio: boolean; con?: string }> {
  const { data, error } = await supabase.rpc('move_turn', { p_turn: turnId, p_date: fecha })
  if (error) throw error
  return data as { intercambio: boolean; con?: string }
}

/** Quién del grupo cubre ese turno. Lo puede fijar cualquier integrante. */
export async function setTurnResponsible(turnId: string, memberId: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_turn_responsible', {
    p_turn: turnId,
    p_member: memberId,
  })
  if (error) throw error
}

export async function updateTurn(
  turnId: string,
  input: {
    status?: TurnStatus
    member_id?: string | null
    replacement_member_id?: string | null
    notes?: string | null
  },
) {
  const { error } = await supabase.from('turns').update(input).eq('id', turnId)
  if (error) throw error
}

export async function deleteTurn(turnId: string) {
  const { error } = await supabase.from('turns').delete().eq('id', turnId)
  if (error) throw error
}

// ---------- Monthly dues ----------

export async function getMyMonthlyDues(): Promise<MonthlyDue[]> {
  const memberId = await getMyMemberIdOrThrow()
  const { data, error } = await supabase
    .from('monthly_dues')
    .select('*')
    .eq('member_id', memberId)
    .order('period', { ascending: false })
  if (error) throw error
  return data
}

export async function getMemberMonthlyDues(memberId: string): Promise<MonthlyDue[]> {
  const { data, error } = await supabase
    .from('monthly_dues')
    .select('*')
    .eq('member_id', memberId)
    .order('period', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllMonthlyDues(): Promise<MonthlyDue[]> {
  const { data, error } = await supabase
    .from('monthly_dues')
    .select('*, fraternity_users(full_name)')
    .order('period', { ascending: false })
  if (error) throw error
  return data
}

// ---------- Payment plans ----------

export async function getMyPaymentPlans(): Promise<PaymentPlan[]> {
  const memberId = await getMyMemberIdOrThrow()
  const { data, error } = await supabase
    .from('payment_plans')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getMemberPaymentPlans(memberId: string): Promise<PaymentPlan[]> {
  const { data, error } = await supabase
    .from('payment_plans')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllPaymentPlans(): Promise<PaymentPlan[]> {
  const { data, error } = await supabase
    .from('payment_plans')
    .select('*, fraternity_users!payment_plans_member_id_fkey(full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getPlanInstallments(planId: string): Promise<PaymentPlanInstallment[]> {
  const { data, error } = await supabase
    .from('payment_plan_installments')
    .select('*')
    .eq('plan_id', planId)
    .order('installment_number')
  if (error) throw error
  return data
}

export async function createPaymentPlan(
  memberId: string,
  reason: string,
  totalAmount: number,
  installmentsCount: number,
  firstDueDate: string,
) {
  const { error } = await supabase.rpc('create_payment_plan', {
    p_member_id: memberId,
    p_reason: reason,
    p_total_amount: totalAmount,
    p_installments_count: installmentsCount,
    p_first_due_date: firstDueDate,
  })
  if (error) throw error
}

// ---------- Debt summary ----------

export interface DebtSummary {
  pendingDuesCount: number
  pendingDuesAmount: number
  pendingInstallmentsCount: number
  pendingInstallmentsAmount: number
  totalOwed: number
  isBlocked: boolean
}

export async function getMemberDebtSummary(memberId: string): Promise<DebtSummary> {
  const [{ data: dues, error: duesError }, { data: plans, error: plansError }] = await Promise.all([
    supabase.from('monthly_dues').select('amount, status').eq('member_id', memberId),
    supabase.from('payment_plans').select('id').eq('member_id', memberId),
  ])
  if (duesError) throw duesError
  if (plansError) throw plansError

  const pendingDues = (dues || []).filter((d) => d.status === 'pendiente')

  let installments: { amount: number; status: string }[] = []
  if (plans && plans.length > 0) {
    const { data, error } = await supabase
      .from('payment_plan_installments')
      .select('amount, status')
      .in(
        'plan_id',
        plans.map((p) => p.id),
      )
    if (error) throw error
    installments = data || []
  }
  const pendingInstallments = installments.filter((i) => i.status === 'pendiente')

  const { data: isBlocked, error: blockedError } = await supabase.rpc('member_is_blocked', { p_member_id: memberId })
  if (blockedError) throw blockedError

  const pendingDuesAmount = pendingDues.reduce((sum, d) => sum + Number(d.amount), 0)
  const pendingInstallmentsAmount = pendingInstallments.reduce((sum, i) => sum + Number(i.amount), 0)

  return {
    pendingDuesCount: pendingDues.length,
    pendingDuesAmount,
    pendingInstallmentsCount: pendingInstallments.length,
    pendingInstallmentsAmount,
    totalOwed: pendingDuesAmount + pendingInstallmentsAmount,
    isBlocked: !!isBlocked,
  }
}

// ---------- Payment submissions (comprobantes) ----------

export async function uploadPaymentProof(file: File): Promise<string> {
  const fraternityId = await getMyFraternityIdOrThrow()
  const memberId = await getMyMemberIdOrThrow()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${fraternityId}/${memberId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('payment-proofs').upload(path, file)
  if (error) throw error
  return path
}

export async function getPaymentProofUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 60 * 10)
  if (error) throw error
  return data.signedUrl
}

export async function createPaymentSubmission(
  targetType: TargetKind,
  targetId: string,
  amount: number,
  proofImagePath: string,
): Promise<PaymentSubmission> {
  const fraternityId = await getMyFraternityIdOrThrow()
  const memberId = await getMyMemberIdOrThrow()
  const { data, error } = await supabase
    .from('payment_submissions')
    .insert({
      fraternity_id: fraternityId,
      member_id: memberId,
      target_type: targetType,
      target_id: targetId,
      amount,
      proof_image_path: proofImagePath,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMyPaymentSubmissions(): Promise<PaymentSubmission[]> {
  const memberId = await getMyMemberIdOrThrow()
  const { data, error } = await supabase
    .from('payment_submissions')
    .select('*')
    .eq('member_id', memberId)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getPendingPaymentSubmissions(): Promise<PaymentSubmission[]> {
  const { data, error } = await supabase
    .from('payment_submissions')
    .select('*, fraternity_users!payment_submissions_member_id_fkey(full_name)')
    .eq('status', 'pendiente')
    .order('submitted_at')
  if (error) throw error
  return data
}

export async function approvePaymentSubmission(submissionId: string, notes?: string) {
  const { error } = await supabase.rpc('approve_payment_submission', {
    p_submission_id: submissionId,
    p_notes: notes ?? null,
  })
  if (error) throw error
}

export async function rejectPaymentSubmission(submissionId: string, notes?: string) {
  const { error } = await supabase.rpc('reject_payment_submission', {
    p_submission_id: submissionId,
    p_notes: notes ?? null,
  })
  if (error) throw error
}

// ---------- Reservations ----------

export async function getReservations(fromDate: string, toDate: string): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, fraternity_users(full_name)')
    .gte('date', fromDate)
    .lte('date', toDate)
    .eq('status', 'confirmada')
    .order('date')
  if (error) throw error
  return data
}

export type ReservationInput = {
  date: string
  start_time: string
  end_time: string
  notes?: string | null
}

export async function createReservation(input: ReservationInput): Promise<Reservation> {
  const fraternityId = await getMyFraternityIdOrThrow()
  const memberId = await getMyMemberIdOrThrow()
  const { data, error } = await supabase
    .from('reservations')
    .insert({ ...input, fraternity_id: fraternityId, member_id: memberId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function countMyReservationsInYear(year: number): Promise<number> {
  const memberId = await getMyMemberIdOrThrow()
  const { count, error } = await supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .eq('status', 'confirmada')
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
  if (error) throw error
  return count ?? 0
}

export async function cancelReservation(id: string) {
  const { error } = await supabase.from('reservations').update({ status: 'cancelada' }).eq('id', id)
  if (error) throw error
}

// ---------- Blocked dates ----------

export async function getBlockedDates(fromDate: string, toDate: string): Promise<BlockedDate[]> {
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date')
  if (error) throw error
  return data
}

export async function createBlockedDate(date: string, reason: string | null): Promise<BlockedDate> {
  const fraternityId = await getMyFraternityIdOrThrow()
  const memberId = await getMyMemberIdOrThrow()
  const { data, error } = await supabase
    .from('blocked_dates')
    .insert({ fraternity_id: fraternityId, date, reason, created_by: memberId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBlockedDate(id: string) {
  const { error } = await supabase.from('blocked_dates').delete().eq('id', id)
  if (error) throw error
}

// ---------- Transactions (ingresos y egresos) ----------

export async function getTransactions(fromDate: string, toDate: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, fraternity_users!transactions_member_id_fkey(full_name)')
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export type TransactionInput = {
  type: TransactionType
  category?: string | null
  category_id?: string | null
  account?: string | null
  amount: number
  description?: string | null
  date: string
  member_id?: string | null
  event_id?: string | null
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const fraternityId = await getMyFraternityIdOrThrow()
  const memberId = await getMyMemberIdOrThrow()
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...input, fraternity_id: fraternityId, created_by: memberId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

// ---------- Managed categories & accounts ----------

export async function getTransactionCategories(): Promise<TransactionCategory[]> {
  const { data, error } = await supabase
    .from('transaction_categories')
    .select('*')
    .order('group_label', { nullsFirst: true })
    .order('name')
  if (error) throw error
  return data
}

export async function createTransactionCategory(input: {
  kind: TransactionType
  name: string
  group_label?: string | null
}): Promise<TransactionCategory> {
  const fraternityId = await getMyFraternityIdOrThrow()
  const { data, error } = await supabase
    .from('transaction_categories')
    .insert({ fraternity_id: fraternityId, kind: input.kind, name: input.name, group_label: input.group_label ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTransactionCategory(
  id: string,
  input: { name?: string; group_label?: string | null },
) {
  const { error } = await supabase.from('transaction_categories').update(input).eq('id', id)
  if (error) throw error
}

export async function deleteTransactionCategory(id: string) {
  const { error } = await supabase.from('transaction_categories').delete().eq('id', id)
  if (error) throw error
}

export async function getTransactionAccounts(): Promise<TransactionAccount[]> {
  const { data, error } = await supabase.from('transaction_accounts').select('*').order('name')
  if (error) throw error
  return data
}

export async function createTransactionAccount(name: string): Promise<TransactionAccount> {
  const fraternityId = await getMyFraternityIdOrThrow()
  const { data, error } = await supabase
    .from('transaction_accounts')
    .insert({ fraternity_id: fraternityId, name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTransactionAccount(id: string) {
  const { error } = await supabase.from('transaction_accounts').delete().eq('id', id)
  if (error) throw error
}

// ---------- Eventos extraordinarios ----------

export async function getEvents(): Promise<FraternityEvent[]> {
  const { data, error } = await supabase
    .from('fraternity_events')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getEvent(id: string): Promise<FraternityEvent> {
  const { data, error } = await supabase.from('fraternity_events').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createEvent(input: {
  name: string
  description?: string | null
  charge_mode: EventChargeMode
  amount_per_member?: number | null
  event_date?: string | null
  blocks_reservations?: boolean
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_event', {
    p_name: input.name,
    p_description: input.description ?? null,
    p_charge_mode: input.charge_mode,
    p_amount_per_member: input.amount_per_member ?? null,
    p_event_date: input.event_date ?? null,
    p_blocks_reservations: input.blocks_reservations ?? false,
  })
  if (error) throw error
  return data
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from('fraternity_events').delete().eq('id', id)
  if (error) throw error
}

// Roster of every active member's charge status for a 'fijo' event.
// SECURITY DEFINER RPC so every member sees the full roster (transparency),
// not just their own row (base-table RLS is own-or-admin).
export async function getEventChargeStatus(eventId: string): Promise<EventChargeRow[]> {
  const { data, error } = await supabase.rpc('get_event_roster', { p_event_id: eventId })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    installment_id: r.installment_id,
    amount: Number(r.amount),
    status: r.status,
    member_id: r.member_id,
    full_name: r.full_name ?? '—',
  }))
}

// Contributions recorded against a 'libre' event (same transparency rationale)
export async function getEventContributions(eventId: string): Promise<EventContribution[]> {
  const { data, error } = await supabase.rpc('get_event_contributions', { p_event_id: eventId })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    date: r.date,
    description: r.description,
    member_id: r.member_id,
    member_name: r.member_name ?? null,
  }))
}

// ---------- Pago manual del tesorero ----------

export async function registerManualPayment(
  targetType: TargetKind,
  targetId: string,
  amount: number,
  paymentDate: string,
  notes?: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('register_manual_payment', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_amount: amount,
    p_payment_date: paymentDate,
    p_notes: notes ?? null,
  })
  if (error) throw error
  return data
}

// ---------- Recibos ----------

export async function getMyReceipts(): Promise<Receipt[]> {
  const memberId = await getMyMemberIdOrThrow()
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('member_id', memberId)
    .order('receipt_number', { ascending: false })
  if (error) throw error
  return data
}

export async function getMemberReceipts(memberId: string): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('member_id', memberId)
    .order('receipt_number', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllReceipts(): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*, fraternity_users!receipts_member_id_fkey(full_name)')
    .order('receipt_number', { ascending: false })
  if (error) throw error
  return data
}

export async function getReceiptById(id: string): Promise<Receipt> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*, fraternity_users!receipts_member_id_fkey(full_name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// ---------- Consultas masivas (para el exportador Excel) ----------
// Traen todo el historial de la fraternidad en una sola consulta cada una,
// evitando el patrón N+1 de las funciones por-miembro/por-plan.

export async function getAllTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, fraternity_users!transactions_member_id_fkey(full_name)')
    .order('date', { ascending: true })
  if (error) throw error
  return data
}

export interface PlanInstallmentRow {
  id: string
  plan_id: string
  installment_number: number
  due_date: string
  amount: number
  status: DueStatus
  paid_at: string | null
  member_id: string
  member_name: string
  reason: string
  installments_count: number
  total_amount: number
  event_id: string | null
}

export async function getAllPlanInstallments(): Promise<PlanInstallmentRow[]> {
  const { data, error } = await supabase
    .from('payment_plan_installments')
    .select(
      'id, plan_id, installment_number, due_date, amount, status, paid_at, payment_plans!inner(member_id, reason, installments_count, total_amount, event_id, fraternity_users!payment_plans_member_id_fkey(full_name))',
    )
    .order('due_date')
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id: r.id,
    plan_id: r.plan_id,
    installment_number: r.installment_number,
    due_date: r.due_date,
    amount: Number(r.amount),
    status: r.status,
    paid_at: r.paid_at,
    member_id: r.payment_plans.member_id,
    member_name: r.payment_plans.fraternity_users?.full_name ?? '—',
    reason: r.payment_plans.reason,
    installments_count: r.payment_plans.installments_count,
    total_amount: Number(r.payment_plans.total_amount),
    event_id: r.payment_plans.event_id,
  }))
}

export async function getAllReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, fraternity_users(full_name)')
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllBlockedDates(): Promise<BlockedDate[]> {
  const { data, error } = await supabase.from('blocked_dates').select('*').order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllTurns(): Promise<Turn[]> {
  const { data, error } = await supabase
    .from('turns')
    .select(
      '*, member:fraternity_users!turns_member_id_fkey(full_name), replacement:fraternity_users!turns_replacement_member_id_fkey(full_name)',
    )
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

// ---------- Bar ----------

export async function getBarItems(): Promise<BarItem[]> {
  const { data, error } = await supabase.from('bar_items').select('*').order('name')
  if (error) throw error
  return data
}

export type BarItemInput = {
  name: string
  category?: string
  unit?: string
  cost_price: number
  sale_price: number
  low_stock_alert?: number
}

export async function createBarItem(input: BarItemInput): Promise<BarItem> {
  const fraternityId = await getMyFraternityIdOrThrow()
  const { data, error } = await supabase
    .from('bar_items')
    .insert({ ...input, fraternity_id: fraternityId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBarItem(id: string, input: Partial<BarItemInput> & { is_active?: boolean }) {
  const { error } = await supabase.from('bar_items').update(input).eq('id', id)
  if (error) throw error
}

export async function deleteBarItem(id: string) {
  const { error } = await supabase.from('bar_items').delete().eq('id', id)
  if (error) throw error
}

export async function getBarMovements(fromDate?: string, toDate?: string): Promise<BarMovement[]> {
  // member_id y created_by apuntan ambos a fraternity_users → hay que calificar el join.
  let q = supabase
    .from('bar_movements')
    .select('*, bar_items(name, cost_price), member:fraternity_users!bar_movements_member_id_fkey(full_name)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (fromDate) q = q.gte('date', fromDate)
  if (toDate) q = q.lte('date', toDate)
  const { data, error } = await q
  if (error) throw error
  return data as unknown as BarMovement[]
}

export type BarMovementInput = {
  kind: BarMovementKind
  item_id?: string | null
  quantity: number
  unit_price: number
  payment_mode?: BarPaymentMode | null
  member_id?: string | null
  date: string
  notes?: string | null
  cash_delta?: number
}

export async function createBarMovement(input: BarMovementInput): Promise<BarMovement> {
  const fraternityId = await getMyFraternityIdOrThrow()
  const memberId = await getMyMemberIdOrThrow()
  const { data, error } = await supabase
    .from('bar_movements')
    .insert({ ...input, fraternity_id: fraternityId, created_by: memberId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBarMovement(id: string) {
  const { error } = await supabase.from('bar_movements').delete().eq('id', id)
  if (error) throw error
}

export async function getBarCashBalance(): Promise<number> {
  const { data, error } = await supabase.rpc('bar_cash_balance')
  if (error) throw error
  return Number(data ?? 0)
}

export async function getBarPendingByMember(): Promise<BarPendingMember[]> {
  const { data, error } = await supabase.rpc('bar_pending_by_member')
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((r) => ({
    member_id: r.member_id,
    full_name: r.full_name,
    pending: Number(r.pending),
  }))
}

export async function settleBarMember(memberId: string): Promise<number> {
  const { data, error } = await supabase.rpc('bar_settle_member', { p_member_id: memberId })
  if (error) throw error
  return Number(data ?? 0)
}

export async function getBarCashCounts(): Promise<BarCashCount[]> {
  const { data, error } = await supabase
    .from('bar_cash_counts')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function createBarCashCount(input: {
  date: string
  expected_cash: number
  actual_cash: number
  notes?: string | null
}): Promise<BarCashCount> {
  const fraternityId = await getMyFraternityIdOrThrow()
  const memberId = await getMyMemberIdOrThrow()
  const { data, error } = await supabase
    .from('bar_cash_counts')
    .insert({ ...input, fraternity_id: fraternityId, created_by: memberId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getBarStockCounts(): Promise<BarStockCount[]> {
  const { data, error } = await supabase
    .from('bar_stock_counts')
    .select('*, items:bar_stock_count_items(*, bar_items(name))')
    .order('date', { ascending: false })
  if (error) throw error
  return data as unknown as BarStockCount[]
}

/**
 * Registra un conteo físico. Por cada ítem con diferencia crea también un
 * movimiento 'ajuste' para que el stock del sistema coincida con lo contado.
 */
export async function createBarStockCount(
  date: string,
  notes: string | null,
  rows: { item_id: string; expected_stock: number; counted_stock: number; reason?: string | null }[],
): Promise<void> {
  const fraternityId = await getMyFraternityIdOrThrow()
  const memberId = await getMyMemberIdOrThrow()

  const { data: count, error: countError } = await supabase
    .from('bar_stock_counts')
    .insert({ fraternity_id: fraternityId, date, notes, created_by: memberId })
    .select()
    .single()
  if (countError) throw countError

  const { error: itemsError } = await supabase.from('bar_stock_count_items').insert(
    rows.map((r) => ({
      fraternity_id: fraternityId,
      count_id: count.id,
      item_id: r.item_id,
      expected_stock: r.expected_stock,
      counted_stock: r.counted_stock,
      reason: r.reason ?? null,
    })),
  )
  if (itemsError) throw itemsError

  const adjustments = rows
    .filter((r) => r.counted_stock !== r.expected_stock)
    .map((r) => ({
      fraternity_id: fraternityId,
      kind: 'ajuste' as const,
      item_id: r.item_id,
      quantity: r.counted_stock - r.expected_stock,
      unit_price: 0,
      cash_delta: 0,
      date,
      notes: r.reason ? `Arqueo de stock: ${r.reason}` : 'Ajuste por conteo físico',
      created_by: memberId,
    }))
  if (adjustments.length > 0) {
    const { error } = await supabase.from('bar_movements').insert(adjustments)
    if (error) throw error
  }
}

export async function barAnnualTransfer(amount: number, account: string, date: string): Promise<string> {
  const { data, error } = await supabase.rpc('bar_annual_transfer', {
    p_amount: amount,
    p_account: account,
    p_date: date,
  })
  if (error) throw error
  return data
}

/**
 * El encargado de bar no tiene permiso de escritura sobre `fraternities`
 * (RLS: solo admin), y un UPDATE bloqueado por RLS no lanza error —
 * simplemente no afecta filas. Por eso va por RPC, que valida el rol.
 */
export async function updateBarOpeningBalance(amount: number) {
  const { error } = await supabase.rpc('set_bar_opening_balance', { p_amount: amount })
  if (error) throw error
}
