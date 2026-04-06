"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Eye, Edit, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { getUserDisplayName, getUserInitials } from "@/lib/utils/user-display"

interface StaffMember {
  id: string // Changed from number to string to match Supabase UUID
  name: string
  email: string
  role: "admin" | "manager" | "staff"
  branch: string
  department?: string // Added department field
  phone?: string
  hire_date: string
  last_active: string
}

interface StaffDirectoryProps {
  staff: StaffMember[]
  onEdit?: (staff: StaffMember) => void
  canEdit?: boolean
}

export function StaffDirectory({ staff, onEdit, canEdit = false }: StaffDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [branchFilter, setBranchFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all") // Added department filter state
  const router = useRouter() // Initialize Next.js router

  const filteredStaff = staff.filter((member) => {
    const displayName = getUserDisplayName(member)
    const matchesSearch =
      displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || member.role === roleFilter
    const matchesBranch = branchFilter === "all" || member.branch === branchFilter
    const matchesDepartment = departmentFilter === "all" || member.department === departmentFilter // Added department filter condition

    return matchesSearch && matchesRole && matchesBranch && matchesDepartment
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "manager":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "staff":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const uniqueBranches = [...new Set(staff.map((s) => s.branch))]
  const uniqueDepartments = [...new Set(staff.map((s) => s.department))] // Added unique departments

  const handleEditStaff = (staffMember: StaffMember) => {
    router.push(`/profile/${staffMember.id}`) // Use Next.js router for navigation
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Directory</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your team members and their compliance status</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link href="/staff/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {" "}
            {/* Updated grid columns */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {uniqueBranches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              {" "}
              {/* Added department filter */}
              <SelectTrigger>
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              {filteredStaff.length} of {staff.length} members
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((member) => {
          const displayName = getUserDisplayName(member)
          const initials = getUserInitials(member)

          return (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{displayName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{member.email}</p>
                    </div>
                  </div>

                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/profile/${member.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditStaff(member)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className={getRoleColor(member.role)}>
                      {member.role}
                    </Badge>
                    <Badge variant="outline">{member.branch}</Badge>
                    {member.department && <Badge variant="outline">{member.department}</Badge>}{" "}
                    {/* Added department badge */}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    {/* Simplified status to just show Active */}
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    >
                      Active
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>Hired: {new Date(member.hire_date).toLocaleDateString()}</p>
                    <p>Last active: {new Date(member.last_active).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredStaff.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No staff members found matching your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
