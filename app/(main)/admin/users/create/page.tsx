import { RoleGuard } from "@/components/auth/role-guard"
import { RegisterForm } from "@/components/auth/register-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CreateUserPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Staff Member</h1>
            <p className="text-gray-600 mt-2">Create a new staff account with role and branch assignment</p>
          </div>
        </div>

        <div className="max-w-2xl">
          <RegisterForm isAdminCreating={true} />
        </div>
      </div>
    </RoleGuard>
  )
}
