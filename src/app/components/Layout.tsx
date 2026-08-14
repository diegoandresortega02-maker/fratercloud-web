import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { signOut } from '../../lib/auth'
import { useAuth } from '../AuthContext'
import isotipo from '../../assets/brand/isotipo.png'

/** `feature` apunta a un interruptor del plan; si el plan lo apaga, no se muestra. */
const navItems: {
  to: string
  label: string
  adminOnly?: boolean
  barOnly?: boolean
  feature?: string
  /** Los grupos no dependen del plan sino de cómo se organiza la fraternidad. */
  gruposOnly?: boolean
}[] = [
  { to: '/dashboard', label: 'Inicio' },
  { to: '/pagos', label: 'Pagos' },
  { to: '/reservas', label: 'Reservas' },
  { to: '/turnos', label: 'Turnos', feature: 'turnos' },
  { to: '/grupos', label: 'Grupos', gruposOnly: true },
  { to: '/bar', label: 'Bar', barOnly: true },
  { to: '/cumpleanos', label: 'Cumpleaños' },
  { to: '/eventos', label: 'Eventos', adminOnly: true, feature: 'eventos' },
  { to: '/deudores', label: 'Deudores', adminOnly: true },
  { to: '/aprobaciones', label: 'Gestión de pagos', adminOnly: true },
  { to: '/registro-recibos', label: 'Recibos', adminOnly: true },
  { to: '/finanzas', label: 'Ingresos y egresos', adminOnly: true },
  { to: '/fraternos', label: 'Fraternos', adminOnly: true },
  { to: '/membresia', label: 'Membresía', adminOnly: true },
]

/**
 * Avisa del vencimiento antes de que el usuario choque.
 *
 * Sin esto, una fraternidad vencida solo vería fallar cada intento de guardar
 * sin entender por qué: la base bloquea la escritura, pero un 403 no explica
 * nada. El aviso lo ve todo el mundo —el bloqueo los afecta a todos— pero solo
 * al administrador se le dice qué hacer, porque es el único que puede pagar.
 */
function AvisoSuscripcion() {
  const { subscription, fraternityUser } = useAuth()
  if (!subscription) return null

  const dias = subscription.dias_restantes ?? null
  const vencida = !subscription.vigente
  const porVencer = dias !== null && dias >= 0 && dias <= 30
  if (!vencida && !porVencer) return null

  const esAdmin = fraternityUser?.role === 'admin'
  const enPrueba = subscription.estado === 'prueba'

  return (
    <div
      role="status"
      className={`px-6 py-3 text-sm border-b ${
        vencida
          ? 'bg-brand-alert/8 border-brand-alert/25 text-brand-alert'
          : 'bg-brand-gold/8 border-brand-gold/25 text-brand-gold'
      }`}
    >
      {vencida ? (
        <>
          <strong>La membresía venció.</strong> Pueden seguir consultando y descargando toda
          la información, pero no registrar movimientos nuevos hasta renovar.
          {esAdmin && ' Renovala desde Membresía.'}
        </>
      ) : (
        <>
          <strong>
            {enPrueba
              ? `Te ${dias === 1 ? 'queda' : 'quedan'} ${dias} ${dias === 1 ? 'día' : 'días'} de prueba.`
              : `La membresía vence en ${dias} ${dias === 1 ? 'día' : 'días'}.`}
          </strong>{' '}
          {esAdmin
            ? enPrueba
              ? 'Elegí tu plan desde Membresía para seguir usando el sistema sin interrupciones.'
              : 'Renovala desde Membresía para no interrumpir la carga de movimientos.'
            : 'Avisale al administrador de la fraternidad.'}
        </>
      )}
    </div>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const { fraternityUser, features, groupsEnabled } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isAdmin = fraternityUser?.role === 'admin'
  // El bar pide las dos cosas: el rol adecuado y que el plan lo incluya.
  // La base ya lo bloquea; esto evita ofrecer una puerta que no abre.
  const canSeeBar = (isAdmin || fraternityUser?.role === 'bar') && features.bar !== false
  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    if (item.barOnly && !canSeeBar) return false
    if (item.gruposOnly && !groupsEnabled) return false
    if (item.feature && features[item.feature] === false) return false
    return true
  })

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-surface-muted">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 md:w-56 shrink-0 bg-white border-r border-surface-border flex flex-col fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <span className="flex items-center gap-1.5">
              <img src={isotipo} alt="" className="h-6 w-6" aria-hidden="true" />
              <span className="text-lg font-bold">
                <span className="text-brand-navy">Frater</span>
                <span className="text-brand-primary">Cloud</span>
              </span>
            </span>
            {fraternityUser && (
              <p className="text-xs text-slate-500 mt-1.5">
                {fraternityUser.full_name} · {fraternityUser.role === 'admin' ? 'Administrador' : 'Fraterno'}
              </p>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-600 text-xl leading-none px-1"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `block rounded-control px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-brand-primary/10 text-brand-primary-dark' : 'text-slate-600 hover:bg-surface-muted'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-2 py-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full text-left rounded-control px-3 py-2 text-sm font-medium text-slate-500 hover:bg-surface-muted"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="md:hidden flex items-center gap-3 bg-white border-b border-surface-border px-4 py-3 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-600 hover:text-ink text-xl leading-none px-1"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <span className="flex items-center gap-1.5">
            <img src={isotipo} alt="" className="h-5 w-5" aria-hidden="true" />
            <span className="text-base font-bold">
              <span className="text-brand-navy">Frater</span>
              <span className="text-brand-primary">Cloud</span>
            </span>
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <AvisoSuscripcion />
          <Outlet />
        </div>
      </main>
    </div>
  )
}
