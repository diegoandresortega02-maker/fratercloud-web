export type FraternityRole = 'admin' | 'member' | 'bar'
export type BarMovementKind = 'compra' | 'venta' | 'ajuste'
export type BarPaymentMode = 'contado' | 'cuenta'
export type MemberStatus = 'activo' | 'invitado' | 'retirado'
export type TurnStatus = 'pendiente' | 'ok' | 'suspendido'
export type DueStatus = 'pendiente' | 'pagado'
export type PaymentPlanStatus = 'activo' | 'completado'
export type TargetKind = 'monthly_due' | 'installment'
export type SubmissionStatus = 'pendiente' | 'aprobado' | 'rechazado'
export type ReservationStatus = 'confirmada' | 'cancelada'
export type TransactionType = 'ingreso' | 'egreso'
export type EventChargeMode = 'fijo' | 'libre'

export interface UsageFeeRules {
  free_uses: number
  mid_fee: number
  mid_until: number
  high_fee: number
}

export interface Fraternity {
  id: string
  name: string
  monthly_due_amount: number
  invite_code: string
  usage_fee_rules: UsageFeeRules | null
  gestion_name: string | null
  gestion_start: string | null
  debt_block_threshold: number
  created_at: string
}

export interface FraternityUser {
  id: string
  fraternity_id: string
  user_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  birth_date: string | null
  role: FraternityRole
  status: MemberStatus
  monthly_due_override: number | null
  entry_date: string | null
  notes: string | null
  terms_accepted_at: string | null
  created_at: string
}

export interface Turn {
  id: string
  fraternity_id: string
  member_id: string
  date: string
  status: TurnStatus
  replacement_member_id: string | null
  notes: string | null
  created_at: string
  member?: { full_name: string }
  replacement?: { full_name: string } | null
}

export interface MonthlyDue {
  id: string
  fraternity_id: string
  member_id: string
  period: string
  amount: number
  status: DueStatus
  paid_at: string | null
  created_at: string
  fraternity_users?: { full_name: string }
}

export interface PaymentPlan {
  id: string
  fraternity_id: string
  member_id: string
  reason: string
  total_amount: number
  installments_count: number
  status: PaymentPlanStatus
  created_by: string
  created_at: string
  fraternity_users?: { full_name: string }
}

export interface PaymentPlanInstallment {
  id: string
  fraternity_id: string
  plan_id: string
  installment_number: number
  due_date: string
  amount: number
  status: DueStatus
  paid_at: string | null
}

export interface PaymentSubmission {
  id: string
  fraternity_id: string
  member_id: string
  target_type: TargetKind
  target_id: string
  amount: number
  proof_image_path: string
  status: SubmissionStatus
  submitted_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  fraternity_users?: { full_name: string }
}

export interface Reservation {
  id: string
  fraternity_id: string
  member_id: string
  date: string
  start_time: string
  end_time: string
  notes: string | null
  status: ReservationStatus
  usage_fee: number | null
  created_at: string
  fraternity_users?: { full_name: string }
}

export interface BlockedDate {
  id: string
  fraternity_id: string
  date: string
  reason: string | null
  created_by: string
  created_at: string
}

export interface Transaction {
  id: string
  fraternity_id: string
  type: TransactionType
  category: string | null
  category_id: string | null
  account: string | null
  amount: number
  description: string | null
  date: string
  created_by: string | null
  member_id: string | null
  event_id: string | null
  related_payment_submission_id: string | null
  created_at: string
  fraternity_users?: { full_name: string } | null
}

export interface TransactionCategory {
  id: string
  fraternity_id: string
  kind: TransactionType
  name: string
  group_label: string | null
  created_at: string
}

export interface TransactionAccount {
  id: string
  fraternity_id: string
  name: string
  created_at: string
}

export interface FraternityEvent {
  id: string
  fraternity_id: string
  name: string
  description: string | null
  charge_mode: EventChargeMode
  amount_per_member: number | null
  event_date: string | null
  blocks_reservations: boolean
  is_open: boolean
  created_by: string | null
  created_at: string
}

export interface EventChargeRow {
  member_id: string
  full_name: string
  status: DueStatus
  amount: number
  installment_id: string
}

export interface EventContribution {
  id: string
  member_id: string | null
  member_name: string | null
  amount: number
  date: string
  description: string | null
}

export interface Receipt {
  id: string
  fraternity_id: string
  member_id: string
  receipt_number: number
  concept: string
  amount: number
  payment_date: string
  issued_by: string
  related_payment_submission_id: string | null
  related_target_type: TargetKind | null
  related_target_id: string | null
  created_at: string
  fraternity_users?: { full_name: string }
}

// ---------- Bar ----------

export interface BarItem {
  id: string
  fraternity_id: string
  name: string
  category: string
  unit: string
  cost_price: number
  sale_price: number
  stock: number
  low_stock_alert: number
  is_active: boolean
  created_at: string
}

export interface BarMovement {
  id: string
  fraternity_id: string
  kind: BarMovementKind
  item_id: string | null
  quantity: number
  unit_price: number
  total: number
  payment_mode: BarPaymentMode | null
  member_id: string | null
  settled: boolean
  cash_delta: number
  date: string
  notes: string | null
  created_by: string | null
  created_at: string
  bar_items?: { name: string; cost_price: number } | null
  member?: { full_name: string } | null
}

export interface BarCashCount {
  id: string
  fraternity_id: string
  date: string
  expected_cash: number
  actual_cash: number
  difference: number
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface BarStockCount {
  id: string
  fraternity_id: string
  date: string
  notes: string | null
  created_by: string | null
  created_at: string
  items?: BarStockCountItem[]
}

export interface BarStockCountItem {
  id: string
  count_id: string
  item_id: string
  expected_stock: number
  counted_stock: number
  difference: number
  reason: string | null
  bar_items?: { name: string } | null
}

export interface BarPendingMember {
  member_id: string
  full_name: string
  pending: number
}
