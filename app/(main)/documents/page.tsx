"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { getDocumentsAction } from "@/lib/actions/document-actions"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { User, Users, Lock, Eye } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user, isAdmin, isManager } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        console.log("[v0] Fetching documents...")
        const docs = await getDocumentsAction()
        console.log("[v0] Documents loaded:", docs.length)
        setDocuments(docs)
      } catch (error) {
        console.error("[v0] Error fetching documents:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-green-100 text-green-800"
      case "expiring":
        return "bg-yellow-100 text-yellow-800"
      case "expired":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPermissionIndicator = (document: any) => {
    if (!document.target_user_id) {
      // General document visible to all
      return {
        icon: <Users className="h-3 w-3" />,
        text: "General",
        color: "bg-blue-100 text-blue-800",
        description: "Visible to all staff members",
      }
    } else if (document.target_user?.id === user?.id) {
      // Document targeted to current user
      return {
        icon: <User className="h-3 w-3" />,
        text: "Personal",
        color: "bg-purple-100 text-purple-800",
        description: "Assigned specifically to you",
      }
    } else if (isAdmin || isManager) {
      // Admin/Manager viewing someone else's document
      return {
        icon: <Lock className="h-3 w-3" />,
        text: `For ${document.target_user?.email || "User"}`,
        color: "bg-orange-100 text-orange-800",
        description: "Restricted document - visible due to your role",
      }
    } else {
      // Shouldn't happen due to RLS, but fallback
      return {
        icon: <Eye className="h-3 w-3" />,
        text: "Restricted",
        color: "bg-gray-100 text-gray-800",
        description: "Limited access document",
      }
    }
  }

  const handleUploadClick = () => {
    router.push("/documents/upload")
  }

  const handleViewDocument = (document: any) => {
    if (document.file_url) {
      window.open(document.file_url, "_blank")
    } else {
      console.log("[v0] No file URL available for document:", document.id)
    }
  }

  const handleDownloadDocument = async (document: any) => {
    try {
      if (document.file_url) {
        const response = await fetch(document.file_url)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = document.file_name || `document-${document.id}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.log("[v0] No file URL available for download:", document.id)
      }
    } catch (error) {
      console.error("[v0] Error downloading document:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documents</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your documents and certificates</p>
          </div>
          <Button onClick={handleUploadClick}>Upload Document</Button>
        </div>
        <LoadingSpinner text="Loading documents..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documents</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your documents and certificates</p>
        </div>
        <Button onClick={handleUploadClick}>Upload Document</Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">No documents uploaded yet.</p>
            <Button onClick={handleUploadClick} className="mt-4">
              Upload Your First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((document) => {
            const permissionInfo = getPermissionIndicator(document)

            return (
              <Card key={document.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{document.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${permissionInfo.color} flex items-center gap-1`}
                        title={permissionInfo.description}
                      >
                        {permissionInfo.icon}
                        {permissionInfo.text}
                      </Badge>
                      <Badge className={getStatusColor(document.status)}>{document.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Type: {document.type}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Category: {document.category}</p>
                      {document.file_name && <p className="text-sm text-gray-500">File: {document.file_name}</p>}
                      {(isAdmin || isManager) && document.uploader?.email && (
                        <p className="text-sm text-gray-500">Uploaded by: {document.uploader.email}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewDocument(document)}>
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadDocument(document)}>
                        Download
                      </Button>
                    </div>
                  </div>
                  {document.expiry_date && (
                    <p className="text-sm text-gray-500 mt-2">
                      Expires: {new Date(document.expiry_date).toLocaleDateString()}
                    </p>
                  )}
                  {document.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{document.description}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
