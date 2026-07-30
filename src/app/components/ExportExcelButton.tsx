import { useState } from 'react'
import { useAuth } from '../AuthContext'

/**
 * Descarga todo el sistema como un Excel con formato.
 * Solo visible para admins. exceljs se carga bajo demanda (import dinámico),
 * así no entra al bundle inicial de la app.
 */
export default function ExportExcelButton({ className = '' }: { className?: string }) {
  const { fraternityUser } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (fraternityUser?.role !== 'admin') return null

  async function handleDownload() {
    setError(null)
    setBusy(true)
    try {
      const { exportFraternityWorkbook } = await import('../../lib/excelExport')
      await exportFraternityWorkbook()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo generar el archivo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <button
        onClick={handleDownload}
        disabled={busy}
        title="Descarga toda la información de la fraternidad en un archivo Excel"
        className="text-sm font-medium text-slate-600 bg-white border border-surface-border hover:bg-surface-muted disabled:opacity-60 rounded-control px-4 py-2"
      >
        {busy ? 'Generando…' : '⬇ Descargar Excel'}
      </button>
      {error && <p className="text-xs text-brand-alert mt-1">{error}</p>}
    </div>
  )
}
