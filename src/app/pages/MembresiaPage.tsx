import { useEffect, useState, type FormEvent } from 'react'
import { BadgeCheck, Minus } from 'lucide-react'
import {
  getCupoFraternos,
  getMiSuscripcion,
  getMisPagosMembresia,
  getUrlComprobante,
  importePorPago,
  registrarPagoMembresia,
  RECARGOS,
  type BillingCycle,
  type CupoFraternos,
  type MiSuscripcion,
  type PagoMembresia,
} from '../../lib/membership'
import { formatMoney } from '../../lib/money'

const FUNCIONES: { clave: string; etiqueta: string }[] = [
  { clave: 'reservas', etiqueta: 'Reservas con bloqueo por mora' },
  { clave: 'recibos', etiqueta: 'Recibos numerados' },
  { clave: 'finanzas', etiqueta: 'Ingresos y egresos' },
  { clave: 'eventos', etiqueta: 'Eventos y cuotas extraordinarias' },
  { clave: 'turnos', etiqueta: 'Turnos' },
  { clave: 'excel_completo', etiqueta: 'Excel completo de 16 hojas' },
  { clave: 'bar', etiqueta: 'Módulo Bar' },
]

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  prueba: { texto: 'En prueba', clase: 'bg-brand-primary/10 text-brand-primary-dark' },
  activa: { texto: 'Al día', clase: 'bg-brand-success/10 text-brand-success' },
  vencida: { texto: 'Vencida', clase: 'bg-brand-alert/10 text-brand-alert' },
  cancelada: { texto: 'Cancelada', clase: 'bg-slate-100 text-slate-500' },
}

const ESTADO_PAGO: Record<string, { texto: string; clase: string }> = {
  pendiente: { texto: 'En revisión', clase: 'bg-brand-gold/10 text-brand-gold' },
  aprobado: { texto: 'Aprobado', clase: 'bg-brand-success/10 text-brand-success' },
  rechazado: { texto: 'Rechazado', clase: 'bg-brand-alert/10 text-brand-alert' },
}

/** Formato boliviano (13/08/2027), igual que el resto del sistema. */
function fechaBO(iso: string | null): string {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null
  const ms = new Date(fecha + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.round(ms / 86400000)
}

export default function MembresiaPage() {
  const [sus, setSus] = useState<MiSuscripcion | null>(null)
  const [cupo, setCupo] = useState<CupoFraternos | null>(null)
  const [pagos, setPagos] = useState<PagoMembresia[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [ciclo, setCiclo] = useState<BillingCycle>('anual')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  async function cargar() {
    try {
      const [s, c, p] = await Promise.all([
        getMiSuscripcion(),
        getCupoFraternos(),
        getMisPagosMembresia(),
      ])
      setSus(s)
      setCupo(c)
      setPagos(p)
      if (s) setCiclo(s.cycle)
    } catch (err) {
      console.error(err)
      setError('No se pudo cargar la membresía.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const plan = sus?.plans ?? null
  const extras = sus?.extra_members ?? 0
  const anualTotal = plan
    ? Number(plan.price_annual) + extras * Number(plan.extra_member_price)
    : 0
  const aPagar = plan ? importePorPago(anualTotal, ciclo) : 0
  const dias = diasHasta(sus?.expires_at ?? null)

  async function enviarPago(e: FormEvent) {
    e.preventDefault()
    setAviso(null)
    setEnviando(true)
    try {
      await registrarPagoMembresia(aPagar, ciclo, archivo)
      setArchivo(null)
      setAviso('Comprobante enviado. Lo vamos a revisar y te avisamos al aprobarlo.')
      await cargar()
    } catch (err) {
      console.error(err)
      setAviso('No se pudo enviar el comprobante. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  async function verComprobante(path: string) {
    try {
      window.open(await getUrlComprobante(path), '_blank', 'noopener')
    } catch (err) {
      console.error(err)
    }
  }

  if (cargando) return <div className="p-6 text-sm text-slate-400">Cargando…</div>
  if (error) return <div className="p-6 text-sm text-brand-alert">{error}</div>

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-ink mb-1">Membresía</h1>
      <p className="text-sm text-slate-500 mb-6">
        Lo que tu fraternidad paga por usar FraterCloud. No tiene relación con las cuotas de los
        fraternos.
      </p>

      {!sus ? (
        <div className="rounded-card border border-surface-border bg-white p-6 text-sm text-slate-600">
          Tu fraternidad todavía no tiene una membresía asignada. Escribinos y la activamos.
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-card border border-surface-border bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Plan</p>
              <p className="text-2xl font-bold text-ink">{plan?.name ?? '—'}</p>
              <span
                className={`inline-block mt-3 rounded-full px-3 py-1 text-xs font-semibold ${
                  ESTADOS[sus.status]?.clase ?? ''
                }`}
              >
                {ESTADOS[sus.status]?.texto ?? sus.status}
              </span>
            </div>

            <div className="rounded-card border border-surface-border bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Vence</p>
              <p className="text-2xl font-bold text-ink">{fechaBO(sus.expires_at)}</p>
              <p className="text-sm text-slate-500 mt-2">
                {dias === null
                  ? ''
                  : dias < 0
                    ? `Venció hace ${Math.abs(dias)} días`
                    : `Faltan ${dias} días`}
              </p>
            </div>

            <div className="rounded-card border border-surface-border bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Fraternos activos</p>
              <p className="text-2xl font-bold text-ink">
                {cupo?.activos ?? '—'}
                <span className="text-base font-medium text-slate-400"> / {cupo?.cupo ?? '∞'}</span>
              </p>
              {cupo?.cupo != null && cupo.activos >= cupo.cupo && (
                <p className="text-sm text-brand-alert mt-2">
                  Llegaste al tope: para sumar más hay que ampliar el plan.
                </p>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-card border border-surface-border bg-white p-6">
              <h2 className="font-semibold text-ink mb-4">Qué incluye tu plan</h2>
              <ul className="space-y-2 mb-5">
                {FUNCIONES.map((f) => {
                  const si = plan?.features?.[f.clave] === true
                  return (
                    <li key={f.clave} className="flex items-start gap-3">
                      {si ? (
                        <BadgeCheck size={18} className="text-brand-success mt-0.5 shrink-0" />
                      ) : (
                        <Minus size={18} className="text-slate-300 mt-0.5 shrink-0" />
                      )}
                      <span className={`text-sm ${si ? 'text-slate-600' : 'text-slate-400 line-through'}`}>
                        {f.etiqueta}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className="border-t border-surface-border pt-4 text-sm text-slate-600 space-y-1">
                <p>
                  Incluye {plan?.included_members} fraternos
                  {extras > 0 && ` + ${extras} extra${extras === 1 ? '' : 's'}`}.
                </p>
                <p>
                  Precio anual: <strong className="text-ink">Bs {formatMoney(anualTotal)}</strong>
                </p>
              </div>
            </div>

            <div className="rounded-card border border-surface-border bg-white p-6">
              <h2 className="font-semibold text-ink mb-1">Renovar</h2>
              <p className="text-sm text-slate-500 mb-4">
                Transferí el monto y subí el comprobante. Lo revisamos y extendemos la vigencia.
              </p>

              <form onSubmit={enviarPago} className="space-y-4">
                <div>
                  <label htmlFor="ciclo" className="block text-sm font-medium text-slate-700 mb-1">
                    Ciclo
                  </label>
                  <select
                    id="ciclo"
                    value={ciclo}
                    onChange={(e) => setCiclo(e.target.value as BillingCycle)}
                    className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
                  >
                    {(Object.keys(RECARGOS) as BillingCycle[]).map((c) => (
                      <option key={c} value={c}>
                        {RECARGOS[c].etiqueta}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-control bg-surface-warm px-4 py-3">
                  <p className="text-sm text-slate-600">A pagar ahora</p>
                  <p className="text-2xl font-bold text-ink">Bs {formatMoney(aPagar)}</p>
                  {RECARGOS[ciclo].pagos > 1 && (
                    <p className="text-xs text-slate-500 mt-1">
                      {RECARGOS[ciclo].pagos} pagos al año · Bs{' '}
                      {formatMoney(aPagar * RECARGOS[ciclo].pagos)} anuales
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="comprobante" className="block text-sm font-medium text-slate-700 mb-1">
                    Comprobante
                  </label>
                  <input
                    id="comprobante"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                    className="w-full text-sm"
                  />
                </div>

                {aviso && <p className="text-sm text-slate-600">{aviso}</p>}

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium rounded-control py-2.5 text-sm"
                >
                  {enviando ? 'Enviando…' : 'Enviar comprobante'}
                </button>
              </form>
            </div>
          </div>

          <div className="rounded-card border border-surface-border bg-white p-6 mt-6">
            <h2 className="font-semibold text-ink mb-4">Pagos enviados</h2>
            {pagos.length === 0 ? (
              <p className="text-sm text-slate-500">Todavía no enviaste ningún comprobante.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-2">Fecha</th>
                      <th className="pb-2">Ciclo</th>
                      <th className="pb-2 text-right">Monto</th>
                      <th className="pb-2">Estado</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((p) => (
                      <tr key={p.id} className="border-t border-surface-border">
                        <td className="py-2">{fechaBO(p.submitted_at.slice(0, 10))}</td>
                        <td className="py-2 capitalize">{p.cycle}</td>
                        <td className="py-2 text-right">Bs {formatMoney(p.amount)}</td>
                        <td className="py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              ESTADO_PAGO[p.status]?.clase ?? ''
                            }`}
                          >
                            {ESTADO_PAGO[p.status]?.texto ?? p.status}
                          </span>
                          {p.review_notes && (
                            <span className="block text-xs text-slate-500 mt-1">{p.review_notes}</span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {p.proof_url && (
                            <button
                              type="button"
                              onClick={() => verComprobante(p.proof_url!)}
                              className="text-brand-primary hover:underline text-xs"
                            >
                              Ver comprobante
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
