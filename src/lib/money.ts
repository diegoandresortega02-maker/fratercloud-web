/**
 * Formats an amount in Bolivian style: "." for thousands, "," for decimals.
 * e.g. 1000.97 -> "1.000,97", 7828.97 -> "7.828,97", -3560 -> "-3.560,00".
 * Deterministic (no dependence on the runtime's locale/ICU data).
 */
export function formatMoney(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0)
  if (!isFinite(n)) return '0,00'
  const neg = n < 0
  const [intPart, decPart] = Math.abs(n).toFixed(2).split('.')
  return `${neg ? '-' : ''}${withThousands(intPart)},${decPart}`
}

/**
 * Same thousands grouping but with no decimals — for compact labels
 * where cents add noise (e.g. "cuota propia Bs 1.500").
 */
export function formatMoneyShort(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0)
  if (!isFinite(n)) return '0'
  const neg = n < 0
  return `${neg ? '-' : ''}${withThousands(Math.abs(n).toFixed(0))}`
}

function withThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
