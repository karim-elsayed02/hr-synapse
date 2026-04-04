"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { isExecutiveTeam, isBranchLead, isMentor } from "@/lib/utils/permissions"
import {
  LayoutDashboard,
  Users,
  UserCircle,
  ClipboardList,
  ListTodo,
  Wallet,
  FileText,
  Megaphone,
  UserCog,
  Settings,
  Plus,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react"

type NavItem = {
  name: string
  href: string
  icon: LucideIcon
  allowedFor: ("executive" | "branchLead" | "mentor" | "staff")[]
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, allowedFor: ["executive", "branchLead", "mentor", "staff"] },
  { name: "Staff Directory", href: "/staff", icon: Users, allowedFor: ["executive", "branchLead", "mentor", "staff"] },
  { name: "My Profile", href: "/profile", icon: UserCircle, allowedFor: ["executive", "branchLead", "mentor", "staff"] },
  { name: "Requests", href: "/requests", icon: ClipboardList, allowedFor: ["executive", "branchLead", "mentor", "staff"] },
  { name: "Task Board", href: "/tasks", icon: ListTodo, allowedFor: ["executive", "branchLead", "mentor", "staff"] },
  { name: "Payroll", href: "/payroll", icon: Wallet, allowedFor: ["executive", "branchLead"] },
  { name: "Documents", href: "/documents", icon: FileText, allowedFor: ["executive", "branchLead", "mentor", "staff"] },
  { name: "Announcements", href: "/announcements", icon: Megaphone, allowedFor: ["executive", "branchLead", "mentor", "staff"] },
  { name: "User Management", href: "/admin/users", icon: UserCog, allowedFor: ["executive"] },
  { name: "Settings", href: "/settings", icon: Settings, allowedFor: ["executive"] },
]

export function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()
  const { user, profile, logout } = useAuth()

  const filteredNavigation = navigation.filter((item) => {
    if (!profile) return false
    const hasExecutiveAccess = item.allowedFor.includes("executive") && isExecutiveTeam(profile)
    const hasBranchLeadAccess = item.allowedFor.includes("branchLead") && isBranchLead(profile)
    const hasMentorAccess = item.allowedFor.includes("mentor") && isMentor(profile)
    const hasStaffAccess = item.allowedFor.includes("staff")
    return hasExecutiveAccess || hasBranchLeadAccess || hasMentorAccess || hasStaffAccess
  })

  const shellClass =
    "fixed inset-y-0 left-0 z-40 flex w-[4.5rem] flex-col bg-gradient-to-b from-[#001A3D] to-[#011b3e] text-white shadow-[0_8px_24px_rgba(0,26,61,0.12)] lg:translate-x-0"

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
    const Icon = item.icon
    return (
      <Link
        href={item.href}
        title={item.name}
        onClick={() => setIsMobileOpen(false)}
        className={cn(
          "group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
          isActive
            ? "bg-[#FFB84D]/20 text-[#FFB84D]"
            : "text-white/70 hover:bg-white/10 hover:text-white"
        )}
      >
        {isActive && <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[#FFB84D]" />}
        <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 2} />
      </Link>
    )
  }

  return (
    <>
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="curator-card border-0 bg-white text-[#001A3D] shadow-[var(--curator-shadow)]"
          aria-label={isMobileOpen ? "Close menu" : "Open menu"}
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <aside
        className={cn(
          shellClass,
          "transition-transform duration-200",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col items-center pt-6 pb-4">
          <Link href="/dashboard" className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-[#FFB84D]/90 shadow-lg ring-2 ring-[#FFB84D]/30" title="SynapseUK">
            <img src="/images/synapse-logo.png" alt="" className="h-8 w-8 rounded-full object-contain" />
          </Link>

          <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto px-2 py-2 [scrollbar-width:thin]">
            {filteredNavigation.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
        </div>

        <div className="mt-auto flex flex-col items-center gap-3 px-2 pb-6">
          <Link
            href="/requests/new"
            title="New request"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFB84D] text-[#291800] shadow-lg transition-transform hover:scale-105"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </Link>

          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white ring-1 ring-white/20"
            title={profile?.full_name || user?.email || "Account"}
          >
            {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?"}
          </div>

          <button
            type="button"
            title="Sign out"
            onClick={() => logout()}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[#001A3D]/40 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
