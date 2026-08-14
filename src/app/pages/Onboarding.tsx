import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, PlusCircle } from 'lucide-react'
import { joinFraternityWithCode, registerFraternity, signOut } from '../../lib/auth'
import { useAuth } from '../AuthContext'
import AuthCard from '../components/AuthCard'

type Modo = 'elegir' | 'create' | 'join'

/**
 * Un código de invitación son 8 caracteres hexadecimales, sin espacios.
 *
 * Existe porque ya pasó: alguien con un código en la mano lo pegó en "Nombre de
 * la fraternidad" y terminó creando una fraternidad llamada "E0EEA418" en vez
 * de unirse a la que lo había invitado.
 */
function pareceCodigo(texto: string): boolean {
  return /^[0-9a-f]{8}$/i.test(texto.trim())
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { refreshFraternityUser } = useAuth()
  // Arranca sin nada elegido: la decisión tiene que ser deliberada.
  const [modo, setModo] = useState<Modo>('elegir')

  const [fraternityName, setFraternityName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [ownerAcceptedTerms, setOwnerAcceptedTerms] = useState(false)

  const [inviteCode, setInviteCode] = useState('')
  const [memberName, setMemberName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [memberAcceptedTerms, setMemberAcceptedTerms] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const nombreEsCodigo = pareceCodigo(fraternityName)

  function volver() {
    setModo('elegir')
    setError(null)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (nombreEsCodigo) return
    setError(null)
    setLoading(true)
    try {
      await registerFraternity(fraternityName, adminName, ownerAcceptedTerms)
      await refreshFraternityUser()
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error al crear la fraternidad')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await joinFraternityWithCode(inviteCode.trim(), memberName, birthDate || null, memberAcceptedTerms)
      await refreshFraternityUser()
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setError(
        err instanceof Error && /invalid|not found|inválido/i.test(err.message)
          ? 'Ese código no corresponde a ninguna fraternidad. Revisá que esté bien copiado.'
          : 'No pudimos unirte. Intentá de nuevo.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (modo === 'elegir') {
    return (
      <AuthCard
        step={{ current: 2, total: 2 }}
        title="¿Qué querés hacer?"
        subtitle="Elegí una de las dos opciones"
        footer={
          <button
            onClick={() => signOut().then(() => navigate('/login'))}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Cerrar sesión
          </button>
        }
      >
        <div className="space-y-3">
          {/* Unirse va PRIMERO: por cada persona que crea una fraternidad hay
              decenas que se suman a una que ya existe. */}
          <button
            type="button"
            onClick={() => setModo('join')}
            className="w-full text-left rounded-card border border-surface-border hover:border-brand-primary hover:bg-brand-primary/5 p-4 transition-colors"
          >
            <div className="flex gap-3">
              <KeyRound className="w-6 h-6 text-brand-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-ink">Unirme a mi fraternidad</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  Ya existe y me pasaron un código de invitación.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setModo('create')}
            className="w-full text-left rounded-card border border-surface-border hover:border-brand-primary hover:bg-brand-primary/5 p-4 transition-colors"
          >
            <div className="flex gap-3">
              <PlusCircle className="w-6 h-6 text-brand-navy shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-ink">Crear una fraternidad nueva</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  Todavía no está en FraterCloud y yo la voy a administrar.
                </p>
              </div>
            </div>
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-5 text-center">
          Si tus compañeros ya usan FraterCloud, elegí la primera opción: crear otra
          fraternidad los dejaría separados.
        </p>
      </AuthCard>
    )
  }

  if (modo === 'join') {
    return (
      <AuthCard
        step={{ current: 2, total: 2 }}
        title="Unirme a mi fraternidad"
        subtitle="Con el código que te pasó tu administrador"
        footer={
          <button onClick={volver} className="text-xs text-slate-400 hover:text-slate-600">
            ← Volver
          </button>
        }
      >
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label htmlFor="codigo" className="block text-sm font-medium text-slate-700 mb-1">
              Código de invitación
            </label>
            <input
              id="codigo"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Por ejemplo: A1B2C3D4"
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <p className="mt-1 text-xs text-slate-500">
              Son 8 caracteres. Te lo da el administrador de tu fraternidad.
            </p>
          </div>
          <div>
            <label htmlFor="nombre-miembro" className="block text-sm font-medium text-slate-700 mb-1">
              Tu nombre completo
            </label>
            <input
              id="nombre-miembro"
              required
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="nacimiento" className="block text-sm font-medium text-slate-700 mb-1">
              Fecha de nacimiento
            </label>
            <input
              id="nacimiento"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <TermsCheckbox checked={memberAcceptedTerms} onChange={setMemberAcceptedTerms} />
          {error && (
            <p role="alert" className="text-sm text-brand-alert bg-brand-alert/5 rounded-control px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !memberAcceptedTerms}
            className="w-full bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium rounded-control py-2 text-sm"
          >
            {loading ? 'Uniendo…' : 'Unirme a la fraternidad'}
          </button>
        </form>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      step={{ current: 2, total: 2 }}
      title="Crear una fraternidad nueva"
      subtitle="Vas a quedar como su administrador"
      footer={
        <button onClick={volver} className="text-xs text-slate-400 hover:text-slate-600">
          ← Volver
        </button>
      }
    >
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label htmlFor="nombre-frater" className="block text-sm font-medium text-slate-700 mb-1">
            Nombre de la fraternidad
          </label>
          <input
            id="nombre-frater"
            required
            value={fraternityName}
            onChange={(e) => setFraternityName(e.target.value)}
            placeholder="Por ejemplo: Fraternidad Los Tajibos"
            aria-invalid={nombreEsCodigo}
            className={`w-full rounded-control border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              nombreEsCodigo
                ? 'border-brand-alert focus:ring-brand-alert'
                : 'border-surface-border focus:ring-brand-primary'
            }`}
          />
          {nombreEsCodigo && (
            <p role="alert" className="mt-2 text-sm text-brand-alert bg-brand-alert/5 rounded-control px-3 py-2">
              Eso parece un <strong>código de invitación</strong>, no el nombre de una fraternidad.{' '}
              <button
                type="button"
                onClick={() => {
                  setInviteCode(fraternityName.trim().toUpperCase())
                  setFraternityName('')
                  setModo('join')
                }}
                className="underline font-medium"
              >
                Unirme con ese código
              </button>
            </p>
          )}
        </div>
        <div>
          <label htmlFor="nombre-admin" className="block text-sm font-medium text-slate-700 mb-1">
            Tu nombre completo
          </label>
          <input
            id="nombre-admin"
            required
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <TermsCheckbox checked={ownerAcceptedTerms} onChange={setOwnerAcceptedTerms} />
        {error && (
          <p role="alert" className="text-sm text-brand-alert bg-brand-alert/5 rounded-control px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !ownerAcceptedTerms || nombreEsCodigo}
          className="w-full bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium rounded-control py-2 text-sm"
        >
          {loading ? 'Creando…' : 'Crear fraternidad'}
        </button>
        <p className="text-xs text-slate-500 text-center">
          Incluye 5 días de prueba con todas las funciones.
        </p>
      </form>
    </AuthCard>
  )
}

function TermsCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      Acepto los términos de uso de FraterCloud
    </label>
  )
}
