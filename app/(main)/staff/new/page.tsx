import { RoleGuard } from "@/components/auth/role-guard"
import { RegisterForm } from "@/components/auth/register-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewStaffPage() {
  return (
    <RoleGuard allowedRoles={["admin", "manager", "branch_lead", "sub_branch_lead"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/staff">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Staff Directory
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add New Staff Member</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create a new staff account with role and branch assignment
            </p>
          </div>
        </div>

        <div className="max-w-2xl">
          <RegisterForm isAdminCreating={true} />
        </div>
      </div>
    </RoleGuard>
  )
}
