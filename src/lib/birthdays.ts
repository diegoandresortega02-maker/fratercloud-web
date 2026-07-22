import type { FraternityUser } from './types'
import { monthName } from './dates'

export interface UpcomingBirthday {
  member: FraternityUser
  nextDate: Date
  label: string
}

export function upcomingBirthdays(members: FraternityUser[], daysAhead: number): UpcomingBirthday[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result: UpcomingBirthday[] = []
  for (const m of members) {
    if (!m.birth_date) continue
    const [, month, day] = m.birth_date.split('-').map(Number)
    let next = new Date(today.getFullYear(), month - 1, day)
    if (next.getTime() < today.getTime()) {
      next = new Date(today.getFullYear() + 1, month - 1, day)
    }
    const diffDays = Math.round((next.getTime() - today.getTime()) / 86400000)
    if (diffDays <= daysAhead) {
      const label = diffDays === 0 ? 'Hoy' : `${next.getDate()} ${monthName(next.getMonth()).slice(0, 3)}`
      result.push({ member: m, nextDate: next, label })
    }
  }
  result.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
  return result
}

export function allBirthdaysByMonth(members: FraternityUser[]): { month: number; members: FraternityUser[] }[] {
  const groups: Record<number, FraternityUser[]> = {}
  for (const m of members) {
    if (!m.birth_date) continue
    const month = Number(m.birth_date.split('-')[1]) - 1
    groups[month] = groups[month] || []
    groups[month].push(m)
  }
  return Object.entries(groups)
    .map(([month, list]) => ({
      month: Number(month),
      members: list.sort((a, b) => Number(a.birth_date!.split('-')[2]) - Number(b.birth_date!.split('-')[2])),
    }))
    .sort((a, b) => a.month - b.month)
}
