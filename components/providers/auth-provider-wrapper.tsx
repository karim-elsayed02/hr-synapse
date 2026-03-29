"use client"

import { AuthProvider } from "@/hooks/use-auth"
import type { ReactNode } from "react"

interface AuthProviderWrapperProps {
  children: ReactNode
}

export function AuthProviderWrapper({ children }: AuthProviderWrapperProps) {
  return <AuthProvider>{children}</AuthProvider>
}
