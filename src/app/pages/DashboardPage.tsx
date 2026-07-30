import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { getFraternityMembers, getMemberDebtSummary, type DebtSummary } from '../../lib/api'
import type { FraternityUser } from '../../lib/types'
import { upcomingBirthdays } from '../../lib/birthdays'
import { formatMoney } from '../../lib/money'
import ExportExcelButton from '../components/ExportExcelButton'

export default function DashboardPage() {
  const { fraternityUser } = useAuth()
  const isAdmin = fraternityUser?.role === 'admin'

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink mb-6">Inicio</h1>
      {isAdmin ? <AdminSummary /> : <MemberSummary />}
    </div>
  )
}

function MemberSummary() {
  const { fraternityUser } = useAuth()
  const [summary, setSummary] = useState<DebtSummary | null>(null)
  const [members, setMembers] = useState<FraternityUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!fraternityUser) return
    Promise.all([getMemberDebtSummary(fraternityUser.id), getFraternityMembers()])
      .then(([s, m]) => {
        setSummary(s)
        setMembers(m)
      })
      .finally(() => setLoading(false))
  }, [fraternityUser])

  if (loading) return <p className="text-sm text-slate-400">Cargando…</p>

  const birthdays = upcomingBirthdays(members, 30)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        label="Estado de cuenta"
        value={summary?.totalOwed ? `Bs ${formatMoney(summary.totalOwed)}` : 'Al día'}
        tone={summary?.isBlocked ? 'alert' : summary?.totalOwed ? 'gold' : 'primary'}
        detail={summary?.isBlocked ? 'Reservas bloqueadas por mora' : undefined}
      />
      <StatCard label="Meses pendientes" value={String(summary?.pendingDuesCount ?? 0)} />
      <StatCard label="Cuotas pendientes" value={String(summary?.pendingInstallmentsCount ?? 0)} />

      <div className="sm:col-span-3 bg-white rounded-card border border-surface-border p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">Próximos cumpleaños</h2>
        {birthdays.length === 0 ? (
          <p className="text-sm text-slate-400">Ninguno en los próximos 30 días.</p>
        ) : (
          <ul className="space-y-1">
            {birthdays.map((b) => (
              <li key={b.member.id} className="text-sm text-slate-600 flex justify-between">
                <span>{b.member.full_name}</span>
                <span className="text-slate-400">{b.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function AdminSummary() {
  const [members, setMembers] = useState<FraternityUser[]>([])
  const [summaries, setSummaries] = useState<Record<string, DebtSummary>>({})
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFraternityMembers()
      .then(async (m) => {
        setMembers(m)
        const entries = await Promise.all(m.map(async (mem) => [mem.id, await getMemberDebtSummary(mem.id)] as const))
        setSummaries(Object.fromEntries(entries))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-slate-400">Cargando…</p>

  const debtors = members.filter((m) => (summaries[m.id]?.totalOwed ?? 0) > 0)
  const totalOwed = Object.values(summaries).reduce((sum, s) => sum + s.totalOwed, 0)
  const birthdays = upcomingBirthdays(members, 30)
  const selected = selectedMemberId ? summaries[selectedMemberId] : null

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportExcelButton />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Fraternos" value={String(members.length)} />
        <StatCard label="Deudores" value={String(debtors.length)} tone={debtors.length > 0 ? 'gold' : 'primary'} />
        <StatCard label="Deuda total" value={`Bs ${formatMoney(totalOwed)}`} />
      </div>

      <div className="bg-white rounded-card border border-surface-border p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">Ver por fraterno</h2>
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="w-full sm:w-72 rounded-control border border-surface-border px-3 py-2 text-sm mb-3"
        >
          <option value="">Selecciona un fraterno…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
        {selected && (
          <div className="text-sm text-slate-600 space-y-1">
            <p>Debe: Bs {formatMoney(selected.totalOwed)}</p>
            <p>Meses pendientes: {selected.pendingDuesCount}</p>
            <p>Cuotas pendientes: {selected.pendingInstallmentsCount}</p>
            <p>{selected.isBlocked ? 'Bloqueado para reservar' : 'Puede reservar'}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-card border border-surface-border p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">Próximos cumpleaños</h2>
        {birthdays.length === 0 ? (
          <p className="text-sm text-slate-400">Ninguno en los próximos 30 días.</p>
        ) : (
          <ul className="space-y-1">
            {birthdays.map((b) => (
              <li key={b.member.id} className="text-sm text-slate-600 flex justify-between">
                <span>{b.member.full_name}</span>
                <span className="text-slate-400">{b.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone = 'primary',
  detail,
}: {
  label: string
  value: string
  tone?: 'primary' | 'gold' | 'alert'
  detail?: string
}) {
  const toneClass =
    tone === 'alert' ? 'text-brand-alert' : tone === 'gold' ? 'text-brand-gold' : 'text-brand-primary'
  return (
    <div className="bg-white rounded-card border border-surface-border p-5">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
      {detail && <p className="text-xs text-slate-400 mt-1">{detail}</p>}
    </div>
  )
}
