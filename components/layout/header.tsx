"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useState } from "react"
import {
  Bell,
  Search,
  User,
  LogOut,
  Settings,
  ArrowLeft,
  Sparkles,
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

const pageNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/staff": "Staff Directory",
  "/profile": "My Profile",
  "/requests": "Requests",
  "/tasks": "Task Board",
  "/documents": "Documents",
  "/announcements": "Announcements",
  "/admin/users": "User Management",
  "/admin/users/create": "Create User",
  "/settings": "Settings",
}

export function Header() {
  const pathname = usePathname()
  const { user, profile, logout } = useAuth()
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const currentPageName = pageNames[pathname] || "SynapseUK"

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
                onClick={() => setShowNotifications(true)}
                className="relative h-10 w-10 rounded-xl text-[#001A3D]/70 hover:bg-[#001A3D]/5 hover:text-[#001A3D]"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
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
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#001A3D] to-[#011b3e] text-xs font-semibold text-[#FFB84D] ring-2 ring-[#FFB84D]/20">
                      {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?"}
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
        <DialogContent className="rounded-2xl border-0 shadow-[0_8px_24px_rgba(0,26,61,0.12)]">
          <DialogHeader>
            <DialogTitle className="font-display">Notifications</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#001A3D]/60">No new notifications</p>
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
