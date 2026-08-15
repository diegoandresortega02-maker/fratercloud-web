import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, CalendarPlus, Wand2, X } from 'lucide-react'
import { useAuth } from '../AuthContext'
import {
  crearTurnos,
  deleteTurn,
  getFraternityMembers,
  getTurns,
  moverTurno,
  setTurnResponsible,
  updateTurn,
  type NuevoTurno,
} from '../../lib/api'
import { listarGrupos, listarIntegrantes, type IntegranteGrupo } from '../../lib/grupos'
import type { FraternityUser, Turn, TurnStatus } from '../../lib/types'
import { toISODate } from '../../lib/dates'

/** Fecha en palabras, como la lee alguien que busca su turno en la lista. */
function fechaLarga(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return toISODate(d)
}

/** El próximo día de semana pedido, contando desde hoy. */
function proximoDia(diaSemana: number): string {
  const hoy = new Date()
  const falta = (diaSemana - hoy.getDay() + 7) % 7 || 7
  return toISODate(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + falta))
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export default function TurnosPage() {
  const { fraternityUser, groupsEnabled } = useAuth()
  const isAdmin = fraternityUser?.role === 'admin'
  const [turns, setTurns] = useState<Turn[]>([])
  const [members, setMembers] = useState<FraternityUser[]>([])
  const [grupos, setGrupos] = useState<{ id: string; name: string; soyMiembro: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [asistente, setAsistente] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [editando, setEditando] = useState<Turn | null>(null)
  const [designar, setDesignar] = useState<Turn | null>(null)

  async function reload() {
    const hoy = new Date()
    const desde = toISODate(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1))
    const hasta = toISODate(new Date(hoy.getFullYear() + 2, hoy.getMonth(), 0))
    const [t, m] = await Promise.all([getTurns(desde, hasta), getFraternityMembers()])
    setTurns(t)
    setMembers(m)
    if (groupsEnabled) {
      const gs = await listarGrupos()
      setGrupos(gs.map((g) => ({ id: g.id, name: g.name, soyMiembro: g.soyMiembro })))
    }
  }

  useEffect(() => {
    reload()
      .catch((e) => {
        console.error(e)
        setError('No se pudieron cargar los turnos.')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <p className="p-8 text-sm text-slate-400">Cargando…</p>

  const hoy = toISODate(new Date())
  const proximos = turns.filter((t) => t.date >= hoy)
  const pasados = turns.filter((t) => t.date < hoy).reverse()
  const misGrupos = new Set(grupos.filter((g) => g.soyMiembro).map((g) => g.id))
  const activos = members.filter((m) => m.status === 'activo')

  async function trasCambio(mensaje?: string) {
    setAviso(mensaje ?? null)
    setError(null)
    await reload()
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Turnos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? 'Agregá turnos cuando quieras y cambiales la fecha si se acomodan entre ustedes.'
              : 'El calendario de la fraternidad.'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setAgregando(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
            >
              <CalendarPlus size={16} /> Agregar turno
            </button>
            <button
              onClick={() => setAsistente(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-surface-border hover:bg-surface-warm rounded-control px-3 py-2"
            >
              <Wand2 size={16} /> Armar varios
            </button>
          </div>
        )}
      </div>

      {aviso && (
        <p role="status" className="mb-4 rounded-control bg-brand-success/10 px-4 py-3 text-sm text-brand-success">
          {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-control bg-brand-alert/10 px-4 py-3 text-sm text-brand-alert">
          {error}
        </p>
      )}

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-ink mb-3">Próximos turnos</h2>
        <ListaTurnos
          turns={proximos}
          isAdmin={isAdmin}
          misGrupos={misGrupos}
          onEditar={setEditando}
          onDesignar={setDesignar}
          vacio={
            isAdmin
              ? 'Todavía no hay turnos. Agregá el primero, o armá varios de una si la rotación es siempre el mismo día.'
              : 'Todavía no hay turnos programados.'
          }
        />
      </section>

      {pasados.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 mb-3">Turnos pasados</h2>
          <ListaTurnos
            turns={pasados.slice(0, 12)}
            isAdmin={isAdmin}
            misGrupos={misGrupos}
            onEditar={setEditando}
            onDesignar={setDesignar}
            vacio=""
          />
        </section>
      )}

      {agregando && (
        <ModalAgregar
          activos={activos}
          grupos={grupos}
          ocupadas={new Set(turns.map((t) => t.date))}
          onCerrar={() => setAgregando(false)}
          onListo={(n) => {
            setAgregando(false)
            trasCambio(n === 1 ? 'Turno agregado.' : `${n} turnos agregados.`)
          }}
        />
      )}
      {asistente && (
        <Asistente
          activos={activos}
          grupos={grupos}
          ocupadas={new Set(turns.map((t) => t.date))}
          onCerrar={() => setAsistente(false)}
          onListo={(n) => {
            setAsistente(false)
            trasCambio(`${n} turnos agregados al calendario.`)
          }}
        />
      )}
      {editando && (
        <ModalEditar
          turn={editando}
          activos={activos}
          turnos={turns}
          onCerrar={() => setEditando(null)}
          onListo={(msg) => {
            setEditando(null)
            trasCambio(msg)
          }}
        />
      )}
      {designar && (
        <ModalDesignar
          turn={designar}
          onCerrar={() => setDesignar(null)}
          onListo={() => {
            setDesignar(null)
            trasCambio('Responsable designado.')
          }}
        />
      )}
    </div>
  )
}

function ListaTurnos({
  turns,
  isAdmin,
  misGrupos,
  onEditar,
  onDesignar,
  vacio,
}: {
  turns: Turn[]
  isAdmin: boolean
  misGrupos: Set<string>
  onEditar: (t: Turn) => void
  onDesignar: (t: Turn) => void
  vacio: string
}) {
  if (turns.length === 0) {
    return vacio ? (
      <div className="bg-white rounded-card border border-surface-border p-5">
        <p className="text-sm text-slate-500">{vacio}</p>
      </div>
    ) : null
  }

  return (
    <div className="bg-white rounded-card border border-surface-border divide-y divide-surface-border">
      {turns.map((t) => {
        // En un turno de grupo el titular es el grupo; el fraterno lo cubre.
        const esDeGrupo = !!t.group_id
        const puedeDesignar = esDeGrupo && (isAdmin || misGrupos.has(t.group_id!))
        return (
          <div key={t.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {esDeGrupo ? (t.grupo?.name ?? 'Grupo') : (t.member?.full_name ?? 'Sin asignar')}
                {t.replacement && (
                  <span className="text-slate-400"> → reemplaza {t.replacement.full_name}</span>
                )}
              </p>
              <p className="text-xs text-slate-400">
                {fechaLarga(t.date)}
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
            <div className="flex items-center gap-3 shrink-0">
              <Insignia status={t.status} />
              {isAdmin && (
                <button
                  onClick={() => onEditar(t)}
                  className="text-xs font-medium text-brand-primary hover:underline"
                  aria-label={`Editar el turno del ${fechaLarga(t.date)}`}
                >
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

function Insignia({ status }: { status: TurnStatus }) {
  if (status === 'ok')
    return (
      <span className="text-xs font-medium text-brand-success bg-brand-success/10 rounded-full px-2 py-0.5">
        Cumplido
      </span>
    )
  if (status === 'suspendido')
    return (
      <span className="text-xs font-medium text-brand-alert bg-brand-alert/10 rounded-full px-2 py-0.5">
        Suspendido
      </span>
    )
  return (
    <span className="text-xs font-medium text-slate-500 bg-surface-muted rounded-full px-2 py-0.5">
      Pendiente
    </span>
  )
}

function Modal({ titulo, children, onCerrar }: { titulo: string; children: React.ReactNode; onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-card w-full max-w-lg max-h-[88vh] overflow-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-semibold text-ink">{titulo}</h3>
          {/* Sin type explícito un botón dentro de un modal con formulario
              cuenta como submit: cerrar terminaría guardando. */}
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-slate-400 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const CAMPO = 'w-full rounded-control border border-surface-border px-3 py-2 text-sm'

/** Un turno suelto: la forma más directa de sumar una fecha al calendario. */
function ModalAgregar({
  activos,
  grupos,
  ocupadas,
  onCerrar,
  onListo,
}: {
  activos: FraternityUser[]
  grupos: { id: string; name: string }[]
  ocupadas: Set<string>
  onCerrar: () => void
  onListo: (n: number) => void
}) {
  const [fecha, setFecha] = useState(toISODate(new Date()))
  const [aQuien, setAQuien] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ocupada = ocupadas.has(fecha)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setGuardando(true)
    try {
      const esGrupo = aQuien.startsWith('g:')
      await crearTurnos([
        {
          date: fecha,
          member_id: esGrupo ? null : aQuien || null,
          group_id: esGrupo ? aQuien.slice(2) : null,
          notes: notas || null,
        },
      ])
      onListo(1)
    } catch (err) {
      console.error(err)
      setError('No se pudo agregar el turno.')
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Agregar un turno" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label htmlFor="nuevo-fecha" className="block text-sm font-medium text-slate-700 mb-1">
            Fecha
          </label>
          <input
            id="nuevo-fecha"
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={CAMPO}
          />
          <p className="mt-1 text-xs text-slate-500">{fechaLarga(fecha)}</p>
          {ocupada && (
            <p role="alert" className="mt-2 text-sm text-brand-alert bg-brand-alert/5 rounded-control px-3 py-2">
              Ese día ya tiene un turno asignado. Elegí otra fecha, o cambiá el que ya existe desde
              su botón Editar.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="nuevo-quien" className="block text-sm font-medium text-slate-700 mb-1">
            ¿A quién le toca?
          </label>
          <select id="nuevo-quien" value={aQuien} onChange={(e) => setAQuien(e.target.value)} className={CAMPO}>
            <option value="">— sin asignar por ahora —</option>
            {activos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
            {grupos.length > 0 && (
              <optgroup label="Grupos">
                {grupos.map((g) => (
                  <option key={g.id} value={`g:${g.id}`}>
                    {g.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <div>
          <label htmlFor="nuevo-notas" className="block text-sm font-medium text-slate-700 mb-1">
            Observaciones <span className="text-slate-400">(opcional)</span>
          </label>
          <input
            id="nuevo-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. cena de fin de año"
            className={CAMPO}
          />
        </div>
        {error && <p role="alert" className="text-sm text-brand-alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="rounded-control px-3 py-2 text-sm text-slate-500">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || ocupada}
            className="rounded-control bg-brand-primary hover:bg-brand-primary-dark px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {guardando ? 'Agregando…' : 'Agregar turno'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

interface FilaPrevia {
  date: string
  quien: string
}

/**
 * Arma varias fechas de una vez.
 *
 * Muestra la lista completa antes de guardar y deja corregirla: el orden que
 * propone el sistema casi nunca es el que la fraternidad ya tiene acordado.
 */
function Asistente({
  activos,
  grupos,
  ocupadas,
  onCerrar,
  onListo,
}: {
  activos: FraternityUser[]
  grupos: { id: string; name: string }[]
  ocupadas: Set<string>
  onCerrar: () => void
  onListo: (n: number) => void
}) {
  const [paso, setPaso] = useState<1 | 2>(1)
  const [entre, setEntre] = useState<'fraternos' | 'grupos'>('fraternos')
  const [diaSemana, setDiaSemana] = useState(4)
  const [desde, setDesde] = useState(proximoDia(4))
  const [cada, setCada] = useState(7)
  const [cuantos, setCuantos] = useState(12)
  const [orden, setOrden] = useState<string[]>([])
  const [previa, setPrevia] = useState<FilaPrevia[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const participantes = entre === 'grupos' ? grupos : activos.map((m) => ({ id: m.id, name: m.full_name }))
  const nombre = (id: string) => participantes.find((p) => p.id === id)?.name ?? '—'

  // Al cambiar el día de la semana se corre la fecha de inicio: nadie quiere
  // elegir "jueves" y que la primera fecha caiga un martes.
  function elegirDia(d: number) {
    setDiaSemana(d)
    setDesde(proximoDia(d))
  }

  function armarPrevia() {
    const lista = orden.length > 0 ? orden : participantes.map((p) => p.id)
    if (lista.length === 0) {
      setError('No hay a quién asignarle los turnos.')
      return
    }
    setOrden(lista)
    const filas: FilaPrevia[] = []
    for (let i = 0; i < cuantos; i++) {
      filas.push({ date: sumarDias(desde, i * cada), quien: lista[i % lista.length] })
    }
    setPrevia(filas)
    setError(null)
    setPaso(2)
  }

  function mover(i: number, delta: number) {
    const j = i + delta
    if (j < 0 || j >= previa.length) return
    // Se intercambia solo el nombre: las fechas quedan donde están.
    const copia = [...previa]
    const tmp = copia[i].quien
    copia[i] = { ...copia[i], quien: copia[j].quien }
    copia[j] = { ...copia[j], quien: tmp }
    setPrevia(copia)
  }

  const chocan = previa.filter((f) => ocupadas.has(f.date))
  const aGuardar = previa.filter((f) => !ocupadas.has(f.date))

  async function guardar() {
    setError(null)
    setGuardando(true)
    try {
      const turnos: NuevoTurno[] = aGuardar.map((f) => ({
        date: f.date,
        member_id: entre === 'grupos' ? null : f.quien,
        group_id: entre === 'grupos' ? f.quien : null,
      }))
      onListo(await crearTurnos(turnos))
    } catch (err) {
      console.error(err)
      setError('No se pudieron guardar los turnos.')
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Armar varios turnos" onCerrar={onCerrar}>
      {paso === 1 ? (
        <div className="space-y-4">
          {grupos.length > 0 && (
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-1">¿Entre quiénes rota?</span>
              <div className="flex gap-2">
                {(
                  [
                    ['fraternos', 'Entre fraternos'],
                    ['grupos', 'Entre grupos'],
                  ] as const
                ).map(([v, txt]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setEntre(v)
                      setOrden([])
                    }}
                    className={`flex-1 rounded-control py-2 text-sm font-medium border ${
                      entre === v
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary-dark'
                        : 'border-surface-border text-slate-500'
                    }`}
                  >
                    {txt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="block text-sm font-medium text-slate-700 mb-1">¿Qué día?</span>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {DIAS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => elegirDia(i)}
                  className={`rounded-control py-2 text-xs font-medium border capitalize ${
                    diaSemana === i
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary-dark'
                      : 'border-surface-border text-slate-500'
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="a-desde" className="block text-sm font-medium text-slate-700 mb-1">
                Primera fecha
              </label>
              <input
                id="a-desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className={CAMPO}
              />
            </div>
            <div>
              <label htmlFor="a-cuantos" className="block text-sm font-medium text-slate-700 mb-1">
                Cuántos turnos
              </label>
              <input
                id="a-cuantos"
                type="number"
                min={1}
                max={104}
                value={cuantos}
                onChange={(e) => setCuantos(Math.min(104, Math.max(1, Number(e.target.value) || 1)))}
                className={CAMPO}
              />
            </div>
          </div>

          <div>
            <label htmlFor="a-cada" className="block text-sm font-medium text-slate-700 mb-1">
              Cada cuánto
            </label>
            <select id="a-cada" value={cada} onChange={(e) => setCada(Number(e.target.value))} className={CAMPO}>
              <option value={7}>Todas las semanas</option>
              <option value={14}>Cada dos semanas</option>
              <option value={21}>Cada tres semanas</option>
              <option value={28}>Cada cuatro semanas</option>
            </select>
          </div>

          {error && <p role="alert" className="text-sm text-brand-alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onCerrar} className="rounded-control px-3 py-2 text-sm text-slate-500">
              Cancelar
            </button>
            <button
              onClick={armarPrevia}
              className="rounded-control bg-brand-primary hover:bg-brand-primary-dark px-4 py-2 text-sm font-medium text-white"
            >
              Ver cómo queda
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-slate-600 mb-3">
            Así queda el calendario. Cambiá a quién le toca cada fecha antes de guardar.
          </p>

          {chocan.length > 0 && (
            <p className="mb-3 rounded-control bg-brand-gold/10 px-3 py-2 text-sm text-brand-gold">
              {chocan.length === 1
                ? 'Una de estas fechas ya tiene turno y se va a saltear.'
                : `${chocan.length} de estas fechas ya tienen turno y se van a saltear.`}{' '}
              Los turnos que ya existen no se tocan.
            </p>
          )}

          <ul className="divide-y divide-surface-border border border-surface-border rounded-control mb-4">
            {previa.map((f, i) => {
              const tomada = ocupadas.has(f.date)
              return (
                <li
                  key={f.date}
                  className={`flex items-center gap-2 px-3 py-2 ${tomada ? 'bg-surface-muted' : ''}`}
                >
                  <span className={`text-xs w-32 shrink-0 ${tomada ? 'text-slate-400 line-through' : 'text-slate-500'}`}>
                    {new Date(f.date + 'T12:00:00').toLocaleDateString('es-BO', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  {tomada ? (
                    <span className="text-sm text-slate-400 flex-1">ya tiene turno</span>
                  ) : (
                    <>
                      <select
                        value={f.quien}
                        onChange={(e) => {
                          const copia = [...previa]
                          copia[i] = { ...copia[i], quien: e.target.value }
                          setPrevia(copia)
                        }}
                        aria-label={`A quién le toca el ${fechaLarga(f.date)}`}
                        className="flex-1 min-w-0 rounded-control border border-surface-border px-2 py-1 text-sm"
                      >
                        {participantes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => mover(i, -1)}
                        aria-label={`Subir a ${nombre(f.quien)}`}
                        className="text-slate-400 hover:text-ink p-1"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => mover(i, 1)}
                        aria-label={`Bajar a ${nombre(f.quien)}`}
                        className="text-slate-400 hover:text-ink p-1"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>

          {error && <p role="alert" className="text-sm text-brand-alert mb-2">{error}</p>}
          <div className="flex justify-between gap-2">
            <button onClick={() => setPaso(1)} className="rounded-control px-3 py-2 text-sm text-slate-500">
              ← Cambiar fechas
            </button>
            <button
              onClick={guardar}
              disabled={guardando || aGuardar.length === 0}
              className="rounded-control bg-brand-primary hover:bg-brand-primary-dark px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {guardando ? 'Guardando…' : `Guardar ${aGuardar.length} turnos`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/**
 * Editar un turno, fecha incluida.
 *
 * Cambiar la fecha a un día ya ocupado no es un error sino el caso más común:
 * dos fraternos que se acomodaron entre ellos. Los dos turnos se intercambian.
 */
function ModalEditar({
  turn,
  activos,
  turnos,
  onCerrar,
  onListo,
}: {
  turn: Turn
  activos: FraternityUser[]
  turnos: Turn[]
  onCerrar: () => void
  onListo: (mensaje?: string) => void
}) {
  const [fecha, setFecha] = useState(turn.date)
  const [memberId, setMemberId] = useState(turn.member_id ?? '')
  const [status, setStatus] = useState<TurnStatus>(turn.status)
  const [reemplazo, setReemplazo] = useState(turn.replacement_member_id ?? '')
  const [notas, setNotas] = useState(turn.notes ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esDeGrupo = !!turn.group_id
  const choque = turnos.find((t) => t.date === fecha && t.id !== turn.id)
  const nombreChoque = choque ? (choque.grupo?.name ?? choque.member?.full_name ?? 'otro turno') : null

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setGuardando(true)
    try {
      let mensaje: string | undefined
      if (fecha !== turn.date) {
        const r = await moverTurno(turn.id, fecha)
        mensaje = r.intercambio
          ? `Turnos intercambiados con ${r.con ?? 'el otro turno'}.`
          : 'Fecha actualizada.'
      }
      await updateTurn(turn.id, {
        status,
        // En un turno de grupo, member_id es quién lo cubre y se toca desde
        // "Designar": acá se dejaría en null sin querer.
        ...(esDeGrupo ? {} : { member_id: memberId || null }),
        replacement_member_id: reemplazo || null,
        notes: notas || null,
      })
      onListo(mensaje ?? 'Turno actualizado.')
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar el turno.')
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el turno del ${fechaLarga(turn.date)}?`)) return
    try {
      await deleteTurn(turn.id)
      onListo('Turno eliminado.')
    } catch (err) {
      console.error(err)
      setError('No se pudo eliminar el turno.')
    }
  }

  return (
    <Modal
      titulo={`Turno de ${turn.grupo?.name ?? turn.member?.full_name ?? 'sin asignar'}`}
      onCerrar={onCerrar}
    >
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label htmlFor="ed-fecha" className="block text-sm font-medium text-slate-700 mb-1">
            Fecha
          </label>
          <input
            id="ed-fecha"
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={CAMPO}
          />
          <p className="mt-1 text-xs text-slate-500">{fechaLarga(fecha)}</p>
          {choque && (
            <p className="mt-2 rounded-control bg-brand-primary/5 border border-brand-primary/20 px-3 py-2 text-sm text-ink">
              Ese día lo tiene <strong>{nombreChoque}</strong>. Al guardar se{' '}
              <strong>intercambian los turnos</strong>: {nombreChoque} pasa al{' '}
              {new Date(turn.date + 'T12:00:00').toLocaleDateString('es-BO', {
                day: 'numeric',
                month: 'long',
              })}
              .
            </p>
          )}
        </div>

        {!esDeGrupo && (
          <div>
            <label htmlFor="ed-quien" className="block text-sm font-medium text-slate-700 mb-1">
              ¿A quién le toca?
            </label>
            <select id="ed-quien" value={memberId} onChange={(e) => setMemberId(e.target.value)} className={CAMPO}>
              <option value="">— sin asignar —</option>
              {activos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="ed-estado" className="block text-sm font-medium text-slate-700 mb-1">
            Estado
          </label>
          <select
            id="ed-estado"
            value={status}
            onChange={(e) => setStatus(e.target.value as TurnStatus)}
            className={CAMPO}
          >
            <option value="pendiente">Pendiente</option>
            <option value="ok">Cumplido</option>
            <option value="suspendido">Suspendido</option>
          </select>
        </div>

        <div>
          <label htmlFor="ed-reemplazo" className="block text-sm font-medium text-slate-700 mb-1">
            Lo cubrió otro fraterno <span className="text-slate-400">(opcional)</span>
          </label>
          <select
            id="ed-reemplazo"
            value={reemplazo}
            onChange={(e) => setReemplazo(e.target.value)}
            className={CAMPO}
          >
            <option value="">— nadie —</option>
            {activos
              .filter((m) => m.id !== turn.member_id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label htmlFor="ed-notas" className="block text-sm font-medium text-slate-700 mb-1">
            Observaciones
          </label>
          <input
            id="ed-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. feriado, cena navideña…"
            className={CAMPO}
          />
        </div>

        {error && <p role="alert" className="text-sm text-brand-alert">{error}</p>}

        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={eliminar} className="text-xs text-brand-alert hover:underline">
            Eliminar turno
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="rounded-control px-3 py-2 text-sm text-slate-500">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-control bg-brand-primary hover:bg-brand-primary-dark px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

/** Elegir quién del grupo cubre el turno. Solo lista a los de ese grupo. */
function ModalDesignar({
  turn,
  onCerrar,
  onListo,
}: {
  turn: Turn
  onCerrar: () => void
  onListo: () => void
}) {
  const [integrantes, setIntegrantes] = useState<IntegranteGrupo[]>([])
  const [memberId, setMemberId] = useState(turn.member_id ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listarIntegrantes(turn.group_id!).then(setIntegrantes).catch(console.error)
  }, [turn.group_id])

  async function guardar() {
    setError(null)
    setGuardando(true)
    try {
      await setTurnResponsible(turn.id, memberId || null)
      onListo()
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar.')
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Responsable del turno" onCerrar={onCerrar}>
      <p className="text-xs text-slate-400 mb-3">
        {turn.grupo?.name} · {fechaLarga(turn.date)}
      </p>
      <select
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
        aria-label="Responsable"
        className={`${CAMPO} mb-4`}
      >
        <option value="">— sin designar —</option>
        {integrantes.map((i) => (
          <option key={i.member_id} value={i.member_id}>
            {i.nombre}
          </option>
        ))}
      </select>
      {error && <p role="alert" className="text-sm text-brand-alert mb-2">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onCerrar} className="rounded-control px-3 py-2 text-sm text-slate-500">
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={guardando}
          className="rounded-control bg-brand-primary hover:bg-brand-primary-dark px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}
