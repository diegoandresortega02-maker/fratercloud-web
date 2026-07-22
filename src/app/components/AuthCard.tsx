import type { ReactNode } from 'react'
import logoLockup from '../../assets/brand/logo-lockup.png'

interface AuthCardProps {
  title: string
  subtitle: string
  step?: { current: number; total: number }
  children: ReactNode
  footer?: ReactNode
}

export default function AuthCard({ title, subtitle, step, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src={logoLockup} alt="FraterCloud" className="h-9 w-auto" />
        </div>

        <div className="bg-white rounded-card shadow-sm border border-surface-border p-8">
          {step && (
            <div className="flex items-center gap-2 mb-4">
              {Array.from({ length: step.total }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i < step.current ? 'bg-brand-primary' : 'bg-surface-muted'}`}
                />
              ))}
            </div>
          )}
          {step && (
            <p className="text-xs font-medium text-brand-primary-dark mb-2">
              Paso {step.current} de {step.total}
            </p>
          )}
          <h1 className="text-2xl font-semibold text-ink mb-1">{title}</h1>
          <p className="text-slate-500 text-sm mb-6">{subtitle}</p>

          {children}
        </div>

        {footer && <div className="mt-6 text-center">{footer}</div>}
      </div>
    </div>
  )
}
