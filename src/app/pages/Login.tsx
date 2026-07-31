import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getEmailAccountStatus, recordFailedLogin, signIn } from '../../lib/auth'
import { esCredencialInvalida, getAuthErrorMessage } from '../../lib/authErrors'
import AuthCard from '../components/AuthCard'

/** Fallos con el mismo correo antes de decir si el problema es el correo o la clave. */
const INTENTOS_PARA_PISTA = 4

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState<ReactNode>(null)
  const [loading, setLoading] = useState(false)

  // Los fallos se cuentan por correo: cambiar de correo empieza de cero, para
  // no acusar de "contraseña incorrecta" a quien recién escribió otra cuenta.
  const fallos = useRef(0)
  const correoDeLosFallos = useRef('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setError(await mensajeDeFallo(err))
    } finally {
      setLoading(false)
    }
  }

  async function mensajeDeFallo(err: unknown): Promise<ReactNode> {
    if (!esCredencialInvalida(err)) {
      return getAuthErrorMessage(err, 'No se pudo iniciar sesión. Intentá de nuevo.')
    }

    const correo = email.trim().toLowerCase()
    if (correoDeLosFallos.current !== correo) {
      correoDeLosFallos.current = correo
      fallos.current = 0
    }
    fallos.current += 1

    await recordFailedLogin(correo)

    if (fallos.current < INTENTOS_PARA_PISTA) {
      return 'El correo o la contraseña son incorrectos.'
    }

    // Recién acá el servidor acepta decir cuál de los dos está mal.
    const estado = await getEmailAccountStatus(correo)

    if (estado === 'no_account') {
      return (
        <>
          No existe ninguna cuenta con <strong>{correo}</strong>. Revisá que esté bien escrito, o{' '}
          <Link to="/registro" className="font-medium underline">
            creá tu cuenta
          </Link>
          .
        </>
      )
    }

    if (estado === 'has_account') {
      return (
        <>
          El correo es correcto, pero la contraseña no.{' '}
          <Link to="/olvide-password" className="font-medium underline">
            Recuperá tu contraseña
          </Link>{' '}
          y te enviamos un enlace para cambiarla.
        </>
      )
    }

    return 'El correo o la contraseña son incorrectos.'
  }

  return (
    <AuthCard
      title="Bienvenido de nuevo"
      subtitle="Inicia sesión en tu fraternidad"
      footer={
        <p className="text-sm text-slate-500">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="text-brand-primary font-medium">
            Regístrate
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email
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

        <div>
          <div className="flex items-baseline justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              className="text-xs text-slate-500 hover:text-brand-primary"
            >
              {verPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <input
            id="password"
            type={verPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <div className="mt-1.5 text-right">
            <Link to="/olvide-password" className="text-xs text-brand-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
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
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </AuthCard>
  )
}
