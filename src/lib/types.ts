export type FraternityRole = 'admin' | 'member'
export type MemberStatus = 'activo' | 'invitado' | 'retirado'
export type TurnStatus = 'pendiente' | 'ok' | 'suspendido'
export type DueStatus = 'pendiente' | 'pagado'
export type PaymentPlanStatus = 'activo' | 'completado'
export type TargetKind = 'monthly_due' | 'installment'
export type SubmissionStatus = 'pendiente' | 'aprobado' | 'rechazado'
export type ReservationStatus = 'confirmada' | 'cancelada'
export type TransactionType = 'ingreso' | 'egreso'

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
  account: string | null
  amount: number
  description: string | null
  date: string
  created_by: string | null
  member_id: string | null
  related_payment_submission_id: string | null
  created_at: string
  fraternity_users?: { full_name: string } | null
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
