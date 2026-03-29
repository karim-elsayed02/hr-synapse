"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/utils/permissions"

interface RegisterFormProps {
  isAdminCreating?: boolean
}

interface Department {
  id: number
  name: string
  parent_id: number | null
  parent_name: string | null
  branch_type: "main_branch" | "sub_department"
  full_path: string
  description?: string
}

const SYNAPSEUK_ROLES: UserRole[] = [
  "staff",
  "manager",
  "admin",
  "Chief Executive Officer",
  "Chief Operating Officer",
  "Chief Financial Officer",
  "Tutoring Lead",
  "Medical Lead",
  "Dental Lead",
  "Medical Admissions Lead",
  "Dental Admissions Lead",
  "Oxbridge Admissions Lead",
  "Medical Work Experience Lead",
  "Dental Work Experience Lead",
  "Tutor",
  "Dental Admissions Mentor",
  "Medical Admissions Mentor",
  "Dental Work Experience Mentor",
  "Medical Work Experience Mentor",
  "Ambassador",
  "Medical Education Lead",
  "Dental Education Lead",
  "Medical Events Lead",
  "Dental Events Lead",
  "Events Curriculum Lead",
  "Events Representative",
  "Events Outreach Officer",
]

export function RegisterForm({ isAdminCreating = false }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const { user, profile } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (isAdminCreating) {
      loadDepartments()
    }
  }, [isAdminCreating])

  const loadDepartments = async () => {
    try {
      const response = await fetch("/api/departments")
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error("Error loading departments:", error)
    }
  }

  if (isAdminCreating && (!user || !profile || profile.role !== "admin")) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Only administrators can create new staff accounts.</p>
        </CardContent>
      </Card>
    )
  }

  const mainBranches = departments.filter((d) => d.branch_type === "main_branch")
  const availableDepartments = selectedBranch
    ? departments.filter((d) => d.parent_id && d.parent_name === selectedBranch)
    : []

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    if (selectedBranch) formData.set("branch", selectedBranch)
    if (selectedDepartment) formData.set("department", selectedDepartment)

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
                    setSelectedDepartment("") // Reset department when branch changes
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {mainBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.name}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                  disabled={!selectedBranch}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDepartments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
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
