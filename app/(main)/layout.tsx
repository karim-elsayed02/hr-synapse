import type React from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Toaster } from "@/components/ui/toaster"
import { LoginAnnouncementOverlay } from "@/components/announcements/login-announcement-overlay"

/** Authenticated app shell — route group `(main)` does not appear in URLs. */
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Sidebar />
      <div className="pl-0 transition-all duration-200 lg:pl-[4.5rem]">
        <Header />
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <Toaster />
      <LoginAnnouncementOverlay />
    </div>
  )
}
