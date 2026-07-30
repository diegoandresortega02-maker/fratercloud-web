import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import {
  barAnnualTransfer,
  createBarCashCount,
  createBarItem,
  createBarMovement,
  createBarStockCount,
  deleteBarItem,
  deleteBarMovement,
  getBarCashBalance,
  getBarCashCounts,
  getBarItems,
  getBarMovements,
  getBarPendingByMember,
  getBarStockCounts,
  getFraternityMembers,
  getTransactionAccounts,
  settleBarMember,
  updateBarItem,
  updateBarOpeningBalance,
} from '../../lib/api'
import type {
  BarCashCount,
  BarItem,
  BarMovement,
  BarPendingMember,
  BarStockCount,
  FraternityUser,
} from '../../lib/types'
import { toISODate } from '../../lib/dates'
import { formatMoney } from '../../lib/money'

type Tab = 'inventario' | 'ventas' | 'compras' | 'caja' | 'arqueos'

export default function BarPage() {
  const { fraternityUser } = useAuth()
  const canManage = fraternityUser?.role === 'bar' || fraternityUser?.role === 'admin'
  const isAdmin = fraternityUser?.role === 'admin'

  const [tab, setTab] = useState<Tab>('inventario')
  const [items, setItems] = useState<BarItem[]>([])
  const [movements, setMovements] = useState<BarMovement[]>([])
  const [members, setMembers] = useState<FraternityUser[]>([])
  const [balance, setBalance] = useState(0)
  const [pending, setPending] = useState<BarPendingMember[]>([])
  const [cashCounts, setCashCounts] = useState<BarCashCount[]>([])
  const [stockCounts, setStockCounts] = useState<BarStockCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const [i, mv, mem, bal, pend, cc, sc] = await Promise.all([
      getBarItems(),
      getBarMovements(),
      getFraternityMembers(),
      getBarCashBalance(),
      getBarPendingByMember(),
      getBarCashCounts(),
      getBarStockCounts(),
    ])
    setItems(i)
    setMovements(mv)
    setMembers(mem)
    setBalance(bal)
    setPending(pend)
    setCashCounts(cc)
    setStockCounts(sc)
  }

  useEffect(() => {
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="p-8 text-sm text-slate-400">Cargando…</p>

  const ventas = movements.filter((m) => m.kind === 'venta')
  const compras = movements.filter((m) => m.kind === 'compra')
  const totalVentas = ventas.reduce((s, m) => s + Number(m.total), 0)
  const totalCompras = compras.reduce((s, m) => s + Number(m.total), 0)
  const ganancia = ventas.reduce(
    (s, m) => s + (Number(m.unit_price) - Number(m.bar_items?.cost_price ?? 0)) * Number(m.quantity),
    0,
  )
  const totalPendiente = pending.reduce((s, p) => s + p.pending, 0)

  const TABS: [Tab, string][] = [
    ['inventario', 'Inventario'],
    ['ventas', 'Ventas'],
    ['compras', 'Compras'],
    ['caja', 'Caja'],
    ['arqueos', 'Arqueos'],
  ]

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-2xl font-semibold text-ink">Bar</h1>
        {!canManage && (
          <span className="text-xs font-medium text-slate-500 bg-surface-muted rounded-full px-3 py-1">
            Solo lectura
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-6">
        La caja del bar es independiente de las arcas de la fraternidad. Toda la información es visible para todos los
        fraternos.
      </p>

      {error && <p className="text-sm text-brand-alert mb-4">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Caja del bar" value={`Bs ${formatMoney(balance)}`} tone="primary" />
        <StatCard label="Ventas" value={`Bs ${formatMoney(totalVentas)}`} />
        <StatCard label="Ganancia" value={`Bs ${formatMoney(ganancia)}`} tone="primary" />
        <StatCard label="Por cobrar" value={`Bs ${formatMoney(totalPendiente)}`} tone={totalPendiente > 0 ? 'gold' : undefined} />
      </div>

      <div className="flex gap-1 rounded-control bg-surface-muted p-1 mb-6 overflow-x-auto">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded whitespace-nowrap ${tab === t ? 'bg-white shadow-sm text-ink' : 'text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'inventario' && (
        <InventoryTab items={items} canManage={canManage} onChanged={reload} />
      )}
      {tab === 'ventas' && (
        <SalesTab
          items={items}
          members={members}
          movements={ventas}
          pending={pending}
          canManage={canManage}
          onChanged={reload}
        />
      )}
      {tab === 'compras' && (
        <PurchasesTab items={items} movements={compras} canManage={canManage} onChanged={reload} />
      )}
      {tab === 'caja' && (
        <CashTab
          balance={balance}
          totalVentas={totalVentas}
          totalCompras={totalCompras}
          ganancia={ganancia}
          canManage={canManage}
          isAdmin={isAdmin}
          onChanged={reload}
        />
      )}
      {tab === 'arqueos' && (
        <AuditsTab
          cashCounts={cashCounts}
          stockCounts={stockCounts}
          items={items}
          balance={balance}
          canManage={canManage}
          onChanged={reload}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'primary' | 'gold' }) {
  const color = tone === 'primary' ? 'text-brand-primary' : tone === 'gold' ? 'text-brand-gold' : 'text-ink'
  return (
    <div className="bg-white rounded-card border border-surface-border p-4">
      <p className="text-[11px] font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  )
}

// ---------- Inventario ----------

function InventoryTab({
  items,
  canManage,
  onChanged,
}: {
  items: BarItem[]
  canManage: boolean
  onChanged: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<BarItem | null>(null)

  return (
    <div>
      {canManage && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
          >
            + Nuevo ítem
          </button>
        </div>
      )}
      <div className="bg-white rounded-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-surface-muted text-left text-xs font-semibold text-slate-500 uppercase">
                <th className="px-4 py-2.5">Ítem</th>
                <th className="px-4 py-2.5">Categoría</th>
                <th className="px-4 py-2.5 text-right">Costo</th>
                <th className="px-4 py-2.5 text-right">Precio venta</th>
                <th className="px-4 py-2.5 text-right">Margen</th>
                <th className="px-4 py-2.5 text-right">Stock</th>
                {canManage && <th className="px-4 py-2.5"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                    Aún no hay ítems cargados.
                  </td>
                </tr>
              )}
              {items.map((it, i) => {
                const margin = Number(it.sale_price) - Number(it.cost_price)
                const low = Number(it.stock) <= Number(it.low_stock_alert)
                return (
                  <tr key={it.id} className={i % 2 === 1 ? 'bg-surface-warm/40' : ''}>
                    <td className="px-4 py-2.5 font-medium text-ink">
                      {it.name}
                      {!it.is_active && <span className="text-[11px] text-slate-400"> (inactivo)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{it.category}</td>
                    <td className="px-4 py-2.5 text-right">Bs {formatMoney(it.cost_price)}</td>
                    <td className="px-4 py-2.5 text-right">Bs {formatMoney(it.sale_price)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${margin > 0 ? 'text-brand-primary' : 'text-brand-alert'}`}>
                      Bs {formatMoney(margin)}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${low ? 'text-brand-alert' : 'text-ink'}`}>
                      {Number(it.stock)} {low && '⚠'}
                    </td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => setEditItem(it)} className="text-xs text-brand-primary hover:underline mr-3">
                          Editar
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`¿Eliminar "${it.name}"? Solo se puede si no tiene movimientos.`)) return
                            try {
                              await deleteBarItem(it.id)
                              onChanged()
                            } catch {
                              alert('No se puede eliminar: el ítem ya tiene movimientos registrados. Márcalo como inactivo.')
                            }
                          }}
                          className="text-xs text-slate-400 hover:text-brand-alert"
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(showForm || editItem) && (
        <ItemModal
          item={editItem}
          onClose={() => {
            setShowForm(false)
            setEditItem(null)
          }}
          onDone={() => {
            setShowForm(false)
            setEditItem(null)
            onChanged()
          }}
        />
      )}
    </div>
  )
}

function ItemModal({ item, onClose, onDone }: { item: BarItem | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? 'trago')
  const [unit, setUnit] = useState(item?.unit ?? 'unidad')
  const [cost, setCost] = useState(item ? String(item.cost_price) : '')
  const [sale, setSale] = useState(item ? String(item.sale_price) : '')
  const [lowAlert, setLowAlert] = useState(item ? String(item.low_stock_alert) : '0')
  const [active, setActive] = useState(item?.is_active ?? true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setErr(null)
    setBusy(true)
    try {
      const payload = {
        name: name.trim(),
        category,
        unit,
        cost_price: Number(cost || 0),
        sale_price: Number(sale || 0),
        low_stock_alert: Number(lowAlert || 0),
      }
      if (item) await updateBarItem(item.id, { ...payload, is_active: active })
      else await createBarItem(payload)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-3">{item ? `Editar ${item.name}` : 'Nuevo ítem'}</h3>
        <div className="space-y-3 mb-3">
          <Field label="Nombre">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Whisky Johnnie Walker" className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-control border border-surface-border px-2 py-2 text-sm">
                <option value="trago">Trago</option>
                <option value="cerveza">Cerveza</option>
                <option value="soda">Soda / gaseosa</option>
                <option value="cigarro">Cigarro</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
            <Field label="Unidad">
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="botella, lata…" className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio de compra (Bs)">
              <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
            </Field>
            <Field label="Precio de venta (Bs)">
              <input type="number" min="0" step="0.01" value={sale} onChange={(e) => setSale(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
            </Field>
          </div>
          <Field label="Avisar cuando el stock baje de">
            <input type="number" min="0" value={lowAlert} onChange={(e) => setLowAlert(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </Field>
          {item && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Activo (se puede vender)
            </label>
          )}
          {!item && (
            <p className="text-[11px] text-slate-400">
              El stock arranca en 0. Cárgalo desde la pestaña Compras.
            </p>
          )}
        </div>
        {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
        <ModalActions onClose={onClose} onSubmit={submit} busy={busy} disabled={!name.trim()} />
      </div>
    </div>
  )
}

// ---------- Ventas ----------

function SalesTab({
  items,
  members,
  movements,
  pending,
  canManage,
  onChanged,
}: {
  items: BarItem[]
  members: FraternityUser[]
  movements: BarMovement[]
  pending: BarPendingMember[]
  canManage: boolean
  onChanged: () => void
}) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
          >
            + Registrar venta
          </button>
        </div>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink mb-2">Consumo pendiente de cobro</h2>
          <div className="bg-white rounded-card border border-surface-border divide-y divide-surface-border">
            {pending.map((p) => (
              <div key={p.member_id} className="p-3 flex items-center justify-between gap-3">
                <span className="text-sm text-ink">{p.full_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-brand-gold">Bs {formatMoney(p.pending)}</span>
                  {canManage && (
                    <button
                      onClick={async () => {
                        if (!confirm(`¿Marcar como cobrado Bs ${formatMoney(p.pending)} de ${p.full_name}? Entrará a la caja del bar.`)) return
                        await settleBarMember(p.member_id)
                        onChanged()
                      }}
                      className="text-xs font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-full px-3 py-1"
                    >
                      Cobrar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-ink mb-2">Historial de ventas</h2>
        <MovementTable movements={movements} canManage={canManage} onChanged={onChanged} showBuyer />
      </section>

      {showForm && (
        <SaleModal
          items={items.filter((i) => i.is_active)}
          members={members}
          onClose={() => setShowForm(false)}
          onDone={() => {
            setShowForm(false)
            onChanged()
          }}
        />
      )}
    </div>
  )
}

function SaleModal({
  items,
  members,
  onClose,
  onDone,
}: {
  items: BarItem[]
  members: FraternityUser[]
  onClose: () => void
  onDone: () => void
}) {
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState('1')
  const [mode, setMode] = useState<'contado' | 'cuenta'>('contado')
  const [memberId, setMemberId] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const item = items.find((i) => i.id === itemId)
  const total = item ? Number(item.sale_price) * Number(qty || 0) : 0
  const profit = item ? (Number(item.sale_price) - Number(item.cost_price)) * Number(qty || 0) : 0
  const enoughStock = item ? Number(item.stock) >= Number(qty || 0) : true

  async function submit() {
    if (!item) return
    setErr(null)
    setBusy(true)
    try {
      await createBarMovement({
        kind: 'venta',
        item_id: item.id,
        quantity: Number(qty),
        unit_price: Number(item.sale_price),
        payment_mode: mode,
        member_id: mode === 'cuenta' ? memberId : null,
        date,
      })
      onDone()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo registrar la venta'
      setErr(msg.includes('insufficient_stock') ? 'No hay stock suficiente para esa cantidad.' : msg)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-3">Registrar venta</h3>
        <div className="space-y-3 mb-3">
          <Field label="Ítem">
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-full rounded-control border border-surface-border px-2 py-2 text-sm">
              <option value="">Selecciona…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — Bs {formatMoney(i.sale_price)} (stock {Number(i.stock)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cantidad">
            <input type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </Field>
          {item && (
            <div className="bg-surface-warm rounded-control p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total</span>
                <span className="font-semibold text-ink">Bs {formatMoney(total)}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-slate-500">Ganancia</span>
                <span className="font-medium text-brand-primary">Bs {formatMoney(profit)}</span>
              </div>
              {!enoughStock && <p className="text-xs text-brand-alert mt-2">Stock insuficiente (hay {Number(item.stock)}).</p>}
            </div>
          )}
          <Field label="Forma de pago">
            <div className="flex gap-2">
              <button
                onClick={() => setMode('contado')}
                className={`flex-1 text-sm font-medium rounded-control py-1.5 ${mode === 'contado' ? 'bg-brand-primary text-white' : 'bg-surface-muted text-slate-500'}`}
              >
                Al contado
              </button>
              <button
                onClick={() => setMode('cuenta')}
                className={`flex-1 text-sm font-medium rounded-control py-1.5 ${mode === 'cuenta' ? 'bg-brand-gold text-white' : 'bg-surface-muted text-slate-500'}`}
              >
                A su cuenta
              </button>
            </div>
          </Field>
          {mode === 'cuenta' && (
            <Field label="¿Quién consumió?">
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="w-full rounded-control border border-surface-border px-2 py-2 text-sm">
                <option value="">Selecciona el fraterno…</option>
                {members
                  .filter((m) => m.status !== 'retirado')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          <Field label="Fecha">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </Field>
        </div>
        {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
        <ModalActions
          onClose={onClose}
          onSubmit={submit}
          busy={busy}
          disabled={!item || !enoughStock || Number(qty) <= 0 || (mode === 'cuenta' && !memberId)}
          label="Registrar venta"
        />
      </div>
    </div>
  )
}

// ---------- Compras ----------

function PurchasesTab({
  items,
  movements,
  canManage,
  onChanged,
}: {
  items: BarItem[]
  movements: BarMovement[]
  canManage: boolean
  onChanged: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
          >
            + Registrar compra
          </button>
        </div>
      )}
      <MovementTable movements={movements} canManage={canManage} onChanged={onChanged} />
      {showForm && (
        <PurchaseModal
          items={items}
          onClose={() => setShowForm(false)}
          onDone={() => {
            setShowForm(false)
            onChanged()
          }}
        />
      )}
    </div>
  )
}

function PurchaseModal({ items, onClose, onDone }: { items: BarItem[]; onClose: () => void; onDone: () => void }) {
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const item = items.find((i) => i.id === itemId)

  useEffect(() => {
    if (item && !price) setPrice(String(item.cost_price))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  async function submit() {
    if (!item) return
    setErr(null)
    setBusy(true)
    try {
      await createBarMovement({
        kind: 'compra',
        item_id: item.id,
        quantity: Number(qty),
        unit_price: Number(price || 0),
        date,
        notes: notes || null,
      })
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo registrar la compra')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-1">Registrar compra</h3>
        <p className="text-xs text-slate-400 mb-3">Suma stock y descuenta de la caja del bar.</p>
        <div className="space-y-3 mb-3">
          <Field label="Ítem">
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-full rounded-control border border-surface-border px-2 py-2 text-sm">
              <option value="">Selecciona…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (stock {Number(i.stock)})
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad">
              <input type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
            </Field>
            <Field label="Precio unitario (Bs)">
              <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
            </Field>
          </div>
          <div className="bg-surface-warm rounded-control p-3 flex justify-between text-sm">
            <span className="text-slate-600">Total a pagar</span>
            <span className="font-semibold text-brand-alert">Bs {formatMoney(Number(qty || 0) * Number(price || 0))}</span>
          </div>
          <Field label="Fecha">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </Field>
          <Field label="Notas (opcional)">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. compra en el mayorista" className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </Field>
        </div>
        {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
        <ModalActions onClose={onClose} onSubmit={submit} busy={busy} disabled={!item || Number(qty) <= 0} label="Registrar compra" />
      </div>
    </div>
  )
}

// ---------- Caja ----------

function CashTab({
  balance,
  totalVentas,
  totalCompras,
  ganancia,
  canManage,
  isAdmin,
  onChanged,
}: {
  balance: number
  totalVentas: number
  totalCompras: number
  ganancia: number
  canManage: boolean
  isAdmin: boolean
  onChanged: () => void
}) {
  const [showOpening, setShowOpening] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-card border border-surface-border p-5">
        <p className="text-xs font-medium text-slate-500 mb-1">Saldo actual de la caja del bar</p>
        <p className="text-3xl font-bold text-brand-primary mb-4">Bs {formatMoney(balance)}</p>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Stat label="Ventas totales" value={totalVentas} />
          <Stat label="Compras" value={totalCompras} negative />
          <Stat label="Ganancia acumulada" value={ganancia} />
        </dl>
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowOpening(true)}
            className="text-sm font-medium text-slate-600 bg-white border border-surface-border hover:bg-surface-muted rounded-control px-4 py-2"
          >
            Definir saldo inicial
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowTransfer(true)}
              className="text-sm font-medium text-white bg-brand-navy hover:opacity-90 rounded-control px-4 py-2"
            >
              Traspaso anual a las arcas
            </button>
          )}
        </div>
      )}

      {showOpening && (
        <OpeningBalanceModal
          onClose={() => setShowOpening(false)}
          onDone={() => {
            setShowOpening(false)
            onChanged()
          }}
        />
      )}
      {showTransfer && (
        <TransferModal
          balance={balance}
          onClose={() => setShowTransfer(false)}
          onDone={() => {
            setShowTransfer(false)
            onChanged()
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className={`font-semibold ${negative ? 'text-brand-alert' : 'text-ink'}`}>Bs {formatMoney(value)}</dd>
    </div>
  )
}

function OpeningBalanceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-1">Saldo inicial de la caja</h3>
        <p className="text-xs text-slate-400 mb-3">
          El dinero que ya tiene el bar antes de empezar a registrar en el sistema.
        </p>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-control border border-surface-border px-3 py-2 text-sm mb-3"
        />
        <ModalActions
          onClose={onClose}
          onSubmit={async () => {
            setBusy(true)
            await updateBarOpeningBalance(Number(amount || 0))
            onDone()
          }}
          busy={busy}
          disabled={amount === ''}
        />
      </div>
    </div>
  )
}

function TransferModal({ balance, onClose, onDone }: { balance: number; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('')
  const [account, setAccount] = useState('')
  const [accounts, setAccounts] = useState<string[]>([])
  const [date, setDate] = useState(toISODate(new Date()))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    getTransactionAccounts().then((a) => {
      setAccounts(a.map((x) => x.name))
      if (a.length > 0) setAccount(a[0].name)
    })
  }, [])

  async function submit() {
    setErr(null)
    setBusy(true)
    try {
      await barAnnualTransfer(Number(amount), account, date)
      onDone()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo hacer el traspaso'
      setErr(msg.includes('insufficient_bar_cash') ? 'El monto supera el saldo de la caja del bar.' : msg)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-1">Traspaso anual a las arcas</h3>
        <p className="text-xs text-slate-400 mb-3">
          Saca dinero de la caja del bar y lo registra como ingreso de la fraternidad. Disponible: Bs {formatMoney(balance)}
        </p>
        <div className="space-y-3 mb-3">
          <Field label="Monto (Bs)">
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </Field>
          <Field label="Cuenta destino">
            <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full rounded-control border border-surface-border px-2 py-2 text-sm">
              {accounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </Field>
        </div>
        {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
        <ModalActions onClose={onClose} onSubmit={submit} busy={busy} disabled={!amount || !account} label="Traspasar" />
      </div>
    </div>
  )
}

// ---------- Arqueos ----------

function AuditsTab({
  cashCounts,
  stockCounts,
  items,
  balance,
  canManage,
  onChanged,
}: {
  cashCounts: BarCashCount[]
  stockCounts: BarStockCount[]
  items: BarItem[]
  balance: number
  canManage: boolean
  onChanged: () => void
}) {
  const [showCash, setShowCash] = useState(false)
  const [showStock, setShowStock] = useState(false)

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => setShowCash(true)}
            className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
          >
            + Arqueo de caja
          </button>
          <button
            onClick={() => setShowStock(true)}
            className="text-sm font-medium text-slate-600 bg-white border border-surface-border hover:bg-surface-muted rounded-control px-4 py-2"
          >
            + Conteo de stock
          </button>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-ink mb-2">Arqueos de caja</h2>
        <div className="bg-white rounded-card border border-surface-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted text-left text-xs font-semibold text-slate-500 uppercase">
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5 text-right">Esperado</th>
                <th className="px-4 py-2.5 text-right">Contado</th>
                <th className="px-4 py-2.5 text-right">Diferencia</th>
                <th className="px-4 py-2.5">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {cashCounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                    Sin arqueos registrados.
                  </td>
                </tr>
              )}
              {cashCounts.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5 text-slate-500">{c.date}</td>
                  <td className="px-4 py-2.5 text-right">Bs {formatMoney(c.expected_cash)}</td>
                  <td className="px-4 py-2.5 text-right">Bs {formatMoney(c.actual_cash)}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${Number(c.difference) === 0 ? 'text-brand-success' : 'text-brand-alert'}`}>
                    {Number(c.difference) === 0 ? 'Cuadra' : `Bs ${formatMoney(c.difference)}`}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{c.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink mb-2">Conteos de inventario</h2>
        {stockCounts.length === 0 ? (
          <div className="bg-white rounded-card border border-surface-border p-4">
            <p className="text-sm text-slate-400">Sin conteos registrados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stockCounts.map((sc) => (
              <div key={sc.id} className="bg-white rounded-card border border-surface-border p-4">
                <p className="text-sm font-medium text-ink mb-1">
                  {sc.date} {sc.notes && <span className="text-xs text-slate-400">· {sc.notes}</span>}
                </p>
                <div className="space-y-1">
                  {(sc.items ?? []).map((it) => (
                    <div key={it.id} className="flex justify-between text-xs">
                      <span className="text-slate-600">{it.bar_items?.name ?? '—'}</span>
                      <span className={Number(it.difference) === 0 ? 'text-brand-success' : 'text-brand-alert'}>
                        sistema {Number(it.expected_stock)} · contado {Number(it.counted_stock)}
                        {Number(it.difference) !== 0 && ` · dif ${Number(it.difference)}`}
                        {it.reason && ` — ${it.reason}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showCash && (
        <CashCountModal
          expected={balance}
          onClose={() => setShowCash(false)}
          onDone={() => {
            setShowCash(false)
            onChanged()
          }}
        />
      )}
      {showStock && (
        <StockCountModal
          items={items}
          onClose={() => setShowStock(false)}
          onDone={() => {
            setShowStock(false)
            onChanged()
          }}
        />
      )}
    </div>
  )
}

function CashCountModal({ expected, onClose, onDone }: { expected: number; onClose: () => void; onDone: () => void }) {
  const [actual, setActual] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [busy, setBusy] = useState(false)
  const diff = Number(actual || 0) - expected

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-1">Arqueo de caja</h3>
        <p className="text-xs text-slate-400 mb-3">Cuenta el efectivo real y compáralo con lo que dice el sistema.</p>
        <div className="space-y-3 mb-3">
          <div className="bg-surface-warm rounded-control p-3 flex justify-between text-sm">
            <span className="text-slate-600">Según el sistema</span>
            <span className="font-semibold text-ink">Bs {formatMoney(expected)}</span>
          </div>
          <Field label="Efectivo contado (Bs)">
            <input type="number" step="0.01" value={actual} onChange={(e) => setActual(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </Field>
          {actual !== '' && (
            <div className={`rounded-control p-3 text-sm font-medium ${diff === 0 ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-alert/10 text-brand-alert'}`}>
              {diff === 0 ? 'La caja cuadra exactamente.' : `Diferencia: Bs ${formatMoney(diff)} (${diff > 0 ? 'sobra' : 'falta'})`}
            </div>
          )}
          <Field label="Observaciones">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Explica la diferencia si la hay" className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </Field>
          <Field label="Fecha">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </Field>
        </div>
        <ModalActions
          onClose={onClose}
          onSubmit={async () => {
            setBusy(true)
            await createBarCashCount({ date, expected_cash: expected, actual_cash: Number(actual), notes: notes || null })
            onDone()
          }}
          busy={busy}
          disabled={actual === ''}
          label="Guardar arqueo"
        />
      </div>
    </div>
  )
}

function StockCountModal({ items, onClose, onDone }: { items: BarItem[]; onClose: () => void; onDone: () => void }) {
  const [counted, setCounted] = useState<Record<string, string>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setErr(null)
    setBusy(true)
    try {
      const rows = items
        .filter((i) => counted[i.id] !== undefined && counted[i.id] !== '')
        .map((i) => ({
          item_id: i.id,
          expected_stock: Number(i.stock),
          counted_stock: Number(counted[i.id]),
          reason: reasons[i.id] || null,
        }))
      if (rows.length === 0) {
        setErr('Cuenta al menos un ítem.')
        setBusy(false)
        return
      }
      await createBarStockCount(date, notes || null, rows)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo guardar el conteo')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-ink mb-1">Conteo físico de inventario</h3>
        <p className="text-xs text-slate-400 mb-3">
          Escribe cuántas unidades hay realmente. El stock del sistema se ajusta y queda registrada la diferencia.
        </p>
        <div className="space-y-2 mb-3">
          {items.map((i) => {
            const c = counted[i.id]
            const diff = c === undefined || c === '' ? null : Number(c) - Number(i.stock)
            return (
              <div key={i.id} className="border border-surface-border rounded-control p-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm text-ink">{i.name}</span>
                  <span className="text-xs text-slate-400">sistema: {Number(i.stock)}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="1"
                    placeholder="contado"
                    value={c ?? ''}
                    onChange={(e) => setCounted({ ...counted, [i.id]: e.target.value })}
                    className="w-28 rounded-control border border-surface-border px-2 py-1.5 text-sm"
                  />
                  {diff !== null && diff !== 0 && (
                    <input
                      placeholder="Motivo de la diferencia"
                      value={reasons[i.id] ?? ''}
                      onChange={(e) => setReasons({ ...reasons, [i.id]: e.target.value })}
                      className="flex-1 rounded-control border border-surface-border px-2 py-1.5 text-sm"
                    />
                  )}
                  {diff !== null && (
                    <span className={`text-xs self-center font-medium ${diff === 0 ? 'text-brand-success' : 'text-brand-alert'}`}>
                      {diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : diff}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <Field label="Observaciones generales">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
        </Field>
        <div className="mt-3">
          <Field label="Fecha">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-control border border-surface-border px-3 py-2 text-sm" />
          </Field>
        </div>
        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
        <div className="mt-3">
          <ModalActions onClose={onClose} onSubmit={submit} busy={busy} label="Guardar conteo" />
        </div>
      </div>
    </div>
  )
}

// ---------- Compartidos ----------

function MovementTable({
  movements,
  canManage,
  onChanged,
  showBuyer,
}: {
  movements: BarMovement[]
  canManage: boolean
  onChanged: () => void
  showBuyer?: boolean
}) {
  return (
    <div className="bg-white rounded-card border border-surface-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-surface-muted text-left text-xs font-semibold text-slate-500 uppercase">
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Ítem</th>
              <th className="px-4 py-2.5 text-right">Cant.</th>
              <th className="px-4 py-2.5 text-right">P. unit.</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              {showBuyer && <th className="px-4 py-2.5">Pago</th>}
              {canManage && <th className="px-4 py-2.5"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {movements.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                  Sin movimientos registrados.
                </td>
              </tr>
            )}
            {movements.map((m, i) => (
              <tr key={m.id} className={i % 2 === 1 ? 'bg-surface-warm/40' : ''}>
                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{m.date}</td>
                <td className="px-4 py-2.5 text-ink">{m.bar_items?.name ?? '—'}</td>
                <td className="px-4 py-2.5 text-right">{Number(m.quantity)}</td>
                <td className="px-4 py-2.5 text-right">Bs {formatMoney(m.unit_price)}</td>
                <td className="px-4 py-2.5 text-right font-medium">Bs {formatMoney(m.total)}</td>
                {showBuyer && (
                  <td className="px-4 py-2.5 text-xs">
                    {m.payment_mode === 'contado' ? (
                      <span className="text-brand-success font-medium">Contado</span>
                    ) : (
                      <span className={m.settled ? 'text-brand-success' : 'text-brand-gold'}>
                        {m.member?.full_name ?? '—'} {m.settled ? '(cobrado)' : '(pendiente)'}
                      </span>
                    )}
                  </td>
                )}
                {canManage && (
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={async () => {
                        if (!confirm('¿Eliminar este movimiento? El stock se revierte.')) return
                        await deleteBarMovement(m.id)
                        onChanged()
                      }}
                      className="text-xs text-slate-400 hover:text-brand-alert"
                    >
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function ModalActions({
  onClose,
  onSubmit,
  busy,
  disabled,
  label = 'Guardar',
}: {
  onClose: () => void
  onSubmit: () => void
  busy: boolean
  disabled?: boolean
  label?: string
}) {
  return (
    <div className="flex gap-2 justify-end">
      <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-control text-slate-500">
        Cancelar
      </button>
      <button
        onClick={onSubmit}
        disabled={busy || disabled}
        className="text-sm px-3 py-1.5 rounded-control bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium"
      >
        {busy ? 'Guardando…' : label}
      </button>
    </div>
  )
}
