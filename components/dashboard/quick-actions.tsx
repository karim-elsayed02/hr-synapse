"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { Plus, FileText, Users, Megaphone } from "lucide-react"
import Link from "next/link"

export function QuickActions() {
  const { isAdmin, isManager } = useAuth()

  const actions = [
    {
      title: "New Request",
      description: "Leave, expense, or shift swap",
      icon: Plus,
      href: "/requests/new",
      roles: ["admin", "manager", "staff"],
    },
    {
      title: "Upload Document",
      description: "Certificates & compliance",
      icon: FileText,
      href: "/documents/upload",
      roles: ["admin", "manager", "staff"],
    },
    {
      title: "Add Staff Member",
      description: "Register a new team member",
      icon: Users,
      href: "/staff/new",
      roles: ["admin", "manager"],
    },
    {
      title: "Create Announcement",
      description: "Share updates with the team",
      icon: Megaphone,
      href: "/announcements/new",
      roles: ["admin", "manager"],
    },
  ]

  const filteredActions = actions.filter((action) => {
    if (isAdmin) return action.roles.includes("admin")
    if (isManager) return action.roles.includes("manager")
    return action.roles.includes("staff")
  })

  return (
    <div className="curator-card p-6">
      <h3 className="font-display text-lg font-semibold tracking-tight text-[#001A3D]">Quick actions</h3>
      <p className="mt-1 text-sm text-[#001A3D]/55">Common tasks</p>

      <div className="mt-6 space-y-2">
        {filteredActions.map((action, index) => (
          <Link key={index} href={action.href}>
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[#f8f9fa]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFB84D]/90 text-[#291800] shadow-sm">
                <action.icon className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[#001A3D]">{action.title}</span>
                <span className="mt-0.5 block text-xs text-[#001A3D]/50">{action.description}</span>
              </span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}
