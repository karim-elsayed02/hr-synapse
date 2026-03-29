"use client"

import { Users, CircleDot, PlayCircle, CheckCircle2 } from "lucide-react"

export type DashboardStats = {
  totalStaff: number
  tasksOpen: number
  tasksInProgress: number
  tasksCompleted: number
}

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total staff",
      value: stats.totalStaff,
      icon: Users,
      accent: "from-[#001A3D]/8 to-transparent",
      iconBg: "bg-[#001A3D]/10 text-[#001A3D]",
    },
    {
      title: "Open tasks",
      value: stats.tasksOpen,
      icon: CircleDot,
      accent: "from-[#FFB84D]/15 to-transparent",
      iconBg: "bg-[#FFB84D]/20 text-[#291800]",
    },
    {
      title: "In progress",
      value: stats.tasksInProgress,
      icon: PlayCircle,
      accent: "from-sky-400/10 to-transparent",
      iconBg: "bg-sky-100 text-sky-700",
    },
    {
      title: "Completed",
      value: stats.tasksCompleted,
      icon: CheckCircle2,
      accent: "from-emerald-400/10 to-transparent",
      iconBg: "bg-emerald-100 text-emerald-700",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="curator-card relative overflow-hidden p-6 transition-transform duration-200 hover:-translate-y-0.5"
        >
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`} />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#001A3D]/50">{card.title}</p>
              <p className="font-display mt-2 text-3xl font-semibold tracking-tight text-[#001A3D]">{card.value}</p>
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconBg}`}>
              <card.icon className="h-5 w-5" strokeWidth={2} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
