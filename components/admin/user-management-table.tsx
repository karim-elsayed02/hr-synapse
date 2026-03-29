"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Trash2, Search, Users, AlertCircle } from "lucide-react"
import type { UserRole } from "@/lib/utils/permissions"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  branch?: string
  department?: string
  phone?: string
  created_at: string
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

export function UserManagementTable() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [branchFilter, setBranchFilter] = useState<string>("all")
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/users")
      const result = await response.json()

      if (result.success) {
        setUsers(result.users || [])
      } else {
        setError(result.error || "Failed to load users")
      }
    } catch (error) {
      setError("Failed to load users")
    }
    setLoading(false)
  }

  async function handleDeleteUser(userId: string) {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: "DELETE",
        })
        const result = await response.json()

        if (result.success) {
          loadUsers()
        } else {
          setError(result.error || "Failed to delete user")
        }
      } catch (error) {
        setError("Failed to delete user")
      }
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdatingRoles((prev) => new Set(prev).add(userId))

    setUsers((prevUsers) =>
      prevUsers.map((user) => (user.id === userId ? { ...user, role: newRole as UserRole } : user)),
    )

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      })
      const result = await response.json()

      if (!result.success) {
        // Revert the optimistic update
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId ? { ...user, role: users.find((u) => u.id === userId)?.role || "staff" } : user,
          ),
        )
        setError(result.error || "Failed to update user role")
      }
    } catch (error) {
      // Revert the optimistic update
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, role: users.find((u) => u.id === userId)?.role || "staff" } : user,
        ),
      )
      setError("Failed to update user role")
    }

    setUpdatingRoles((prev) => {
      const newSet = new Set(prev)
      newSet.delete(userId)
      return newSet
    })
  }

  const handleEditUser = (user: User) => {
    console.log("[v0] UserManagementTable: Navigating to staff profile:", user.id)
    router.push(`/staff/${user.id}`)
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesBranch = branchFilter === "all" || user.branch === branchFilter

    return matchesSearch && matchesRole && matchesBranch
  })

  const branches = [...new Set(users.map((user) => user.branch).filter(Boolean))]

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Unable to Load Users</h3>
              <p className="text-gray-600 mt-1">{error}</p>
              <Button onClick={loadUsers} className="mt-4">
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Management Table</CardTitle>
          <Link href="/staff">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Switch to Directory View
            </Button>
          </Link>
        </div>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="Chief Executive Officer">CEO</SelectItem>
              <SelectItem value="Chief Operating Officer">COO</SelectItem>
              <SelectItem value="Chief Financial Officer">CFO</SelectItem>
              <SelectItem value="Medical Lead">Medical Lead</SelectItem>
              <SelectItem value="Dental Lead">Dental Lead</SelectItem>
              <SelectItem value="Tutoring Lead">Tutoring Lead</SelectItem>
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch} value={branch!}>
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No Users Found</h3>
            <p className="text-gray-600 mt-1">
              {users.length === 0
                ? "No users have been added to the system yet."
                : "No users match your current search criteria."}
            </p>
            {users.length === 0 && (
              <Button onClick={loadUsers} variant="outline" className="mt-4 bg-transparent">
                Refresh
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || "N/A"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                      disabled={updatingRoles.has(user.id)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                        {updatingRoles.has(user.id) && (
                          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
                          </div>
                        )}
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {SYNAPSEUK_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{user.branch || "N/A"}</TableCell>
                  <TableCell>{user.department || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteUser(user.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
