import { useState } from 'react'
import { Link } from 'react-router-dom'
import NumberFlow from '@number-flow/react'
import {
  BadgeCheck,
  Beer,
  CalendarCheck,
  FileSpreadsheet,
  PartyPopper,
  Receipt,
  ShieldCheck,
  Users,
} from 'lucide-react'
import Reveal from './Reveal'

/**
 * Ciclos de cobro. El anual es la base; los más cortos llevan recargo porque
 * cada cobro extra es un comprobante que alguien tiene que revisar a mano.
 */
const CICLOS = [
  { id: 'anual', etiqueta: 'Anual', pagos: 1, nota: 'Sin recargo' },
  { id: 'semestral', etiqueta: 'Semestral', pagos: 2, nota: '+10%' },
  { id: 'trimestral', etiqueta: 'Trimestral', pagos: 4, nota: '+20%' },
] as const

type CicloId = (typeof CICLOS)[number]['id']

/**
 * Los importes por pago están escritos, no calculados: aplicar el recargo con
 * una multiplicación deja precios como Bs 907,50, que en una página de precios
 * se leen como error de sistema.
 */
const PLANES = [
  {
    nombre: 'Esencial',
    descripcion: 'Para fraternidades chicas que quieren dejar la planilla atrás.',
    porPago: { anual: 950, semestral: 525, trimestral: 290 },
    fraternos: 15,
    extras: 'hasta 5 fraternos extra',
    destacado: false,
    caracteristicas: [
      { texto: 'Hasta 15 fraternos', icono: <Users size={20} /> },
      { texto: 'Reservas con bloqueo por mora', icono: <CalendarCheck size={20} /> },
      { texto: 'Recibos numerados automáticos', icono: <Receipt size={20} /> },
    ],
    incluye: [
      'Incluye:',
      'Mensualidades generadas solas',
      'Deudores y planes de pago',
      'Ingresos y egresos por categoría',
      '1 administrador',
    ],
  },
  {
    nombre: 'Plus',
    descripcion: 'El punto justo para la mayoría: suma eventos, turnos y reportes.',
    porPago: { anual: 1650, semestral: 910, trimestral: 500 },
    fraternos: 20,
    extras: 'hasta 5 fraternos extra',
    destacado: true,
    caracteristicas: [
      { texto: 'Hasta 20 fraternos', icono: <Users size={20} /> },
      { texto: 'Eventos y cuotas extraordinarias', icono: <PartyPopper size={20} /> },
      { texto: 'Excel completo de 16 hojas', icono: <FileSpreadsheet size={20} /> },
    ],
    incluye: [
      'Todo lo de Esencial, más:',
      'Eventos con detalle de quién aportó',
      'Turnos con rotación automática',
      'Reportes por fraterno y por gestión',
      '2 administradores',
    ],
  },
  {
    nombre: 'Gold',
    descripcion: 'Todo el sistema, incluido el bar con su caja y sus arqueos.',
    porPago: { anual: 2500, semestral: 1375, trimestral: 750 },
    fraternos: 30,
    extras: 'fraternos extra sin límite',
    destacado: false,
    caracteristicas: [
      { texto: 'Hasta 30 fraternos', icono: <Users size={20} /> },
      { texto: 'Módulo Bar con caja separada', icono: <Beer size={20} /> },
      { texto: 'Arqueos y control de faltantes', icono: <ShieldCheck size={20} /> },
    ],
    incluye: [
      'Todo lo de Plus, más:',
      'Inventario, ventas y compras del bar',
      'Perfil de encargado de bar',
      'Fraternos extra sin límite',
      '5 administradores',
    ],
  },
] as const

const PRECIO_EXTRA = 55

function Selector({ ciclo, onChange }: { ciclo: CicloId; onChange: (c: CicloId) => void }) {
  const indice = CICLOS.findIndex((c) => c.id === ciclo)

  return (
    <div className="flex justify-center">
      {/* Grilla de columnas iguales: con `flex` los botones toman el ancho de su
          texto ("Anual" es más corto) y la píldora, que se posiciona por tercios,
          termina montada sobre el botón vecino. */}
      <div className="relative grid grid-cols-3 w-full max-w-md rounded-full border border-surface-border bg-white p-1">
        {/* La píldora se desliza con transform en vez de una librería de animación:
            el mismo efecto sin sumar peso a una página que se abre desde el celular. */}
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
            className={`relative z-10 rounded-full px-2 sm:px-6 py-2 text-sm font-medium transition-colors ${
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
  const activo = CICLOS.find((c) => c.id === ciclo)!

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
          {PLANES.map((plan, i) => {
            const porPago = plan.porPago[ciclo]
            const alAnio = porPago * activo.pagos

            return (
              <Reveal key={plan.nombre} delay={120 + i * 90}>
                <div
                  className={`h-full flex flex-col rounded-card border p-6 ${
                    plan.destacado
                      ? 'border-brand-primary ring-2 ring-brand-primary/30 bg-white shadow-card'
                      : 'border-surface-border bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-2xl font-bold text-ink">{plan.nombre}</h3>
                    {plan.destacado && (
                      <span className="shrink-0 rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white">
                        El más elegido
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 mt-2 mb-5 min-h-[40px]">{plan.descripcion}</p>

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
                        Bs <NumberFlow value={alAnio} locales="es-BO" format={{ maximumFractionDigits: 0 }} />{' '}
                        al año
                      </>
                    )}
                  </p>

                  <Link
                    to={ctaHref}
                    className={`mt-5 mb-6 block rounded-control py-3 text-center text-base font-semibold transition-colors ${
                      plan.destacado
                        ? 'bg-brand-primary hover:bg-brand-primary-dark text-white'
                        : 'bg-brand-navy hover:bg-ink text-white'
                    }`}
                  >
                    Quiero este plan
                  </Link>

                  <ul className="space-y-3 pb-5">
                    {plan.caracteristicas.map((c) => (
                      <li key={c.texto} className="flex items-start gap-3">
                        <span className="text-brand-navy mt-0.5 shrink-0">{c.icono}</span>
                        <span className="text-sm font-medium text-ink">{c.texto}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto border-t border-surface-border pt-5">
                    <h4 className="text-sm font-semibold text-ink mb-3">{plan.incluye[0]}</h4>
                    <ul className="space-y-2">
                      {plan.incluye.slice(1).map((texto) => (
                        <li key={texto} className="flex items-start gap-3">
                          <BadgeCheck size={18} className="text-brand-success mt-0.5 shrink-0" />
                          <span className="text-sm text-slate-600">{texto}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={400}>
          <div className="mt-8 rounded-card border border-surface-border bg-white p-5 text-center">
            <p className="text-sm text-slate-600">
              ¿Son más fraternos que los del plan? Cada fraterno adicional cuesta{' '}
              <strong className="text-ink">Bs {PRECIO_EXTRA} al año</strong>. Esencial y Plus
              admiten hasta 5; Gold no tiene tope.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Al vencer, la cuenta pasa a solo lectura: se puede seguir consultando y descargando
              toda la información. Nunca se borra nada.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
