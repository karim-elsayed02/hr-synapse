"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect, useCallback } from "react"
import {
  Bell,
  Search,
  User,
  LogOut,
  Settings,
  ArrowLeft,
  Sparkles,
  CheckCheck,
  ClipboardList,
  FileText,
  CreditCard,
  File,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { getAvatarUrl } from "@/lib/utils/avatar"

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  related_entity_type: string | null
  related_entity_id: string | null
  is_read: boolean
  created_at: string
}

const ICON_MAP: Record<string, React.ElementType> = {
  task_assigned: ClipboardList,
  task_awaiting_approval: ClipboardList,
  task_approved: ClipboardList,
  request_received: FileText,
  request_approved: FileText,
  request_rejected: FileText,
  pay_entry_created: CreditCard,
  pay_entry_paid: CreditCard,
  document_uploaded: File,
  document_updated: File,
}

const ENTITY_ROUTES: Record<string, string> = {
  task: "/tasks",
  request: "/requests",
  payroll_entry: "/payroll",
  document: "/documents",
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const pageNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/staff": "Staff Directory",
  "/profile": "My Profile",
  "/requests": "Requests",
  "/tasks": "Task Board",
  "/documents": "Documents",
  "/announcements": "Announcements",
  "/settings": "Settings",
}

export function Header() {
  const pathname = usePathname()
  const { user, profile, logout } = useAuth()
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30")
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unread_count ?? 0)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const openNotifications = async () => {
    setShowNotifications(true)
    setLoadingNotifs(true)
    await fetchNotifications()
    setLoadingNotifs(false)
  }

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all_read: true }),
    }).catch(() => {})
  }

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id)
    const route = n.related_entity_type ? ENTITY_ROUTES[n.related_entity_type] : null
    if (route) {
      setShowNotifications(false)
      router.push(route)
    }
  }

  const currentPageName =
    pathname === "/profile"
      ? "My Profile"
      : pathname.startsWith("/profile/")
        ? "Profile"
        : pageNames[pathname] || "SynapseUK"

  const handleGoBack = () => {
    router.back()
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
      router.refresh()
    } catch {
      router.push("/login")
      router.refresh()
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      setSearchResults(data.results || [])
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleResultClick = (result: any) => {
    router.push(result.url)
    setShowSearch(false)
    setSearchQuery("")
    setSearchResults([])
  }

  const handleSearchClose = (open: boolean) => {
    setShowSearch(open)
    if (!open) {
      setSearchQuery("")
      setSearchResults([])
    }
  }

  const showBack = pathname !== "/dashboard"

  return (
    <header className="sticky top-0 z-30 border-b border-[#001A3D]/[0.08] bg-[#f8fafc]/95 backdrop-blur-md">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setShowSearch(true)
              void (async () => {
                if (!searchQuery.trim()) return
                setIsSearching(true)
                try {
                  const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
                  const data = await response.json()
                  setSearchResults(data.results || [])
                } catch {
                  setSearchResults([])
                } finally {
                  setIsSearching(false)
                }
              })()
            }}
            className="relative min-w-0 flex-1"
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#001A3D]/40" />
            <Input
              placeholder="Search employees, tasks, or records…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-2xl border-0 bg-white pl-11 pr-4 text-[15px] shadow-[0_8px_24px_rgba(0,26,61,0.06)] placeholder:text-[#001A3D]/35 focus-visible:ring-2 focus-visible:ring-[#FFB84D]/50"
            />
          </form>

          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end lg:gap-4">
            <div className="hidden items-center gap-1 sm:flex">
              <span className="font-display text-sm font-semibold tracking-tight text-[#001A3D]">HR Platform</span>
              <Sparkles className="h-4 w-4 text-[#FFB84D]" aria-hidden />
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={openNotifications}
                className="relative h-10 w-10 rounded-xl text-[#001A3D]/70 hover:bg-[#001A3D]/5 hover:text-[#001A3D]"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => router.push("/settings")}
                className="h-10 w-10 rounded-xl text-[#001A3D]/70 hover:bg-[#001A3D]/5 hover:text-[#001A3D]"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 gap-2 rounded-xl pl-1 pr-2 hover:bg-[#001A3D]/5"
                  >
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#001A3D] to-[#011b3e] text-xs font-semibold text-[#FFB84D] ring-2 ring-[#FFB84D]/20">
                      {getAvatarUrl(profile?.avatar_path) ? (
                        <img src={getAvatarUrl(profile?.avatar_path)!} alt="" className="h-full w-full object-cover" />
                      ) : (
                        profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?"
                      )}
                    </span>
                    <span className="hidden max-w-[120px] truncate text-sm font-medium text-[#001A3D] sm:inline">
                      {profile?.full_name?.split(" ")[0] || "User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl border-0 shadow-[0_8px_24px_rgba(0,26,61,0.12)]">
                  <DropdownMenuItem onClick={() => router.push("/profile")} className="rounded-lg">
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")} className="rounded-lg">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-lg">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {showBack && (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="h-9 gap-2 rounded-full text-[#001A3D]/70 hover:bg-[#001A3D]/5 hover:text-[#001A3D]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="font-display text-lg font-semibold tracking-tight text-[#001A3D] sm:text-xl">{currentPageName}</h1>
          </div>
        )}
      </div>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md rounded-2xl border-0 p-0 shadow-[0_8px_24px_rgba(0,26,61,0.12)]">
          <DialogHeader className="flex flex-row items-center justify-between px-5 pb-0 pt-5">
            <DialogTitle className="font-display text-lg">Notifications</DialogTitle>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#001A3D]/60 transition-colors hover:bg-[#001A3D]/5 hover:text-[#001A3D]"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </DialogHeader>

          <div className="max-h-[420px] overflow-y-auto px-2 pb-4">
            {loadingNotifs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-[#001A3D]/30" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12">
                <Bell className="h-8 w-8 text-[#001A3D]/15" />
                <p className="text-sm text-[#001A3D]/40">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-1 pt-2">
                {notifications.map((n) => {
                  const Icon = ICON_MAP[n.type] ?? Bell
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[#f8f9fa] ${
                        !n.is_read ? "bg-[#FFB84D]/5" : ""
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          !n.is_read
                            ? "bg-[#FFB84D]/15 text-[#b47a1a]"
                            : "bg-[#001A3D]/5 text-[#001A3D]/40"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm leading-snug ${
                              !n.is_read ? "font-semibold text-[#001A3D]" : "font-medium text-[#001A3D]/70"
                            }`}
                          >
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FFB84D]" />
                          )}
                        </div>
                        {n.message && (
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#001A3D]/50">
                            {n.message}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] font-medium text-[#001A3D]/30">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSearch} onOpenChange={handleSearchClose}>
        <DialogContent className="rounded-2xl border-0 shadow-[0_8px_24px_rgba(0,26,61,0.12)]">
          <DialogHeader>
            <DialogTitle className="font-display">Search</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSearch} className="space-y-4">
            <Input
              placeholder="Search for staff, documents, tasks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl"
              autoFocus
            />
            <Button
              type="submit"
              className="w-full rounded-xl bg-[#FFB84D] font-medium text-[#291800] hover:bg-[#FFB84D]/90"
              disabled={isSearching}
            >
              {isSearching ? "Searching…" : "Search"}
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-4 max-h-60 space-y-1 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleResultClick(result)}
                  className="w-full rounded-xl p-3 text-left transition-colors hover:bg-[#f8f9fa]"
                >
                  <div className="text-sm font-medium text-[#001A3D]">{result.title}</div>
                  <div className="text-xs text-[#001A3D]/50">{result.subtitle}</div>
                </button>
              ))}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !isSearching && (
            <p className="mt-4 text-center text-sm text-[#001A3D]/50">No results for &quot;{searchQuery}&quot;</p>
          )}
        </DialogContent>
      </Dialog>
    </header>
  )
}
