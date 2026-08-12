import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { signOut } from '../../lib/auth'
import { formatMoney } from '../../lib/money'
import {
  aprobarPago,
  listarFraternidades,
  listarFraternos,
  listarPagos,
  listarPlanes,
  rechazarPago,
  type FraternidadCliente,
  type FraternoDeCliente,
  type PagoMembresia,
  type Plan,
} from '../../lib/platform'

type Pestana = 'fraternidades' | 'pagos' | 'planes' | 'resumen'

const PESTANAS: { id: Pestana; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'fraternidades', label: 'Fraternidades' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'planes', label: 'Planes' },
]

/** Color del estado según lo urgente que sea, no según el nombre. */
function Estado({ f }: { f: FraternidadCliente }) {
  const d = f.diasRestantes
  let texto: string = f.estado
  let clase = 'bg-slate-100 text-slate-600'

  if (f.estado === 'vencida') {
    texto = 'Vencida'
    clase = 'bg-brand-alert/10 text-brand-alert'
  } else if (f.estado === 'cancelada') {
    texto = 'Cancelada'
  } else if (d != null && d <= 30) {
    texto = `Vence en ${d} d`
    clase = 'bg-brand-gold/10 text-brand-gold'
  } else if (f.estado === 'prueba') {
    texto = 'En prueba'
    clase = 'bg-brand-primary/10 text-brand-primary-dark'
  } else {
    texto = 'Al día'
    clase = 'bg-brand-success/10 text-brand-success'
  }
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${clase}`}>{texto}</span>
}

export default function PlataformaPage() {
  const [pestana, setPestana] = useState<Pestana>('resumen')
  const [frats, setFrats] = useState<FraternidadCliente[]>([])
  const [pagos, setPagos] = useState<PagoMembresia[]>([])
  const [planes, setPlanes] = useState<Plan[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [abierta, setAbierta] = useState<FraternidadCliente | null>(null)
  const [fraternos, setFraternos] = useState<FraternoDeCliente[]>([])
  const [cargandoFraternos, setCargandoFraternos] = useState(false)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [f, p, pl] = await Promise.all([listarFraternidades(), listarPagos(), listarPlanes()])
      setFrats(f)
      setPagos(p)
      setPlanes(pl)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'No se pudo cargar la información.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  async function abrirFraternidad(f: FraternidadCliente) {
    setAbierta(f)
    setCargandoFraternos(true)
    try {
      setFraternos(await listarFraternos(f.id))
    } catch (e) {
      console.error(e)
      setFraternos([])
    } finally {
      setCargandoFraternos(false)
    }
  }

  async function revisar(id: string, aprobar: boolean) {
    try {
      if (aprobar) await aprobarPago(id)
      else await rechazarPago(id)
      await cargar()
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'No se pudo registrar la revisión.')
    }
  }

  const pendientes = pagos.filter((p) => p.status === 'pendiente')
  const ingresoAnual = frats
    .filter((f) => f.estado === 'activa' || f.estado === 'prueba')
    .reduce((s, f) => s + f.aCobrar, 0)
  const porVencer = frats.filter(
    (f) => f.diasRestantes != null && f.diasRestantes <= 30 && f.estado !== 'vencida',
  )

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="bg-brand-navy text-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-bold">
              Frater<span className="text-brand-primary">Cloud</span>
            </span>
            <span className="text-xs text-slate-300">Panel de plataforma</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-slate-300 hover:text-white">
              Ver la web
            </Link>
            <button onClick={() => signOut()} className="text-slate-300 hover:text-white">
              Cerrar sesión
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPestana(p.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                pestana === p.id ? 'bg-surface-muted text-ink' : 'text-slate-300 hover:text-white'
              }`}
            >
              {p.label}
              {p.id === 'pagos' && pendientes.length > 0 && (
                <span className="ml-2 rounded-full bg-brand-coral px-1.5 py-0.5 text-xs text-white">
                  {pendientes.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <p role="alert" className="mb-4 rounded-control bg-brand-alert/10 px-4 py-3 text-sm text-brand-alert">
            {error}
          </p>
        )}
        {cargando ? (
          <p className="text-slate-500 text-sm">Cargando…</p>
        ) : (
          <>
            {pestana === 'resumen' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Tarjeta titulo="Fraternidades" valor={String(frats.length)} />
                <Tarjeta
                  titulo="Ingreso anual comprometido"
                  valor={`Bs ${formatMoney(ingresoAnual)}`}
                  nota="Suma de lo que corresponde cobrar a las vigentes"
                />
                <Tarjeta
                  titulo="Pagos por revisar"
                  valor={String(pendientes.length)}
                  alerta={pendientes.length > 0}
                />
                <Tarjeta
                  titulo="Vencen en 30 días"
                  valor={String(porVencer.length)}
                  alerta={porVencer.length > 0}
                  nota={porVencer.map((f) => f.nombre).join(', ') || undefined}
                />
                <div className="sm:col-span-2 lg:col-span-4 rounded-card bg-white border border-surface-border p-5">
                  <h3 className="font-semibold text-ink mb-3">Fraternidades por plan</h3>
                  <div className="flex flex-wrap gap-4">
                    {planes.map((pl) => (
                      <div key={pl.id} className="rounded-control bg-surface-warm px-4 py-3">
                        <div className="text-2xl font-bold text-ink">
                          {frats.filter((f) => f.planCode === pl.code).length}
                        </div>
                        <div className="text-xs text-slate-600">{pl.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {pestana === 'fraternidades' && (
              <div className="rounded-card bg-white border border-surface-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-warm text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Fraternidad</th>
                        <th className="px-4 py-3">Plan</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Vence</th>
                        <th className="px-4 py-3 text-right">Activos</th>
                        <th className="px-4 py-3 text-right">Extras</th>
                        <th className="px-4 py-3 text-right">A cobrar</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {frats.map((f) => (
                        <tr key={f.id} className="hover:bg-surface-warm/60">
                          <td className="px-4 py-3 font-medium text-ink">{f.nombre}</td>
                          <td className="px-4 py-3 text-slate-600">{f.plan}</td>
                          <td className="px-4 py-3">
                            <Estado f={f} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">{f.vence ?? '—'}</td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {f.activos}
                            <span className="text-slate-400"> / {f.incluidos}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {f.extras > 0 ? (
                              <span className="font-semibold text-brand-gold">
                                {f.extras} × Bs {f.precioExtra}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-ink">
                            Bs {formatMoney(f.aCobrar)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => abrirFraternidad(f)}
                              className="text-brand-primary hover:underline"
                            >
                              Ver fraternos
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {pestana === 'pagos' && (
              <div className="rounded-card bg-white border border-surface-border p-5">
                {pagos.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Todavía no hay comprobantes. Van a aparecer acá cuando una fraternidad suba el
                    suyo desde su panel.
                  </p>
                ) : (
                  <ul className="divide-y divide-surface-border">
                    {pagos.map((p) => (
                      <li key={p.id} className="py-4 flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[200px]">
                          <div className="font-medium text-ink">{p.fraternidad}</div>
                          <div className="text-xs text-slate-500">
                            Bs {formatMoney(p.amount)} · {p.cycle} ·{' '}
                            {new Date(p.submitted_at).toLocaleDateString('es-BO')}
                          </div>
                        </div>
                        {p.proof_url && (
                          <a
                            href={p.proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-brand-primary hover:underline"
                          >
                            Ver comprobante
                          </a>
                        )}
                        {p.status === 'pendiente' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => revisar(p.id, true)}
                              className="rounded-control bg-brand-success px-3 py-1.5 text-sm font-medium text-white"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => revisar(p.id, false)}
                              className="rounded-control border border-surface-border px-3 py-1.5 text-sm text-slate-600"
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              p.status === 'aprobado'
                                ? 'bg-brand-success/10 text-brand-success'
                                : 'bg-brand-alert/10 text-brand-alert'
                            }`}
                          >
                            {p.status}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {pestana === 'planes' && (
              <div className="grid md:grid-cols-3 gap-4">
                {planes.map((pl) => (
                  <div key={pl.id} className="rounded-card bg-white border border-surface-border p-5">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg font-bold text-ink">{pl.name}</h3>
                      {!pl.is_public && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          a medida
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-ink mt-2">
                      Bs {formatMoney(pl.price_annual)}
                      <span className="text-sm font-normal text-slate-500">/año</span>
                    </p>
                    <dl className="mt-4 space-y-1 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <dt>Fraternos incluidos</dt>
                        <dd className="font-medium text-ink">{pl.included_members}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Extra por fraterno</dt>
                        <dd className="font-medium text-ink">Bs {pl.extra_member_price}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Tope de extras</dt>
                        <dd className="font-medium text-ink">{pl.max_extra_members ?? 'sin tope'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Administradores</dt>
                        <dd className="font-medium text-ink">{pl.max_admins}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {Object.entries(pl.features).map(([k, v]) => (
                        <span
                          key={k}
                          className={`rounded px-2 py-0.5 text-xs ${
                            v ? 'bg-brand-success/10 text-brand-success' : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="md:col-span-3 text-xs text-slate-500">
                  Los precios y topes se editan por ahora en la base de datos. La edición desde acá
                  queda para una vuelta siguiente.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {abierta && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
          onClick={() => setAbierta(null)}
        >
          <div
            className="bg-white rounded-card w-full max-w-3xl max-h-[85vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-xl font-bold text-ink">{abierta.nombre}</h2>
              <button onClick={() => setAbierta(null)} className="text-slate-400 hover:text-ink">
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              {abierta.activos} activos · {abierta.invitados} invitados · {abierta.retirados} retirados
            </p>

            {cargandoFraternos ? (
              <p className="text-sm text-slate-500">Cargando…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-warm text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Fraterno</th>
                      <th className="px-3 py-2">Correo</th>
                      <th className="px-3 py-2">Teléfono</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Cuenta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {fraternos.map((u) => (
                      <tr key={u.id}>
                        <td className="px-3 py-2 text-ink">{u.full_name}</td>
                        <td className="px-3 py-2 text-slate-600">{u.email ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{u.phone ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{u.status}</td>
                        <td className="px-3 py-2">
                          {u.tiene_cuenta ? (
                            u.acepto_terminos ? (
                              <span className="text-brand-success">aceptó términos</span>
                            ) : (
                              <span className="text-slate-500">con cuenta</span>
                            )
                          ) : (
                            <span className="text-slate-400">sin cuenta</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Tarjeta({
  titulo,
  valor,
  nota,
  alerta,
}: {
  titulo: string
  valor: string
  nota?: string
  alerta?: boolean
}) {
  return (
    <div className="rounded-card bg-white border border-surface-border p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className={`text-3xl font-bold mt-1 ${alerta ? 'text-brand-coral' : 'text-ink'}`}>{valor}</div>
      {nota && <div className="text-xs text-slate-500 mt-2">{nota}</div>}
    </div>
  )
}
