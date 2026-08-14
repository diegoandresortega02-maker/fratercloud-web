import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import {
  deleteTurn,
  generateGroupTurnRotation,
  generateTurnRotation,
  getFraternityMembers,
  getTurns,
  setTurnResponsible,
  updateTurn,
} from '../../lib/api'
import { listarGrupos, listarIntegrantes, type IntegranteGrupo } from '../../lib/grupos'
import type { FraternityUser, Turn, TurnStatus } from '../../lib/types'
import { toISODate } from '../../lib/dates'

function nextThursday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = (4 - day + 7) % 7 || 7
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff))
}

export default function TurnosPage() {
  const { fraternityUser, groupsEnabled } = useAuth()
  const isAdmin = fraternityUser?.role === 'admin'
  const [turns, setTurns] = useState<Turn[]>([])
  const [members, setMembers] = useState<FraternityUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerate, setShowGenerate] = useState(false)
  const [editTurn, setEditTurn] = useState<Turn | null>(null)
  /** Los grupos a los que pertenezco: solo en esos puedo designar responsable. */
  const [misGrupos, setMisGrupos] = useState<Set<string>>(new Set())
  const [designar, setDesignar] = useState<Turn | null>(null)

  async function reload() {
    const today = new Date()
    const from = toISODate(new Date(today.getFullYear(), today.getMonth() - 2, 1))
    const to = toISODate(new Date(today.getFullYear() + 1, today.getMonth(), 0))
    const [t, m] = await Promise.all([getTurns(from, to), getFraternityMembers()])
    setTurns(t)
    setMembers(m)
    if (groupsEnabled) {
      const gs = await listarGrupos()
      setMisGrupos(new Set(gs.filter((g) => g.soyMiembro).map((g) => g.id)))
    }
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="p-8 text-sm text-slate-400">Cargando…</p>

  const today = toISODate(new Date())
  const upcoming = turns.filter((t) => t.date >= today)
  const past = turns.filter((t) => t.date < today).reverse()

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-ink">Turnos</h1>
        {isAdmin && (
          <button
            onClick={() => setShowGenerate(true)}
            className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
          >
            Generar rotación
          </button>
        )}
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-ink mb-3">Próximos turnos</h2>
        <TurnList
          turns={upcoming}
          isAdmin={isAdmin}
          misGrupos={misGrupos}
          onEdit={setEditTurn}
          onDesignar={setDesignar}
          emptyText="No hay turnos programados. El administrador puede generar la rotación."
        />
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 mb-3">Turnos pasados</h2>
          <TurnList
            turns={past.slice(0, 12)}
            isAdmin={isAdmin}
            misGrupos={misGrupos}
            onEdit={setEditTurn}
            onDesignar={setDesignar}
            emptyText=""
          />
        </section>
      )}

      {showGenerate && (
        <GenerateModal
          porGrupos={groupsEnabled}
          onClose={() => setShowGenerate(false)}
          onDone={() => {
            setShowGenerate(false)
            reload()
          }}
        />
      )}
      {designar && (
        <DesignarModal
          turn={designar}
          onClose={() => setDesignar(null)}
          onDone={() => {
            setDesignar(null)
            reload()
          }}
        />
      )}
      {editTurn && (
        <EditTurnModal
          turn={editTurn}
          members={members}
          onClose={() => setEditTurn(null)}
          onDone={() => {
            setEditTurn(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function TurnList({
  turns,
  isAdmin,
  misGrupos,
  onEdit,
  onDesignar,
  emptyText,
}: {
  turns: Turn[]
  isAdmin: boolean
  misGrupos: Set<string>
  onEdit: (t: Turn) => void
  onDesignar: (t: Turn) => void
  emptyText: string
}) {
  if (turns.length === 0) {
    return emptyText ? (
      <div className="bg-white rounded-card border border-surface-border p-4">
        <p className="text-sm text-slate-400">{emptyText}</p>
      </div>
    ) : null
  }
  return (
    <div className="bg-white rounded-card border border-surface-border divide-y divide-surface-border">
      {turns.map((t) => {
        // En un turno de grupo el titular es el grupo; el fraterno es quien lo cubre.
        const esDeGrupo = !!t.group_id
        const puedeDesignar = esDeGrupo && (isAdmin || misGrupos.has(t.group_id!))
        return (
          <div key={t.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">
                {esDeGrupo ? (t.grupo?.name ?? 'Grupo') : t.member?.full_name}
                {t.replacement && <span className="text-slate-400"> → reemplaza {t.replacement.full_name}</span>}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(t.date + 'T12:00:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {t.notes ? ` · ${t.notes}` : ''}
              </p>
              {esDeGrupo && (
                <p className="text-xs mt-0.5">
                  {t.member ? (
                    <span className="text-slate-500">Cubre {t.member.full_name}</span>
                  ) : (
                    <span className="text-brand-gold font-medium">Sin responsable designado</span>
                  )}
                  {puedeDesignar && (
                    <button
                      onClick={() => onDesignar(t)}
                      className="ml-2 text-brand-primary hover:underline font-medium"
                      aria-label={`${t.member ? 'Cambiar' : 'Designar'} responsable del turno de ${t.grupo?.name ?? 'grupo'}`}
                    >
                      {t.member ? 'Cambiar' : 'Designar'}
                    </button>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={t.status} />
              {isAdmin && (
                <button onClick={() => onEdit(t)} className="text-xs font-medium text-brand-primary hover:underline">
                  Editar
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Elegir quién del grupo cubre el turno. Solo lista a los del grupo. */
function DesignarModal({ turn, onClose, onDone }: { turn: Turn; onClose: () => void; onDone: () => void }) {
  const [integrantes, setIntegrantes] = useState<IntegranteGrupo[]>([])
  const [memberId, setMemberId] = useState(turn.member_id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listarIntegrantes(turn.group_id!).then(setIntegrantes).catch(console.error)
  }, [turn.group_id])

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      await setTurnResponsible(turn.id, memberId || null)
      onDone()
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-1">Responsable del turno</h3>
        <p className="text-xs text-slate-400 mb-3">
          {turn.grupo?.name} ·{' '}
          {new Date(turn.date + 'T12:00:00').toLocaleDateString('es-BO', { day: 'numeric', month: 'long' })}
        </p>
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="w-full rounded-control border border-surface-border px-2 py-2 text-sm mb-3"
        >
          <option value="">— sin designar —</option>
          {integrantes.map((i) => (
            <option key={i.member_id} value={i.member_id}>
              {i.nombre}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-brand-alert mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-control text-slate-500">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-sm px-3 py-1.5 rounded-control bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium"
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: TurnStatus }) {
  if (status === 'ok')
    return <span className="text-xs font-medium text-brand-success bg-brand-success/10 rounded-full px-2 py-0.5">OK</span>
  if (status === 'suspendido')
    return <span className="text-xs font-medium text-brand-alert bg-brand-alert/10 rounded-full px-2 py-0.5">Suspendido</span>
  return <span className="text-xs font-medium text-slate-500 bg-surface-muted rounded-full px-2 py-0.5">Pendiente</span>
}

function GenerateModal({
  porGrupos,
  onClose,
  onDone,
}: {
  porGrupos: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [startDate, setStartDate] = useState(nextThursday())
  const [weeks, setWeeks] = useState('12')
  const [modo, setModo] = useState<'fraterno' | 'grupo'>(porGrupos ? 'grupo' : 'fraterno')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      if (modo === 'grupo') await generateGroupTurnRotation(startDate, Number(weeks))
      else await generateTurnRotation(startDate, Number(weeks))
      onDone()
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : ''
      setError(
        /no_groups/.test(msg)
          ? 'Todavía no hay grupos con integrantes. Creen los grupos primero.'
          : /no_active_members/.test(msg)
            ? 'No hay fraternos activos para asignar.'
            : 'No se pudo generar la rotación',
      )
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-1">Generar rotación de turnos</h3>
        {porGrupos && (
          <div className="flex gap-2 my-3">
            {(
              [
                ['grupo', 'Por grupo'],
                ['fraterno', 'Por fraterno'],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setModo(valor)}
                className={`flex-1 rounded-control py-2 text-sm font-medium border ${
                  modo === valor
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary-dark'
                    : 'border-surface-border text-slate-500'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 mb-3">
          {modo === 'grupo'
            ? 'Asigna una semana a cada grupo con integrantes, en orden alfabético. Después cada grupo designa quién lo cubre.'
            : 'Asigna un turno semanal a cada fraterno activo en orden alfabético.'}{' '}
          Las fechas ya ocupadas se conservan.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Primera fecha</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Semanas</label>
            <input
              type="number"
              min="1"
              max="104"
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
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
            disabled={loading}
            className="text-sm px-3 py-1.5 rounded-control bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium"
          >
            {loading ? 'Generando…' : 'Generar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditTurnModal({
  turn,
  members,
  onClose,
  onDone,
}: {
  turn: Turn
  members: FraternityUser[]
  onClose: () => void
  onDone: () => void
}) {
  const [status, setStatus] = useState<TurnStatus>(turn.status)
  const [replacementId, setReplacementId] = useState(turn.replacement_member_id ?? '')
  const [notes, setNotes] = useState(turn.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      await updateTurn(turn.id, {
        status,
        replacement_member_id: replacementId || null,
        notes: notes || null,
      })
      onDone()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este turno?')) return
    await deleteTurn(turn.id)
    onDone()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-ink mb-3">
          Turno de {turn.grupo?.name ?? turn.member?.full_name ?? 'sin asignar'} — {turn.date}
        </h3>
        <div className="space-y-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TurnStatus)}
              className="w-full rounded-control border border-surface-border px-2 py-2 text-sm"
            >
              <option value="pendiente">Pendiente</option>
              <option value="ok">OK (cumplido)</option>
              <option value="suspendido">Suspendido</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Reemplazado por (opcional)</label>
            <select
              value={replacementId}
              onChange={(e) => setReplacementId(e.target.value)}
              className="w-full rounded-control border border-surface-border px-2 py-2 text-sm"
            >
              <option value="">— nadie —</option>
              {members
                .filter((m) => m.status === 'activo' && m.id !== turn.member_id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Observaciones</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. feriado, cena navideña…"
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2 justify-between">
          <button onClick={handleDelete} className="text-xs text-brand-alert hover:underline">
            Eliminar turno
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-control text-slate-500">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="text-sm px-3 py-1.5 rounded-control bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium"
            >
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
