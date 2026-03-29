"use client"

import type React from "react"
import { uploadDocumentAction } from "@/lib/actions/document-actions"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, X, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCodeWords } from "@/lib/codewords-client"
import { useAuth } from "@/hooks/use-auth"
import { getUserDisplayName } from "@/lib/utils/user-display"

const DOCUMENT_TYPES = ["DBS Certificate", "Contract", "Training Certificate", "Policy Document", "Other"]

const DOCUMENT_CATEGORIES = [
  "HR Documents",
  "Training & Certification",
  "Compliance",
  "Policies",
  "Personal Documents",
  "Other",
]

export function UploadDocumentForm() {
  const router = useRouter()
  const { toast } = useToast()
  const { getUsers } = useCodeWords()
  const { user, isAdmin, isManager } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "",
    category: "",
    expiryDate: "",
    targetUserId: null, // Updated default value to null
  })

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user || (!isAdmin && !isManager)) {
        console.log("[v0] Upload form: User not authorized to assign documents", { user: !!user, isAdmin, isManager })
        return // Only admins and managers can assign documents to others
      }

      try {
        setLoadingUsers(true)
        console.log("[v0] Upload form: Fetching users...")
        const response = await getUsers()
        console.log("[v0] Upload form: Users response:", response)
        if (response.data) {
          console.log("[v0] Upload form: Setting users:", response.data)
          setUsers(response.data)
        } else {
          console.log("[v0] Upload form: No users data in response")
        }
      } catch (error) {
        console.error("[v0] Upload form: Error fetching users:", error)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [user, isAdmin, isManager, getUsers])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const removeFile = () => {
    setSelectedFile(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    if (!formData.title || !formData.type || !formData.category) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      await uploadDocumentAction({
        ...formData,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        targetUserId: formData.targetUserId, // Pass target user ID if selected
      })

      toast({
        title: "Document uploaded successfully",
        description: `${selectedFile.name} has been uploaded and is being processed.`,
      })

      // Reset form
      setSelectedFile(null)
      setFormData({
        title: "",
        description: "",
        type: "",
        category: "",
        expiryDate: "",
        targetUserId: null, // Reset target user selection
      })

      // Redirect to documents page
      router.push("/documents")
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Document File *</Label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {selectedFile ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drop your file here, or{" "}
                    <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                      browse
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </label>
                  </p>
                  <p className="text-sm text-gray-500">Supports PDF, DOC, DOCX, JPG, PNG files up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Document Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter document title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Document Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>

          {(isAdmin || isManager) && (
            <div className="space-y-2">
              <Label htmlFor="targetUser">Assign to Specific User (Optional)</Label>
              <Select
                value={formData.targetUserId?.toString() || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, targetUserId: value === "none" ? null : Number.parseInt(value) })
                }
                disabled={loadingUsers}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingUsers ? "Loading users..." : "Select user (leave blank for general document)"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>General Document (visible to all)</span>
                    </div>
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{getUserDisplayName(user)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                If you select a user, only they, admins, and their department managers will be able to see this
                document.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter document description"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.push("/documents")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
