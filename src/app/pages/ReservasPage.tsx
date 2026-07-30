import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import {
  cancelReservation,
  countMyReservationsInYear,
  createBlockedDate,
  createReservation,
  deleteBlockedDate,
  getBlockedDates,
  getMemberDebtSummary,
  getMyFraternity,
  getReservations,
  type ReservationInput,
} from '../../lib/api'
import type { BlockedDate, Reservation, UsageFeeRules } from '../../lib/types'
import { addMonths, daysInMonthGrid, monthLabel, toISODate } from '../../lib/dates'
import { formatMoneyShort } from '../../lib/money'

export default function ReservasPage() {
  const { fraternityUser } = useAuth()
  const isAdmin = fraternityUser?.role === 'admin'
  const [month, setMonth] = useState(() => new Date())
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [blocked, setBlocked] = useState<BlockedDate[]>([])
  const [isBlocked, setIsBlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState<string | null>(null)
  const [showBlockForm, setShowBlockForm] = useState<string | null>(null)

  async function reload() {
    const from = toISODate(new Date(month.getFullYear(), month.getMonth(), 1))
    const to = toISODate(new Date(month.getFullYear(), month.getMonth() + 1, 0))
    const [res, blk] = await Promise.all([getReservations(from, to), getBlockedDates(from, to)])
    setReservations(res)
    setBlocked(blk)
    if (fraternityUser) {
      const summary = await getMemberDebtSummary(fraternityUser.id)
      setIsBlocked(summary.isBlocked)
    }
  }

  useEffect(() => {
    setLoading(true)
    reload().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, fraternityUser])

  const days = daysInMonthGrid(month)
  const reservationsByDay: Record<string, Reservation[]> = {}
  for (const r of reservations) {
    reservationsByDay[r.date] = reservationsByDay[r.date] || []
    reservationsByDay[r.date].push(r)
  }
  const blockedByDay: Record<string, BlockedDate> = {}
  for (const b of blocked) blockedByDay[b.date] = b

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-ink">Reservas</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(addMonths(month, -1))} className="px-2 py-1 rounded-control border border-surface-border text-sm">
            ←
          </button>
          <span className="text-sm font-medium w-36 text-center">{monthLabel(month)}</span>
          <button onClick={() => setMonth(addMonths(month, 1))} className="px-2 py-1 rounded-control border border-surface-border text-sm">
            →
          </button>
        </div>
      </div>

      {isBlocked && (
        <div className="bg-brand-alert/10 text-brand-alert text-sm rounded-card p-4 mb-4">
          Tienes 2 o más periodos pendientes de pago: no puedes crear nuevas reservas hasta ponerte al día en{' '}
          <a href="/pagos" className="underline font-medium">Pagos</a>.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {days.map((day) => {
            const iso = toISODate(day)
            const dayReservations = reservationsByDay[iso] || []
            const dayBlocked = blockedByDay[iso]
            return (
              <div key={iso} className="bg-white rounded-card border border-surface-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-ink">
                    {day.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' })}
                  </p>
                  {dayBlocked ? (
                    <span className="text-xs font-medium text-brand-alert bg-brand-alert/10 rounded-full px-2 py-0.5">
                      Bloqueado
                    </span>
                  ) : (
                    <button
                      disabled={isBlocked}
                      onClick={() => setShowForm(iso)}
                      className="text-xs font-medium text-white bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-40 rounded-full px-2 py-0.5"
                    >
                      Reservar
                    </button>
                  )}
                </div>
                {dayBlocked && dayBlocked.reason && <p className="text-xs text-slate-400 mb-1">{dayBlocked.reason}</p>}
                {dayReservations.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin reservas</p>
                ) : (
                  <ul className="space-y-1">
                    {dayReservations.map((r) => (
                      <li key={r.id} className="text-xs text-slate-600 flex items-center justify-between">
                        <span>
                          {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} · {r.fraternity_users?.full_name}
                          {r.usage_fee != null && Number(r.usage_fee) > 0 && (
                            <span className="text-brand-gold font-medium"> · Bs {formatMoneyShort(r.usage_fee)}</span>
                          )}
                        </span>
                        {(r.member_id === fraternityUser?.id || isAdmin) && (
                          <button
                            onClick={() => cancelReservation(r.id).then(reload)}
                            className="text-slate-400 hover:text-brand-alert"
                          >
                            Cancelar
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {isAdmin && !dayBlocked && (
                  <button
                    onClick={() => setShowBlockForm(iso)}
                    className="text-xs text-slate-400 hover:text-brand-alert mt-2"
                  >
                    Bloquear fecha
                  </button>
                )}
                {isAdmin && dayBlocked && (
                  <button
                    onClick={() => deleteBlockedDate(dayBlocked.id).then(reload)}
                    className="text-xs text-slate-400 hover:text-brand-primary mt-2"
                  >
                    Desbloquear
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <ReservationFormModal
          date={showForm}
          onClose={() => setShowForm(null)}
          onDone={() => {
            setShowForm(null)
            reload()
          }}
        />
      )}
      {showBlockForm && (
        <BlockDateModal
          date={showBlockForm}
          onClose={() => setShowBlockForm(null)}
          onDone={() => {
            setShowBlockForm(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function ReservationFormModal({ date, onClose, onDone }: { date: string; onClose: () => void; onDone: () => void }) {
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('14:00')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [feePreview, setFeePreview] = useState<string | null>(null)

  useEffect(() => {
    const year = Number(date.slice(0, 4))
    Promise.all([getMyFraternity(), countMyReservationsInYear(year)])
      .then(([f, priorUses]) => {
        const rules: UsageFeeRules | null = f.usage_fee_rules
        if (!rules) return
        if (priorUses < rules.free_uses) {
          setFeePreview('Este es tu uso libre del año — sin costo.')
        } else if (priorUses < rules.mid_until) {
          setFeePreview(`Este uso tiene un costo de Bs ${formatMoneyShort(rules.mid_fee)} (uso n.º ${priorUses + 1} del año).`)
        } else {
          setFeePreview(`Este uso tiene un costo de Bs ${formatMoneyShort(rules.high_fee)} (uso n.º ${priorUses + 1} del año).`)
        }
      })
      .catch(() => {})
  }, [date])

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const input: ReservationInput = { date, start_time: startTime, end_time: endTime, notes: notes || null }
      await createReservation(input)
      onDone()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo crear la reserva')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-3">Reservar el {date}</h3>
        {feePreview && (
          <p className="text-xs font-medium text-brand-gold bg-brand-gold/10 rounded-control px-3 py-2 mb-3">
            {feePreview}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-control border border-surface-border px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-control border border-surface-border px-2 py-1.5 text-sm" />
          </div>
        </div>
        <textarea
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-control border border-surface-border px-3 py-2 text-sm mb-3"
        />
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-control text-slate-500">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-sm px-3 py-1.5 rounded-control bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium"
          >
            {loading ? 'Guardando…' : 'Reservar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BlockDateModal({ date, onClose, onDone }: { date: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    try {
      await createBlockedDate(date, reason || null)
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-3">Bloquear el {date}</h3>
        <input
          placeholder="Motivo (opcional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-control border border-surface-border px-3 py-2 text-sm mb-3"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-control text-slate-500">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-sm px-3 py-1.5 rounded-control bg-brand-alert hover:opacity-90 disabled:opacity-50 text-white font-medium"
          >
            {loading ? 'Bloqueando…' : 'Bloquear'}
          </button>
        </div>
      </div>
    </div>
  )
}
