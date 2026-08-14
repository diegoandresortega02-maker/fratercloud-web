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
  const [repetida, setRepetida] = useState('')
  const [verPassword, setVerPassword] = useState(false)
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
    if (password !== repetida) {
      setError('Las dos contraseñas no coinciden.')
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
          <div className="flex items-baseline justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            {/* Un solo interruptor para los dos campos: si mostrara solo uno, la
                comprobación de que coinciden dejaría de servir para nada. */}
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              className="text-xs text-slate-500 hover:text-brand-primary"
              aria-pressed={verPassword}
            >
              {verPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <input
            id="password"
            type={verPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={MIN_LARGO}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <p className="mt-1 text-xs text-slate-500">Al menos {MIN_LARGO} caracteres.</p>
        </div>

        <div>
          <label htmlFor="repetida" className="block text-sm font-medium text-slate-700 mb-1">
            Repetí la contraseña
          </label>
          <input
            id="repetida"
            type={verPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            aria-invalid={repetida.length > 0 && password !== repetida}
            className={`w-full rounded-control border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              repetida.length > 0 && password !== repetida
                ? 'border-brand-alert focus:ring-brand-alert'
                : 'border-surface-border focus:ring-brand-primary'
            }`}
          />
          {/* Se avisa mientras escribe, no al enviar: descubrir el error después
              de darle al botón obliga a reescribir las dos. */}
          {repetida.length > 0 && password !== repetida && (
            <p className="mt-1 text-xs text-brand-alert">Todavía no coinciden.</p>
          )}
          {repetida.length > 0 && password === repetida && (
            <p className="mt-1 text-xs text-brand-success">Coinciden.</p>
          )}
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
