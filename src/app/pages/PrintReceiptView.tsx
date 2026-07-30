import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getMyFraternity, getReceiptById } from '../../lib/api'
import type { Fraternity, Receipt } from '../../lib/types'
import logoLockup from '../../assets/brand/logo-lockup.png'
import { formatMoney } from '../../lib/money'

export default function PrintReceiptView() {
  const { id } = useParams<{ id: string }>()
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [fraternity, setFraternity] = useState<Fraternity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([getReceiptById(id), getMyFraternity()])
      .then(([r, f]) => {
        setReceipt(r)
        setFraternity(f)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el recibo'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="p-8 text-sm text-slate-400">Cargando…</p>
  if (error || !receipt || !fraternity) return <p className="p-8 text-sm text-brand-alert">{error || 'Recibo no encontrado'}</p>

  return (
    <div className="min-h-screen bg-surface-muted py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-end mb-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark rounded-control px-4 py-2"
          >
            Imprimir / Guardar PDF
          </button>
        </div>

        <div className="bg-white rounded-card border border-surface-border p-8 print:border-0 print:rounded-none">
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-surface-border">
            <img src={logoLockup} alt="FraterCloud" className="h-8 w-auto" />
            <div className="text-right">
              <p className="text-xs text-slate-400">Recibo N°</p>
              <p className="text-xl font-bold text-brand-primary">{String(receipt.receipt_number).padStart(4, '0')}</p>
            </div>
          </div>

          <h1 className="text-lg font-bold text-ink mb-1">{fraternity.name}</h1>
          <p className="text-sm text-slate-500 mb-6">Recibo de pago</p>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-xs text-slate-400">Fraterno</p>
              <p className="font-medium text-ink">{receipt.fraternity_users?.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Fecha de pago</p>
              <p className="font-medium text-ink">{receipt.payment_date}</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs text-slate-400 mb-1">Concepto</p>
            <p className="font-medium text-ink">{receipt.concept}</p>
          </div>

          <div className="bg-surface-warm rounded-control p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Monto pagado</span>
            <span className="text-2xl font-bold text-brand-primary">Bs {formatMoney(receipt.amount)}</span>
          </div>

          <p className="text-[11px] text-slate-400 mt-8 text-center">
            Recibo generado automáticamente por FraterCloud — {fraternity.name}
          </p>
        </div>
      </div>
    </div>
  )
}
