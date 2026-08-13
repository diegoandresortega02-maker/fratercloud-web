import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberFlow from '@number-flow/react'
import { BadgeCheck, Minus, Users } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Reveal from './Reveal'

/**
 * Ciclos de cobro. El anual es la base; los más cortos llevan recargo porque
 * cada cobro extra es un comprobante que alguien tiene que revisar a mano.
 */
const CICLOS = [
  { id: 'anual', etiqueta: 'Anual', pagos: 1, recargo: 1, nota: 'Sin recargo' },
  { id: 'semestral', etiqueta: 'Semestral', pagos: 2, recargo: 1.1, nota: '+10%' },
  { id: 'trimestral', etiqueta: 'Trimestral', pagos: 4, recargo: 1.2, nota: '+20%' },
] as const

type CicloId = (typeof CICLOS)[number]['id']

/** Los interruptores del plan, en el orden y con el nombre que ve el cliente. */
const FUNCIONES: { clave: string; etiqueta: string }[] = [
  { clave: 'reservas', etiqueta: 'Reservas con bloqueo por mora' },
  { clave: 'recibos', etiqueta: 'Recibos numerados automáticos' },
  { clave: 'finanzas', etiqueta: 'Ingresos y egresos por categoría' },
  { clave: 'eventos', etiqueta: 'Eventos y cuotas extraordinarias' },
  { clave: 'turnos', etiqueta: 'Turnos con rotación automática' },
  { clave: 'excel_completo', etiqueta: 'Excel completo de 16 hojas' },
  { clave: 'bar', etiqueta: 'Módulo Bar con caja y arqueos' },
]

interface Plan {
  code: string
  name: string
  description: string | null
  price_annual: number
  included_members: number
  extra_member_price: number
  max_extra_members: number | null
  max_admins: number
  features: Record<string, boolean>
  sort_order: number
}

/**
 * Importe de cada pago del ciclo, redondeado a múltiplos de 5.
 *
 * Sin redondear, aplicar el recargo deja precios como Bs 907,50, que en una
 * página de precios se leen como error de sistema.
 */
function importePorPago(anual: number, recargo: number, pagos: number): number {
  return Math.round((anual * recargo) / pagos / 5) * 5
}

function Selector({ ciclo, onChange }: { ciclo: CicloId; onChange: (c: CicloId) => void }) {
  const indice = CICLOS.findIndex((c) => c.id === ciclo)

  return (
    <div className="flex justify-center">
      {/* Grilla de columnas iguales: con `flex` los botones toman el ancho de su
          texto ("Anual" es más corto) y la píldora, que se posiciona por tercios,
          termina montada sobre el botón vecino. */}
      <div className="relative grid grid-cols-3 w-full max-w-md rounded-full border border-surface-border bg-white p-1">
        <span
          aria-hidden
          className="absolute top-1 bottom-1 left-1 rounded-full bg-brand-primary shadow-sm transition-transform duration-300 ease-out"
          style={{
            width: `calc((100% - 0.5rem) / ${CICLOS.length})`,
            transform: `translateX(${indice * 100}%)`,
          }}
        />
        {CICLOS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            aria-pressed={ciclo === c.id}
            className={`relative z-10 rounded-full px-4 sm:px-6 py-2 text-sm font-medium transition-colors ${
              ciclo === c.id ? 'text-white' : 'text-slate-500 hover:text-ink'
            }`}
          >
            {c.etiqueta}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PricingSection({ ctaHref = '/registro' }: { ctaHref?: string }) {
  const [ciclo, setCiclo] = useState<CicloId>('anual')
  const [planes, setPlanes] = useState<Plan[] | null>(null)
  const [error, setError] = useState(false)
  const activo = CICLOS.find((c) => c.id === ciclo)!

  // Los precios salen de la tabla `plans`, no del código: si se edita el plan
  // desde el panel de plataforma, esta página cambia sola. La política
  // `plans_lectura_publica` deja leer los planes públicos sin sesión.
  useEffect(() => {
    supabase
      .from('plans')
      .select('code,name,description,price_annual,included_members,extra_member_price,max_extra_members,max_admins,features,sort_order')
      .eq('is_public', true)
      .order('sort_order')
      .then(({ data, error: err }) => {
        if (err || !data?.length) {
          console.error('No se pudieron cargar los planes', err)
          setError(true)
          return
        }
        setPlanes(data as Plan[])
      })
  }, [])

  if (error) {
    return (
      <section id="precios" className="bg-surface-warm py-20 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-ink mb-3">No pudimos cargar los planes</h2>
          <p className="text-slate-600">
            Escribinos y te pasamos las opciones y los precios al día.
          </p>
        </div>
      </section>
    )
  }

  const precioExtra = planes?.[0]?.extra_member_price ?? 55

  return (
    <section id="precios" className="bg-surface-warm py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-ink mb-4">
              Un plan para el tamaño{' '}
              <span className="inline-block rounded-xl border border-dashed border-brand-primary bg-brand-primary/10 px-2 py-1">
                de tu fraternidad
              </span>
            </h2>
            <p className="text-slate-600">
              Se paga por año y se cuentan solo los fraternos activos. Los invitados y los
              retirados no se cobran.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <Selector ciclo={ciclo} onChange={setCiclo} />
          <p className="text-center text-sm text-slate-500 mt-3">
            {activo.pagos === 1
              ? 'Un solo pago al año, sin recargo.'
              : `${activo.pagos} pagos al año · recargo ${activo.nota} sobre el precio anual.`}
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {planes
            ? planes.map((plan, i) => {
                const porPago = importePorPago(Number(plan.price_annual), activo.recargo, activo.pagos)
                const alAnio = porPago * activo.pagos
                // El del medio se destaca: es el que conviene a la mayoría.
                const destacado = i === 1

                return (
                  <Reveal key={plan.code} delay={120 + i * 90}>
                    <div
                      className={`h-full flex flex-col rounded-card border p-6 ${
                        destacado
                          ? 'border-brand-primary ring-2 ring-brand-primary/30 bg-white shadow-card'
                          : 'border-surface-border bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-2xl font-bold text-ink">{plan.name}</h3>
                        {destacado && (
                          <span className="shrink-0 rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white">
                            El más elegido
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-600 mt-2 mb-5 min-h-[40px]">{plan.description}</p>

                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-semibold text-ink">Bs</span>
                        <NumberFlow
                          value={porPago}
                          locales="es-BO"
                          format={{ maximumFractionDigits: 0 }}
                          className="text-4xl font-bold text-ink"
                        />
                        <span className="text-slate-500 ml-1 text-sm">
                          {activo.pagos === 1 ? '/año' : `× ${activo.pagos} pagos`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 h-4">
                        {activo.pagos > 1 && (
                          <>
                            Bs{' '}
                            <NumberFlow value={alAnio} locales="es-BO" format={{ maximumFractionDigits: 0 }} />{' '}
                            al año
                          </>
                        )}
                      </p>

                      <Link
                        to={ctaHref}
                        className={`mt-5 mb-6 block rounded-control py-3 text-center text-base font-semibold transition-colors ${
                          destacado
                            ? 'bg-brand-primary hover:bg-brand-primary-dark text-white'
                            : 'bg-brand-navy hover:bg-ink text-white'
                        }`}
                      >
                        Quiero este plan
                      </Link>

                      <div className="flex items-start gap-3 pb-5 border-b border-surface-border">
                        <Users size={20} className="text-brand-navy mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            Hasta {plan.included_members} fraternos
                          </p>
                          <p className="text-xs text-slate-500">
                            {plan.max_extra_members === null
                              ? 'Extras sin límite'
                              : `Hasta ${plan.max_extra_members} extras`}{' '}
                            · {plan.max_admins}{' '}
                            {plan.max_admins === 1 ? 'administrador' : 'administradores'}
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-2 pt-5 mt-auto">
                        {FUNCIONES.map((f) => {
                          const incluida = plan.features[f.clave] === true
                          return (
                            <li key={f.clave} className="flex items-start gap-3">
                              {incluida ? (
                                <BadgeCheck size={18} className="text-brand-success mt-0.5 shrink-0" />
                              ) : (
                                <Minus size={18} className="text-slate-300 mt-0.5 shrink-0" />
                              )}
                              <span
                                className={`text-sm ${incluida ? 'text-slate-600' : 'text-slate-400 line-through'}`}
                              >
                                {f.etiqueta}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </Reveal>
                )
              })
            : // Esqueleto mientras cargan: evita que la página salte de alto.
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[520px] rounded-card border border-surface-border bg-white/60 animate-pulse"
                />
              ))}
        </div>

        {planes && (
          <Reveal delay={400}>
            <div className="mt-8 rounded-card border border-surface-border bg-white p-5 text-center">
              <p className="text-sm text-slate-600">
                ¿Son más fraternos que los del plan? Cada fraterno adicional cuesta{' '}
                <strong className="text-ink">Bs {precioExtra} al año</strong>.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Al vencer, la cuenta pasa a solo lectura: se puede seguir consultando y descargando
                toda la información. Nunca se borra nada.
              </p>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
