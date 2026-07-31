import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../../lib/auth'
import { getAuthErrorMessage } from '../../lib/authErrors'
import AuthCard from '../components/AuthCard'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setEnviado(true)
    } catch (err) {
      console.error(err)
      setError(getAuthErrorMessage(err, 'No se pudo enviar el correo. Intentá de nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <AuthCard
        title="Revisá tu correo"
        subtitle="Si ese correo tiene una cuenta, te llegó un enlace para elegir una contraseña nueva."
        footer={
          <Link to="/login" className="text-sm text-brand-primary font-medium">
            Volver a iniciar sesión
          </Link>
        }
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            El enlace llega a <strong className="text-ink">{email.trim()}</strong> y vence en una hora.
          </p>
          <p>
            Si no lo ves en unos minutos, fijate en la carpeta de spam o correo no deseado antes de volver
            a pedirlo.
          </p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Te enviamos un enlace para elegir una nueva"
      footer={
        <p className="text-sm text-slate-500">
          ¿Ya la recordaste?{' '}
          <Link to="/login" className="text-brand-primary font-medium">
            Iniciar sesión
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email de tu cuenta
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-brand-alert bg-brand-alert/5 rounded-control px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium rounded-control py-2 text-sm"
        >
          {loading ? 'Enviando…' : 'Enviarme el enlace'}
        </button>
      </form>
    </AuthCard>
  )
}
