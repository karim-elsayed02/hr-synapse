"use client"

import Link from "next/link"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { Loader2, UserX } from "lucide-react"
import { useRouter } from "next/navigation"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  /** Shown in a dedicated banner (not the generic red error) */
  const [deactivatedMessage, setDeactivatedMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setDeactivatedMessage(null)
    setIsLoading(true)

    if (!email || !password) {
      setError("Please enter both email and password")
      setIsLoading(false)
      return
    }

    const result = await login({ email, password })

    if (result.success) {
      router.push("/dashboard")
    } else {
      const msg =
        (result.error && result.error.trim()) ||
        "Could not sign in. Please try again."
      if ("deactivated" in result && result.deactivated === true) {
        setDeactivatedMessage(msg)
        setError("")
      } else {
        setError(msg)
        setDeactivatedMessage(null)
      }
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] via-[#001A3D] to-[#011b3e] p-4 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col justify-center">
        <div className="curator-card overflow-hidden border-0 shadow-[0_8px_24px_rgba(0,26,61,0.2)]">
          <div className="bg-gradient-to-br from-[#001A3D]/5 to-transparent px-8 pb-2 pt-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#FFB84D]/90 p-2 shadow-lg ring-4 ring-[#FFB84D]/20">
              <img src="/images/synapse-logo.png" alt="" className="h-full w-full object-contain" />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#001A3D] sm:text-3xl">
              SynapseUK
            </h1>
            <p className="mt-2 text-sm text-[#001A3D]/55">HR Platform — sign in to continue</p>
          </div>

          <div className="px-8 pb-10 pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              {deactivatedMessage ? (
                <Alert
                  className="rounded-xl border-amber-300/90 bg-amber-50 text-amber-950 shadow-sm [&>svg]:text-amber-800"
                  role="alert"
                >
                  <UserX className="shrink-0" aria-hidden />
                  <AlertTitle className="text-base font-semibold text-amber-950">
                    Account deactivated
                  </AlertTitle>
                  <AlertDescription className="text-sm leading-relaxed text-amber-950/90">
                    {deactivatedMessage}
                  </AlertDescription>
                </Alert>
              ) : null}

              {error && !deactivatedMessage ? (
                <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#001A3D]/80">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@synapseuk.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-12 rounded-xl border-[#001A3D]/10 bg-[#f8f9fa] text-[#001A3D] placeholder:text-[#001A3D]/35 focus-visible:ring-[#FFB84D]/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password" className="text-[#001A3D]/80">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-[#001A3D]/70 underline-offset-4 hover:text-[#001A3D] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-12 rounded-xl border-[#001A3D]/10 bg-[#f8f9fa] text-[#001A3D] focus-visible:ring-[#FFB84D]/50"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full rounded-xl bg-[#FFB84D] text-base font-semibold text-[#291800] shadow-md transition-transform hover:bg-[#f5a84a] hover:shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-[#001A3D]/45">
              Need help? Contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
