"use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Loader2, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email")
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
              Forgot password
            </h1>
            <p className="mt-2 text-sm text-[#001A3D]/55">
              Enter your email and we&apos;ll send a reset link
            </p>
          </div>

          <div className="px-8 pb-10 pt-4">
            {success ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <Mail className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-[#001A3D]">Check your inbox</p>
                  <p className="mt-1 text-sm text-[#001A3D]/55">
                    We sent a password reset link to <span className="font-medium text-[#001A3D]/80">{email}</span>
                  </p>
                </div>
                <p className="text-xs text-[#001A3D]/40">
                  Didn&apos;t receive it? Check your spam folder or try again.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setSuccess(false); setEmail(""); }}
                  className="h-11 w-full rounded-xl border-[#001A3D]/15 text-[#001A3D] hover:bg-[#f8f9fa]"
                >
                  Try again
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#001A3D]/80">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@synapseuk.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-12 rounded-xl border-[#001A3D]/10 bg-[#f8f9fa] text-[#001A3D] placeholder:text-[#001A3D]/35 focus-visible:ring-[#FFB84D]/50"
                    required
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
                      Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#001A3D]/70 underline-offset-4 hover:text-[#001A3D] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
