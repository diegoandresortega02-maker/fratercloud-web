import { useEffect, useState } from 'react'
import {
  approvePaymentSubmission,
  getPaymentProofUrl,
  getPendingPaymentSubmissions,
  rejectPaymentSubmission,
} from '../../lib/api'
import type { PaymentSubmission } from '../../lib/types'

export default function AprobacionesPage() {
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function reload() {
    setSubmissions(await getPendingPaymentSubmissions())
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  async function handleApprove(id: string) {
    setBusyId(id)
    try {
      await approvePaymentSubmission(id)
      await reload()
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(id: string) {
    setBusyId(id)
    try {
      await rejectPaymentSubmission(id)
      await reload()
    } finally {
      setBusyId(null)
    }
  }

  async function handleViewProof(path: string) {
    const url = await getPaymentProofUrl(path)
    window.open(url, '_blank')
  }

  if (loading) return <p className="p-8 text-sm text-slate-400">Cargando…</p>

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink mb-6">Gestión de pagos</h1>

      <div className="bg-white rounded-card border border-surface-border divide-y divide-surface-border">
        {submissions.length === 0 && <p className="p-4 text-sm text-slate-400">No hay comprobantes pendientes de revisión.</p>}
        {submissions.map((s) => (
          <div key={s.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">{s.fraternity_users?.full_name}</p>
              <p className="text-xs text-slate-400">
                {s.target_type === 'monthly_due' ? 'Mensualidad' : 'Cuota de plan de pago'} · Bs {Number(s.amount).toFixed(2)} ·{' '}
                {new Date(s.submitted_at).toLocaleDateString('es-BO')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleViewProof(s.proof_image_path)}
                className="text-xs font-medium text-brand-primary hover:underline"
              >
                Ver comprobante
              </button>
              <button
                disabled={busyId === s.id}
                onClick={() => handleApprove(s.id)}
                className="text-xs font-medium text-white bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 rounded-full px-3 py-1"
              >
                Aprobar
              </button>
              <button
                disabled={busyId === s.id}
                onClick={() => handleReject(s.id)}
                className="text-xs font-medium text-brand-alert bg-brand-alert/10 hover:opacity-90 disabled:opacity-50 rounded-full px-3 py-1"
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
