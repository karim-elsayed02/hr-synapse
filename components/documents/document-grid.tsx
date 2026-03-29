"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import {
  FileText,
  Download,
  Eye,
  MoreHorizontal,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Document {
  id: number
  name: string
  type: "dbs" | "contract" | "certificate" | "policy" | "other"
  category: string
  file_size: number
  file_type: string
  uploaded_by: {
    id: string
    name: string
  }
  uploaded_date: string
  expiry_date?: string
  status: "valid" | "expiring" | "expired"
  staff_member?: {
    id: string
    name: string
  }
  tags?: string[]
  description?: string
}

interface DocumentGridProps {
  documents: Document[]
  onDownload: (document: Document) => void
  onPreview: (document: Document) => void
  onDelete?: (documentId: number) => void
  canManage?: boolean
}

export function DocumentGrid({ documents, onDownload, onPreview, onDelete, canManage = false }: DocumentGridProps) {
  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-3 w-3" />
      case "expiring":
        return <Clock className="h-3 w-3" />
      case "expired":
        return <AlertTriangle className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "dbs":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "contract":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "certificate":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "policy":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
  }

  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null
    const days = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {documents.map((document) => {
        const daysUntilExpiry = getDaysUntilExpiry(document.expiry_date)

        return (
          <Card key={document.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2 text-gray-900 dark:text-white">
                        {document.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {document.file_type.toUpperCase()} • {formatFileSize(document.file_size)}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onPreview(document)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDownload(document)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      {canManage && onDelete && (
                        <DropdownMenuItem onClick={() => onDelete(document.id)} className="text-red-600">
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Description */}
                {document.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{document.description}</p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className={getTypeColor(document.type)}>
                    {document.type.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary" className={getStatusColor(document.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(document.status)}
                      {document.status}
                    </span>
                  </Badge>
                  {document.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Expiry Information */}
                {document.expiry_date && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Expires in:</span>
                      <span
                        className={
                          daysUntilExpiry !== null && daysUntilExpiry <= 30
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-gray-600 dark:text-gray-400"
                        }
                      >
                        {daysUntilExpiry !== null && daysUntilExpiry > 0
                          ? `${daysUntilExpiry} days`
                          : daysUntilExpiry !== null && daysUntilExpiry <= 0
                            ? "Expired"
                            : "N/A"}
                      </span>
                    </div>
                    {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                      <Progress
                        value={Math.max(0, Math.min(100, ((365 - daysUntilExpiry) / 365) * 100))}
                        className="h-1"
                      />
                    )}
                  </div>
                )}

                {/* Staff Member */}
                {document.staff_member && (
                  <div className="flex items-center space-x-2">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{document.staff_member.name}</span>
                  </div>
                )}

                {/* Upload Info */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs">
                        {document.uploaded_by.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{document.uploaded_by.name}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(document.uploaded_date), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
