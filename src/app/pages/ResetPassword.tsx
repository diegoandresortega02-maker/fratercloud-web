import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { updatePassword } from '../../lib/auth'
import { getAuthErrorMessage } from '../../lib/authErrors'
import AuthCard from '../components/AuthCard'

const MIN_LARGO = 8

/** Mientras se resuelve si el enlace del correo es válido. */
type Estado = 'verificando' | 'listo' | 'enlace_invalido'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [estado, setEstado] = useState<Estado>('verificando')
  const [password, setPassword] = useState('')
  const [repetida, setRepetida] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Supabase abre una sesión real al entrar por el enlace del correo. Puede
  // llegar como evento (recién clickeado) o ya estar puesta (si se recargó la
  // página), así que se miran las dos cosas.
  useEffect(() => {
    let vigente = true

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!vigente) return
      if (event === 'PASSWORD_RECOVERY' || session) setEstado('listo')
    })

    supabase.auth.getSession().then(({ data }) => {
      if (!vigente) return
      if (data.session) setEstado('listo')
    })

    // Si en unos segundos no apareció ninguna sesión, el enlace no sirve.
    const t = setTimeout(() => {
      if (vigente) setEstado((e) => (e === 'verificando' ? 'enlace_invalido' : e))
    }, 3000)

    return () => {
      vigente = false
      clearTimeout(t)
      sub.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

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
      await updatePassword(password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error(err)
      setError(getAuthErrorMessage(err, 'No se pudo cambiar la contraseña. Intentá de nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  if (estado === 'verificando') {
    return (
      <AuthCard title="Un momento" subtitle="Estamos verificando tu enlace…">
        <p className="text-sm text-slate-500">Esto toma solo unos segundos.</p>
      </AuthCard>
    )
  }

  if (estado === 'enlace_invalido') {
    return (
      <AuthCard
        title="El enlace no es válido"
        subtitle="Puede haber vencido o haberse usado antes"
        footer={
          <Link to="/login" className="text-sm text-brand-primary font-medium">
            Volver a iniciar sesión
          </Link>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Los enlaces para cambiar la contraseña duran una hora y sirven una sola vez. Pedí uno nuevo y
            usalo apenas te llegue.
          </p>
          <Link
            to="/olvide-password"
            className="block text-center w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-control py-2 text-sm"
          >
            Pedir un enlace nuevo
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Elegí tu contraseña nueva" subtitle="Con esta vas a entrar de ahora en adelante">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Contraseña nueva
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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <p className="mt-1 text-xs text-slate-500">Al menos {MIN_LARGO} caracteres.</p>
        </div>

        <div>
          <label htmlFor="repetida" className="block text-sm font-medium text-slate-700 mb-1">
            Repetila
          </label>
          <input
            id="repetida"
            type={verPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
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
          {loading ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthCard>
  )
}
