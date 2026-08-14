import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Landing from './pages/Landing'
import PreciosPage from './pages/PreciosPage'
import InvitacionPage from './pages/InvitacionPage'
import PlataformaPage from './pages/PlataformaPage'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import PagosPage from './pages/PagosPage'
import ReservasPage from './pages/ReservasPage'
import CumpleanosPage from './pages/CumpleanosPage'
import DeudoresPage from './pages/DeudoresPage'
import AprobacionesPage from './pages/AprobacionesPage'
import FinanzasPage from './pages/FinanzasPage'
import FraternosPage from './pages/FraternosPage'
import TurnosPage from './pages/TurnosPage'
import EventosPage from './pages/EventosPage'
import PrintReceiptView from './pages/PrintReceiptView'
import PrintMemberStatementView from './pages/PrintMemberStatementView'
import BarPage from './pages/BarPage'
import RecibosPage from './pages/RecibosPage'
import MembresiaPage from './pages/MembresiaPage'

function postAuthRedirect(fraternityUser: unknown, isPlatformAdmin = false) {
  if (isPlatformAdmin) return '/plataforma'
  return fraternityUser ? '/dashboard' : '/onboarding'
}

/** El panel del dueño del sistema. No exige pertenecer a una fraternidad. */
function RequirePlatformAdmin({ children }: { children: React.ReactNode }) {
  const { session, isPlatformAdmin, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, fraternityUser, isPlatformAdmin, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (isPlatformAdmin) return <Navigate to="/plataforma" replace />
  if (!fraternityUser) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function RequireSessionOnly({ children }: { children: React.ReactNode }) {
  const { session, fraternityUser, isPlatformAdmin, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (isPlatformAdmin) return <Navigate to="/plataforma" replace />
  if (fraternityUser) return <Navigate to={postAuthRedirect(fraternityUser)} replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { fraternityUser, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (fraternityUser?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/**
 * El bar pide dos condiciones: el rol adecuado y que el plan lo incluya.
 * La base de datos ya bloquea los datos; esto solo evita mostrar una pantalla
 * vacía a quien entre escribiendo la URL.
 */
function RequireBar({ children }: { children: React.ReactNode }) {
  const { fraternityUser, features, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  const role = fraternityUser?.role
  if (role !== 'bar' && role !== 'admin') return <Navigate to="/dashboard" replace />
  if (features.bar === false) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { session, fraternityUser, isPlatformAdmin, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (session) return <Navigate to={postAuthRedirect(fraternityUser, isPlatformAdmin)} replace />
  return <>{children}</>
}

function FullscreenLoader() {
  return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando…</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/precios" element={<PreciosPage />} />
      {/* Sin guardia: la invitación tiene que abrirse sin sesión. */}
      <Route path="/unirme/:codigo" element={<InvitacionPage />} />
      <Route path="/plataforma" element={<RequirePlatformAdmin><PlataformaPage /></RequirePlatformAdmin>} />
      <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
      <Route path="/registro" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
      <Route path="/olvide-password" element={<RedirectIfAuthed><ForgotPassword /></RedirectIfAuthed>} />
      {/* Sin guardia a propósito: el enlace del correo abre una sesión real, así
          que RedirectIfAuthed sacaría al fraterno antes de poder cambiar la clave. */}
      <Route path="/restablecer-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={<RequireSessionOnly><Onboarding /></RequireSessionOnly>} />
      <Route path="/recibos/:id" element={<RequireAuth><PrintReceiptView /></RequireAuth>} />
      <Route
        path="/estado-cuenta/:memberId"
        element={
          <RequireAuth>
            <RequireAdmin>
              <PrintMemberStatementView />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pagos" element={<PagosPage />} />
        <Route path="/reservas" element={<ReservasPage />} />
        <Route path="/cumpleanos" element={<CumpleanosPage />} />
        <Route path="/turnos" element={<TurnosPage />} />
        <Route path="/bar" element={<RequireBar><BarPage /></RequireBar>} />
        <Route path="/eventos" element={<RequireAdmin><EventosPage /></RequireAdmin>} />
        <Route path="/deudores" element={<RequireAdmin><DeudoresPage /></RequireAdmin>} />
        <Route path="/aprobaciones" element={<RequireAdmin><AprobacionesPage /></RequireAdmin>} />
        <Route path="/registro-recibos" element={<RequireAdmin><RecibosPage /></RequireAdmin>} />
        <Route path="/finanzas" element={<RequireAdmin><FinanzasPage /></RequireAdmin>} />
        <Route path="/fraternos" element={<RequireAdmin><FraternosPage /></RequireAdmin>} />
        <Route path="/membresia" element={<RequireAdmin><MembresiaPage /></RequireAdmin>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
