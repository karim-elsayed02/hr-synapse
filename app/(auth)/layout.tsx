import type { ReactNode } from "react"

/**
 * Auth route group — URLs unchanged: /login, /register, etc.
 * No app chrome (sidebar/header only under `(main)`).
 * Each page controls its own background (e.g. login gradient).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
