import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '../../lib/auth'
import { getAuthErrorMessage } from '../../lib/authErrors'
import { useAuth } from '../AuthContext'
import AuthCard from '../components/AuthCard'

const MIN_LARGO = 8

export default function Register() {
  const navigate = useNavigate()
  const { refreshFraternityUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (password.length < MIN_LARGO) {
      setError(`La contraseña debe tener al menos ${MIN_LARGO} caracteres.`)
      return
    }

    setLoading(true)
    try {
      const data = await signUp(email.trim(), password)
      if (data.session) {
        await refreshFraternityUser()
        navigate('/onboarding')
      } else {
        setInfo('Te enviamos un correo para confirmar la cuenta. Revisá tu bandeja y el spam.')
      }
    } catch (err) {
      console.error(err)
      setError(getAuthErrorMessage(err, 'No se pudo crear la cuenta. Intentá de nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      step={{ current: 1, total: 2 }}
      title="Crea tu cuenta"
      subtitle="Primero tu usuario. Después configuramos tu fraternidad."
      footer={
        <p className="text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-brand-primary font-medium">
            Inicia sesión
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_LARGO}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <p className="mt-1 text-xs text-slate-500">Al menos {MIN_LARGO} caracteres.</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-brand-alert bg-brand-alert/5 rounded-control px-3 py-2">
            {error}
          </p>
        )}
        {info && <p className="text-sm text-emerald-600">{info}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium rounded-control py-2 text-sm"
        >
          {loading ? 'Creando…' : 'Continuar'}
        </button>
      </form>
    </AuthCard>
  )
}
