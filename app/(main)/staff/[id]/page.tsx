"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { StaffProfile } from "@/components/staff/staff-profile"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getUserDisplayName } from "@/lib/utils/user-display"

export default function StaffProfilePage() {
  const params = useParams()
  const { user, isAdmin, isManager } = useAuth()
  const [staffMember, setStaffMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStaffMember = async () => {
      if (!user || !params.id) return

      try {
        setLoading(true)
        const response = await fetch("/api/admin/users")
        const result = await response.json()

        if (result.success && result.users) {
          const staff = result.users.find((s: any) => s.id === params.id)

          if (staff) {
            setStaffMember({
              id: staff.id,
              name: getUserDisplayName(staff),
              email: staff.email,
              phone: staff.phone || null,
              role: staff.role || "staff",
              branch: staff.branch || "Main Office",
              compliance_status: staff.compliance_status || "pending",
              hire_date: staff.created_at || new Date().toISOString(),
              last_active: staff.last_sign_in_at || staff.created_at || new Date().toISOString(),
              address: staff.address || null,
              emergency_contact: staff.emergency_contact || null,
              documents: staff.documents || [],
              compliance_score: staff.compliance_score || 0,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching staff member:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStaffMember()
  }, [user, params.id])

  const handleEdit = () => {
    console.log("Edit staff member:", staffMember)
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Loading profile...</span>
        </div>
      </div>
    )
  }

  if (!staffMember) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Staff member not found.</p>
          <Link href="/staff">
            <Button variant="outline">
              <span className="mr-2">←</span>
              Back to Directory
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Link href="/staff">
          <Button variant="outline" size="sm">
            <span className="mr-2">←</span>
            Back to Directory
          </Button>
        </Link>
      </div>

      <StaffProfile staff={staffMember} canEdit={isAdmin || isManager} onEdit={handleEdit} />
    </div>
  )
}
