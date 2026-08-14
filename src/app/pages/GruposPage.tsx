import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ShieldCheck, Users } from 'lucide-react'
import {
  borrarMovimiento,
  cambiarRolEnGrupo,
  crearGrupo,
  listarGrupos,
  listarIntegrantes,
  listarMovimientos,
  registrarMovimiento,
  salirDelGrupo,
  unirmeAGrupo,
  type Grupo,
  type IntegranteGrupo,
  type MovimientoGrupo,
} from '../../lib/grupos'
import { formatMoney } from '../../lib/money'
import { useAuth } from '../AuthContext'

function fechaBO(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export default function GruposPage() {
  const { fraternityUser } = useAuth()
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [abierto, setAbierto] = useState<Grupo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [saldoInicial, setSaldoInicial] = useState('')

  async function cargar() {
    try {
      setGrupos(await listarGrupos())
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar los grupos.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await crearGrupo(nombre, descripcion, Number(saldoInicial) || 0)
      setNombre('')
      setDescripcion('')
      setSaldoInicial('')
      setCreando(false)
      await cargar()
    } catch (err) {
      console.error(err)
      setError('No se pudo crear el grupo. Puede que ya exista uno con ese nombre.')
    }
  }

  async function handleUnirme(g: Grupo) {
    try {
      await unirmeAGrupo(g.id)
      await cargar()
    } catch (err) {
      console.error(err)
      setError('No se pudo unir al grupo.')
    }
  }

  async function handleSalir(g: Grupo) {
    if (!fraternityUser) return
    try {
      await salirDelGrupo(g.id, fraternityUser.id)
      await cargar()
    } catch (err) {
      console.error(err)
      setError('No se pudo salir del grupo.')
    }
  }

  if (cargando) return <div className="p-6 text-sm text-slate-400">Cargando…</div>

  if (abierto) {
    return (
      <DetalleGrupo
        grupo={abierto}
        onVolver={() => {
          setAbierto(null)
          cargar()
        }}
      />
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h1 className="text-2xl font-semibold text-ink">Grupos</h1>
        <button
          onClick={() => setCreando((v) => !v)}
          className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
        >
          {creando ? 'Cancelar' : '+ Crear grupo'}
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Cada grupo lleva su propia caja, aparte de la de la fraternidad. Sumate al tuyo.
      </p>

      {error && (
        <p role="alert" className="mb-4 rounded-control bg-brand-alert/5 px-4 py-3 text-sm text-brand-alert">
          {error}
        </p>
      )}

      {creando && (
        <form onSubmit={handleCrear} className="rounded-card border border-surface-border bg-white p-5 mb-6 space-y-3">
          <div>
            <label htmlFor="g-nombre" className="block text-sm font-medium text-slate-700 mb-1">
              Nombre del grupo
            </label>
            <input
              id="g-nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Por ejemplo: Los de la esquina"
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="g-desc" className="block text-sm font-medium text-slate-700 mb-1">
              Descripción <span className="text-slate-400">(opcional)</span>
            </label>
            <input
              id="g-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="g-saldo" className="block text-sm font-medium text-slate-700 mb-1">
              Con cuánto arranca la caja <span className="text-slate-400">(Bs)</span>
            </label>
            <input
              id="g-saldo"
              type="number"
              step="0.01"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              placeholder="0"
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <p className="text-xs text-slate-500">
            Quien crea el grupo queda como su administrador y puede nombrar a otro después.
          </p>
          <button
            type="submit"
            className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-control py-2 text-sm"
          >
            Crear grupo
          </button>
        </form>
      )}

      {grupos.length === 0 ? (
        <div className="rounded-card border border-surface-border bg-white p-6 text-sm text-slate-600">
          Todavía no hay grupos. Creá el primero y los demás se van sumando.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {grupos.map((g) => (
            <div key={g.id} className="rounded-card border border-surface-border bg-white p-5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2 className="font-semibold text-ink">{g.name}</h2>
                {g.soyAdmin && (
                  <span className="shrink-0 rounded-full bg-brand-primary/10 text-brand-primary-dark px-2 py-0.5 text-xs font-semibold">
                    Administrás
                  </span>
                )}
              </div>
              {g.description && <p className="text-sm text-slate-500 mb-3">{g.description}</p>}

              <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                <Users size={16} className="text-slate-400" />
                {g.integrantes} {g.integrantes === 1 ? 'integrante' : 'integrantes'}
              </div>

              {g.soyMiembro ? (
                <>
                  <div className="rounded-control bg-surface-warm px-3 py-2 mb-3">
                    <p className="text-xs text-slate-500">Caja del grupo</p>
                    <p className="text-lg font-bold text-ink">Bs {formatMoney(g.saldo ?? 0)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAbierto(g)}
                      className="flex-1 text-sm font-medium text-white bg-brand-navy hover:bg-ink rounded-control py-2"
                    >
                      Abrir
                    </button>
                    <button
                      onClick={() => handleSalir(g)}
                      className="text-sm font-medium text-slate-500 hover:text-brand-alert px-3"
                    >
                      Salir
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* La caja no se muestra: solo la ven los integrantes. */}
                  <button
                    onClick={() => handleUnirme(g)}
                    className="w-full text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control py-2"
                  >
                    Unirme a este grupo
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DetalleGrupo({ grupo, onVolver }: { grupo: Grupo; onVolver: () => void }) {
  const { fraternityUser } = useAuth()
  const [integrantes, setIntegrantes] = useState<IntegranteGrupo[]>([])
  const [movs, setMovs] = useState<MovimientoGrupo[]>([])
  const [saldo, setSaldo] = useState(grupo.saldo ?? 0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('egreso')
  const [monto, setMonto] = useState('')
  const [detalle, setDetalle] = useState('')
  const [categoria, setCategoria] = useState('')
  const [deQuien, setDeQuien] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  async function cargar() {
    try {
      const [ints, ms] = await Promise.all([listarIntegrantes(grupo.id), listarMovimientos(grupo.id)])
      setIntegrantes(ints)
      setMovs(ms)
      setSaldo(
        grupo.opening_balance +
          ms.reduce((s, m) => s + (m.type === 'ingreso' ? m.amount : -m.amount), 0),
      )
    } catch (err) {
      console.error(err)
      setError('No se pudo cargar el grupo.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupo.id])

  const soyAdmin = integrantes.some((i) => i.member_id === fraternityUser?.id && i.role === 'admin')

  async function agregar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await registrarMovimiento(grupo.id, {
        type: tipo,
        amount: Number(monto),
        description: detalle,
        category: categoria,
        member_id: deQuien || null,
        date: fecha,
      })
      setMonto('')
      setDetalle('')
      setCategoria('')
      setDeQuien('')
      await cargar()
    } catch (err) {
      console.error(err)
      setError('No se pudo registrar el movimiento.')
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <button onClick={onVolver} className="flex items-center gap-1 text-sm text-slate-500 hover:text-ink mb-4">
        <ArrowLeft size={16} /> Volver a los grupos
      </button>

      <h1 className="text-2xl font-semibold text-ink mb-1">{grupo.name}</h1>
      {grupo.description && <p className="text-sm text-slate-500 mb-4">{grupo.description}</p>}

      <div className="rounded-card border border-surface-border bg-white p-5 mb-6">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Caja del grupo</p>
        <p className="text-3xl font-bold text-ink">Bs {formatMoney(saldo)}</p>
        <p className="text-xs text-slate-500 mt-1">
          Arrancó con Bs {formatMoney(grupo.opening_balance)}. Esta plata es del grupo: no entra ni
          sale de las arcas de la fraternidad.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-control bg-brand-alert/5 px-4 py-3 text-sm text-brand-alert">
          {error}
        </p>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-card border border-surface-border bg-white p-5">
          <h2 className="font-semibold text-ink mb-3">Integrantes ({integrantes.length})</h2>
          {cargando ? (
            <p className="text-sm text-slate-400">Cargando…</p>
          ) : (
            <ul className="space-y-2">
              {integrantes.map((i) => (
                <li key={i.member_id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 text-ink">
                    {i.role === 'admin' && <ShieldCheck size={16} className="text-brand-primary" />}
                    {i.nombre}
                  </span>
                  {soyAdmin && i.member_id !== fraternityUser?.id && (
                    <button
                      onClick={async () => {
                        await cambiarRolEnGrupo(
                          grupo.id,
                          i.member_id,
                          i.role === 'admin' ? 'member' : 'admin',
                        )
                        await cargar()
                      }}
                      className="text-xs text-brand-primary hover:underline"
                    >
                      {i.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-card border border-surface-border bg-white p-5">
          <h2 className="font-semibold text-ink mb-3">Registrar movimiento</h2>
          {soyAdmin ? (
            <form onSubmit={agregar} className="space-y-3">
              <div className="flex gap-2">
                {(['egreso', 'ingreso'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`flex-1 rounded-control py-2 text-sm font-medium border ${
                      tipo === t
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary-dark'
                        : 'border-surface-border text-slate-500'
                    }`}
                  >
                    {t === 'egreso' ? 'Gasto' : 'Aporte'}
                  </button>
                ))}
              </div>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Monto en Bs"
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              />
              <input
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder="Concepto"
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              />
              <input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Categoría (opcional)"
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              />
              <select
                value={deQuien}
                onChange={(e) => setDeQuien(e.target.value)}
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              >
                <option value="">Sin fraterno asociado</option>
                {integrantes.map((i) => (
                  <option key={i.member_id} value={i.member_id}>
                    {i.nombre}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-control py-2 text-sm"
              >
                Registrar
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">
              Solo el administrador del grupo puede registrar movimientos. Vos podés ver todo.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-card border border-surface-border bg-white p-5 mt-6">
        <h2 className="font-semibold text-ink mb-3">Movimientos</h2>
        {movs.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay movimientos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="text-left pb-2">Fecha</th>
                  <th className="text-left pb-2">Concepto</th>
                  <th className="text-left pb-2">Fraterno</th>
                  <th className="text-right pb-2">Monto</th>
                  {soyAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {movs.map((m) => (
                  <tr key={m.id} className="border-t border-surface-border">
                    <td className="py-2 text-slate-600">{fechaBO(m.date)}</td>
                    <td className="py-2">
                      <span className="text-ink">{m.description ?? '—'}</span>
                      {m.category && (
                        <span className="block text-xs text-slate-400">{m.category}</span>
                      )}
                    </td>
                    <td className="py-2 text-slate-600">{m.nombreMiembro ?? '—'}</td>
                    <td
                      className={`py-2 text-right font-medium ${
                        m.type === 'ingreso' ? 'text-brand-success' : 'text-brand-alert'
                      }`}
                    >
                      {m.type === 'ingreso' ? '+' : '−'} Bs {formatMoney(m.amount)}
                    </td>
                    {soyAdmin && (
                      <td className="py-2 text-right">
                        <button
                          onClick={async () => {
                            await borrarMovimiento(m.id)
                            await cargar()
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
        )}
      </div>
    </div>
  )
}
