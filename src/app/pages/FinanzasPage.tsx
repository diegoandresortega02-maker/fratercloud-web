import { useEffect, useState } from 'react'
import {
  createTransaction,
  createTransactionAccount,
  createTransactionCategory,
  deleteTransaction,
  deleteTransactionAccount,
  deleteTransactionCategory,
  getFraternityMembers,
  getMyFraternity,
  getTransactionAccounts,
  getTransactionCategories,
  getTransactions,
  type TransactionInput,
} from '../../lib/api'
import type {
  Fraternity,
  FraternityUser,
  Transaction,
  TransactionAccount,
  TransactionCategory,
  TransactionType,
} from '../../lib/types'
import { addMonths, endOfMonth, startOfMonth, toISODate } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import ExportExcelButton from '../components/ExportExcelButton'

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
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [accounts, setAccounts] = useState<TransactionAccount[]>([])
  const [fraternity, setFraternity] = useState<Fraternity | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [accountFilter, setAccountFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'todos' | TransactionType>('todos')
  const [memberFilter, setMemberFilter] = useState<string>('')

  const { from, to } = rangeFor(period, anchorDate, fraternity)

  async function reloadTransactions() {
    setTransactions(await getTransactions(from, to))
  }

  async function reloadCatalog() {
    const [c, a] = await Promise.all([getTransactionCategories(), getTransactionAccounts()])
    setCategories(c)
    setAccounts(a)
  }

  useEffect(() => {
    Promise.all([getFraternityMembers(), getMyFraternity(), getTransactionCategories(), getTransactionAccounts()]).then(
      ([m, f, c, a]) => {
        setMembers(m)
        setFraternity(f)
        setCategories(c)
        setAccounts(a)
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setLoading(true)
    reloadTransactions().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, anchorDate, fraternity])

  const accountNames = accounts.map((a) => a.name)
  const byAccount = accountFilter ? transactions.filter((t) => t.account === accountFilter) : transactions
  const byMember = memberFilter ? byAccount.filter((t) => t.member_id === memberFilter) : byAccount
  const visible = typeFilter === 'todos' ? byMember : byMember.filter((t) => t.type === typeFilter)

  const ingresos = byMember.filter((t) => t.type === 'ingreso').reduce((sum, t) => sum + Number(t.amount), 0)
  const egresos = byMember.filter((t) => t.type === 'egreso').reduce((sum, t) => sum + Number(t.amount), 0)

  const egresoCategoryTotals = Object.entries(
    byMember
      .filter((t) => t.type === 'egreso')
      .reduce<Record<string, number>>((acc, t) => {
        const key = t.category || 'Sin categoría'
        acc[key] = (acc[key] ?? 0) + Number(t.amount)
        return acc
      }, {}),
  ).sort((a, b) => b[1] - a[1])

  // Chronological ascending for the running balance; table shows newest first
  const chronological = [...visible].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.created_at < b.created_at ? -1 : 1,
  )
  const balanceById: Record<string, number> = {}
  let running = 0
  for (const t of chronological) {
    running += t.type === 'ingreso' ? Number(t.amount) : -Number(t.amount)
    balanceById[t.id] = running
  }
  const rows = [...chronological].reverse()

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-ink">Ingresos y egresos</h1>
        <div className="flex flex-wrap gap-2">
          <ExportExcelButton />
          <button
            onClick={() => setShowCatalog(true)}
            className="text-sm font-medium text-slate-600 bg-white border border-surface-border hover:bg-surface-muted rounded-control px-4 py-2"
          >
            ⚙ Categorías y cuentas
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
          >
            + Registrar movimiento
          </button>
        </div>
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
        {accountNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAccountFilter(null)}
              className={`text-xs font-medium rounded-full px-3 py-1.5 ${accountFilter === null ? 'bg-brand-navy text-white' : 'bg-white border border-surface-border text-slate-600'}`}
            >
              Todas las cuentas
            </button>
            {accountNames.map((a) => (
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
          <p className="text-2xl font-semibold text-brand-primary">Bs {formatMoney(ingresos)}</p>
        </button>
        <button
          onClick={() => setTypeFilter((f) => (f === 'egreso' ? 'todos' : 'egreso'))}
          className={`text-left bg-white rounded-card border p-5 ${typeFilter === 'egreso' ? 'border-brand-alert ring-1 ring-brand-alert' : 'border-surface-border'}`}
        >
          <p className="text-xs font-medium text-slate-500 mb-1">Egresos</p>
          <p className="text-2xl font-semibold text-brand-alert">Bs {formatMoney(egresos)}</p>
        </button>
        <div className="bg-white rounded-card border border-surface-border p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Balance</p>
          <p className="text-2xl font-semibold text-ink">Bs {formatMoney(ingresos - egresos)}</p>
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
                <span className="text-xs font-semibold text-ink w-28 text-right">Bs {formatMoney(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : (
        <div className="bg-white rounded-card border border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-surface-muted text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Concepto / Categoría</th>
                  <th className="px-4 py-2.5">Cuenta</th>
                  <th className="px-4 py-2.5">Fraterno</th>
                  <th className="px-4 py-2.5 text-right">Ingreso</th>
                  <th className="px-4 py-2.5 text-right">Egreso</th>
                  <th className="px-4 py-2.5 text-right">Saldo</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-400">
                      Sin movimientos en este periodo.
                    </td>
                  </tr>
                )}
                {rows.map((t, i) => (
                  <tr key={t.id} className={i % 2 === 1 ? 'bg-surface-warm/40' : ''}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{t.date}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-ink">{t.description || t.category || '—'}</span>
                      {t.category && t.description && (
                        <span className="block text-[11px] text-slate-400">{t.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{t.account || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{t.fraternity_users?.full_name || '—'}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap font-medium text-brand-primary">
                      {t.type === 'ingreso' ? `Bs ${formatMoney(t.amount)}` : ''}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap font-medium text-brand-alert">
                      {t.type === 'egreso' ? `Bs ${formatMoney(t.amount)}` : ''}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap text-slate-500">
                      {typeFilter === 'todos' ? `Bs ${formatMoney(balanceById[t.id])}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => deleteTransaction(t.id).then(reloadTransactions)}
                        className="text-xs text-slate-400 hover:text-brand-alert"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <TransactionModal
          categories={categories}
          accounts={accounts}
          members={members}
          onClose={() => setShowForm(false)}
          onCatalogChanged={reloadCatalog}
          onDone={() => {
            setShowForm(false)
            reloadTransactions()
          }}
        />
      )}

      {showCatalog && (
        <CatalogModal
          categories={categories}
          accounts={accounts}
          onClose={() => setShowCatalog(false)}
          onChanged={reloadCatalog}
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

// Groups categories of a given kind by group_label for use in <optgroup>
function groupCategories(categories: TransactionCategory[], kind: TransactionType) {
  const filtered = categories.filter((c) => c.kind === kind)
  const groups: Record<string, TransactionCategory[]> = {}
  for (const c of filtered) {
    const g = c.group_label || 'Sin grupo'
    ;(groups[g] ??= []).push(c)
  }
  return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
}

function TransactionModal({
  categories,
  accounts,
  members,
  onClose,
  onDone,
  onCatalogChanged,
}: {
  categories: TransactionCategory[]
  accounts: TransactionAccount[]
  members: FraternityUser[]
  onClose: () => void
  onDone: () => void
  onCatalogChanged: () => void
}) {
  const [type, setType] = useState<TransactionType>('ingreso')
  const [categoryId, setCategoryId] = useState('')
  const [account, setAccount] = useState('')
  const [memberId, setMemberId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [creatingCat, setCreatingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatGroup, setNewCatGroup] = useState('')
  const [creatingAcc, setCreatingAcc] = useState(false)
  const [newAccName, setNewAccName] = useState('')

  const grouped = groupCategories(categories, type)

  async function handleCreateCategory() {
    if (!newCatName.trim()) return
    try {
      const cat = await createTransactionCategory({ kind: type, name: newCatName.trim(), group_label: newCatGroup.trim() || null })
      onCatalogChanged()
      setCategoryId(cat.id)
      setCreatingCat(false)
      setNewCatName('')
      setNewCatGroup('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la categoría')
    }
  }

  async function handleCreateAccount() {
    if (!newAccName.trim()) return
    try {
      const acc = await createTransactionAccount(newAccName.trim())
      onCatalogChanged()
      setAccount(acc.name)
      setCreatingAcc(false)
      setNewAccName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
    }
  }

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const selectedCat = categories.find((c) => c.id === categoryId)
      const input: TransactionInput = {
        type,
        category: selectedCat?.name ?? null,
        category_id: categoryId || null,
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-3">Registrar movimiento</h3>
        <div className="space-y-3 mb-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setType('ingreso')
                setCategoryId('')
              }}
              className={`flex-1 text-sm font-medium rounded-control py-1.5 ${type === 'ingreso' ? 'bg-brand-primary text-white' : 'bg-surface-muted text-slate-500'}`}
            >
              Ingreso
            </button>
            <button
              onClick={() => {
                setType('egreso')
                setCategoryId('')
              }}
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
            <label className="block text-xs font-medium text-slate-500 mb-1">Categoría</label>
            {creatingCat ? (
              <div className="space-y-2">
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nombre (ej. Luz)"
                  className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
                />
                <input
                  value={newCatGroup}
                  onChange={(e) => setNewCatGroup(e.target.value)}
                  placeholder="Grupo (opcional, ej. Gastos Fijos)"
                  className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={handleCreateCategory} className="text-xs font-medium text-white bg-brand-primary rounded-control px-3 py-1.5">
                    Crear
                  </button>
                  <button onClick={() => setCreatingCat(false)} className="text-xs text-slate-500 px-2">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex-1 rounded-control border border-surface-border px-3 py-2 text-sm"
                >
                  <option value="">— sin categoría —</option>
                  {grouped.map(([group, cats]) => (
                    <optgroup key={group} label={group}>
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  onClick={() => setCreatingCat(true)}
                  className="text-xs font-medium text-brand-primary border border-surface-border rounded-control px-2"
                  title="Nueva categoría"
                >
                  ＋
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Cuenta</label>
            {creatingAcc ? (
              <div className="flex gap-2">
                <input
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="Nombre de la cuenta"
                  className="flex-1 rounded-control border border-surface-border px-3 py-2 text-sm"
                />
                <button onClick={handleCreateAccount} className="text-xs font-medium text-white bg-brand-primary rounded-control px-3">
                  OK
                </button>
                <button onClick={() => setCreatingAcc(false)} className="text-xs text-slate-500 px-1">
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="flex-1 rounded-control border border-surface-border px-3 py-2 text-sm"
                >
                  <option value="">— sin cuenta —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setCreatingAcc(true)}
                  className="text-xs font-medium text-brand-primary border border-surface-border rounded-control px-2"
                  title="Nueva cuenta"
                >
                  ＋
                </button>
              </div>
            )}
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
            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción (opcional)</label>
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

function CatalogModal({
  categories,
  accounts,
  onClose,
  onChanged,
}: {
  categories: TransactionCategory[]
  accounts: TransactionAccount[]
  onClose: () => void
  onChanged: () => void
}) {
  const [tab, setTab] = useState<'ingreso' | 'egreso' | 'cuentas'>('egreso')
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [busy, setBusy] = useState(false)

  async function addItem() {
    if (!name.trim()) return
    setBusy(true)
    try {
      if (tab === 'cuentas') {
        await createTransactionAccount(name.trim())
      } else {
        await createTransactionCategory({ kind: tab, name: name.trim(), group_label: group.trim() || null })
      }
      setName('')
      setGroup('')
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function removeCategory(id: string) {
    if (!confirm('¿Eliminar esta categoría? Los movimientos ya registrados conservan su etiqueta.')) return
    await deleteTransactionCategory(id)
    onChanged()
  }
  async function removeAccount(id: string) {
    if (!confirm('¿Eliminar esta cuenta?')) return
    await deleteTransactionAccount(id)
    onChanged()
  }

  const grouped = tab !== 'cuentas' ? groupCategories(categories, tab) : []

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-card p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-ink">Categorías y cuentas</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-ink text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="flex gap-2 rounded-control bg-surface-muted p-1 mb-4">
          {(['egreso', 'ingreso', 'cuentas'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-xs font-medium rounded py-1.5 ${tab === t ? 'bg-white shadow-sm text-ink' : 'text-slate-500'}`}
            >
              {t === 'egreso' ? 'Egresos' : t === 'ingreso' ? 'Ingresos' : 'Cuentas'}
            </button>
          ))}
        </div>

        <div className="space-y-2 mb-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tab === 'cuentas' ? 'Nombre de la cuenta' : 'Nombre (ej. Luz)'}
            className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
          />
          {tab !== 'cuentas' && (
            <input
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="Grupo (opcional, ej. Gastos Fijos)"
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          )}
          <button
            onClick={addItem}
            disabled={busy || !name.trim()}
            className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 rounded-control px-4 py-2"
          >
            + Agregar
          </button>
        </div>

        {tab === 'cuentas' ? (
          <div className="divide-y divide-surface-border border border-surface-border rounded-control">
            {accounts.length === 0 && <p className="p-3 text-sm text-slate-400">Sin cuentas.</p>}
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-ink">{a.name}</span>
                <button onClick={() => removeAccount(a.id)} className="text-xs text-slate-400 hover:text-brand-alert">
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.length === 0 && <p className="text-sm text-slate-400">Sin categorías.</p>}
            {grouped.map(([groupName, cats]) => (
              <div key={groupName}>
                <p className="text-[11px] font-semibold uppercase text-slate-400 mb-1">{groupName}</p>
                <div className="divide-y divide-surface-border border border-surface-border rounded-control">
                  {cats.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm text-ink">{c.name}</span>
                      <button onClick={() => removeCategory(c.id)} className="text-xs text-slate-400 hover:text-brand-alert">
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
