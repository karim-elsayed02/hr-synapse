"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { STAFF_PROFILE_ROLES } from "@/lib/utils/permissions"
import {
  BRANCH_SLUGS,
  SUB_BRANCH_SLUGS,
  BRANCH_LABELS,
  SUB_BRANCH_LABELS,
} from "@/lib/utils/org-structure"

interface RegisterFormProps {
  isAdminCreating?: boolean
}

const SYNAPSEUK_ROLES = STAFF_PROFILE_ROLES

export function RegisterForm({ isAdminCreating = false }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const { user, profile } = useAuth()
  const { toast } = useToast()

  if (isAdminCreating && (!user || !profile || profile.role !== "admin")) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Only administrators can create new staff accounts.</p>
        </CardContent>
      </Card>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    if (isAdminCreating) {
      if (selectedBranch) formData.set("branch", selectedBranch)
      if (selectedDepartment && selectedDepartment !== "_none") {
        formData.set("department", selectedDepartment)
      }
    }

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const fullName = formData.get("full_name") as string

    if (!email || !password) {
      setError("Email and password are required")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        toast({
          title: "Staff Account Created Successfully!",
          description: `${fullName} (${email}) has been added to the system.`,
        })

        event.currentTarget.reset()
        setSelectedBranch("")
        setSelectedDepartment("")
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    }

    setIsLoading(false)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isAdminCreating ? "Add New Staff Member" : "Create Account"}</CardTitle>
        <CardDescription>
          {isAdminCreating
            ? "Create a new staff account with role and branch assignment"
            : "Enter your details to create your account"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email address"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="Enter full name"
              required
              disabled={isLoading}
            />
          </div>

          {isAdminCreating && (
            <>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {SYNAPSEUK_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select
                  value={selectedBranch}
                  onValueChange={(value) => {
                    setSelectedBranch(value)
                    setSelectedDepartment("")
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCH_SLUGS.map((slug) => (
                      <SelectItem key={slug} value={slug}>
                        {BRANCH_LABELS[slug]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">
                  Sub-branch <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Select
                  value={selectedDepartment || "_none"}
                  onValueChange={(value) =>
                    setSelectedDepartment(value === "_none" ? "" : value)
                  }
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Whole branch — no sub-branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Whole branch (no sub-branch)</SelectItem>
                    {SUB_BRANCH_SLUGS.map((slug) => (
                      <SelectItem key={slug} value={slug}>
                        {SUB_BRANCH_LABELS[slug]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" placeholder="Enter phone number" disabled={isLoading} />
              </div>
            </>
          )}

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating Account..." : isAdminCreating ? "Create Staff Account" : "Create Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
