import { useEffect, useState } from 'react'
import { createTransaction, deleteTransaction, getFraternityMembers, getMyFraternity, getTransactions, type TransactionInput } from '../../lib/api'
import type { Fraternity, FraternityUser, Transaction, TransactionType } from '../../lib/types'
import { addMonths, endOfMonth, startOfMonth, toISODate } from '../../lib/dates'

type Period = 'dia' | 'mes' | 'anio' | 'gestion'

function shiftAnchor(period: Period, anchor: Date, direction: 1 | -1): Date {
  if (period === 'dia') return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + direction)
  if (period === 'anio') return new Date(anchor.getFullYear() + direction, anchor.getMonth(), anchor.getDate())
  return addMonths(anchor, direction)
}

export default function FinanzasPage() {
  const [period, setPeriod] = useState<Period>('mes')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [members, setMembers] = useState<FraternityUser[]>([])
  const [fraternity, setFraternity] = useState<Fraternity | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [accountFilter, setAccountFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'todos' | TransactionType>('todos')
  const [memberFilter, setMemberFilter] = useState<string>('')

  const { from, to } = rangeFor(period, anchorDate, fraternity)

  async function reload() {
    setTransactions(await getTransactions(from, to))
  }

  useEffect(() => {
    Promise.all([getFraternityMembers(), getMyFraternity()]).then(([m, f]) => {
      setMembers(m)
      setFraternity(f)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setLoading(true)
    reload().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, anchorDate, fraternity])

  const accounts = [...new Set(transactions.map((t) => t.account).filter((a): a is string => !!a))].sort()
  const byAccount = accountFilter ? transactions.filter((t) => t.account === accountFilter) : transactions
  const byMember = memberFilter ? byAccount.filter((t) => t.member_id === memberFilter) : byAccount
  const visible = typeFilter === 'todos' ? byMember : byMember.filter((t) => t.type === typeFilter)

  const ingresos = byMember.filter((t) => t.type === 'ingreso').reduce((sum, t) => sum + Number(t.amount), 0)
  const egresos = byMember.filter((t) => t.type === 'egreso').reduce((sum, t) => sum + Number(t.amount), 0)

  // Expense breakdown by category for the visible period/account/member
  const egresoCategoryTotals = Object.entries(
    byMember
      .filter((t) => t.type === 'egreso')
      .reduce<Record<string, number>>((acc, t) => {
        const key = t.category || 'Sin categoría'
        acc[key] = (acc[key] ?? 0) + Number(t.amount)
        return acc
      }, {}),
  ).sort((a, b) => b[1] - a[1])

  // Running balance within the visible period (list is ordered newest-first)
  const chronological = [...visible].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.created_at < b.created_at ? -1 : 1))
  const balanceById: Record<string, number> = {}
  let running = 0
  for (const t of chronological) {
    running += t.type === 'ingreso' ? Number(t.amount) : -Number(t.amount)
    balanceById[t.id] = running
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Ingresos y egresos</h1>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
        >
          + Registrar movimiento
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2 rounded-control bg-surface-muted p-1 w-fit">
          {(['dia', 'mes', 'anio', ...(fraternity?.gestion_start ? (['gestion'] as Period[]) : [])] as Period[]).map(
            (p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 text-sm font-medium rounded ${period === p ? 'bg-white shadow-sm text-ink' : 'text-slate-500'}`}
              >
                {p === 'dia' ? 'Día' : p === 'mes' ? 'Mes' : p === 'anio' ? 'Año' : fraternity?.gestion_name || 'Gestión'}
              </button>
            ),
          )}
        </div>
        {period === 'gestion' ? (
          <span className="text-sm font-medium">
            {from} — {to}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAnchorDate((d) => shiftAnchor(period, d, -1))}
              className="px-2 py-1 rounded-control border border-surface-border text-sm"
            >
              ←
            </button>
            <span className="text-sm font-medium">{from === to ? from : `${from} — ${to}`}</span>
            <button
              onClick={() => setAnchorDate((d) => shiftAnchor(period, d, 1))}
              className="px-2 py-1 rounded-control border border-surface-border text-sm"
            >
              →
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        {accounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAccountFilter(null)}
              className={`text-xs font-medium rounded-full px-3 py-1.5 ${accountFilter === null ? 'bg-brand-navy text-white' : 'bg-white border border-surface-border text-slate-600'}`}
            >
              Todas las cuentas
            </button>
            {accounts.map((a) => (
              <button
                key={a}
                onClick={() => setAccountFilter(a)}
                className={`text-xs font-medium rounded-full px-3 py-1.5 ${accountFilter === a ? 'bg-brand-navy text-white' : 'bg-white border border-surface-border text-slate-600'}`}
              >
                {a}
              </button>
            ))}
          </div>
        )}
        <select
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
          className="text-xs font-medium rounded-control border border-surface-border px-3 py-1.5 text-slate-600"
        >
          <option value="">Todos los fraternos</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setTypeFilter((f) => (f === 'ingreso' ? 'todos' : 'ingreso'))}
          className={`text-left bg-white rounded-card border p-5 ${typeFilter === 'ingreso' ? 'border-brand-primary ring-1 ring-brand-primary' : 'border-surface-border'}`}
        >
          <p className="text-xs font-medium text-slate-500 mb-1">Ingresos</p>
          <p className="text-2xl font-semibold text-brand-primary">Bs {ingresos.toFixed(2)}</p>
        </button>
        <button
          onClick={() => setTypeFilter((f) => (f === 'egreso' ? 'todos' : 'egreso'))}
          className={`text-left bg-white rounded-card border p-5 ${typeFilter === 'egreso' ? 'border-brand-alert ring-1 ring-brand-alert' : 'border-surface-border'}`}
        >
          <p className="text-xs font-medium text-slate-500 mb-1">Egresos</p>
          <p className="text-2xl font-semibold text-brand-alert">Bs {egresos.toFixed(2)}</p>
        </button>
        <div className="bg-white rounded-card border border-surface-border p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Balance</p>
          <p className="text-2xl font-semibold text-ink">Bs {(ingresos - egresos).toFixed(2)}</p>
        </div>
      </div>

      {egresoCategoryTotals.length > 0 && (
        <div className="bg-white rounded-card border border-surface-border p-5 mb-6">
          <p className="text-sm font-semibold text-ink mb-3">Egresos por categoría</p>
          <div className="space-y-2">
            {egresoCategoryTotals.map(([cat, total]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-44 shrink-0 truncate">{cat}</span>
                <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full bg-brand-alert/70"
                    style={{ width: `${Math.max(2, (total / egresoCategoryTotals[0][1]) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-ink w-28 text-right">Bs {total.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Las categorías se crean al escribirlas en "Registrar movimiento" — los movimientos con la misma categoría se
            agrupan aquí.
          </p>
        </div>
      )}

      {typeFilter !== 'todos' && (
        <p className="text-xs text-slate-500 mb-3">
          Mostrando solo <span className="font-semibold">{typeFilter === 'ingreso' ? 'ingresos' : 'egresos'}</span> —
          haz clic de nuevo en la tarjeta para ver todo.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : (
        <div className="bg-white rounded-card border border-surface-border divide-y divide-surface-border">
          {visible.length === 0 && <p className="p-4 text-sm text-slate-400">Sin movimientos en este periodo.</p>}
          {visible.map((t) => (
            <div key={t.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">{t.description || t.category || '—'}</p>
                <p className="text-xs text-slate-400">
                  {t.date}
                  {t.category ? ` · ${t.category}` : ''}
                  {t.account ? ` · ${t.account}` : ''}
                  {t.fraternity_users?.full_name ? ` · ${t.fraternity_users.full_name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className={`block text-sm font-semibold ${t.type === 'ingreso' ? 'text-brand-primary' : 'text-brand-alert'}`}>
                    {t.type === 'ingreso' ? '+' : '-'}Bs {Number(t.amount).toFixed(2)}
                  </span>
                  {typeFilter === 'todos' && (
                    <span className="block text-[11px] text-slate-400">saldo Bs {balanceById[t.id].toFixed(2)}</span>
                  )}
                </div>
                <button
                  onClick={() => deleteTransaction(t.id).then(reload)}
                  className="text-xs text-slate-400 hover:text-brand-alert"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <TransactionModal
          accounts={accounts}
          members={members}
          onClose={() => setShowForm(false)}
          onDone={() => {
            setShowForm(false)
            reload()
          }}
        />
      )}
    </div>
  )
}

function rangeFor(period: Period, anchor: Date, fraternity: Fraternity | null): { from: string; to: string } {
  if (period === 'dia') {
    const iso = toISODate(anchor)
    return { from: iso, to: iso }
  }
  if (period === 'anio') {
    return { from: `${anchor.getFullYear()}-01-01`, to: `${anchor.getFullYear()}-12-31` }
  }
  if (period === 'gestion') {
    return { from: fraternity?.gestion_start ?? '2000-01-01', to: toISODate(new Date()) }
  }
  return { from: toISODate(startOfMonth(anchor)), to: toISODate(endOfMonth(anchor)) }
}

function TransactionModal({
  accounts,
  members,
  onClose,
  onDone,
}: {
  accounts: string[]
  members: FraternityUser[]
  onClose: () => void
  onDone: () => void
}) {
  const [type, setType] = useState<TransactionType>('ingreso')
  const [category, setCategory] = useState('')
  const [account, setAccount] = useState('')
  const [memberId, setMemberId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const input: TransactionInput = {
        type,
        category: category || null,
        account: account || null,
        member_id: memberId || null,
        amount: Number(amount),
        description: description || null,
        date,
      }
      await createTransaction(input)
      onDone()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-3">Registrar movimiento</h3>
        <div className="space-y-3 mb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setType('ingreso')}
              className={`flex-1 text-sm font-medium rounded-control py-1.5 ${type === 'ingreso' ? 'bg-brand-primary text-white' : 'bg-surface-muted text-slate-500'}`}
            >
              Ingreso
            </button>
            <button
              onClick={() => setType('egreso')}
              className={`flex-1 text-sm font-medium rounded-control py-1.5 ${type === 'egreso' ? 'bg-brand-alert text-white' : 'bg-surface-muted text-slate-500'}`}
            >
              Egreso
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Monto (Bs)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Categoría (opcional)</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Cuenta (opcional)</label>
            <input
              list="account-options"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="Ej. Cuenta general"
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
            <datalist id="account-options">
              {accounts.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fraterno (opcional)</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            >
              <option value="">— ninguno —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
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
            {loading ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
