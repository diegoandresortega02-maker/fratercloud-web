import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import {
  adminAddMember,
  adminUpdateMember,
  getFraternityMembers,
  getMyFraternity,
  updateFraternityDueAmount,
  updateFraternitySettings,
  updateMemberRole,
  type MemberInput,
} from '../../lib/api'
import type { Fraternity, FraternityRole, FraternityUser, MemberStatus } from '../../lib/types'
import { formatMoneyShort } from '../../lib/money'

export default function FraternosPage() {
  const { fraternityUser } = useAuth()
  const [fraternity, setFraternity] = useState<Fraternity | null>(null)
  const [members, setMembers] = useState<FraternityUser[]>([])
  const [dueAmount, setDueAmount] = useState('')
  const [gestionName, setGestionName] = useState('')
  const [gestionStart, setGestionStart] = useState('')
  const [debtThreshold, setDebtThreshold] = useState('2')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editMember, setEditMember] = useState<FraternityUser | null>(null)

  async function reload() {
    const [f, m] = await Promise.all([getMyFraternity(), getFraternityMembers()])
    setFraternity(f)
    setDueAmount(String(f.monthly_due_amount))
    setGestionName(f.gestion_name ?? '')
    setGestionStart(f.gestion_start ?? '')
    setDebtThreshold(String(f.debt_block_threshold))
    setMembers(m)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  async function handleSaveDueAmount() {
    await updateFraternityDueAmount(Number(dueAmount))
    await reload()
  }

  async function handleSaveSettings() {
    await updateFraternitySettings({
      gestion_name: gestionName || null,
      gestion_start: gestionStart || null,
      debt_block_threshold: Number(debtThreshold),
    })
    await reload()
  }

  async function handleRoleChange(memberId: string, role: FraternityRole) {
    await updateMemberRole(memberId, role)
    await reload()
  }

  async function handleCopyCode() {
    if (!fraternity) return
    await navigator.clipboard.writeText(fraternity.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading || !fraternity) return <p className="p-8 text-sm text-slate-400">Cargando…</p>

  const actives = members.filter((m) => m.status !== 'retirado')
  const retired = members.filter((m) => m.status === 'retirado')

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-ink">Fraternos</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
        >
          + Agregar fraterno
        </button>
      </div>

      <div className="bg-white rounded-card border border-surface-border p-5 mb-6">
        <h2 className="text-sm font-semibold text-ink mb-3">{fraternity.name}</h2>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-xs text-slate-500">Código de invitación:</span>
          <code className="text-sm font-mono bg-surface-muted px-2 py-1 rounded-control">{fraternity.invite_code}</code>
          <button onClick={handleCopyCode} className="text-xs font-medium text-brand-primary hover:underline">
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Cuota mensual general (Bs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={dueAmount}
              onChange={(e) => setDueAmount(e.target.value)}
              className="rounded-control border border-surface-border px-3 py-2 text-sm w-40"
            />
          </div>
          <button
            onClick={handleSaveDueAmount}
            className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
          >
            Guardar
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Los fraternos con cuota propia distinta se configuran individualmente en la lista.
        </p>
      </div>

      <div className="bg-white rounded-card border border-surface-border p-5 mb-6">
        <h2 className="text-sm font-semibold text-ink mb-3">Configuración de mora y gestión</h2>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Bloquear reservas al deber (periodos)
            </label>
            <input
              type="number"
              min="1"
              value={debtThreshold}
              onChange={(e) => setDebtThreshold(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">1 = estar al día exige cero deuda pendiente.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre de la gestión (opcional)</label>
            <input
              value={gestionName}
              onChange={(e) => setGestionName(e.target.value)}
              placeholder="Ej. Gestión Marcelo Sinatra"
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Inicio de la gestión (opcional)</label>
            <input
              type="date"
              value={gestionStart}
              onChange={(e) => setGestionStart(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleSaveSettings}
          className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
        >
          Guardar configuración
        </button>
        <p className="text-[11px] text-slate-400 mt-2">
          El nombre y la fecha de gestión habilitan un filtro adicional en Ingresos y egresos.
        </p>
      </div>

      <div className="bg-white rounded-card border border-surface-border divide-y divide-surface-border mb-6">
        {actives.map((m) => (
          <div key={m.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink flex items-center gap-2">
                {m.full_name}
                {m.status === 'invitado' && (
                  <span className="text-[10px] font-semibold uppercase text-brand-gold bg-brand-gold/10 rounded-full px-2 py-0.5">
                    Invitado
                  </span>
                )}
                {!m.user_id && (
                  <span className="text-[10px] font-semibold uppercase text-slate-400 bg-surface-muted rounded-full px-2 py-0.5">
                    Sin cuenta
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400">
                {m.email || 'sin email'}
                {m.entry_date ? ` · ingresó ${m.entry_date.slice(0, 7)}` : ''}
                {m.monthly_due_override != null ? ` · cuota propia Bs ${formatMoneyShort(m.monthly_due_override)}` : ''}
              </p>
              {m.notes && <p className="text-xs text-brand-gold mt-0.5">{m.notes}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMember(m)}
                className="text-xs font-medium text-brand-primary hover:underline"
              >
                Editar
              </button>
              <select
                value={m.role}
                disabled={m.id === fraternityUser?.id || !m.user_id}
                onChange={(e) => handleRoleChange(m.id, e.target.value as FraternityRole)}
                className="rounded-control border border-surface-border px-2 py-1 text-sm disabled:opacity-50"
              >
                <option value="member">Fraterno</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {retired.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-500 mb-3">Retirados</h2>
          <div className="bg-white rounded-card border border-surface-border divide-y divide-surface-border opacity-80">
            {retired.map((m) => (
              <div key={m.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{m.full_name}</p>
                  {m.notes && <p className="text-xs text-slate-400">{m.notes}</p>}
                </div>
                <button
                  onClick={() => setEditMember(m)}
                  className="text-xs font-medium text-brand-primary hover:underline"
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddForm && (
        <MemberModal
          title="Agregar fraterno"
          onClose={() => setShowAddForm(false)}
          onSave={async (input) => {
            await adminAddMember(input)
            setShowAddForm(false)
            await reload()
          }}
        />
      )}
      {editMember && (
        <MemberModal
          title={`Editar — ${editMember.full_name}`}
          member={editMember}
          onClose={() => setEditMember(null)}
          onSave={async (input) => {
            await adminUpdateMember(editMember.id, {
              ...input,
              clear_override: input.monthly_due_override == null,
            })
            setEditMember(null)
            await reload()
          }}
        />
      )}
    </div>
  )
}

function MemberModal({
  title,
  member,
  onClose,
  onSave,
}: {
  title: string
  member?: FraternityUser
  onClose: () => void
  onSave: (input: MemberInput) => Promise<void>
}) {
  const [fullName, setFullName] = useState(member?.full_name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [status, setStatus] = useState<MemberStatus>(member?.status ?? 'activo')
  const [entryDate, setEntryDate] = useState(member?.entry_date ?? '')
  const [birthDate, setBirthDate] = useState(member?.birth_date ?? '')
  const [override, setOverride] = useState(
    member?.monthly_due_override != null ? String(member.monthly_due_override) : '',
  )
  const [notes, setNotes] = useState(member?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      await onSave({
        full_name: fullName,
        email: email || null,
        status,
        entry_date: entryDate || null,
        birth_date: birthDate || null,
        monthly_due_override: override === '' ? null : Number(override),
        notes: notes || null,
      })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-card p-6 w-full max-w-md">
        <h3 className="text-base font-semibold text-ink mb-4">{title}</h3>
        <div className="space-y-3 mb-4">
          {!member && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nombre completo</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Email (con este email podrá reclamar su cuenta al registrarse)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MemberStatus)}
                className="w-full rounded-control border border-surface-border px-2 py-2 text-sm"
              >
                <option value="activo">Activo</option>
                <option value="invitado">Invitado</option>
                <option value="retirado">Retirado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cuota propia (Bs, opcional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="usa la general"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha de ingreso</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha de nacimiento</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-control border border-surface-border px-3 py-2 text-sm"
              rows={2}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-control text-slate-500">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (!member && !fullName)}
            className="text-sm px-3 py-1.5 rounded-control bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 text-white font-medium"
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
