"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface NewTaskModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (taskData: any) => Promise<boolean>
  initialStatus?: string
  assignees: Array<{ id: number; name: string; branch?: string; department?: string }>
  departments: Array<{ id: number; name: string; parent_name?: string; branch_type: string }>
}

export function NewTaskModal({
  open,
  onClose,
  onSubmit,
  initialStatus = "todo",
  assignees,
  departments,
}: NewTaskModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<string>("medium")
  const [assignedTo, setAssignedTo] = useState<string>("")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("") // Added department selection
  const [dueDate, setDueDate] = useState<Date>()
  const [tags, setTags] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const filteredAssignees = selectedDepartment
    ? assignees.filter((assignee) => assignee.department === selectedDepartment)
    : assignees

  const mainBranches = departments.filter((dept) => dept.branch_type === "main_branch")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!title.trim() || !assignedTo || !selectedDepartment) {
      setError("Please fill in all required fields")
      return
    }

    try {
      setLoading(true)

      const taskData = {
        title: title.trim(),
        description: description.trim(),
        status: initialStatus,
        priority,
        assigned_to: Number.parseInt(assignedTo),
        branch: selectedDepartment, // Use department as branch
        due_date: dueDate?.toISOString(),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }

      const success = await onSubmit(taskData)
      if (success) {
        // Reset form
        setTitle("")
        setDescription("")
        setPriority("medium")
        setAssignedTo("")
        setSelectedDepartment("") // Reset department
        setDueDate(undefined)
        setTags("")
        onClose()
      }
    } catch (error) {
      setError("Failed to create task. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setTitle("")
      setDescription("")
      setPriority("medium")
      setAssignedTo("")
      setSelectedDepartment("") // Reset department
      setDueDate(undefined)
      setTags("")
      setError("")
      onClose()
    }
  }

  const handleDepartmentChange = (department: string) => {
    setSelectedDepartment(department)
    setAssignedTo("") // Reset assignee when department changes
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide task details and requirements"
              rows={3}
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
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={selectedDepartment} onValueChange={handleDepartmentChange} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {mainBranches.map((department) => (
                    <SelectItem key={department.id} value={department.name}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assigned To */}
            <div className="space-y-2">
              <Label>Assigned To *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} disabled={loading || !selectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedDepartment ? "Select staff member" : "Select department first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredAssignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id.toString()}>
                      {assignee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDepartment && filteredAssignees.length === 0 && (
                <p className="text-xs text-amber-600">No staff members found in this department</p>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags separated by commas"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Separate multiple tags with commas (e.g., urgent, compliance, training)
            </p>
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
                "Create Task"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
