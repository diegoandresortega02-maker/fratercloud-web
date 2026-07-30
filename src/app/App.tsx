import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
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
import RecibosPage from './pages/RecibosPage'

function postAuthRedirect(fraternityUser: unknown) {
  return fraternityUser ? '/dashboard' : '/onboarding'
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, fraternityUser, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!fraternityUser) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function RequireSessionOnly({ children }: { children: React.ReactNode }) {
  const { session, fraternityUser, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (fraternityUser) return <Navigate to={postAuthRedirect(fraternityUser)} replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { fraternityUser, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (fraternityUser?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { session, fraternityUser, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (session) return <Navigate to={postAuthRedirect(fraternityUser)} replace />
  return <>{children}</>
}

function FullscreenLoader() {
  return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando…</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
      <Route path="/registro" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
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
        <Route path="/eventos" element={<RequireAdmin><EventosPage /></RequireAdmin>} />
        <Route path="/deudores" element={<RequireAdmin><DeudoresPage /></RequireAdmin>} />
        <Route path="/aprobaciones" element={<RequireAdmin><AprobacionesPage /></RequireAdmin>} />
        <Route path="/registro-recibos" element={<RequireAdmin><RecibosPage /></RequireAdmin>} />
        <Route path="/finanzas" element={<RequireAdmin><FinanzasPage /></RequireAdmin>} />
        <Route path="/fraternos" element={<RequireAdmin><FraternosPage /></RequireAdmin>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
