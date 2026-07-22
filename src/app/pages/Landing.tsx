import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import logoLockup from '../../assets/brand/logo-lockup.png'
import isotipo from '../../assets/brand/isotipo.png'

const FEATURES: { icon: (props: { className?: string }) => ReactElement; title: string; description: string }[] = [
  {
    icon: IconWallet,
    title: 'Aportes mensuales',
    description: 'Cada fraterno ve cuánto debe y desde cuándo, sin planillas sueltas ni dudas de fin de mes.',
  },
  {
    icon: IconClipboard,
    title: 'Deudores y planes de pago',
    description: 'Convierte una deuda atrasada en cuotas claras, con fechas de vencimiento y seguimiento automático.',
  },
  {
    icon: IconUpload,
    title: 'Comprobantes con aprobación',
    description: 'El fraterno sube la foto de su pago; el administrador la revisa y aprueba en un clic.',
  },
  {
    icon: IconCalendar,
    title: 'Reservas de la sede',
    description: 'Calendario compartido para reservar la fraternidad, con horarios y disponibilidad siempre visibles.',
  },
  {
    icon: IconLock,
    title: 'Bloqueo automático por mora',
    description: 'Quien debe 2 meses o más queda bloqueado para reservar hasta ponerse al día — sin excepciones manuales.',
  },
  {
    icon: IconChart,
    title: 'Ingresos y egresos',
    description: 'Registra cada movimiento y mira el balance del periodo: cuánto entró, cuánto salió.',
  },
  {
    icon: IconGift,
    title: 'Cumpleaños',
    description: 'Calendario de cumpleaños de todos los fraternos, siempre a la vista de la comunidad.',
  },
  {
    icon: IconBuilding,
    title: 'Multi-fraternidad',
    description: 'Cada fraternidad ve únicamente su propia información, con administradores y fraternos con roles claros.',
  },
]

const TRAITS = [
  {
    icon: IconHandshake,
    title: 'Cercana',
    description: 'Lenguaje directo y amable, sin tecnicismos innecesarios.',
  },
  {
    icon: IconShield,
    title: 'Confiable',
    description: 'Datos ordenados, mensajes precisos y acciones previsibles.',
  },
  {
    icon: IconBolt,
    title: 'Dinámica',
    description: 'Interfaces ágiles, acentos vivos y llamados claros.',
  },
  {
    icon: IconUsers,
    title: 'Inclusiva',
    description: 'Representa a la comunidad sin estereotipos ni jerarquías visuales.',
  },
]

export default function Landing() {
  const { session, fraternityUser } = useAuth()
  const isLoggedIn = !!session && !!fraternityUser

  return (
    <div className="min-h-screen bg-surface-warm">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src={logoLockup} alt="FraterCloud" className="h-7 w-auto" />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#funcionalidades" className="hover:text-ink">
              Funcionalidades
            </a>
            <a href="#marca" className="hover:text-ink">
              Por qué FraterCloud
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="bg-brand-primary hover:bg-brand-primary-dark text-white text-sm font-medium rounded-control px-4 py-2"
              >
                Ir a mi panel
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-ink">
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro"
                  className="bg-brand-primary hover:bg-brand-primary-dark text-white text-sm font-medium rounded-control px-4 py-2"
                >
                  Comenzar gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-brand-primary-dark text-sm font-semibold mb-3">Software para fraternidades sociales</p>
          <h1 className="text-4xl md:text-5xl font-bold text-ink leading-tight mb-5">
            Tu comunidad, mejor conectada<span className="text-brand-coral">.</span>
          </h1>
          <p className="text-slate-500 text-lg mb-8 max-w-md">
            FraterCloud reúne miembros, cuotas, reservas, ingresos y comunicación de tu fraternidad en un solo lugar
            confiable — sin planillas ni WhatsApp perdidos.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/registro"
              className="bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-control px-6 py-3"
            >
              Comenzar gratis
            </Link>
            <a
              href="#funcionalidades"
              className="border border-surface-border hover:bg-surface-muted text-ink font-medium rounded-control px-6 py-3"
            >
              Ver funcionalidades
            </a>
          </div>
        </div>

        <HeroMockup />
      </section>

      {/* Features */}
      <section id="funcionalidades" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-ink mb-3">Todo lo que tu fraternidad necesita</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Un sistema pensado desde la gestión real de una fraternidad: cuotas, deudores, reservas y comunicación.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-card border border-surface-border p-6">
              <div className="w-10 h-10 rounded-control bg-brand-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-brand-primary-dark" />
              </div>
              <h3 className="font-semibold text-ink mb-1">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="max-w-4xl mx-auto px-6 py-8 text-center">
        <h2 className="text-2xl font-bold text-ink mb-3">Pensado para cómo se organiza una fraternidad</h2>
        <p className="text-slate-500 mb-4 max-w-2xl mx-auto">
          Un administrador con visión completa y cada fraterno con su propio estado de cuenta, su calendario de
          reservas y sus cumpleaños. Todo conectado, sin depender de una planilla que solo una persona entiende.
        </p>
        <Link to="/registro" className="text-brand-primary font-medium hover:text-brand-primary-dark">
          Crear mi fraternidad →
        </Link>
      </section>

      {/* Brand positioning */}
      <section id="marca" className="bg-white border-y border-surface-border">
        <div className="max-w-6xl mx-auto px-6 py-20 grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {TRAITS.map((t) => (
            <div key={t.title}>
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-primary/10 flex items-center justify-center mb-4">
                <t.icon className="w-6 h-6 text-brand-primary-dark" />
              </div>
              <h3 className="font-semibold text-ink mb-2">{t.title}</h3>
              <p className="text-sm text-slate-500">{t.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-ink mb-4">Empieza a organizar tu fraternidad hoy</h2>
        <p className="text-slate-500 mb-8">Crea tu cuenta y configura tu fraternidad en menos de dos minutos.</p>
        <Link
          to="/registro"
          className="inline-block bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-control px-8 py-3"
        >
          Crear cuenta gratis
        </Link>
      </section>

      <footer className="border-t border-surface-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={isotipo} alt="FraterCloud" className="h-6 w-6 opacity-80" />
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} FraterCloud. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

function HeroMockup() {
  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-surface-muted" />
        <span className="w-2.5 h-2.5 rounded-full bg-surface-muted" />
        <span className="w-2.5 h-2.5 rounded-full bg-surface-muted" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1 space-y-2">
          <div className="h-3 w-3/4 rounded bg-brand-primary/20" />
          <div className="h-2 w-full rounded bg-surface-muted" />
          <div className="h-2 w-full rounded bg-surface-muted" />
          <div className="h-2 w-2/3 rounded bg-surface-muted" />
          <div className="h-6 w-full rounded-control bg-brand-gold/15 mt-3" />
        </div>
        <div className="col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-ink/10" />
            <div className="h-5 w-16 rounded-control bg-brand-primary" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 21 }).map((_, i) => (
              <div
                key={i}
                className={`h-4 rounded-sm ${i === 10 ? 'bg-brand-primary' : i === 15 ? 'bg-brand-coral/60' : 'bg-surface-muted'}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="h-2 w-20 rounded bg-surface-muted" />
            <div className="h-2 w-10 rounded bg-brand-primary/40" />
          </div>
        </div>
      </div>
    </div>
  )
}

function IconWallet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16" cy="14" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconClipboard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" strokeLinecap="round" />
    </svg>
  )
}

function IconUpload({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 15V4M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
    </svg>
  )
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" strokeLinecap="round" />
    </svg>
  )
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" strokeLinecap="round" />
    </svg>
  )
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 19h16M7 19v-6M12 19V7M17 19v-9" strokeLinecap="round" />
    </svg>
  )
}

function IconGift({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="4" y="9.5" width="16" height="10.5" rx="1.5" />
      <path d="M4 13.5h16" />
      <path d="M12 9.5V20M12 9.5C10 6 6.5 6 6.5 8.2 6.5 9.8 9 9.5 12 9.5ZM12 9.5C14 6 17.5 6 17.5 8.2c0 1.6-2.5 1.3-5.5 1.3Z" strokeLinejoin="round" />
    </svg>
  )
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="4" y="3" width="10" height="18" rx="1" />
      <rect x="14" y="9" width="6" height="12" rx="1" />
      <path d="M7 7h1M10 7h1M7 11h1M10 11h1M7 15h1M10 15h1" strokeLinecap="round" />
    </svg>
  )
}

function IconHandshake({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M2 12l4-3 4 2 3-2 3 2 4-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 9v4l4 4 2-2M18 9v4l-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3 4.5 6v6c0 5 3.2 8.2 7.5 9 4.3-.8 7.5-4 7.5-9V6z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" strokeLinejoin="round" />
    </svg>
  )
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20c1.2-3.5 3.6-5.3 6.5-5.3s5.3 1.8 6.5 5.3" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.5 14.3c2.3.2 4 1.8 5 4.7" strokeLinecap="round" />
    </svg>
  )
}
