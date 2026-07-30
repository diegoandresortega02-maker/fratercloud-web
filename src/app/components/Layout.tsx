import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { signOut } from '../../lib/auth'
import { useAuth } from '../AuthContext'
import isotipo from '../../assets/brand/isotipo.png'

const navItems = [
  { to: '/dashboard', label: 'Inicio' },
  { to: '/pagos', label: 'Pagos' },
  { to: '/reservas', label: 'Reservas' },
  { to: '/turnos', label: 'Turnos' },
  { to: '/cumpleanos', label: 'Cumpleaños' },
  { to: '/eventos', label: 'Eventos', adminOnly: true },
  { to: '/deudores', label: 'Deudores', adminOnly: true },
  { to: '/aprobaciones', label: 'Gestión de pagos', adminOnly: true },
  { to: '/registro-recibos', label: 'Recibos', adminOnly: true },
  { to: '/finanzas', label: 'Ingresos y egresos', adminOnly: true },
  { to: '/fraternos', label: 'Fraternos', adminOnly: true },
]

export default function Layout() {
  const navigate = useNavigate()
  const { fraternityUser } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isAdmin = fraternityUser?.role === 'admin'
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin)

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
          <Outlet />
        </div>
      </main>
    </div>
  )
}
