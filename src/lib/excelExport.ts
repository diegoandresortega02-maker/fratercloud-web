import type { Workbook, Worksheet, Row } from 'exceljs'
import {
  getAllBlockedDates,
  getAllMonthlyDues,
  getBarCashBalance,
  getBarCashCounts,
  getBarItems,
  getBarMovements,
  getAllPlanInstallments,
  getAllReceipts,
  getAllReservations,
  getAllTransactions,
  getAllTurns,
  getEventChargeStatus,
  getEventContributions,
  getEvents,
  getFraternityMembers,
  getMyFraternity,
  type PlanInstallmentRow,
} from './api'
import type { FraternityUser } from './types'
import { monthName } from './dates'

// ---------- Estilo compartido ----------

const NAVY = 'FF0B1D3A'
const WARM = 'FFF6F2EB'
const MIST = 'FFE2E5EA'
const GREEN = 'FF18864B'
const RED = 'FFB42318'
const GREEN_BG = 'FFE7F5EC'
const RED_BG = 'FFFCEBEA'

/** Excel localiza este formato: en es-BO se ve 1.000,97 y sigue siendo número real. */
const MONEY = '#,##0.00'
const FONT = 'Arial'

type Align = 'left' | 'right' | 'center'
interface Col {
  header: string
  width: number
  align?: Align
  money?: boolean
}

/** Encabezado navy con texto blanco, fila congelada y autofiltro. */
function setupSheet(ws: Worksheet, cols: Col[], opts: { autoFilter?: boolean; freezeCols?: number } = {}) {
  ws.columns = cols.map((c) => ({ width: c.width }))
  const header = ws.addRow(cols.map((c) => c.header))
  header.font = { name: FONT, bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
  header.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
  header.height = 22
  header.eachCell((cell, i) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    const align = cols[i - 1]?.align
    if (align) cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true }
  })
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: opts.freezeCols ?? 0 }]
  if (opts.autoFilter !== false && cols.length > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } }
  }
}

/** Aplica fuente, formato de moneda y alineación a una fila de datos. */
function styleDataRow(row: Row, cols: Col[]) {
  row.font = { name: FONT, size: 10 }
  row.eachCell((cell, i) => {
    const col = cols[i - 1]
    if (!col) return
    if (col.money) {
      cell.numFmt = MONEY
      cell.alignment = { horizontal: 'right' }
    } else if (col.align) {
      cell.alignment = { horizontal: col.align }
    }
  })
}

/**
 * Fila de totales con fórmulas SUM reales sobre el rango de datos.
 * Incluye `result` (el total ya calculado) para que el archivo muestre los
 * valores correctos apenas se abre, sin depender de que Excel recalcule.
 */
function addTotalsRow(ws: Worksheet, cols: Col[], firstDataRow: number, lastDataRow: number, label = 'TOTAL') {
  if (lastDataRow < firstDataRow) return
  const values: (string | { formula: string; result: number })[] = cols.map((c, i) => {
    if (i === 0) return label
    if (!c.money) return ''
    const letter = colLetter(i + 1)
    let sum = 0
    for (let r = firstDataRow; r <= lastDataRow; r++) {
      const v = ws.getRow(r).getCell(i + 1).value
      if (typeof v === 'number') sum += v
      else if (v && typeof v === 'object' && 'result' in v && typeof v.result === 'number') sum += v.result
    }
    return { formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})`, result: Math.round(sum * 100) / 100 }
  })
  const row = ws.addRow(values)
  row.font = { name: FONT, bold: true, size: 10 }
  row.eachCell((cell, i) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MIST } }
    cell.border = { top: { style: 'thin', color: { argb: NAVY } } }
    if (cols[i - 1]?.money) {
      cell.numFmt = MONEY
      cell.alignment = { horizontal: 'right' }
    }
  })
}

function colLetter(n: number): string {
  let s = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** Título de sección dentro de una hoja (para hojas con varios bloques). */
function addSectionTitle(ws: Worksheet, text: string, span = 6) {
  ws.addRow([])
  const row = ws.addRow([text])
  row.font = { name: FONT, bold: true, size: 11, color: { argb: NAVY } }
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARM } }
  })
  ws.mergeCells(row.number, 1, row.number, span)
  return row.number
}

/** Encabezado de una tabla secundaria dentro de una hoja de varios bloques. */
function addSubHeader(ws: Worksheet, cols: Col[]) {
  const row = ws.addRow(cols.map((c) => c.header))
  row.font = { name: FONT, bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
  row.eachCell((cell, i) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    const align = cols[i - 1]?.align
    if (align) cell.alignment = { horizontal: align }
  })
  return row.number
}

// ---------- Utilidades de datos ----------

const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** '2026-07-01' -> 'jul-2026' (encabezado uniforme, siempre ordenable). */
function periodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number)
  return `${MONTH_ABBR[m - 1]}-${y}`
}

/** '2026-07-01' -> 'Julio de 2026' (texto largo para listas). */
function periodLongLabel(period: string): string {
  const [y, m] = period.split('-').map(Number)
  return `${monthName(m - 1)} de ${y}`
}

/** Lista de periodos 'YYYY-MM-01' desde el más antiguo registrado hasta el mes actual. */
function periodRange(firstPeriod: string, lastPeriod: string): string[] {
  const out: string[] = []
  const [fy, fm] = firstPeriod.split('-').map(Number)
  const [ly, lm] = lastPeriod.split('-').map(Number)
  let y = fy
  let m = fm
  // Tope de seguridad: 50 años, por si llegara una fecha corrupta.
  for (let guard = 0; guard < 600; guard++) {
    out.push(`${y}-${String(m).padStart(2, '0')}-01`)
    if (y === ly && m === lm) break
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return out
}

const STATUS_LABEL: Record<string, string> = {
  activo: 'Activo',
  invitado: 'Invitado',
  retirado: 'Retirado',
}

function memberSort(a: { full_name: string }, b: { full_name: string }) {
  return a.full_name.localeCompare(b.full_name, 'es')
}

// ---------- Exportador principal ----------

export async function exportFraternityWorkbook(): Promise<void> {
  // exceljs se carga aquí (import dinámico) para que no entre al bundle inicial.
  const ExcelJS = await import('exceljs')

  const [
    fraternity,
    members,
    dues,
    installments,
    transactions,
    events,
    reservations,
    blockedDates,
    turns,
    receipts,
    barItems,
    barMovements,
    barCashCounts,
    barBalance,
  ] = await Promise.all([
    getMyFraternity(),
    getFraternityMembers(),
    getAllMonthlyDues(),
    getAllPlanInstallments(),
    getAllTransactions(),
    getEvents(),
    getAllReservations(),
    getAllBlockedDates(),
    getAllTurns(),
    getAllReceipts(),
    getBarItems(),
    getBarMovements(),
    getBarCashCounts(),
    getBarCashBalance(),
  ])

  // Rosters/contribuciones de cada evento (pocos eventos, consulta por evento es aceptable)
  const eventDetails = await Promise.all(
    events.map(async (ev) => ({
      event: ev,
      roster: ev.charge_mode === 'fijo' ? await getEventChargeStatus(ev.id) : [],
      contributions: ev.charge_mode === 'libre' ? await getEventContributions(ev.id) : [],
    })),
  )

  const wb: Workbook = new ExcelJS.Workbook()
  wb.creator = 'FraterCloud'
  wb.created = new Date()

  const sortedMembers = [...members].sort(memberSort)
  const activeMembers = sortedMembers.filter((m) => m.status === 'activo')

  // Deuda por fraterno, calculada localmente (evita una consulta por miembro)
  const debtByMember = new Map<string, { duesCount: number; duesAmount: number; instCount: number; instAmount: number }>()
  for (const m of sortedMembers) {
    debtByMember.set(m.id, { duesCount: 0, duesAmount: 0, instCount: 0, instAmount: 0 })
  }
  for (const d of dues) {
    if (d.status !== 'pendiente') continue
    const e = debtByMember.get(d.member_id)
    if (e) {
      e.duesCount++
      e.duesAmount += Number(d.amount)
    }
  }
  for (const i of installments) {
    if (i.status !== 'pendiente') continue
    const e = debtByMember.get(i.member_id)
    if (e) {
      e.instCount++
      e.instAmount += i.amount
    }
  }

  buildResumen(wb, fraternity, sortedMembers, debtByMember, transactions)
  buildFraternos(wb, sortedMembers, fraternity.monthly_due_amount)
  buildEstadoCuenta(wb, sortedMembers, debtByMember, fraternity.debt_block_threshold)
  buildMatrizMensualidades(wb, activeMembers, dues)
  buildMensualidadesDetalle(wb, dues, sortedMembers)
  buildPlanesYMultas(wb, installments)
  buildMovimientos(wb, transactions, fraternity.gestion_name, fraternity.gestion_start)
  buildResumenFinanciero(wb, transactions)
  buildEventos(wb, eventDetails)
  buildReservas(wb, reservations, blockedDates)
  buildTurnos(wb, turns)
  buildCumpleanos(wb, sortedMembers)
  buildRecibos(wb, receipts)
  buildBarInventario(wb, barItems)
  buildBarMovimientos(wb, barMovements)
  buildBarArqueos(wb, barCashCounts, barBalance)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const today = new Date().toISOString().slice(0, 10)
  const safeName = fraternity.name.replace(/[^\p{L}\p{N} -]/gu, '').trim() || 'Fraternidad'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `FraterCloud-${safeName}-${today}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------- 1. Resumen ----------

function buildResumen(
  wb: Workbook,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fraternity: any,
  members: FraternityUser[],
  debt: Map<string, { duesCount: number; duesAmount: number; instCount: number; instAmount: number }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactions: any[],
) {
  const ws = wb.addWorksheet('Resumen', { properties: { tabColor: { argb: NAVY } } })
  ws.columns = [{ width: 38 }, { width: 22 }, { width: 22 }, { width: 22 }]

  const title = ws.addRow([fraternity.name])
  title.font = { name: FONT, bold: true, size: 16, color: { argb: NAVY } }
  ws.mergeCells(title.number, 1, title.number, 4)

  const sub = ws.addRow(['Reporte generado por FraterCloud'])
  sub.font = { name: FONT, size: 10, color: { argb: 'FF6B7280' } }
  ws.mergeCells(sub.number, 1, sub.number, 4)

  ws.addRow([])
  const info: [string, string][] = [
    ['Fecha de generación', new Date().toLocaleString('es-BO')],
    ['Gestión', fraternity.gestion_name || '—'],
    ['Inicio de gestión', fraternity.gestion_start || '—'],
    ['Cuota mensual vigente', `Bs ${Number(fraternity.monthly_due_amount).toFixed(2)}`],
    ['Bloqueo de reservas', `Al deber ${fraternity.debt_block_threshold} periodo(s) o más`],
    ['Código de invitación', fraternity.invite_code],
  ]
  for (const [k, v] of info) {
    const r = ws.addRow([k, v])
    r.font = { name: FONT, size: 10 }
    r.getCell(1).font = { name: FONT, size: 10, bold: true }
  }

  // --- Fraternos ---
  addSectionTitle(ws, 'FRATERNOS', 4)
  const counts = { activo: 0, invitado: 0, retirado: 0 } as Record<string, number>
  for (const m of members) counts[m.status] = (counts[m.status] ?? 0) + 1
  for (const [k, label] of [
    ['activo', 'Activos'],
    ['invitado', 'Invitados'],
    ['retirado', 'Retirados'],
  ] as const) {
    const r = ws.addRow([label, counts[k] ?? 0])
    r.font = { name: FONT, size: 10 }
    r.getCell(1).font = { name: FONT, size: 10, bold: true }
  }
  const totalRow = ws.addRow(['Total', members.length])
  totalRow.font = { name: FONT, bold: true, size: 10 }

  // --- Deuda ---
  addSectionTitle(ws, 'DEUDA', 4)
  let totalDue = 0
  let totalInst = 0
  let debtors = 0
  for (const m of members) {
    const e = debt.get(m.id)
    if (!e) continue
    totalDue += e.duesAmount
    totalInst += e.instAmount
    if (e.duesAmount + e.instAmount > 0) debtors++
  }
  const round2 = (n: number) => Math.round(n * 100) / 100
  for (const [label, val] of [
    ['Mensualidades pendientes (Bs)', round2(totalDue)],
    ['Otras cuotas pendientes (Bs)', round2(totalInst)],
    ['Deuda total (Bs)', round2(totalDue + totalInst)],
  ] as [string, number][]) {
    const r = ws.addRow([label, val])
    r.font = { name: FONT, size: 10 }
    r.getCell(1).font = { name: FONT, size: 10, bold: true }
    r.getCell(2).numFmt = MONEY
  }
  const dRow = ws.addRow(['Fraternos con deuda', debtors])
  dRow.font = { name: FONT, size: 10 }
  dRow.getCell(1).font = { name: FONT, size: 10, bold: true }

  // --- Saldos por cuenta ---
  addSectionTitle(ws, 'SALDOS POR CUENTA', 4)
  const accCols: Col[] = [
    { header: 'Cuenta', width: 38 },
    { header: 'Ingresos', width: 22, money: true },
    { header: 'Egresos', width: 22, money: true },
    { header: 'Saldo', width: 22, money: true },
  ]
  addSubHeader(ws, accCols)
  const byAccount = new Map<string, { ing: number; egr: number }>()
  for (const t of transactions) {
    const key = t.account || 'Sin cuenta'
    const e = byAccount.get(key) ?? { ing: 0, egr: 0 }
    if (t.type === 'ingreso') e.ing += Number(t.amount)
    else e.egr += Number(t.amount)
    byAccount.set(key, e)
  }
  const firstAcc = ws.rowCount + 1
  for (const [name, v] of [...byAccount.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
    const r = ws.addRow([name, round2(v.ing), round2(v.egr), round2(v.ing - v.egr)])
    styleDataRow(r, accCols)
  }
  addTotalsRow(ws, accCols, firstAcc, ws.rowCount)

  // --- Nota metodológica ---
  addSectionTitle(ws, 'NOTA', 4)
  const notes = [
    'Los importes son números reales: puede sumarlos, filtrarlos y hacer tablas dinámicas.',
    'Las filas TOTAL usan fórmulas; si edita un monto, el total se recalcula solo.',
    'La columna "Saldo" de la hoja Movimientos es acumulativa sobre TODOS los movimientos',
    'registrados. Si se cargaron gastos históricos sin sus ingresos de la misma época,',
    'ese saldo puede salir negativo: refleja lo cargado en el sistema, no el efectivo real.',
    'Para el efectivo disponible use el bloque "SALDOS POR CUENTA" de arriba.',
  ]
  for (const n of notes) {
    const r = ws.addRow([n])
    r.font = { name: FONT, size: 9, color: { argb: 'FF6B7280' } }
    ws.mergeCells(r.number, 1, r.number, 4)
  }
}

// ---------- 2. Fraternos ----------

function buildFraternos(wb: Workbook, members: FraternityUser[], defaultDue: number) {
  const ws = wb.addWorksheet('Fraternos')
  const cols: Col[] = [
    { header: 'N.º', width: 6, align: 'center' },
    { header: 'Fraterno', width: 30 },
    { header: 'Estado', width: 12 },
    { header: 'Rol', width: 14 },
    { header: 'Email', width: 30 },
    { header: 'Fecha de ingreso', width: 16, align: 'center' },
    { header: 'Cumpleaños', width: 14, align: 'center' },
    { header: 'Cuota mensual (Bs)', width: 18, money: true },
    { header: '¿Tiene cuenta?', width: 15, align: 'center' },
    { header: 'Notas', width: 45 },
  ]
  setupSheet(ws, cols, { freezeCols: 2 })
  members.forEach((m, i) => {
    const r = ws.addRow([
      i + 1,
      m.full_name,
      STATUS_LABEL[m.status] ?? m.status,
      m.role === 'admin' ? 'Administrador' : 'Fraterno',
      m.email ?? '',
      m.entry_date ?? '',
      m.birth_date ?? '',
      m.monthly_due_override != null ? Number(m.monthly_due_override) : Number(defaultDue),
      m.user_id ? 'Sí' : 'No',
      m.notes ?? '',
    ])
    styleDataRow(r, cols)
    if (m.status === 'retirado') {
      r.eachCell((c) => {
        c.font = { name: FONT, size: 10, color: { argb: 'FF9CA3AF' } }
      })
    }
  })
}

// ---------- 3. Estado de cuenta ----------

function buildEstadoCuenta(
  wb: Workbook,
  members: FraternityUser[],
  debt: Map<string, { duesCount: number; duesAmount: number; instCount: number; instAmount: number }>,
  threshold: number,
) {
  const ws = wb.addWorksheet('Estado de cuenta')
  const cols: Col[] = [
    { header: 'N.º', width: 6, align: 'center' },
    { header: 'Fraterno', width: 30 },
    { header: 'Estado', width: 12 },
    { header: 'Meses que debe', width: 15, align: 'center' },
    { header: 'Mensualidades (Bs)', width: 18, money: true },
    { header: 'Otras cuotas', width: 13, align: 'center' },
    { header: 'Otras cuotas (Bs)', width: 18, money: true },
    { header: 'TOTAL ADEUDADO (Bs)', width: 21, money: true },
    { header: '¿Bloqueado?', width: 13, align: 'center' },
  ]
  setupSheet(ws, cols, { freezeCols: 2 })

  const rows = members
    .map((m) => ({ m, d: debt.get(m.id)! }))
    .filter((x) => !!x.d)
    .sort((a, b) => b.d.duesAmount + b.d.instAmount - (a.d.duesAmount + a.d.instAmount) || memberSort(a.m, b.m))

  const r2 = (n: number) => Math.round(n * 100) / 100
  const first = ws.rowCount + 1
  rows.forEach((x, i) => {
    const total = x.d.duesAmount + x.d.instAmount
    const blocked = x.d.duesCount >= threshold || x.d.instCount >= threshold
    const r = ws.addRow([
      i + 1,
      x.m.full_name,
      STATUS_LABEL[x.m.status] ?? x.m.status,
      x.d.duesCount,
      r2(x.d.duesAmount),
      x.d.instCount,
      r2(x.d.instAmount),
      r2(total),
      blocked ? 'SÍ' : 'No',
    ])
    styleDataRow(r, cols)
    if (total > 0) {
      r.getCell(8).font = { name: FONT, size: 10, bold: true, color: { argb: RED } }
    }
    if (blocked) {
      const c = r.getCell(9)
      c.font = { name: FONT, size: 10, bold: true, color: { argb: RED } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_BG } }
    }
  })
  addTotalsRow(ws, cols, first, ws.rowCount)
}

// ---------- 4. Matriz mensualidades ----------

function buildMatrizMensualidades(
  wb: Workbook,
  members: FraternityUser[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dues: any[],
) {
  const ws = wb.addWorksheet('Matriz mensualidades')
  if (dues.length === 0) {
    ws.addRow(['Sin mensualidades registradas.'])
    return
  }

  // Rango dinámico: del periodo más antiguo registrado hasta el mes actual.
  const periods = dues.map((d) => String(d.period).slice(0, 10)).sort()
  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastPeriod = periods[periods.length - 1] > currentPeriod ? periods[periods.length - 1] : currentPeriod
  const range = periodRange(periods[0], lastPeriod)

  const cols: Col[] = [
    { header: 'N.º', width: 6, align: 'center' },
    { header: 'Fraterno', width: 30 },
    ...range.map((p) => ({ header: periodLabel(p), width: 10, align: 'center' as Align })),
    { header: 'Debe (Bs)', width: 13, money: true },
  ]
  setupSheet(ws, cols, { freezeCols: 2, autoFilter: false })

  // Índice (miembro, periodo) -> estado
  const key = (m: string, p: string) => `${m}|${p}`
  const map = new Map<string, { status: string; amount: number }>()
  for (const d of dues) {
    map.set(key(d.member_id, String(d.period).slice(0, 10)), { status: d.status, amount: Number(d.amount) })
  }

  const first = ws.rowCount + 1
  members.forEach((m, i) => {
    let owed = 0
    const cells: (string | number)[] = [i + 1, m.full_name]
    for (const p of range) {
      const entry = map.get(key(m.id, p))
      if (!entry) {
        cells.push('')
      } else if (entry.status === 'pagado') {
        cells.push('PAGADO')
      } else {
        cells.push('DEBE')
        owed += entry.amount
      }
    }
    cells.push(owed)
    const r = ws.addRow(cells)
    styleDataRow(r, cols)
    // Colorear cada celda de periodo
    range.forEach((_, idx) => {
      const cell = r.getCell(3 + idx)
      const v = cell.value
      if (v === 'PAGADO') {
        cell.font = { name: FONT, size: 9, bold: true, color: { argb: GREEN } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_BG } }
      } else if (v === 'DEBE') {
        cell.font = { name: FONT, size: 9, bold: true, color: { argb: RED } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_BG } }
      }
    })
    if (owed > 0) r.getCell(cols.length).font = { name: FONT, size: 10, bold: true, color: { argb: RED } }
  })
  addTotalsRow(ws, cols, first, ws.rowCount)
}

// ---------- 5. Mensualidades (detalle) ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMensualidadesDetalle(wb: Workbook, dues: any[], members: FraternityUser[]) {
  const ws = wb.addWorksheet('Mensualidades (detalle)')
  const cols: Col[] = [
    { header: 'Fraterno', width: 30 },
    { header: 'Periodo', width: 20 },
    { header: 'Año', width: 8, align: 'center' },
    { header: 'Mes', width: 8, align: 'center' },
    { header: 'Monto (Bs)', width: 14, money: true },
    { header: 'Estado', width: 12, align: 'center' },
    { header: 'Fecha de pago', width: 18, align: 'center' },
  ]
  setupSheet(ws, cols, { freezeCols: 1 })

  const nameById = new Map(members.map((m) => [m.id, m.full_name]))
  const sorted = [...dues].sort(
    (a, b) =>
      String(b.period).localeCompare(String(a.period)) ||
      (nameById.get(a.member_id) ?? '').localeCompare(nameById.get(b.member_id) ?? '', 'es'),
  )
  const first = ws.rowCount + 1
  for (const d of sorted) {
    const p = String(d.period).slice(0, 10)
    const [y, m] = p.split('-').map(Number)
    const r = ws.addRow([
      nameById.get(d.member_id) ?? '—',
      periodLongLabel(p),
      y,
      m,
      Number(d.amount),
      d.status === 'pagado' ? 'Pagado' : 'Pendiente',
      d.paid_at ? String(d.paid_at).slice(0, 10) : '',
    ])
    styleDataRow(r, cols)
    const c = r.getCell(6)
    c.font = { name: FONT, size: 10, bold: true, color: { argb: d.status === 'pagado' ? GREEN : RED } }
  }
  addTotalsRow(ws, cols, first, ws.rowCount)
}

// ---------- 6. Planes y multas ----------

function buildPlanesYMultas(wb: Workbook, installments: PlanInstallmentRow[]) {
  const ws = wb.addWorksheet('Planes y multas')
  const cols: Col[] = [
    { header: 'Fraterno', width: 30 },
    { header: 'Concepto', width: 46 },
    { header: 'Total del plan (Bs)', width: 18, money: true },
    { header: 'Cuota', width: 10, align: 'center' },
    { header: 'De', width: 8, align: 'center' },
    { header: 'Vence', width: 14, align: 'center' },
    { header: 'Monto (Bs)', width: 14, money: true },
    { header: 'Estado', width: 12, align: 'center' },
    { header: 'Fecha de pago', width: 18, align: 'center' },
    { header: '¿De evento?', width: 12, align: 'center' },
  ]
  setupSheet(ws, cols, { freezeCols: 1 })

  const sorted = [...installments].sort(
    (a, b) => a.member_name.localeCompare(b.member_name, 'es') || a.due_date.localeCompare(b.due_date),
  )
  const first = ws.rowCount + 1
  for (const it of sorted) {
    const r = ws.addRow([
      it.member_name,
      it.reason,
      it.total_amount,
      it.installment_number,
      it.installments_count,
      it.due_date,
      it.amount,
      it.status === 'pagado' ? 'Pagado' : 'Pendiente',
      it.paid_at ? String(it.paid_at).slice(0, 10) : '',
      it.event_id ? 'Sí' : 'No',
    ])
    styleDataRow(r, cols)
    r.getCell(8).font = { name: FONT, size: 10, bold: true, color: { argb: it.status === 'pagado' ? GREEN : RED } }
  }
  addTotalsRow(ws, cols, first, ws.rowCount)
}

// ---------- 7. Movimientos ----------

function buildMovimientos(
  wb: Workbook,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactions: any[],
  gestionName: string | null,
  gestionStart: string | null,
) {
  const ws = wb.addWorksheet('Movimientos')
  const cols: Col[] = [
    { header: 'N.º', width: 6, align: 'center' },
    { header: 'Fecha', width: 12, align: 'center' },
    { header: 'Tipo', width: 10, align: 'center' },
    { header: 'Categoría', width: 24 },
    { header: 'Cuenta', width: 22 },
    { header: 'Fraterno', width: 26 },
    { header: 'Descripción', width: 60 },
    { header: 'Ingreso (Bs)', width: 15, money: true },
    { header: 'Egreso (Bs)', width: 15, money: true },
    { header: 'Saldo (Bs)', width: 15, money: true },
    { header: 'Gestión', width: 22 },
  ]
  setupSheet(ws, cols, { freezeCols: 2 })

  const sorted = [...transactions].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const first = ws.rowCount + 1
  let running = 0
  sorted.forEach((t, i) => {
    const rowNum = first + i
    const inGestion = gestionStart && String(t.date) >= gestionStart
    const amount = Number(t.amount)
    running += t.type === 'ingreso' ? amount : -amount
    const r = ws.addRow([
      i + 1,
      String(t.date).slice(0, 10),
      t.type === 'ingreso' ? 'Ingreso' : 'Egreso',
      t.category ?? '',
      t.account ?? '',
      t.fraternity_users?.full_name ?? '',
      t.description ?? '',
      t.type === 'ingreso' ? amount : null,
      t.type === 'egreso' ? amount : null,
      // Saldo acumulado: fórmula real (se recalcula si editan montos) + valor ya
      // calculado para que se vea correcto al abrir el archivo.
      {
        formula: i === 0 ? `H${rowNum}-I${rowNum}` : `J${rowNum - 1}+H${rowNum}-I${rowNum}`,
        result: Math.round(running * 100) / 100,
      },
      inGestion ? gestionName || 'Gestión actual' : 'Anterior',
    ])
    styleDataRow(r, cols)
    r.getCell(3).font = {
      name: FONT,
      size: 10,
      bold: true,
      color: { argb: t.type === 'ingreso' ? GREEN : RED },
    }
  })
  addTotalsRow(ws, cols, first, ws.rowCount)
}

// ---------- 8. Resumen financiero ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildResumenFinanciero(wb: Workbook, transactions: any[]) {
  const ws = wb.addWorksheet('Resumen financiero')
  const rnd = (n: number) => Math.round(n * 100) / 100
  ws.columns = [{ width: 34 }, { width: 18 }, { width: 18 }, { width: 18 }]

  const title = ws.addRow(['RESUMEN FINANCIERO'])
  title.font = { name: FONT, bold: true, size: 14, color: { argb: NAVY } }
  ws.mergeCells(title.number, 1, title.number, 4)

  const trio: Col[] = [
    { header: '', width: 34 },
    { header: 'Ingresos (Bs)', width: 18, money: true },
    { header: 'Egresos (Bs)', width: 18, money: true },
    { header: 'Balance (Bs)', width: 18, money: true },
  ]

  // --- Por cuenta ---
  addSectionTitle(ws, 'POR CUENTA', 4)
  addSubHeader(ws, [{ ...trio[0], header: 'Cuenta' }, trio[1], trio[2], trio[3]])
  const byAccount = groupSum(transactions, (t) => t.account || 'Sin cuenta')
  let start = ws.rowCount + 1
  for (const [name, v] of byAccount) {
    styleDataRow(ws.addRow([name, rnd(v.ing), rnd(v.egr), rnd(v.ing - v.egr)]), trio)
  }
  addTotalsRow(ws, trio, start, ws.rowCount)

  // --- Por categoría ---
  addSectionTitle(ws, 'POR CATEGORÍA', 4)
  addSubHeader(ws, [{ ...trio[0], header: 'Categoría' }, trio[1], trio[2], trio[3]])
  const byCategory = groupSum(transactions, (t) => t.category || 'Sin categoría')
  start = ws.rowCount + 1
  for (const [name, v] of byCategory) {
    styleDataRow(ws.addRow([name, rnd(v.ing), rnd(v.egr), rnd(v.ing - v.egr)]), trio)
  }
  addTotalsRow(ws, trio, start, ws.rowCount)

  // --- Por mes ---
  addSectionTitle(ws, 'POR MES', 4)
  addSubHeader(ws, [{ ...trio[0], header: 'Mes' }, trio[1], trio[2], trio[3]])
  const byMonth = groupSum(transactions, (t) => String(t.date).slice(0, 7))
  start = ws.rowCount + 1
  for (const [ym, v] of [...byMonth].sort((a, b) => a[0].localeCompare(b[0]))) {
    styleDataRow(ws.addRow([periodLabel(`${ym}-01`), v.ing, v.egr, v.ing - v.egr]), trio)
  }
  addTotalsRow(ws, trio, start, ws.rowCount)
}

function groupSum(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactions: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyOf: (t: any) => string,
): [string, { ing: number; egr: number }][] {
  const map = new Map<string, { ing: number; egr: number }>()
  for (const t of transactions) {
    const k = keyOf(t)
    const e = map.get(k) ?? { ing: 0, egr: 0 }
    if (t.type === 'ingreso') e.ing += Number(t.amount)
    else e.egr += Number(t.amount)
    map.set(k, e)
  }
  return [...map.entries()].sort((a, b) => b[1].ing + b[1].egr - (a[1].ing + a[1].egr))
}

// ---------- 9. Eventos ----------

function buildEventos(
  wb: Workbook,
  details: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roster: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contributions: any[]
  }[],
) {
  const ws = wb.addWorksheet('Eventos')
  ws.columns = [{ width: 34 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 30 }]

  const title = ws.addRow(['EVENTOS EXTRAORDINARIOS'])
  title.font = { name: FONT, bold: true, size: 14, color: { argb: NAVY } }
  ws.mergeCells(title.number, 1, title.number, 6)

  if (details.length === 0) {
    ws.addRow([])
    ws.addRow(['Sin eventos registrados.'])
    return
  }

  const summaryCols: Col[] = [
    { header: 'Evento', width: 34 },
    { header: 'Tipo', width: 16, align: 'center' },
    { header: 'Fecha', width: 16, align: 'center' },
    { header: 'Esperado (Bs)', width: 16, money: true },
    { header: 'Recaudado (Bs)', width: 16, money: true },
    { header: 'Pagaron', width: 30 },
  ]
  addSectionTitle(ws, 'RESUMEN', 6)
  addSubHeader(ws, summaryCols)
  const start = ws.rowCount + 1
  for (const d of details) {
    const expected =
      d.event.charge_mode === 'fijo' ? d.roster.reduce((s: number, r) => s + Number(r.amount), 0) : 0
    const collected =
      d.event.charge_mode === 'fijo'
        ? d.roster.filter((r) => r.status === 'pagado').reduce((s: number, r) => s + Number(r.amount), 0)
        : d.contributions.reduce((s: number, c) => s + Number(c.amount), 0)
    const paidCount = d.event.charge_mode === 'fijo' ? d.roster.filter((r) => r.status === 'pagado').length : d.contributions.length
    const r = ws.addRow([
      d.event.name,
      d.event.charge_mode === 'fijo' ? 'Cuota fija' : 'Aporte libre',
      d.event.event_date ?? '',
      d.event.charge_mode === 'fijo' ? expected : null,
      collected,
      d.event.charge_mode === 'fijo' ? `${paidCount} de ${d.roster.length}` : `${paidCount} aporte(s)`,
    ])
    styleDataRow(r, summaryCols)
  }
  addTotalsRow(ws, summaryCols, start, ws.rowCount)

  // Detalle por evento
  for (const d of details) {
    addSectionTitle(ws, `DETALLE — ${d.event.name}`, 6)
    if (d.event.charge_mode === 'fijo') {
      const cols: Col[] = [
        { header: 'Fraterno', width: 34 },
        { header: 'Monto (Bs)', width: 16, money: true },
        { header: 'Estado', width: 16, align: 'center' },
      ]
      addSubHeader(ws, cols)
      const s = ws.rowCount + 1
      for (const row of [...d.roster].sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'))) {
        const r = ws.addRow([row.full_name, Number(row.amount), row.status === 'pagado' ? 'PAGÓ' : 'PENDIENTE'])
        styleDataRow(r, cols)
        const c = r.getCell(3)
        const paid = row.status === 'pagado'
        c.font = { name: FONT, size: 10, bold: true, color: { argb: paid ? GREEN : RED } }
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paid ? GREEN_BG : RED_BG } }
      }
      addTotalsRow(ws, cols, s, ws.rowCount)
    } else {
      const cols: Col[] = [
        { header: 'Fraterno', width: 34 },
        { header: 'Monto (Bs)', width: 16, money: true },
        { header: 'Fecha', width: 16, align: 'center' },
        { header: 'Descripción', width: 40 },
      ]
      addSubHeader(ws, cols)
      const s = ws.rowCount + 1
      for (const c of d.contributions) {
        styleDataRow(ws.addRow([c.member_name ?? '—', Number(c.amount), c.date, c.description ?? '']), cols)
      }
      addTotalsRow(ws, cols, s, ws.rowCount)
    }
  }
}

// ---------- 10. Reservas ----------

function buildReservas(
  wb: Workbook,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reservations: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockedDates: any[],
) {
  const ws = wb.addWorksheet('Reservas')
  const cols: Col[] = [
    { header: 'Fecha', width: 14, align: 'center' },
    { header: 'Desde', width: 10, align: 'center' },
    { header: 'Hasta', width: 10, align: 'center' },
    { header: 'Fraterno', width: 30 },
    { header: 'Tarifa de uso (Bs)', width: 18, money: true },
    { header: 'Estado', width: 14, align: 'center' },
    { header: 'Notas', width: 45 },
  ]
  setupSheet(ws, cols)
  const first = ws.rowCount + 1
  for (const r of reservations) {
    const row = ws.addRow([
      String(r.date).slice(0, 10),
      String(r.start_time ?? '').slice(0, 5),
      String(r.end_time ?? '').slice(0, 5),
      r.fraternity_users?.full_name ?? '—',
      r.usage_fee != null ? Number(r.usage_fee) : null,
      r.status === 'confirmada' ? 'Confirmada' : 'Cancelada',
      r.notes ?? '',
    ])
    styleDataRow(row, cols)
  }
  addTotalsRow(ws, cols, first, ws.rowCount)

  addSectionTitle(ws, 'FECHAS BLOQUEADAS', 7)
  const bCols: Col[] = [
    { header: 'Fecha', width: 14, align: 'center' },
    { header: 'Motivo', width: 45 },
  ]
  addSubHeader(ws, bCols)
  for (const b of blockedDates) {
    styleDataRow(ws.addRow([String(b.date).slice(0, 10), b.reason ?? '']), bCols)
  }
}

// ---------- 11. Turnos ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTurnos(wb: Workbook, turns: any[]) {
  const ws = wb.addWorksheet('Turnos')
  const cols: Col[] = [
    { header: 'Fecha', width: 14, align: 'center' },
    { header: 'Turnero', width: 30 },
    { header: 'Estado', width: 14, align: 'center' },
    { header: 'Reemplazado por', width: 30 },
    { header: 'Observaciones', width: 45 },
  ]
  setupSheet(ws, cols)
  for (const t of turns) {
    const r = ws.addRow([
      String(t.date).slice(0, 10),
      t.member?.full_name ?? '—',
      t.status === 'ok' ? 'OK' : t.status === 'suspendido' ? 'Suspendido' : 'Pendiente',
      t.replacement?.full_name ?? '',
      t.notes ?? '',
    ])
    styleDataRow(r, cols)
    if (t.status === 'ok') r.getCell(3).font = { name: FONT, size: 10, bold: true, color: { argb: GREEN } }
    if (t.status === 'suspendido') r.getCell(3).font = { name: FONT, size: 10, bold: true, color: { argb: RED } }
  }
}

// ---------- 12. Cumpleaños ----------

function buildCumpleanos(wb: Workbook, members: FraternityUser[]) {
  const ws = wb.addWorksheet('Cumpleaños')
  const cols: Col[] = [
    { header: 'Mes', width: 14 },
    { header: 'Día', width: 8, align: 'center' },
    { header: 'Fraterno', width: 32 },
    { header: 'Fecha completa', width: 16, align: 'center' },
    { header: 'Estado', width: 12 },
  ]
  setupSheet(ws, cols)
  const withBirthday = members
    .filter((m) => !!m.birth_date)
    .map((m) => {
      const [, mm, dd] = m.birth_date!.split('-').map(Number)
      return { m, mm, dd }
    })
    .sort((a, b) => a.mm - b.mm || a.dd - b.dd)
  for (const x of withBirthday) {
    styleDataRow(
      ws.addRow([monthName(x.mm - 1), x.dd, x.m.full_name, x.m.birth_date, STATUS_LABEL[x.m.status] ?? x.m.status]),
      cols,
    )
  }
  if (withBirthday.length === 0) ws.addRow(['Sin fechas de nacimiento registradas.'])
}

// ---------- 13. Recibos ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRecibos(wb: Workbook, receipts: any[]) {
  const ws = wb.addWorksheet('Recibos')
  const cols: Col[] = [
    { header: 'N.º recibo', width: 12, align: 'center' },
    { header: 'Fecha de pago', width: 15, align: 'center' },
    { header: 'Fraterno', width: 30 },
    { header: 'Concepto', width: 50 },
    { header: 'Monto (Bs)', width: 15, money: true },
  ]
  setupSheet(ws, cols)
  const first = ws.rowCount + 1
  const sorted = [...receipts].sort((a, b) => a.receipt_number - b.receipt_number)
  for (const r of sorted) {
    styleDataRow(
      ws.addRow([
        String(r.receipt_number).padStart(4, '0'),
        String(r.payment_date).slice(0, 10),
        r.fraternity_users?.full_name ?? '—',
        r.concept,
        Number(r.amount),
      ]),
      cols,
    )
  }
  addTotalsRow(ws, cols, first, ws.rowCount)
}

// ---------- 14. Bar inventario ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildBarInventario(wb: Workbook, items: any[]) {
  const ws = wb.addWorksheet('Bar inventario')
  const cols: Col[] = [
    { header: 'Ítem', width: 30 },
    { header: 'Categoría', width: 14 },
    { header: 'Unidad', width: 12 },
    { header: 'Costo (Bs)', width: 14, money: true },
    { header: 'Precio venta (Bs)', width: 16, money: true },
    { header: 'Margen (Bs)', width: 14, money: true },
    { header: 'Stock', width: 10, align: 'right' },
    { header: 'Valor stock (Bs)', width: 16, money: true },
    { header: 'Activo', width: 10, align: 'center' },
  ]
  setupSheet(ws, cols, { freezeCols: 1 })
  const first = ws.rowCount + 1
  for (const it of items) {
    const cost = Number(it.cost_price)
    const sale = Number(it.sale_price)
    const stock = Number(it.stock)
    const r = ws.addRow([
      it.name,
      it.category,
      it.unit,
      cost,
      sale,
      Math.round((sale - cost) * 100) / 100,
      stock,
      Math.round(stock * cost * 100) / 100,
      it.is_active ? 'Sí' : 'No',
    ])
    styleDataRow(r, cols)
    if (stock <= Number(it.low_stock_alert)) {
      r.getCell(7).font = { name: FONT, size: 10, bold: true, color: { argb: RED } }
    }
  }
  addTotalsRow(ws, cols, first, ws.rowCount)
}

// ---------- 15. Bar movimientos ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildBarMovimientos(wb: Workbook, movements: any[]) {
  const ws = wb.addWorksheet('Bar movimientos')
  const cols: Col[] = [
    { header: 'Fecha', width: 12, align: 'center' },
    { header: 'Tipo', width: 10, align: 'center' },
    { header: 'Ítem', width: 28 },
    { header: 'Cantidad', width: 10, align: 'right' },
    { header: 'P. unitario (Bs)', width: 15, money: true },
    { header: 'Total (Bs)', width: 14, money: true },
    { header: 'Ganancia (Bs)', width: 14, money: true },
    { header: 'Forma de pago', width: 14, align: 'center' },
    { header: 'Fraterno', width: 26 },
    { header: 'Cobrado', width: 10, align: 'center' },
    { header: 'Efecto en caja (Bs)', width: 17, money: true },
    { header: 'Notas', width: 36 },
  ]
  setupSheet(ws, cols, { freezeCols: 2 })

  const sorted = [...movements].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const first = ws.rowCount + 1
  for (const m of sorted) {
    const qty = Number(m.quantity)
    const unit = Number(m.unit_price)
    const cost = Number(m.bar_items?.cost_price ?? 0)
    const profit = m.kind === 'venta' ? Math.round((unit - cost) * qty * 100) / 100 : null
    const r = ws.addRow([
      String(m.date).slice(0, 10),
      m.kind === 'venta' ? 'Venta' : m.kind === 'compra' ? 'Compra' : 'Ajuste',
      m.bar_items?.name ?? '—',
      qty,
      unit,
      Number(m.total),
      profit,
      m.payment_mode === 'contado' ? 'Contado' : m.payment_mode === 'cuenta' ? 'A cuenta' : '',
      m.member?.full_name ?? '',
      m.payment_mode === 'cuenta' ? (m.settled ? 'Sí' : 'No') : '',
      Number(m.cash_delta),
      m.notes ?? '',
    ])
    styleDataRow(r, cols)
    r.getCell(2).font = {
      name: FONT,
      size: 10,
      bold: true,
      color: { argb: m.kind === 'venta' ? GREEN : m.kind === 'compra' ? RED : NAVY },
    }
    if (m.payment_mode === 'cuenta' && !m.settled) {
      r.getCell(10).font = { name: FONT, size: 10, bold: true, color: { argb: RED } }
    }
  }
  addTotalsRow(ws, cols, first, ws.rowCount)
}

// ---------- 16. Bar arqueos ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildBarArqueos(wb: Workbook, counts: any[], balance: number) {
  const ws = wb.addWorksheet('Bar arqueos')
  ws.columns = [{ width: 14 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 46 }]

  const title = ws.addRow(['CONTROL DE LA CAJA DEL BAR'])
  title.font = { name: FONT, bold: true, size: 14, color: { argb: NAVY } }
  ws.mergeCells(title.number, 1, title.number, 5)

  ws.addRow([])
  const bal = ws.addRow(['Saldo actual de la caja del bar', balance])
  bal.font = { name: FONT, bold: true, size: 11 }
  bal.getCell(2).numFmt = MONEY

  addSectionTitle(ws, 'ARQUEOS REGISTRADOS', 5)
  const cols: Col[] = [
    { header: 'Fecha', width: 14, align: 'center' },
    { header: 'Esperado (Bs)', width: 18, money: true },
    { header: 'Contado (Bs)', width: 18, money: true },
    { header: 'Diferencia (Bs)', width: 18, money: true },
    { header: 'Observaciones', width: 46 },
  ]
  addSubHeader(ws, cols)
  if (counts.length === 0) {
    const r = ws.addRow(['Sin arqueos registrados.'])
    r.font = { name: FONT, size: 10, color: { argb: 'FF6B7280' } }
  }
  for (const c of [...counts].sort((a, b) => String(a.date).localeCompare(String(b.date)))) {
    const diff = Number(c.difference)
    const r = ws.addRow([
      String(c.date).slice(0, 10),
      Number(c.expected_cash),
      Number(c.actual_cash),
      diff,
      c.notes ?? '',
    ])
    styleDataRow(r, cols)
    const cell = r.getCell(4)
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: diff === 0 ? GREEN : RED } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: diff === 0 ? GREEN_BG : RED_BG } }
  }

  addSectionTitle(ws, 'NOTA', 5)
  for (const n of [
    'La caja del bar es independiente de las arcas de la fraternidad.',
    'Solo se traspasa a las arcas mediante el "Traspaso anual", que queda registrado en ambos lados.',
    'Una diferencia distinta de cero en un arqueo debe estar explicada en las observaciones.',
  ]) {
    const r = ws.addRow([n])
    r.font = { name: FONT, size: 9, color: { argb: 'FF6B7280' } }
    ws.mergeCells(r.number, 1, r.number, 5)
  }
}
