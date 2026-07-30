import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import {
  createEvent,
  createTransaction,
  deleteEvent,
  getEventChargeStatus,
  getEventContributions,
  getEvents,
  getFraternityMembers,
  type TransactionInput,
} from '../../lib/api'
import type { EventChargeMode, EventChargeRow, EventContribution, FraternityEvent, FraternityUser } from '../../lib/types'
import { toISODate } from '../../lib/dates'
import { formatMoney } from '../../lib/money'

export default function EventosPage() {
  const { fraternityUser } = useAuth()
  const isAdmin = fraternityUser?.role === 'admin'
  const [events, setEvents] = useState<FraternityEvent[]>([])
  const [members, setMembers] = useState<FraternityUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [detailFor, setDetailFor] = useState<FraternityEvent | null>(null)

  async function reload() {
    const [e, m] = await Promise.all([getEvents(), getFraternityMembers()])
    setEvents(e)
    setMembers(m)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="p-8 text-sm text-slate-400">Cargando…</p>

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-2xl font-semibold text-ink">Eventos</h1>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
          >
            + Nuevo evento
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-6">
        Aniversarios, recaudaciones y cuotas extraordinarias. Cada evento muestra con transparencia quién pagó y cuánto
        se recaudó.
      </p>

      <div className="space-y-3">
        {events.length === 0 && (
          <div className="bg-white rounded-card border border-surface-border p-6 text-center text-sm text-slate-400">
            Aún no hay eventos.
          </div>
        )}
        {events.map((ev) => (
          <button
            key={ev.id}
            onClick={() => setDetailFor(ev)}
            className="w-full text-left bg-white rounded-card border border-surface-border p-5 hover:border-brand-primary"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-ink flex items-center gap-2">
                  {ev.name}
                  <span className="text-[10px] font-medium uppercase text-brand-tech bg-brand-tech/10 rounded-full px-2 py-0.5">
                    {ev.charge_mode === 'fijo' ? 'Cuota fija' : 'Recaudación'}
                  </span>
                  {ev.blocks_reservations && (
                    <span className="text-[10px] font-medium uppercase text-brand-alert bg-brand-alert/10 rounded-full px-2 py-0.5">
                      Bloquea reservas
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {ev.event_date || '—'}
                  {ev.charge_mode === 'fijo' && ev.amount_per_member != null
                    ? ` · Bs ${formatMoney(ev.amount_per_member)} por fraterno`
                    : ''}
                </p>
              </div>
              <span className="text-xs font-medium text-brand-primary">Ver detalle →</span>
            </div>
          </button>
        ))}
      </div>

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onDone={() => {
            setShowCreate(false)
            reload()
          }}
        />
      )}
      {detailFor && (
        <EventDetailModal
          event={detailFor}
          members={members}
          isAdmin={isAdmin}
          onClose={() => setDetailFor(null)}
          onChanged={reload}
        />
      )}
    </div>
  )
}

function CreateEventModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [chargeMode, setChargeMode] = useState<EventChargeMode>('fijo')
  const [amount, setAmount] = useState('')
  const [eventDate, setEventDate] = useState(toISODate(new Date()))
  const [blocks, setBlocks] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      await createEvent({
        name,
        description: description || null,
        charge_mode: chargeMode,
        amount_per_member: chargeMode === 'fijo' ? Number(amount) : null,
        event_date: eventDate || null,
        blocks_reservations: blocks,
      })
      onDone()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo crear el evento')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-3">Nuevo evento</h3>
        <div className="space-y-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Aniversario 2026"
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de cobro</label>
            <div className="flex gap-2">
              <button
                onClick={() => setChargeMode('fijo')}
                className={`flex-1 text-sm font-medium rounded-control py-1.5 ${chargeMode === 'fijo' ? 'bg-brand-primary text-white' : 'bg-surface-muted text-slate-500'}`}
              >
                Cuota fija
              </button>
              <button
                onClick={() => setChargeMode('libre')}
                className={`flex-1 text-sm font-medium rounded-control py-1.5 ${chargeMode === 'libre' ? 'bg-brand-primary text-white' : 'bg-surface-muted text-slate-500'}`}
              >
                Recaudación libre
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {chargeMode === 'fijo'
                ? 'Se cobra el mismo monto a cada fraterno activo (aparece en su estado de cuenta).'
                : 'Cada fraterno aporta lo que quiera; el admin registra las contribuciones.'}
            </p>
          </div>
          {chargeMode === 'fijo' && (
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
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          {chargeMode === 'fijo' && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={blocks} onChange={(e) => setBlocks(e.target.checked)} />
              La deuda de este evento bloquea reservas
            </label>
          )}
        </div>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-control text-slate-500">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name || (chargeMode === 'fijo' && !amount)}
            className="text-sm px-3 py-1.5 rounded-control bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium"
          >
            {loading ? 'Creando…' : 'Crear evento'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EventDetailModal({
  event,
  members,
  isAdmin,
  onClose,
  onChanged,
}: {
  event: FraternityEvent
  members: FraternityUser[]
  isAdmin: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const [roster, setRoster] = useState<EventChargeRow[]>([])
  const [contributions, setContributions] = useState<EventContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [showContribute, setShowContribute] = useState(false)

  async function reload() {
    if (event.charge_mode === 'fijo') {
      setRoster(await getEventChargeStatus(event.id))
    } else {
      setContributions(await getEventContributions(event.id))
    }
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id])

  const recaudadoFijo = roster.filter((r) => r.status === 'pagado').reduce((s, r) => s + r.amount, 0)
  const esperadoFijo = roster.reduce((s, r) => s + r.amount, 0)
  const pagados = roster.filter((r) => r.status === 'pagado').length
  const recaudadoLibre = contributions.reduce((s, c) => s + c.amount, 0)

  async function handleDelete() {
    if (!confirm('¿Eliminar este evento? Se eliminarán también sus cargos a fraternos.')) return
    await deleteEvent(event.id)
    onChanged()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1 gap-3">
          <h3 className="text-base font-semibold text-ink">{event.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-ink text-lg leading-none">
            ✕
          </button>
        </div>
        {event.description && <p className="text-sm text-slate-500 mb-3">{event.description}</p>}

        {loading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : event.charge_mode === 'fijo' ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-surface-warm rounded-control p-3">
                <p className="text-[11px] text-slate-500">Recaudado</p>
                <p className="text-lg font-semibold text-brand-primary">Bs {formatMoney(recaudadoFijo)}</p>
              </div>
              <div className="bg-surface-warm rounded-control p-3">
                <p className="text-[11px] text-slate-500">Esperado</p>
                <p className="text-lg font-semibold text-ink">Bs {formatMoney(esperadoFijo)}</p>
              </div>
              <div className="bg-surface-warm rounded-control p-3">
                <p className="text-[11px] text-slate-500">Pagaron</p>
                <p className="text-lg font-semibold text-ink">
                  {pagados}/{roster.length}
                </p>
              </div>
            </div>
            <div className="divide-y divide-surface-border border border-surface-border rounded-control">
              {roster
                .slice()
                .sort((a, b) => a.full_name.localeCompare(b.full_name))
                .map((r) => (
                  <div key={r.installment_id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-ink">{r.full_name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Bs {formatMoney(r.amount)}</span>
                      {r.status === 'pagado' ? (
                        <span className="text-xs font-medium text-brand-success bg-brand-success/10 rounded-full px-2 py-0.5">
                          Pagó
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-brand-alert bg-brand-alert/10 rounded-full px-2 py-0.5">
                          Pendiente
                        </span>
                      )}
                    </span>
                  </div>
                ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              El pago de la cuota se hace desde la página Pagos de cada fraterno (o el admin lo registra en Deudores).
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="bg-surface-warm rounded-control p-3">
                <p className="text-[11px] text-slate-500">Total recaudado</p>
                <p className="text-lg font-semibold text-brand-primary">Bs {formatMoney(recaudadoLibre)}</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowContribute(true)}
                  className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
                >
                  + Registrar contribución
                </button>
              )}
            </div>
            <div className="divide-y divide-surface-border border border-surface-border rounded-control">
              {contributions.length === 0 && <p className="p-3 text-sm text-slate-400">Aún no hay contribuciones.</p>}
              {contributions.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-sm text-ink">{c.member_name || 'Anónimo'}</p>
                    <p className="text-[11px] text-slate-400">
                      {c.date}
                      {c.description ? ` · ${c.description}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-brand-primary">Bs {formatMoney(c.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {isAdmin && (
          <div className="mt-4 text-right">
            <button onClick={handleDelete} className="text-xs text-slate-400 hover:text-brand-alert">
              Eliminar evento
            </button>
          </div>
        )}

        {showContribute && (
          <ContributionModal
            event={event}
            members={members}
            onClose={() => setShowContribute(false)}
            onDone={() => {
              setShowContribute(false)
              reload()
            }}
          />
        )}
      </div>
    </div>
  )
}

function ContributionModal({
  event,
  members,
  onClose,
  onDone,
}: {
  event: FraternityEvent
  members: FraternityUser[]
  onClose: () => void
  onDone: () => void
}) {
  const [memberId, setMemberId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const input: TransactionInput = {
        type: 'ingreso',
        category: 'Evento',
        amount: Number(amount),
        description: `Contribución — ${event.name}`,
        date,
        member_id: memberId || null,
        event_id: event.id,
      }
      await createTransaction(input)
      onDone()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo registrar la contribución')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-3">Registrar contribución</h3>
        <div className="space-y-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fraterno (opcional)</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            >
              <option value="">— anónimo —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
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
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
            {loading ? 'Registrando…' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
