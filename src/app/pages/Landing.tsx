import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import fotoReunion from '../../assets/fotos/reunion.webp'
import fotoTablet from '../../assets/fotos/tablet.webp'
import fotoFraternos from '../../assets/fotos/fraternos.webp'
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
    description: 'Quien se atrasa queda bloqueado para reservar hasta ponerse al día — sin excepciones manuales.',
  },
  {
    icon: IconChart,
    title: 'Ingresos y egresos',
    description: 'Cada movimiento con su categoría y cuenta, y el balance del periodo siempre a la vista.',
  },
  {
    icon: IconGlass,
    title: 'Bar con inventario',
    description: 'Stock, ventas y caja propia del bar, con arqueos que dejan por escrito cualquier diferencia.',
  },
  {
    icon: IconDownload,
    title: 'Reportes en Excel',
    description: 'Descarga toda la información en un archivo ordenado, con fórmulas y listo para imprimir.',
  },
]

const TRAITS = [
  { icon: IconHandshake, title: 'Cercana', description: 'Lenguaje directo y amable, sin tecnicismos innecesarios.' },
  { icon: IconShield, title: 'Confiable', description: 'Datos ordenados, mensajes precisos y acciones previsibles.' },
  { icon: IconBolt, title: 'Dinámica', description: 'Interfaces ágiles, acentos vivos y llamados claros.' },
  { icon: IconUsers, title: 'Inclusiva', description: 'Representa a la comunidad sin estereotipos ni jerarquías visuales.' },
]

const STEPS = [
  {
    n: '1',
    title: 'Crea tu fraternidad',
    description: 'Te registras, defines el aporte mensual y las reglas de mora. Toma menos de dos minutos.',
  },
  {
    n: '2',
    title: 'Suma a los fraternos',
    description: 'Los cargas de una vez, aunque todavía no tengan cuenta. Cada uno entra después con el código de invitación.',
  },
  {
    n: '3',
    title: 'Gestiona y reporta',
    description: 'Cobros, reservas, turnos y bar en un solo lugar. Y cuando lo necesites, todo en un Excel ordenado.',
  },
]

const PROFILES = [
  {
    icon: IconUser,
    title: 'Fraterno',
    color: 'text-brand-primary-dark',
    bg: 'bg-brand-primary/10',
    items: ['Su estado de cuenta y lo que debe', 'Sube el comprobante de su pago', 'Reserva la sede si está al día', 'Turnos y cumpleaños'],
  },
  {
    icon: IconGlass,
    title: 'Encargado de bar',
    color: 'text-brand-gold',
    bg: 'bg-brand-gold/10',
    items: ['Inventario y precios del bar', 'Registra ventas y compras', 'Caja del bar, separada de las arcas', 'Arqueos de caja y de stock'],
  },
  {
    icon: IconShieldCheck,
    title: 'Administrador',
    color: 'text-brand-navy',
    bg: 'bg-brand-navy/10',
    items: ['Todo lo anterior, a escala de la fraternidad', 'Aprueba pagos y emite recibos', 'Ingresos, egresos y eventos', 'Reportes y descarga en Excel'],
  },
]

const FAQS = [
  {
    q: '¿Los datos de mi fraternidad quedan separados de los de otras?',
    a: 'Sí. Cada fraternidad ve únicamente su propia información. La separación está aplicada en la base de datos, no solo en la pantalla: aunque alguien intentara consultar por fuera del sistema, no obtiene datos de otra fraternidad.',
  },
  {
    q: '¿Puedo traer lo que ya tengo en Excel?',
    a: 'Sí. Se puede cargar el estado inicial: los fraternos, lo que cada uno debe, los saldos de las cuentas y los gastos históricos. A partir de ahí el sistema sigue solo, y podés descargar todo en Excel cuando quieras.',
  },
  {
    q: '¿Qué pasa si un fraterno todavía no tiene cuenta?',
    a: 'No es problema. El administrador lo carga igual con su deuda y su historial. Cuando ese fraterno se registre con el mismo correo, el sistema le entrega automáticamente su ficha — sin duplicados ni datos perdidos.',
  },
  {
    q: '¿Los fraternos ven las cuentas de la fraternidad?',
    a: 'Cada perfil ve lo que le corresponde. El fraterno ve su propio estado de cuenta; el encargado del bar, su inventario y su caja; el administrador, el panorama completo. Vos decidís quién tiene cada rol.',
  },
]

export default function Landing() {
  const { session, fraternityUser } = useAuth()
  const isLoggedIn = !!session && !!fraternityUser
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-surface-warm overflow-x-hidden">
      <header
        className={`sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-surface-border transition-shadow ${
          scrolled ? 'shadow-card' : ''
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <img src={logoLockup} alt="FraterCloud" className="h-6 sm:h-7 w-auto shrink-0" />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#funcionalidades" className="hover:text-ink">
              Funcionalidades
            </a>
            <a href="#perfiles" className="hover:text-ink">
              Perfiles
            </a>
            <a href="#preguntas" className="hover:text-ink">
              Preguntas
            </a>
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="bg-brand-primary hover:bg-brand-primary-dark text-white text-sm font-medium rounded-control px-4 py-2 whitespace-nowrap"
              >
                Ir a mi panel
              </Link>
            ) : (
              <>
                {/* En pantallas muy angostas se oculta para que el logo y el CTA no se enciman */}
                <Link to="/login" className="hidden xs:inline text-sm font-medium text-slate-600 hover:text-ink whitespace-nowrap">
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro"
                  className="bg-brand-primary hover:bg-brand-primary-dark text-white text-sm font-medium rounded-control px-3 sm:px-4 py-2 whitespace-nowrap"
                >
                  Comenzar
                  <span className="hidden sm:inline"> gratis</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        {/* Manchas de color de marca, sutiles y decorativas */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-primary/10 blur-3xl" />
          <div className="absolute top-32 -right-20 w-80 h-80 rounded-full bg-brand-coral/10 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <p className="text-brand-primary-dark text-sm font-semibold mb-3">Software para fraternidades sociales</p>
            <h1 className="text-[2rem] sm:text-4xl md:text-5xl font-bold text-ink leading-tight mb-5 text-balance">
              Tu comunidad, mejor conectada<span className="text-brand-coral">.</span>
            </h1>
            <p className="text-slate-500 text-lg mb-8 max-w-md">
              FraterCloud reúne miembros, cuotas, reservas, bar y finanzas de tu fraternidad en un solo lugar
              confiable — sin planillas sueltas ni WhatsApp perdidos.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/registro"
                className="bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-control px-6 py-3 transition-colors"
              >
                Comenzar gratis
              </Link>
              <a
                href="#funcionalidades"
                className="border border-surface-border bg-white hover:bg-surface-muted text-ink font-medium rounded-control px-6 py-3 transition-colors"
              >
                Ver funcionalidades
              </a>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <PanelDemo />
          </Reveal>
        </div>
      </section>

      {/* Del Excel a FraterCloud */}
      <section className="bg-white border-y border-surface-border">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <Reveal>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-ink mb-3">Del Excel a FraterCloud</h2>
              <p className="text-slate-500 max-w-2xl mx-auto">
                FraterCloud nació mirando la planilla real de una fraternidad: 17 hojas, meses escritos de cinco formas
                distintas y totales que ya no cuadraban.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-card border border-surface-border p-6 bg-surface-warm/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">Antes</p>
                <ul className="space-y-3">
                  {[
                    'Una planilla que solo una persona entiende',
                    'Sumar a mano quién debe y cuántos meses',
                    'Reservas acordadas por WhatsApp',
                    'El dinero del bar anotado en un cuaderno',
                    'Cerrar la gestión tomaba días',
                  ].map((t) => (
                    <li key={t} className="flex gap-3 text-sm text-slate-500">
                      <span className="text-slate-300 mt-0.5">✕</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-card border-2 border-brand-primary/30 p-6 bg-white shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary-dark mb-4">Ahora</p>
                <ul className="space-y-3">
                  {[
                    'Cada fraterno entra y ve lo suyo',
                    'La deuda se calcula sola, mes a mes',
                    'Calendario de reservas con bloqueo por mora',
                    'Bar con inventario, caja propia y arqueos',
                    'Todo el reporte en Excel, en un clic',
                  ].map((t) => (
                    <li key={t} className="flex gap-3 text-sm text-ink">
                      <span className="text-brand-primary mt-0.5">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="max-w-6xl mx-auto px-6 py-20">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-ink mb-3">Todo lo que tu fraternidad necesita</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Un sistema pensado desde la gestión real de una fraternidad: cuotas, deudores, reservas, bar y reportes.
            </p>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div className="h-full bg-white rounded-card border border-surface-border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-card hover:border-brand-primary/40">
                <div className="w-10 h-10 rounded-control bg-brand-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-brand-primary-dark" />
                </div>
                <h3 className="font-semibold text-ink mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="relative bg-brand-navy overflow-hidden">
        {/* La foto va detrás de un velo opaco: el texto tiene que leerse sin
            depender de qué haya en la imagen. */}
        <img
          src={fotoReunion}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div aria-hidden className="absolute inset-0 bg-brand-navy/85" />
        <div className="relative max-w-5xl mx-auto px-6 py-20">
          <Reveal>
            <h2 className="text-3xl font-bold text-white text-center mb-12">Empezar es simple</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="text-center md:text-left">
                  <div className="w-11 h-11 rounded-full bg-brand-primary text-white font-bold text-lg flex items-center justify-center mb-4 mx-auto md:mx-0">
                    {s.n}
                  </div>
                  <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-300">{s.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={360}>
            <div className="text-center mt-12">
              <Link
                to="/registro"
                className="inline-block bg-white hover:bg-surface-warm text-brand-navy font-medium rounded-control px-6 py-3 transition-colors"
              >
                Crear mi fraternidad
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Perfiles */}
      <section id="perfiles" className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-center mb-12">
          <Reveal>
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-ink mb-3">Cada quien ve lo que le corresponde</h2>
              <p className="text-slate-500 max-w-xl mx-auto lg:mx-0">
                Tres perfiles con permisos distintos, para que la información sensible quede donde
                tiene que estar. Y todos entran desde donde estén: es una página web, no hay nada
                que instalar.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <img
              src={fotoTablet}
              alt="Un fraterno consultando su cuenta desde una tablet"
              className="w-full h-64 lg:h-72 object-cover rounded-card shadow-card"
              loading="lazy"
            />
          </Reveal>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {PROFILES.map((p, i) => (
            <Reveal key={p.title} delay={i * 100}>
              <div className="h-full bg-white rounded-card border border-surface-border p-6">
                <div className={`w-11 h-11 rounded-control ${p.bg} flex items-center justify-center mb-4`}>
                  <p.icon className={`w-6 h-6 ${p.color}`} />
                </div>
                <h3 className="font-semibold text-ink mb-3">{p.title}</h3>
                <ul className="space-y-2">
                  {p.items.map((it) => (
                    <li key={it} className="flex gap-2 text-sm text-slate-500">
                      <span className="text-brand-primary mt-0.5 shrink-0">·</span>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Rasgos de marca */}
      <section className="bg-white border-y border-surface-border">
        <div className="max-w-6xl mx-auto px-6 py-20 grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {TRAITS.map((t, i) => (
            <Reveal key={t.title} delay={i * 80}>
              <div>
                <div className="w-12 h-12 mx-auto rounded-full bg-brand-primary/10 flex items-center justify-center mb-4">
                  <t.icon className="w-6 h-6 text-brand-primary-dark" />
                </div>
                <h3 className="font-semibold text-ink mb-2">{t.title}</h3>
                <p className="text-sm text-slate-500">{t.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section id="preguntas" className="max-w-3xl mx-auto px-6 py-20">
        <Reveal>
          <h2 className="text-3xl font-bold text-ink text-center mb-10">Preguntas frecuentes</h2>
        </Reveal>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 70}>
              <details className="group bg-white rounded-card border border-surface-border p-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-medium text-ink">
                  {f.q}
                  <span className="text-brand-primary text-xl leading-none transition-transform group-open:rotate-45 shrink-0">
                    +
                  </span>
                </summary>
                <p className="text-sm text-slate-500 mt-3">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden">
        <img
          src={fotoFraternos}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="lazy"
        />
        {/* Degradado desde la izquierda: deja ver la escena y sostiene el texto. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-brand-navy/95 via-brand-navy/85 to-brand-navy/50"
        />
        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <h2 className="text-3xl font-bold text-white mb-4">Empieza a organizar tu fraternidad hoy</h2>
            <p className="text-slate-200 mb-8">
              Crea tu cuenta y configura tu fraternidad en menos de dos minutos.
            </p>
            <Link
              to="/registro"
              className="inline-block bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-control px-8 py-3 transition-colors"
            >
              Crear cuenta gratis
            </Link>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-surface-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={isotipo} alt="FraterCloud" className="h-6 w-6 opacity-80" />
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} FraterCloud. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}

// ---------- Aparición al hacer scroll ----------

// ---------- Panel interactivo de demostración ----------

type DemoTab = 'deudores' | 'finanzas' | 'reservas' | 'bar'

const DEMO_TABS: { id: DemoTab; label: string; icon: (p: { className?: string }) => ReactElement }[] = [
  { id: 'deudores', label: 'Deudores', icon: IconClipboard },
  { id: 'finanzas', label: 'Finanzas', icon: IconChart },
  { id: 'reservas', label: 'Reservas', icon: IconCalendar },
  { id: 'bar', label: 'Bar', icon: IconGlass },
]

/**
 * Panel simulado y navegable. Está construido con React y CSS —no es una captura
 * de pantalla— y usa nombres de ejemplo, no datos de ninguna fraternidad real.
 * Rota solo hasta que el visitante hace clic; ahí el control pasa a él.
 */
function PanelDemo() {
  const [tab, setTab] = useState<DemoTab>('deudores')
  const [userTook, setUserTook] = useState(false)

  useEffect(() => {
    if (userTook) return
    const id = setInterval(() => {
      setTab((cur) => {
        const i = DEMO_TABS.findIndex((t) => t.id === cur)
        return DEMO_TABS[(i + 1) % DEMO_TABS.length].id
      })
    }, 3500)
    return () => clearInterval(id)
  }, [userTook])

  function pick(id: DemoTab) {
    setUserTook(true)
    setTab(id)
  }

  return (
    <div>
      <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
        {/* Barra de ventana */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-surface-border bg-surface-warm/50">
          <span className="w-2.5 h-2.5 rounded-full bg-surface-muted" />
          <span className="w-2.5 h-2.5 rounded-full bg-surface-muted" />
          <span className="w-2.5 h-2.5 rounded-full bg-surface-muted" />
          <span className="ml-3 text-[10px] font-medium text-slate-400">Vista de ejemplo · hacé clic para explorar</span>
        </div>

        <div className="flex min-h-[280px]">
          {/* Barra lateral simulada */}
          <div className="w-28 sm:w-32 shrink-0 border-r border-surface-border p-2 space-y-1 bg-white" role="tablist" aria-label="Secciones del panel de ejemplo">
            {DEMO_TABS.map((t) => {
              const active = t.id === tab
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => pick(t.id)}
                  className={`w-full flex items-center gap-1.5 rounded-control px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    active ? 'bg-brand-primary/10 text-brand-primary-dark' : 'text-slate-500 hover:bg-surface-muted'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              )
            })}
          </div>

          {/* Contenido */}
          <div className="flex-1 p-4 min-w-0" role="tabpanel">
            {tab === 'deudores' && <DemoDeudores />}
            {tab === 'finanzas' && <DemoFinanzas />}
            {tab === 'reservas' && <DemoReservas />}
            {tab === 'bar' && <DemoBar />}
          </div>
        </div>
      </div>

      {/* Puntos indicadores */}
      <div className="flex justify-center gap-1.5 mt-3">
        {DEMO_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            aria-label={`Ver ${t.label}`}
            className={`h-1.5 rounded-full transition-all ${t.id === tab ? 'w-5 bg-brand-primary' : 'w-1.5 bg-surface-muted'}`}
          />
        ))}
      </div>
    </div>
  )
}

function DemoTitle({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold text-ink mb-3">{children}</p>
}

function DemoDeudores() {
  const rows = [
    { name: 'Carlos M.', amount: '3.910,00', months: '12 meses', blocked: true },
    { name: 'Roberto S.', amount: '2.610,00', months: '6 meses', blocked: true },
    { name: 'Javier P.', amount: '600,00', months: '2 meses', blocked: true },
    { name: 'Andrés L.', amount: '300,00', months: '1 mes', blocked: false },
  ]
  return (
    <div className="animate-[fc-fade-up_0.35s_ease-out]">
      <DemoTitle>Deudores</DemoTitle>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-2 rounded-control border border-surface-border px-2.5 py-1.5">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-ink truncate">{r.name}</p>
              <p className="text-[10px] text-slate-400">{r.months}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {r.blocked && (
                <span className="text-[9px] font-semibold text-brand-alert bg-brand-alert/10 rounded-full px-1.5 py-0.5">
                  Bloqueado
                </span>
              )}
              <span className="text-[11px] font-semibold text-brand-gold">Bs {r.amount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoFinanzas() {
  const rows = [
    { d: '22/07', c: 'Aporte mensual', in: '300,00', out: '' },
    { d: '20/07', c: 'Luz — Gastos Fijos', in: '', out: '180,00' },
    { d: '18/07', c: 'Aporte mensual', in: '300,00', out: '' },
    { d: '15/07', c: 'Limpieza de piscina', in: '', out: '250,00' },
  ]
  return (
    <div className="animate-[fc-fade-up_0.35s_ease-out]">
      <DemoTitle>Ingresos y egresos</DemoTitle>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <div className="rounded-control bg-brand-primary/5 px-2 py-1.5">
          <p className="text-[9px] text-slate-500">Ingresos</p>
          <p className="text-[11px] font-bold text-brand-primary">Bs 8.450</p>
        </div>
        <div className="rounded-control bg-brand-alert/5 px-2 py-1.5">
          <p className="text-[9px] text-slate-500">Egresos</p>
          <p className="text-[11px] font-bold text-brand-alert">Bs 3.120</p>
        </div>
        <div className="rounded-control bg-surface-muted/60 px-2 py-1.5">
          <p className="text-[9px] text-slate-500">Balance</p>
          <p className="text-[11px] font-bold text-ink">Bs 5.330</p>
        </div>
      </div>
      <table className="w-full text-[10px] table-fixed">
        <thead>
          <tr className="text-slate-400 text-left">
            <th className="font-medium pb-1 pr-2 w-[18%]">Fecha</th>
            <th className="font-medium pb-1 pr-2">Concepto</th>
            <th className="font-medium pb-1 text-right w-[20%]">Ingreso</th>
            <th className="font-medium pb-1 text-right w-[20%]">Egreso</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="py-1 pr-2 text-slate-500 whitespace-nowrap">{r.d}</td>
              <td className="py-1 pr-2 text-ink truncate">{r.c}</td>
              <td className="py-1 text-right text-brand-primary font-medium whitespace-nowrap">{r.in}</td>
              <td className="py-1 text-right text-brand-alert font-medium whitespace-nowrap">{r.out}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DemoReservas() {
  const reserved = [4, 11, 18]
  const blocked = [25]
  return (
    <div className="animate-[fc-fade-up_0.35s_ease-out]">
      <DemoTitle>Reservas de la sede</DemoTitle>
      <div className="grid grid-cols-7 gap-1 mb-3">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-semibold text-slate-400">
            {d}
          </div>
        ))}
        {Array.from({ length: 28 }).map((_, i) => {
          const day = i + 1
          const isRes = reserved.includes(day)
          const isBlk = blocked.includes(day)
          return (
            <div
              key={day}
              className={`aspect-square rounded-sm flex items-center justify-center text-[9px] font-medium ${
                isRes
                  ? 'bg-brand-primary text-white'
                  : isBlk
                    ? 'bg-brand-coral/70 text-white'
                    : 'bg-surface-muted/50 text-slate-400'
              }`}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-[9px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-brand-primary" /> Reservado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-brand-coral/70" /> Bloqueado
        </span>
      </div>
    </div>
  )
}

function DemoBar() {
  const items = [
    { n: 'Whisky', stock: 6, margin: '60,00' },
    { n: 'Cerveza', stock: 48, margin: '8,00' },
    { n: 'Coca-Cola 2L', stock: 3, margin: '5,00', low: true },
    { n: 'Cigarros', stock: 22, margin: '4,00' },
  ]
  return (
    <div className="animate-[fc-fade-up_0.35s_ease-out]">
      <DemoTitle>Bar — inventario y caja</DemoTitle>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <div className="rounded-control bg-brand-primary/5 px-2 py-1.5">
          <p className="text-[9px] text-slate-500">Caja del bar</p>
          <p className="text-[11px] font-bold text-brand-primary">Bs 1.445</p>
        </div>
        <div className="rounded-control bg-surface-muted/60 px-2 py-1.5">
          <p className="text-[9px] text-slate-500">Ganancia</p>
          <p className="text-[11px] font-bold text-ink">Bs 620</p>
        </div>
      </div>
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.n} className="flex items-center justify-between gap-2 text-[10px] border-b border-surface-border pb-1">
            <span className="text-ink truncate">{it.n}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400">margen Bs {it.margin}</span>
              <span className={`font-semibold ${it.low ? 'text-brand-alert' : 'text-slate-600'}`}>
                {it.stock} {it.low && '⚠'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Iconos ----------

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

function IconGlass({ className }: { className?: string }) {
  // Vaso con pie: copa simétrica, tallo centrado y base.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M6 3h12l-1.2 6a4.9 4.9 0 0 1-9.6 0z" strokeLinejoin="round" />
      <path d="M12 14v6" strokeLinecap="round" />
      <path d="M8.5 20h7" strokeLinecap="round" />
    </svg>
  )
}

function IconDownload({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 4v11M8 11l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" strokeLinecap="round" />
    </svg>
  )
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6" strokeLinecap="round" />
    </svg>
  )
}

function IconShieldCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3 4.5 6v6c0 5 3.2 8.2 7.5 9 4.3-.8 7.5-4 7.5-9V6z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
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
