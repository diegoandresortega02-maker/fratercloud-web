import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createAssessment,
  createPaymentPlan,
  getFraternityMembers,
  getMemberDebtSummary,
  getMemberMonthlyDues,
  getMemberPaymentPlans,
  getMemberReceipts,
  getPlanInstallments,
  registerManualPayment,
  type DebtSummary,
} from '../../lib/api'
import type { FraternityUser, MonthlyDue, PaymentPlan, PaymentPlanInstallment, Receipt, TargetKind } from '../../lib/types'
import { monthName, toISODate } from '../../lib/dates'

function periodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)
  return `${monthName(month - 1)} de ${year}`
}

export default function DeudoresPage() {
  const [members, setMembers] = useState<FraternityUser[]>([])
  const [summaries, setSummaries] = useState<Record<string, DebtSummary>>({})
  const [loading, setLoading] = useState(true)
  const [planFor, setPlanFor] = useState<FraternityUser | null>(null)
  const [showAssessment, setShowAssessment] = useState(false)
  const [showFineModal, setShowFineModal] = useState(false)
  const [detailFor, setDetailFor] = useState<FraternityUser | null>(null)

  async function reload() {
    const m = await getFraternityMembers()
    setMembers(m)
    const entries = await Promise.all(m.map(async (mem) => [mem.id, await getMemberDebtSummary(mem.id)] as const))
    setSummaries(Object.fromEntries(entries))
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="p-8 text-sm text-slate-400">Cargando…</p>

  const debtors = members
    .filter((m) => (summaries[m.id]?.totalOwed ?? 0) > 0)
    .sort((a, b) => (summaries[b.id]?.totalOwed ?? 0) - (summaries[a.id]?.totalOwed ?? 0))

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-ink">Deudores</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFineModal(true)}
            className="text-sm font-medium text-white bg-brand-alert hover:opacity-90 rounded-control px-4 py-2"
          >
            + Multa o cargo individual
          </button>
          <button
            onClick={() => setShowAssessment(true)}
            className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
          >
            + Nueva cuota extraordinaria
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500 -mt-4 mb-6">
        La cuota extraordinaria se aplica a todos los activos. Una multa o cargo individual se aplica a un solo
        fraterno, esté o no al día — úsala también para inasistencias a turno u otros cargos puntuales.
      </p>

      <div className="bg-white rounded-card border border-surface-border divide-y divide-surface-border">
        {debtors.length === 0 && <p className="p-4 text-sm text-slate-400">No hay deudores actualmente.</p>}
        {debtors.map((m) => {
          const s = summaries[m.id]
          return (
            <div key={m.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">{m.full_name}</p>
                <p className="text-xs text-slate-400">
                  {s.pendingDuesCount} mensualidades · {s.pendingInstallmentsCount} cuotas pendientes
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-brand-gold">Bs {s.totalOwed.toFixed(2)}</span>
                {s.isBlocked && (
                  <span className="text-xs font-medium text-brand-alert bg-brand-alert/10 rounded-full px-2 py-0.5">
                    Bloqueado
                  </span>
                )}
                <button
                  onClick={() => setDetailFor(m)}
                  className="text-xs font-medium text-brand-primary hover:underline"
                >
                  Ver detalle
                </button>
                <button
                  onClick={() => setPlanFor(m)}
                  className="text-xs font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-full px-3 py-1"
                >
                  Crear plan de pago
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {planFor && (
        <PaymentPlanModal
          member={planFor}
          onClose={() => setPlanFor(null)}
          onDone={() => {
            setPlanFor(null)
            reload()
          }}
        />
      )}
      {showAssessment && (
        <AssessmentModal
          onClose={() => setShowAssessment(false)}
          onDone={() => {
            setShowAssessment(false)
            reload()
          }}
        />
      )}
      {detailFor && (
        <MemberDetailModal
          member={detailFor}
          onClose={() => setDetailFor(null)}
          onChanged={reload}
        />
      )}
      {showFineModal && (
        <FineMemberPickerModal
          members={members}
          onClose={() => setShowFineModal(false)}
          onDone={() => {
            setShowFineModal(false)
            reload()
          }}
        />
      )}
    </div>
  )
}

function FineMemberPickerModal({
  members,
  onClose,
  onDone,
}: {
  members: FraternityUser[]
  onClose: () => void
  onDone: () => void
}) {
  const [selected, setSelected] = useState<FraternityUser | null>(null)
  const active = members.filter((m) => m.status !== 'retirado').sort((a, b) => a.full_name.localeCompare(b.full_name))

  if (selected) {
    return <PaymentPlanModal member={selected} onClose={onClose} onDone={onDone} defaultReason="Multa — " />
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-1">Multa o cargo individual</h3>
        <p className="text-xs text-slate-400 mb-3">Elige a qué fraterno se le aplica.</p>
        <select
          onChange={(e) => setSelected(active.find((m) => m.id === e.target.value) ?? null)}
          defaultValue=""
          className="w-full rounded-control border border-surface-border px-3 py-2 text-sm mb-3"
        >
          <option value="" disabled>
            Selecciona un fraterno…
          </option>
          {active.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-control text-slate-500">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

function MemberDetailModal({
  member,
  onClose,
  onChanged,
}: {
  member: FraternityUser
  onClose: () => void
  onChanged: () => void
}) {
  const [dues, setDues] = useState<MonthlyDue[]>([])
  const [plans, setPlans] = useState<PaymentPlan[]>([])
  const [installmentsByPlan, setInstallmentsByPlan] = useState<Record<string, PaymentPlanInstallment[]>>({})
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [payTarget, setPayTarget] = useState<{ type: TargetKind; id: string; amount: number; label: string } | null>(
    null,
  )

  async function reload() {
    const [d, p, rec] = await Promise.all([
      getMemberMonthlyDues(member.id),
      getMemberPaymentPlans(member.id),
      getMemberReceipts(member.id),
    ])
    setDues(d)
    setPlans(p)
    setReceipts(rec)
    const installs = await Promise.all(p.map((plan) => getPlanInstallments(plan.id)))
    setInstallmentsByPlan(Object.fromEntries(p.map((plan, i) => [plan.id, installs[i]])))
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.id])

  const pendingDues = dues.filter((d) => d.status === 'pendiente')
  const paidDues = dues.filter((d) => d.status === 'pagado')

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-ink">{member.full_name}</h3>
          <div className="flex items-center gap-3">
            <Link
              to={`/estado-cuenta/${member.id}`}
              target="_blank"
              className="text-xs font-medium text-brand-primary hover:underline"
            >
              Imprimir estado de cuenta
            </Link>
            <button onClick={onClose} className="text-slate-400 hover:text-ink text-lg leading-none">
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : (
          <>
            <section className="mb-5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Mensualidades pendientes</h4>
              {pendingDues.length === 0 && <p className="text-sm text-slate-400">Al día.</p>}
              <div className="space-y-2">
                {pendingDues.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 bg-surface-warm rounded-control px-3 py-2">
                    <span className="text-sm text-ink">
                      {periodLabel(d.period)} · Bs {Number(d.amount).toFixed(2)}
                    </span>
                    <button
                      onClick={() =>
                        setPayTarget({ type: 'monthly_due', id: d.id, amount: Number(d.amount), label: periodLabel(d.period) })
                      }
                      className="text-xs font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-full px-3 py-1"
                    >
                      Registrar pago
                    </button>
                  </div>
                ))}
              </div>
              {paidDues.length > 0 && (
                <p className="text-xs text-slate-400 mt-2">{paidDues.length} mensualidades ya pagadas.</p>
              )}
            </section>

            {plans.map((plan) => {
              const installs = installmentsByPlan[plan.id] || []
              const pending = installs.filter((i) => i.status === 'pendiente')
              if (pending.length === 0) return null
              return (
                <section key={plan.id} className="mb-5">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">{plan.reason}</h4>
                  <div className="space-y-2">
                    {pending.map((inst) => (
                      <div
                        key={inst.id}
                        className="flex items-center justify-between gap-2 bg-surface-warm rounded-control px-3 py-2"
                      >
                        <span className="text-sm text-ink">
                          Cuota {inst.installment_number}/{plan.installments_count} · vence {inst.due_date} · Bs{' '}
                          {Number(inst.amount).toFixed(2)}
                        </span>
                        <button
                          onClick={() =>
                            setPayTarget({
                              type: 'installment',
                              id: inst.id,
                              amount: Number(inst.amount),
                              label: `${plan.reason} — cuota ${inst.installment_number}`,
                            })
                          }
                          className="text-xs font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-full px-3 py-1"
                        >
                          Registrar pago
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}

            {receipts.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Recibos emitidos</h4>
                <div className="space-y-1">
                  {receipts.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        N° {String(r.receipt_number).padStart(4, '0')} · {r.payment_date} · Bs{' '}
                        {Number(r.amount).toFixed(2)}
                      </span>
                      <Link to={`/recibos/${r.id}`} target="_blank" className="text-xs text-brand-primary hover:underline">
                        Ver
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {payTarget && (
          <ManualPaymentModal
            target={payTarget}
            onClose={() => setPayTarget(null)}
            onDone={() => {
              setPayTarget(null)
              reload()
              onChanged()
            }}
          />
        )}
      </div>
    </div>
  )
}

function ManualPaymentModal({
  target,
  onClose,
  onDone,
}: {
  target: { type: TargetKind; id: string; amount: number; label: string }
  onClose: () => void
  onDone: () => void
}) {
  const [amount, setAmount] = useState(String(target.amount))
  const [paymentDate, setPaymentDate] = useState(toISODate(new Date()))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const receiptId = await registerManualPayment(target.type, target.id, Number(amount), paymentDate, notes || null)
      window.open(`/recibos/${receiptId}`, '_blank')
      onDone()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-1">Registrar pago</h3>
        <p className="text-xs text-slate-400 mb-3">{target.label}</p>
        <div className="space-y-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Monto (Bs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha de pago</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notas (opcional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. pagó en efectivo"
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-control text-slate-500">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !amount}
            className="text-sm px-3 py-1.5 rounded-control bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium"
          >
            {loading ? 'Registrando…' : 'Registrar y emitir recibo'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PaymentPlanModal({
  member,
  onClose,
  onDone,
  defaultReason,
}: {
  member: FraternityUser
  onClose: () => void
  onDone: () => void
  defaultReason?: string
}) {
  const [reason, setReason] = useState(defaultReason ?? '')
  const [totalAmount, setTotalAmount] = useState('')
  const [installmentsCount, setInstallmentsCount] = useState(defaultReason ? '1' : '3')
  const [firstDueDate, setFirstDueDate] = useState(toISODate(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      await createPaymentPlan(member.id, reason, Number(totalAmount), Number(installmentsCount), firstDueDate)
      onDone()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo crear el plan de pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-3">
          {defaultReason ? 'Multa o cargo' : 'Plan de pago'} para {member.full_name}
        </h3>
        <div className="space-y-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Motivo</label>
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Mensualidades atrasadas, multa…"
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Monto total (Bs)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">N° de cuotas</label>
              <input
                type="number"
                min="1"
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(e.target.value)}
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Primera cuota vence</label>
            <input
              type="date"
              value={firstDueDate}
              onChange={(e) => setFirstDueDate(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-control text-slate-500">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason || !totalAmount}
            className="text-sm px-3 py-1.5 rounded-control bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium"
          >
            {loading ? 'Creando…' : 'Crear plan'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AssessmentModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(toISODate(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const count = await createAssessment(reason, Number(amount), dueDate)
      alert(`Cuota extraordinaria creada para ${count} fraternos activos.`)
      onDone()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuota extraordinaria')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-1">Nueva cuota extraordinaria</h3>
        <p className="text-xs text-slate-400 mb-3">
          Se aplicará a todos los fraternos activos como una deuda de una sola cuota.
        </p>
        <div className="space-y-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Concepto</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Cuota extraordinaria — equipamiento"
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Monto por fraterno (Bs)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Vence</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-control text-slate-500">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason || !amount}
            className="text-sm px-3 py-1.5 rounded-control bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium"
          >
            {loading ? 'Creando…' : 'Aplicar a todos'}
          </button>
        </div>
      </div>
    </div>
  )
}
