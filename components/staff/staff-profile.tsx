"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Edit, Mail, Phone, MapPin, Calendar, Shield, FileText, Clock, Banknote } from "lucide-react"
import { getUserDisplayName, getUserInitials } from "@/lib/utils/user-display"
import { formatBranchLabel, formatSubBranchLabel } from "@/lib/utils/org-structure"

interface StaffMember {
  id: string // Changed from number to string to match Supabase UUID
  name: string
  email: string
  phone?: string
  role: string // Made more flexible, not just specific roles
  branch: string
  /** Sub-branch (stored as `department` on profiles) */
  department?: string | null
  compliance_status: string // Made more flexible
  hire_date: string
  last_active: string
  address?: string
  /** Default hourly pay rate (GBP); optional */
  hourly_rate?: number | null
  emergency_contact?: {
    name: string
    phone: string
    relationship: string
  }
  documents?: Array<{
    id: number
    name: string
    type: string
    status: string // Made more flexible
    expiry_date?: string
    uploaded_date: string
  }>
  compliance_score: number
}

interface StaffProfileProps {
  staff: StaffMember
  canEdit?: boolean
  onEdit?: () => void
}

export function StaffProfile({ staff, canEdit = false, onEdit }: StaffProfileProps) {
  const getComplianceColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "expired":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "expiring":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "expired":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const displayName = getUserDisplayName(staff)
  const initials = getUserInitials(staff)

  const hourlyRateDisplay = (() => {
    const v = staff.hourly_rate
    if (v === null || v === undefined || Number.isNaN(Number(v))) return null
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(Number(v))
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="capitalize">
                    {staff.role || "staff"}
                  </Badge>
                  {formatBranchLabel(staff.branch) !== "—" ? (
                    <Badge variant="outline">{formatBranchLabel(staff.branch)}</Badge>
                  ) : null}
                  {formatSubBranchLabel(staff.department) !== "—" ? (
                    <Badge variant="outline">{formatSubBranchLabel(staff.department)}</Badge>
                  ) : null}
                  <Badge variant="secondary" className={getComplianceColor(staff.compliance_status || "pending")}>
                    {staff.compliance_status || "pending"}
                  </Badge>
                </div>
              </div>
            </div>

            {canEdit && (
              <Button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Branch: </span>
                    {formatBranchLabel(staff.branch)}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Sub-branch: </span>
                    {formatSubBranchLabel(staff.department)}
                  </span>
                </div>
                {hourlyRateDisplay ? (
                  <div className="flex items-center space-x-3">
                    <Banknote className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Hourly rate: </span>
                      {hourlyRateDisplay}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{staff.email || "No email provided"}</span>
                </div>
                {staff.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{staff.phone}</span>
                  </div>
                )}
                {staff.address && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{staff.address}</span>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Hired: {staff.hire_date ? new Date(staff.hire_date).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Last active: {staff.last_active ? new Date(staff.last_active).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {staff.emergency_contact && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium">{staff.emergency_contact.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{staff.emergency_contact.relationship}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{staff.emergency_contact.phone}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Compliance Score</span>
                    <span>{staff.compliance_score || 0}%</span>
                  </div>
                  <Progress value={staff.compliance_score || 0} className="h-2" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {staff.documents?.filter((d) => d.status === "valid").length || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Valid Documents</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {staff.documents?.filter((d) => d.status === "expiring").length || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Expiring Soon</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {staff.documents?.filter((d) => d.status === "expired").length || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Expired</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Documents & Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {staff.documents && staff.documents.length > 0 ? (
                <div className="space-y-3">
                  {staff.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {doc.type} • Uploaded {new Date(doc.uploaded_date).toLocaleDateString()}
                        </p>
                        {doc.expiry_date && (
                          <p className="text-xs text-gray-500">
                            Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className={getDocumentStatusColor(doc.status)}>
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No documents uploaded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Account Created</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(staff.hire_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Last Active</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(staff.last_active).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
