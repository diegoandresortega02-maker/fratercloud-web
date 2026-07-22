import { useEffect, useState } from 'react'
import { getFraternityMembers } from '../../lib/api'
import type { FraternityUser } from '../../lib/types'
import { allBirthdaysByMonth, upcomingBirthdays } from '../../lib/birthdays'
import { monthName } from '../../lib/dates'

export default function CumpleanosPage() {
  const [members, setMembers] = useState<FraternityUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFraternityMembers()
      .then(setMembers)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="p-8 text-sm text-slate-400">Cargando…</p>

  const upcoming = upcomingBirthdays(members, 30)
  const byMonth = allBirthdaysByMonth(members)

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink mb-6">Cumpleaños</h1>

      <div className="bg-white rounded-card border border-surface-border p-5 mb-6">
        <h2 className="text-sm font-semibold text-ink mb-3">Próximos 30 días</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400">No hay cumpleaños próximos.</p>
        ) : (
          <ul className="space-y-1">
            {upcoming.map((b) => (
              <li key={b.member.id} className="text-sm text-slate-600 flex justify-between">
                <span>{b.member.full_name}</span>
                <span className="font-medium text-brand-primary-dark">{b.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-card border border-surface-border p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">Todos los fraternos</h2>
        {byMonth.length === 0 ? (
          <p className="text-sm text-slate-400">Nadie tiene fecha de nacimiento registrada aún.</p>
        ) : (
          <div className="space-y-4">
            {byMonth.map((group) => (
              <div key={group.month}>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">{monthName(group.month)}</p>
                <ul className="space-y-1">
                  {group.members.map((m) => (
                    <li key={m.id} className="text-sm text-slate-600 flex justify-between">
                      <span>{m.full_name}</span>
                      <span className="text-slate-400">
                        {Number(m.birth_date!.split('-')[2])} {monthName(group.month).slice(0, 3)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
