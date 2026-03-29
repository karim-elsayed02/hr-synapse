"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pin, Eye, Edit, Trash2, AlertCircle, Info, CheckCircle, Users, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Announcement {
  id: number
  title: string
  content: string
  priority: "low" | "medium" | "high" | "urgent"
  type: "general" | "policy" | "training" | "urgent" | "celebration"
  author: {
    id: number
    name: string
    role: string
  }
  created_date: string
  expires_date?: string
  is_pinned: boolean
  target_audience: "all" | "managers" | "staff" | "branch_specific"
  target_branches?: string[]
  read_by: number[]
  total_recipients: number
}

interface AnnouncementListProps {
  announcements: Announcement[]
  currentUserId: number
  onMarkAsRead: (announcementId: number) => void
  onPin: (announcementId: number) => void
  onUnpin: (announcementId: number) => void
  onEdit?: (announcement: Announcement) => void
  onDelete?: (announcementId: number) => void
  canManage?: boolean
}

export function AnnouncementList({
  announcements,
  currentUserId,
  onMarkAsRead,
  onPin,
  onUnpin,
  onEdit,
  onDelete,
  canManage = false,
}: AnnouncementListProps) {
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Set<number>>(new Set())

  const safeAnnouncements = Array.isArray(announcements) ? announcements : []

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedAnnouncements)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
      // Mark as read when expanded
      if (!isRead(id)) {
        onMarkAsRead(id)
      }
    }
    setExpandedAnnouncements(newExpanded)
  }

  const isRead = (announcementId: number) => {
    const announcement = safeAnnouncements.find((a) => a.id === announcementId)
    return announcement?.read_by.includes(currentUserId) || false
  }

  const isExpired = (expiresDate?: string) => {
    if (!expiresDate) return false
    return new Date(expiresDate) < new Date()
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200"
      case "medium":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200"
      case "low":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200"
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle className="h-3 w-3" />
      case "high":
        return <AlertCircle className="h-3 w-3" />
      case "medium":
        return <Info className="h-3 w-3" />
      case "low":
        return <CheckCircle className="h-3 w-3" />
      default:
        return <Info className="h-3 w-3" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "policy":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "training":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "celebration":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    }
  }

  const getReadPercentage = (announcement: Announcement) => {
    if (announcement.total_recipients === 0) return 0
    return Math.round((announcement.read_by.length / announcement.total_recipients) * 100)
  }

  // Sort announcements: pinned first, then by priority and date
  const sortedAnnouncements = [...safeAnnouncements].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1

    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff

    return new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
  })

  if (safeAnnouncements.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No announcements to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedAnnouncements.map((announcement) => {
        const isAnnouncementRead = isRead(announcement.id)
        const isExpiredAnnouncement = isExpired(announcement.expires_date)
        const isExpanded = expandedAnnouncements.has(announcement.id)
        const readPercentage = getReadPercentage(announcement)

        return (
          <Card
            key={announcement.id}
            className={`transition-all duration-200 ${
              announcement.is_pinned ? "ring-2 ring-blue-200 dark:ring-blue-800" : ""
            } ${!isAnnouncementRead ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" : ""} ${
              isExpiredAnnouncement ? "opacity-60" : ""
            } hover:shadow-md`}
          >
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      {announcement.is_pinned && <Pin className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                      <h3
                        className={`font-semibold text-lg cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                          !isAnnouncementRead ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => toggleExpanded(announcement.id)}
                      >
                        {announcement.title}
                      </h3>
                      {!isAnnouncementRead && <div className="h-2 w-2 bg-blue-600 rounded-full"></div>}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary" className={getPriorityColor(announcement.priority)}>
                        <span className="flex items-center gap-1">
                          {getPriorityIcon(announcement.priority)}
                          {announcement.priority}
                        </span>
                      </Badge>
                      <Badge variant="secondary" className={getTypeColor(announcement.type)}>
                        {announcement.type}
                      </Badge>
                      {isExpiredAnnouncement && (
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        >
                          Expired
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!isAnnouncementRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMarkAsRead(announcement.id)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {announcement.is_pinned ? (
                            <DropdownMenuItem onClick={() => onUnpin(announcement.id)}>
                              <Pin className="h-4 w-4 mr-2" />
                              Unpin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => onPin(announcement.id)}>
                              <Pin className="h-4 w-4 mr-2" />
                              Pin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onEdit?.(announcement)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete?.(announcement.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Content Preview */}
                <div className="text-gray-600 dark:text-gray-400">
                  {isExpanded ? (
                    <div className="whitespace-pre-wrap">{announcement.content}</div>
                  ) : (
                    <p className="line-clamp-2">{announcement.content}</p>
                  )}
                  {announcement.content.length > 150 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(announcement.id)}
                      className="mt-2 p-0 h-auto text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      {isExpanded ? "Show less" : "Read more"}
                    </Button>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs">
                          {announcement.author.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{announcement.author.name}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(announcement.created_date), { addSuffix: true })}</span>
                    </div>

                    {announcement.expires_date && (
                      <div className="flex items-center space-x-1">
                        <span>Expires: {new Date(announcement.expires_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center space-x-2">
                      <Users className="h-3 w-3" />
                      <span>
                        {readPercentage}% read ({announcement.read_by.length}/{announcement.total_recipients})
                      </span>
                    </div>
                  )}
                </div>

                {/* Target Audience */}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Target: </span>
                  {announcement.target_audience === "all" && "All Staff"}
                  {announcement.target_audience === "managers" && "Managers Only"}
                  {announcement.target_audience === "staff" && "Staff Only"}
                  {announcement.target_audience === "branch_specific" &&
                    `Branches: ${announcement.target_branches?.join(", ")}`}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
