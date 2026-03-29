"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Calendar, AlertCircle, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Task {
  id: number
  title: string
  description: string
  status: "todo" | "in_progress" | "review" | "completed"
  priority: "low" | "medium" | "high"
  assigned_to: {
    id: number
    name: string
  }
  created_by: {
    id: number
    name: string
  }
  due_date?: string
  created_date: string
  branch: string
  tags?: string[]
}

interface KanbanBoardProps {
  tasks: Task[]
  onTaskMove: (taskId: number, newStatus: string) => void
  onTaskEdit: (task: Task) => void
  onTaskDelete: (taskId: number) => void
  onNewTask: (status: string) => void
  canEdit?: boolean
}

const columns = [
  { id: "todo", title: "To Do", color: "bg-gray-100 dark:bg-gray-800" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-100 dark:bg-blue-900" },
  { id: "review", title: "Review", color: "bg-orange-100 dark:bg-orange-900" },
  { id: "completed", title: "Completed", color: "bg-green-100 dark:bg-green-900" },
]

export function KanbanBoard({
  tasks,
  onTaskMove,
  onTaskEdit,
  onTaskDelete,
  onNewTask,
  canEdit = false,
}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    if (draggedTask && draggedTask.status !== status) {
      onTaskMove(draggedTask.id, status)
    }
    setDraggedTask(null)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "medium":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "low":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="h-3 w-3" />
      case "medium":
        return <Clock className="h-3 w-3" />
      default:
        return null
    }
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status)
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-6">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id)

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <Card className={`${column.color} border-2 border-dashed border-transparent transition-colors`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    {column.title}
                    <Badge variant="secondary" className="text-xs">
                      {columnTasks.length}
                    </Badge>
                  </CardTitle>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onNewTask(column.id)} className="h-8 w-8 p-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-move hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
                    draggable={canEdit}
                    onDragStart={(e) => handleDragStart(e, task)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Task Header */}
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium text-sm line-clamp-2 flex-1 pr-2">{task.title}</h3>
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onTaskEdit(task)}>Edit Task</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onTaskDelete(task.id)} className="text-red-600">
                                  Delete Task
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        {/* Task Description */}
                        {task.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{task.description}</p>
                        )}

                        {/* Priority and Tags */}
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className={`text-xs ${getPriorityColor(task.priority)}`}>
                            <span className="flex items-center gap-1">
                              {getPriorityIcon(task.priority)}
                              {task.priority}
                            </span>
                          </Badge>
                          {task.tags?.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        {/* Due Date */}
                        {task.due_date && (
                          <div
                            className={`flex items-center gap-1 text-xs ${
                              isOverdue(task.due_date)
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            <span>Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}</span>
                          </div>
                        )}

                        {/* Assignee */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 text-xs">
                                {task.assigned_to.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{task.assigned_to.name}</span>
                          </div>

                          <div className="text-xs text-gray-500 dark:text-gray-400">{task.branch}</div>
                        </div>

                        {/* Created Info */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
                          Created by {task.created_by.name} •{" "}
                          {formatDistanceToNow(new Date(task.created_date), { addSuffix: true })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No tasks in this column</p>
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => onNewTask(column.id)} className="mt-2 text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        Add task
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
