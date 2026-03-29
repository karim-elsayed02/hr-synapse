"use client"

import { useAuth } from "@/hooks/use-auth"
import type { ReactNode } from "react"

interface BranchGuardProps {
  children: ReactNode
  requiredBranch?: string
  fallback?: ReactNode
}

export function BranchGuard({ children, requiredBranch, fallback }: BranchGuardProps) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Admins can see everything
  if (profile?.role === "admin") {
    return <>{children}</>
  }

  // Managers can only see their branch
  if (profile?.role === "manager" && requiredBranch && profile.branch !== requiredBranch) {
    return (
      fallback || (
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Branch Access Denied</h2>
          <p className="text-gray-600">You can only view data from your assigned branch.</p>
        </div>
      )
    )
  }

  // Staff can only see their own data
  if (profile?.role === "staff" && requiredBranch && profile.branch !== requiredBranch) {
    return (
      fallback || (
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You can only view your own information.</p>
        </div>
      )
    )
  }

  return <>{children}</>
}
