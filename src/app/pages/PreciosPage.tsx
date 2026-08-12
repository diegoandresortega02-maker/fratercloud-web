import { Link } from 'react-router-dom'
import logoLockup from '../../assets/brand/logo-lockup.png'
import PricingSection from '../components/PricingSection'

export default function PreciosPage() {
  return (
    <div className="min-h-screen bg-surface-warm">
      <header className="bg-white border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/">
            <img src={logoLockup} alt="FraterCloud" className="h-7 w-auto" />
          </Link>
          <Link to="/login" className="text-sm font-medium text-brand-primary hover:underline">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <PricingSection />
    </div>
  )
}
