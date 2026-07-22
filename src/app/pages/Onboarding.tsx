import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinFraternityWithCode, registerFraternity, signOut } from '../../lib/auth'
import { useAuth } from '../AuthContext'
import AuthCard from '../components/AuthCard'

export default function Onboarding() {
  const navigate = useNavigate()
  const { refreshFraternityUser } = useAuth()
  const [mode, setMode] = useState<'create' | 'join'>('create')

  const [fraternityName, setFraternityName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [ownerAcceptedTerms, setOwnerAcceptedTerms] = useState(false)

  const [inviteCode, setInviteCode] = useState('')
  const [memberName, setMemberName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [memberAcceptedTerms, setMemberAcceptedTerms] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
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
      setError(err instanceof Error ? err.message : 'Código de invitación inválido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      step={{ current: 2, total: 2 }}
      title="Configura tu fraternidad"
      subtitle="Crea una fraternidad nueva o únete a una existente con un código"
      footer={
        <button
          onClick={() => signOut().then(() => navigate('/login'))}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Cerrar sesión
        </button>
      }
    >
      <div className="flex gap-2 mb-6 rounded-control bg-surface-muted p-1">
        <button
          className={`flex-1 text-sm font-medium rounded py-1.5 ${mode === 'create' ? 'bg-white shadow-sm text-ink' : 'text-slate-500'}`}
          onClick={() => setMode('create')}
        >
          Crear fraternidad
        </button>
        <button
          className={`flex-1 text-sm font-medium rounded py-1.5 ${mode === 'join' ? 'bg-white shadow-sm text-ink' : 'text-slate-500'}`}
          onClick={() => setMode('join')}
        >
          Unirme con código
        </button>
      </div>

      {mode === 'create' ? (
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la fraternidad</label>
            <input
              required
              value={fraternityName}
              onChange={(e) => setFraternityName(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tu nombre completo</label>
            <input
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <TermsCheckbox checked={ownerAcceptedTerms} onChange={setOwnerAcceptedTerms} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !ownerAcceptedTerms}
            className="w-full bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium rounded-control py-2 text-sm"
          >
            {loading ? 'Creando…' : 'Crear fraternidad'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Código de invitación</label>
            <input
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tu nombre completo</label>
            <input
              required
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de nacimiento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <TermsCheckbox checked={memberAcceptedTerms} onChange={setMemberAcceptedTerms} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !memberAcceptedTerms}
            className="w-full bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium rounded-control py-2 text-sm"
          >
            {loading ? 'Uniendo…' : 'Unirme a la fraternidad'}
          </button>
        </form>
      )}
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
