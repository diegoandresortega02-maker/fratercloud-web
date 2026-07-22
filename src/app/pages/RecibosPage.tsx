import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllReceipts } from '../../lib/api'
import type { Receipt } from '../../lib/types'

export default function RecibosPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getAllReceipts()
      .then(setReceipts)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="p-8 text-sm text-slate-400">Cargando…</p>

  const filtered = search
    ? receipts.filter(
        (r) =>
          r.fraternity_users?.full_name.toLowerCase().includes(search.toLowerCase()) ||
          r.concept.toLowerCase().includes(search.toLowerCase()) ||
          String(r.receipt_number).includes(search),
      )
    : receipts

  const total = filtered.reduce((sum, r) => sum + Number(r.amount), 0)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-ink">Registro de recibos</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por fraterno, concepto o número…"
          className="rounded-control border border-surface-border px-3 py-2 text-sm w-64"
        />
      </div>

      <div className="bg-white rounded-card border border-surface-border p-5 mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{filtered.length} recibos</span>
        <span className="text-lg font-semibold text-brand-primary">Bs {total.toFixed(2)}</span>
      </div>

      <div className="bg-white rounded-card border border-surface-border divide-y divide-surface-border">
        {filtered.length === 0 && <p className="p-4 text-sm text-slate-400">No hay recibos que coincidan.</p>}
        {filtered.map((r) => (
          <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">
                N° {String(r.receipt_number).padStart(4, '0')} · {r.fraternity_users?.full_name}
              </p>
              <p className="text-xs text-slate-400">
                {r.concept} · {r.payment_date}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-brand-primary">Bs {Number(r.amount).toFixed(2)}</span>
              <Link to={`/recibos/${r.id}`} target="_blank" className="text-xs font-medium text-brand-primary hover:underline">
                Ver
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
