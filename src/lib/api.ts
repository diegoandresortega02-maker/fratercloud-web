import { supabase } from './supabaseClient'
import type {
  BlockedDate,
  Fraternity,
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
  TransactionType,
  Turn,
  TurnStatus,
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

export async function updateMemberRole(memberId: string, role: 'admin' | 'member') {
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
    .select('*, member:fraternity_users!turns_member_id_fkey(full_name), replacement:fraternity_users!turns_replacement_member_id_fkey(full_name)')
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date')
  if (error) throw error
  return data
}

export async function generateTurnRotation(startDate: string, weeks: number): Promise<number> {
  const { data, error } = await supabase.rpc('generate_turn_rotation', {
    p_start_date: startDate,
    p_weeks: weeks,
  })
  if (error) throw error
  return data
}

export async function updateTurn(
  turnId: string,
  input: { status?: TurnStatus; replacement_member_id?: string | null; notes?: string | null },
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
  account?: string | null
  amount: number
  description?: string | null
  date: string
  member_id?: string | null
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
