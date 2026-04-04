"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, Loader2 } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
      } else {
        setDone(true)
        setTimeout(() => router.push("/login"), 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#000000] via-[#001A3D] to-[#011b3e] p-4 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col justify-center">
        <div className="curator-card overflow-hidden border-0 shadow-[0_8px_24px_rgba(0,26,61,0.2)]">
          <div className="bg-linear-to-br from-[#001A3D]/5 to-transparent px-8 pb-2 pt-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#FFB84D]/90 p-2 shadow-lg ring-4 ring-[#FFB84D]/20">
              <img src="/images/synapse-logo.png" alt="" className="h-full w-full object-contain" />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#001A3D] sm:text-3xl">
              Reset password
            </h1>
            <p className="mt-2 text-sm text-[#001A3D]/55">
              Choose a new password for your account
            </p>
          </div>

          <div className="px-8 pb-10 pt-4">
            {done ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-[#001A3D]">Password updated</p>
                  <p className="mt-1 text-sm text-[#001A3D]/55">
                    Redirecting you to sign in…
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#001A3D]/80">
                    New password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 rounded-xl border-[#001A3D]/10 bg-[#f8f9fa] text-[#001A3D] focus-visible:ring-[#FFB84D]/50"
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[#001A3D]/80">
                    Confirm new password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 rounded-xl border-[#001A3D]/10 bg-[#f8f9fa] text-[#001A3D] focus-visible:ring-[#FFB84D]/50"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 w-full rounded-xl bg-[#FFB84D] text-base font-semibold text-[#291800] shadow-md transition-transform hover:bg-[#f5a84a] hover:shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
