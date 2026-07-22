import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getFraternityMembers,
  getMemberDebtSummary,
  getMemberMonthlyDues,
  getMemberPaymentPlans,
  getMyFraternity,
  getPlanInstallments,
  type DebtSummary,
} from '../../lib/api'
import type { Fraternity, FraternityUser, MonthlyDue, PaymentPlan, PaymentPlanInstallment } from '../../lib/types'
import { monthName } from '../../lib/dates'
import logoLockup from '../../assets/brand/logo-lockup.png'

function periodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)
  return `${monthName(month - 1)} de ${year}`
}

export default function PrintMemberStatementView() {
  const { memberId } = useParams<{ memberId: string }>()
  const [fraternity, setFraternity] = useState<Fraternity | null>(null)
  const [member, setMember] = useState<FraternityUser | null>(null)
  const [summary, setSummary] = useState<DebtSummary | null>(null)
  const [dues, setDues] = useState<MonthlyDue[]>([])
  const [plans, setPlans] = useState<PaymentPlan[]>([])
  const [installmentsByPlan, setInstallmentsByPlan] = useState<Record<string, PaymentPlanInstallment[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!memberId) return
    Promise.all([
      getMyFraternity(),
      getFraternityMembers(),
      getMemberDebtSummary(memberId),
      getMemberMonthlyDues(memberId),
      getMemberPaymentPlans(memberId),
    ]).then(async ([f, members, s, d, p]) => {
      setFraternity(f)
      setMember(members.find((m) => m.id === memberId) ?? null)
      setSummary(s)
      setDues(d)
      setPlans(p)
      const installs = await Promise.all(p.map((plan) => getPlanInstallments(plan.id)))
      setInstallmentsByPlan(Object.fromEntries(p.map((plan, i) => [plan.id, installs[i]])))
      setLoading(false)
    })
  }, [memberId])

  if (loading) return <p className="p-8 text-sm text-slate-400">Cargando…</p>
  if (!member || !fraternity) return <p className="p-8 text-sm text-brand-alert">No encontrado</p>

  const pendingDues = dues.filter((d) => d.status === 'pendiente')
  const paidDues = dues.filter((d) => d.status === 'pagado')

  return (
    <div className="min-h-screen bg-surface-muted py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end mb-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
          >
            Imprimir / Guardar PDF
          </button>
        </div>

        <div className="bg-white rounded-card border border-surface-border p-8 print:border-0 print:rounded-none">
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-surface-border">
            <img src={logoLockup} alt="FraterCloud" className="h-8 w-auto" />
            <div className="text-right">
              <p className="text-xs text-slate-400">Estado de cuenta</p>
              <p className="text-sm font-semibold text-ink">{new Date().toLocaleDateString('es-BO')}</p>
            </div>
          </div>

          <h1 className="text-lg font-bold text-ink mb-1">{fraternity.name}</h1>
          <p className="text-sm text-slate-500 mb-6">{member.full_name}</p>

          <div className="bg-surface-warm rounded-control p-4 flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-ink">Total adeudado</span>
            <span className="text-2xl font-bold text-brand-gold">Bs {summary?.totalOwed.toFixed(2) ?? '0.00'}</span>
          </div>

          <section className="mb-6">
            <h2 className="text-xs font-semibold text-slate-500 uppercase mb-2">Mensualidades pendientes</h2>
            {pendingDues.length === 0 ? (
              <p className="text-sm text-slate-400">Sin mensualidades pendientes.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {pendingDues.map((d) => (
                    <tr key={d.id} className="border-b border-surface-border">
                      <td className="py-1.5 text-ink">{periodLabel(d.period)}</td>
                      <td className="py-1.5 text-right text-ink">Bs {Number(d.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {plans.map((plan) => {
            const installs = installmentsByPlan[plan.id] || []
            const pending = installs.filter((i) => i.status === 'pendiente')
            if (pending.length === 0) return null
            return (
              <section key={plan.id} className="mb-6">
                <h2 className="text-xs font-semibold text-slate-500 uppercase mb-2">{plan.reason}</h2>
                <table className="w-full text-sm">
                  <tbody>
                    {pending.map((inst) => (
                      <tr key={inst.id} className="border-b border-surface-border">
                        <td className="py-1.5 text-ink">
                          Cuota {inst.installment_number}/{plan.installments_count} · vence {inst.due_date}
                        </td>
                        <td className="py-1.5 text-right text-ink">Bs {Number(inst.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )
          })}

          {paidDues.length > 0 && (
            <p className="text-xs text-slate-400">{paidDues.length} mensualidades pagadas en el historial.</p>
          )}

          <p className="text-[11px] text-slate-400 mt-8 text-center">
            Estado de cuenta generado automáticamente por FraterCloud — {fraternity.name}
          </p>
        </div>
      </div>
    </div>
  )
}
