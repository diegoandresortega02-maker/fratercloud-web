import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import {
  createPaymentSubmission,
  getMemberDebtSummary,
  getMyFraternity,
  getMyMonthlyDues,
  getMyPaymentPlans,
  getMyPaymentSubmissions,
  getMyReceipts,
  getPlanInstallments,
  uploadPaymentProof,
  type DebtSummary,
} from '../../lib/api'
import type {
  Fraternity,
  MonthlyDue,
  PaymentPlan,
  PaymentPlanInstallment,
  PaymentSubmission,
  Receipt,
  TargetKind,
} from '../../lib/types'
import { monthName } from '../../lib/dates'

function periodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)
  return `${monthName(month - 1)} de ${year}`
}

export default function PagosPage() {
  const { fraternityUser } = useAuth()
  const [fraternity, setFraternity] = useState<Fraternity | null>(null)
  const [summary, setSummary] = useState<DebtSummary | null>(null)
  const [dues, setDues] = useState<MonthlyDue[]>([])
  const [plans, setPlans] = useState<PaymentPlan[]>([])
  const [installmentsByPlan, setInstallmentsByPlan] = useState<Record<string, PaymentPlanInstallment[]>>({})
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [uploadTarget, setUploadTarget] = useState<{ type: TargetKind; id: string; amount: number } | null>(null)
  const [loading, setLoading] = useState(true)

  async function reload() {
    if (!fraternityUser) return
    const [f, s, d, p, subs, rec] = await Promise.all([
      getMyFraternity(),
      getMemberDebtSummary(fraternityUser.id),
      getMyMonthlyDues(),
      getMyPaymentPlans(),
      getMyPaymentSubmissions(),
      getMyReceipts(),
    ])
    setFraternity(f)
    setSummary(s)
    setDues(d)
    setPlans(p)
    setSubmissions(subs)
    setReceipts(rec)
    const installs = await Promise.all(p.map((plan) => getPlanInstallments(plan.id)))
    setInstallmentsByPlan(Object.fromEntries(p.map((plan, i) => [plan.id, installs[i]])))
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fraternityUser])

  function submissionFor(targetType: TargetKind, targetId: string) {
    return submissions.find((s) => s.target_type === targetType && s.target_id === targetId)
  }

  if (loading) return <p className="p-8 text-sm text-slate-400">Cargando…</p>

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink mb-6">Pagos — estado de cuenta</h1>

      <div className="bg-white rounded-card border border-surface-border p-5 mb-6 flex flex-wrap gap-6">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Total adeudado</p>
          <p className={`text-2xl font-semibold ${summary?.totalOwed ? 'text-brand-gold' : 'text-brand-primary'}`}>
            Bs {summary?.totalOwed.toFixed(2) ?? '0.00'}
          </p>
          {summary && summary.totalOwed > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Mensualidades: Bs {summary.pendingDuesAmount.toFixed(2)} · Otras cuotas: Bs{' '}
              {summary.pendingInstallmentsAmount.toFixed(2)}
            </p>
          )}
        </div>
        {summary?.isBlocked && (
          <div className="flex-1 flex items-center">
            <p className="text-sm text-brand-alert font-medium">
              Tienes {fraternity?.debt_block_threshold ?? 2} o más periodos pendientes: no puedes hacer reservas hasta
              ponerte al día.
            </p>
          </div>
        )}
      </div>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-ink mb-3">Aportes mensuales</h2>
        <div className="bg-white rounded-card border border-surface-border divide-y divide-surface-border">
          {dues.length === 0 && <p className="p-4 text-sm text-slate-400">Aún no hay aportes generados.</p>}
          {dues.map((due) => {
            const sub = submissionFor('monthly_due', due.id)
            return (
              <div key={due.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{periodLabel(due.period)}</p>
                  <p className="text-xs text-slate-400">Bs {Number(due.amount).toFixed(2)}</p>
                </div>
                <StatusOrUpload
                  status={due.status}
                  submission={sub}
                  onUpload={() => setUploadTarget({ type: 'monthly_due', id: due.id, amount: Number(due.amount) })}
                />
              </div>
            )
          })}
        </div>
      </section>

      {plans.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-ink mb-3">Planes de pago</h2>
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-card border border-surface-border mb-3">
              <div className="p-4 border-b border-surface-border">
                <p className="text-sm font-medium text-ink">{plan.reason}</p>
                <p className="text-xs text-slate-400">
                  Bs {Number(plan.total_amount).toFixed(2)} en {plan.installments_count} cuotas
                </p>
              </div>
              <div className="divide-y divide-surface-border">
                {(installmentsByPlan[plan.id] || []).map((inst) => {
                  const sub = submissionFor('installment', inst.id)
                  return (
                    <div key={inst.id} className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-ink">Cuota {inst.installment_number}</p>
                        <p className="text-xs text-slate-400">
                          Vence {inst.due_date} · Bs {Number(inst.amount).toFixed(2)}
                        </p>
                      </div>
                      <StatusOrUpload
                        status={inst.status}
                        submission={sub}
                        onUpload={() => setUploadTarget({ type: 'installment', id: inst.id, amount: Number(inst.amount) })}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {receipts.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-ink mb-3">Pagos efectuados</h2>
          <div className="bg-white rounded-card border border-surface-border divide-y divide-surface-border">
            {receipts.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{r.concept}</p>
                  <p className="text-xs text-slate-400">
                    N° {String(r.receipt_number).padStart(4, '0')} · {r.payment_date} · Bs {Number(r.amount).toFixed(2)}
                  </p>
                </div>
                <Link
                  to={`/recibos/${r.id}`}
                  target="_blank"
                  className="text-xs font-medium text-brand-primary hover:underline"
                >
                  Ver recibo
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {uploadTarget && (
        <UploadModal
          target={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onDone={() => {
            setUploadTarget(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function StatusOrUpload({
  status,
  submission,
  onUpload,
}: {
  status: string
  submission?: PaymentSubmission
  onUpload: () => void
}) {
  if (status === 'pagado') {
    return <span className="text-xs font-medium text-brand-primary bg-brand-primary/10 rounded-full px-3 py-1">Pagado</span>
  }
  if (submission?.status === 'pendiente') {
    return <span className="text-xs font-medium text-brand-gold bg-brand-gold/10 rounded-full px-3 py-1">En revisión</span>
  }
  if (submission?.status === 'rechazado') {
    return (
      <button
        onClick={onUpload}
        className="text-xs font-medium text-brand-alert bg-brand-alert/10 rounded-full px-3 py-1"
      >
        Rechazado · reintentar
      </button>
    )
  }
  return (
    <button
      onClick={onUpload}
      className="text-xs font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-full px-3 py-1"
    >
      Subir comprobante
    </button>
  )
}

function UploadModal({
  target,
  onClose,
  onDone,
}: {
  target: { type: TargetKind; id: string; amount: number }
  onClose: () => void
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      const path = await uploadPaymentProof(file)
      await createPaymentSubmission(target.type, target.id, target.amount, path)
      onDone()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error al subir el comprobante')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-3">Subir comprobante de pago</h3>
        <p className="text-sm text-slate-500 mb-3">Monto: Bs {target.amount.toFixed(2)}</p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm mb-3"
        />
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-control text-slate-500">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            className="text-sm px-3 py-1.5 rounded-control bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium"
          >
            {loading ? 'Subiendo…' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
