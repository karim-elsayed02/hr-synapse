"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarIcon, Loader2, Pin } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface Department {
  id: number
  name: string
  parent_id: number | null
  parent_name: string | null
  branch_type: "main_branch" | "sub_department"
  full_path: string
}

interface NewAnnouncementModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (announcementData: any) => Promise<boolean>
}

export function NewAnnouncementModal({ open, onClose, onSubmit }: NewAnnouncementModalProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [priority, setPriority] = useState<string>("medium")
  const [type, setType] = useState<string>("general")
  const [targetAudience, setTargetAudience] = useState<string>("all")
  const [targetBranches, setTargetBranches] = useState<string[]>([])
  const [expiresDate, setExpiresDate] = useState<Date>()
  const [isPinned, setIsPinned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [departments, setDepartments] = useState<Department[]>([])

  useEffect(() => {
    if (open) {
      loadDepartments()
    }
  }, [open])

  const loadDepartments = async () => {
    try {
      const response = await fetch("/api/departments")
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error("Error loading departments:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!title.trim() || !content.trim()) {
      setError("Please fill in all required fields")
      return
    }

    if (targetAudience === "branch_specific" && targetBranches.length === 0) {
      setError("Please select at least one branch for branch-specific announcements")
      return
    }

    try {
      setLoading(true)

      const announcementData = {
        title: title.trim(),
        content: content.trim(),
        priority,
        type,
        target_audience: targetAudience,
        target_branches: targetAudience === "branch_specific" ? targetBranches : undefined,
        expires_date: expiresDate?.toISOString(),
        is_pinned: isPinned,
      }

      const success = await onSubmit(announcementData)
      if (success) {
        // Reset form
        setTitle("")
        setContent("")
        setPriority("medium")
        setType("general")
        setTargetAudience("all")
        setTargetBranches([])
        setExpiresDate(undefined)
        setIsPinned(false)
        onClose()
      }
    } catch (error) {
      setError("Failed to create announcement. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleBranchToggle = (branch: string) => {
    setTargetBranches((prev) => (prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch]))
  }

  const handleClose = () => {
    if (!loading) {
      setTitle("")
      setContent("")
      setPriority("medium")
      setType("general")
      setTargetAudience("all")
      setTargetBranches([])
      setExpiresDate(undefined)
      setIsPinned(false)
      setError("")
      onClose()
    }
  }

  const mainBranches = departments.filter((d) => d.branch_type === "main_branch")

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Announcement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter announcement title"
              disabled={loading}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement content here..."
              rows={6}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="policy">Policy Update</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="urgent">Urgent Notice</SelectItem>
                  <SelectItem value="celebration">Celebration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Select value={targetAudience} onValueChange={setTargetAudience} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                <SelectItem value="managers">Managers Only</SelectItem>
                <SelectItem value="staff">Staff Only</SelectItem>
                <SelectItem value="branch_specific">Specific Branches</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Branch Selection */}
          {targetAudience === "branch_specific" && (
            <div className="space-y-2">
              <Label>Select Branches</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                {mainBranches.map((branch) => (
                  <div key={branch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`branch-${branch.name}`}
                      checked={targetBranches.includes(branch.name)}
                      onCheckedChange={() => handleBranchToggle(branch.name)}
                      disabled={loading}
                    />
                    <Label htmlFor={`branch-${branch.name}`} className="text-sm">
                      {branch.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label>Expiry Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !expiresDate && "text-muted-foreground")}
                  disabled={loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresDate ? format(expiresDate, "PPP") : "Select expiry date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={expiresDate} onSelect={setExpiresDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Pin Option */}
          <div className="flex items-center space-x-2">
            <Checkbox id="pin" checked={isPinned} onCheckedChange={setIsPinned} disabled={loading} />
            <Label htmlFor="pin" className="flex items-center space-x-2">
              <Pin className="h-4 w-4" />
              <span>Pin this announcement to the top</span>
            </Label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Announcement"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
