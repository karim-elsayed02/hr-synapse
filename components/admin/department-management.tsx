"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Building2, Users, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getUserDisplayName } from "@/lib/utils/user-display"

interface Department {
  id: number
  name: string
  parent_id: number | null
  parent_name: string | null
  branch_type: "main_branch" | "sub_department"
  full_path: string
  description?: string
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
  branch: string | null
  department: string | null
}

export function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadDepartments()
    loadUsers()
  }, [])

  const loadDepartments = async () => {
    try {
      const response = await fetch("/api/departments")
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error("Error loading departments:", error)
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      })
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }

  const assignUserToDepartment = async (userId: string, branch: string, department: string) => {
    try {
      const response = await fetch("/api/admin/assign-department", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, branch, department }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "User assigned to department successfully",
        })
        loadUsers()
        setIsAssignDialogOpen(false)
        setSelectedUser(null)
      } else {
        throw new Error("Failed to assign user")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign user to department",
        variant: "destructive",
      })
    }
  }

  const mainBranches = departments.filter((d) => d.branch_type === "main_branch")
  const getSubDepartments = (parentId: number) => departments.filter((d) => d.parent_id === parentId)

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Department Management</h2>
          <p className="text-muted-foreground">Manage SynapseUK's organisational structure</p>
        </div>
      </div>

      {/* Department Structure Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            SynapseUK Organisational Structure
          </CardTitle>
          <CardDescription>Current departmental hierarchy and structure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mainBranches.map((branch) => (
              <div key={branch.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{branch.name}</h3>
                  <Badge variant="outline">{branch.branch_type.replace("_", " ")}</Badge>
                </div>
                {branch.description && <p className="text-sm text-muted-foreground mb-3">{branch.description}</p>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {getSubDepartments(branch.id).map((dept) => (
                    <div key={dept.id} className="bg-muted/50 rounded p-3">
                      <div className="font-medium">{dept.name}</div>
                      {dept.description && <div className="text-xs text-muted-foreground mt-1">{dept.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Department Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Department Assignments
          </CardTitle>
          <CardDescription>Assign staff members to their respective departments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{getUserDisplayName(user)}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{user.role}</Badge>
                    {user.branch && user.department ? (
                      <Badge variant="outline">
                        {user.branch} - {user.department}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">No Department</Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(user)
                    setIsAssignDialogOpen(true)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Department</DialogTitle>
            <DialogDescription>Assign {getUserDisplayName(selectedUser)} to a department</DialogDescription>
          </DialogHeader>

          <DepartmentAssignmentForm
            user={selectedUser}
            departments={departments}
            onAssign={assignUserToDepartment}
            onCancel={() => {
              setIsAssignDialogOpen(false)
              setSelectedUser(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DepartmentAssignmentForm({
  user,
  departments,
  onAssign,
  onCancel,
}: {
  user: User | null
  departments: Department[]
  onAssign: (userId: string, branch: string, department: string) => void
  onCancel: () => void
}) {
  const [selectedBranch, setSelectedBranch] = useState(user?.branch || "")
  const [selectedDepartment, setSelectedDepartment] = useState(user?.department || "")

  if (!user) return null

  const mainBranches = departments.filter((d) => d.branch_type === "main_branch")
  const availableDepartments = selectedBranch
    ? departments.filter((d) => d.parent_id && d.parent_name === selectedBranch)
    : []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedBranch && selectedDepartment) {
      onAssign(user.id, selectedBranch, selectedDepartment)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="branch">Branch</Label>
        <Select
          value={selectedBranch}
          onValueChange={(value) => {
            setSelectedBranch(value)
            setSelectedDepartment("") // Reset department when branch changes
          }}
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
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={!selectedBranch}>
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

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedBranch || !selectedDepartment}>
          Assign Department
        </Button>
      </div>
    </form>
  )
}
