"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  MoreHorizontal,
  Eye,
  Check,
  X,
  Clock,
  Calendar,
  DollarSign,
  Users,
  MessageSquare,
  CheckCircle,
  FileText,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { completeRequestAction, addCommentAction, getRequestCommentsAction } from "@/lib/actions/request-actions"
import { toast } from "@/hooks/use-toast"

interface Request {
  id: number
  type: "leave" | "expense" | "shift_swap" | "general"
  title: string
  description: string
  requester: {
    id: number
    name: string
    role: string
  }
  status: "pending" | "approved" | "rejected" | "cancelled" | "completed"
  priority: "low" | "medium" | "high"
  created_date: string
  requested_date?: string
  amount?: number
  approver?: {
    id: number
    name: string
  }
  approved_date?: string
}

interface RequestListProps {
  requests: Request[]
  canApprove?: boolean
  onApprove?: (requestId: number) => void
  onReject?: (requestId: number) => void
  onView?: (request: Request) => void
  onUpdate?: () => void
}

export function RequestList({ requests, canApprove = false, onApprove, onReject, onView, onUpdate }: RequestListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [replyMessage, setReplyMessage] = useState("")
  const [comments, setComments] = useState<any[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requester.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || request.type === typeFilter
    const matchesStatus = statusFilter === "all" || request.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "leave":
        return <Calendar className="h-4 w-4" />
      case "expense":
        return <DollarSign className="h-4 w-4" />
      case "shift_swap":
        return <Users className="h-4 w-4" />
      case "general":
        return <FileText className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "leave":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "expense":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "shift_swap":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "general":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
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

  const handleComplete = async (requestId: number) => {
    try {
      await completeRequestAction(requestId.toString())
      toast({
        title: "Success",
        description: "Request marked as completed successfully!",
      })
      onUpdate?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete request. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleReply = async () => {
    if (!selectedRequest || !replyMessage.trim()) return

    try {
      await addCommentAction(selectedRequest.id.toString(), replyMessage)
      setReplyMessage("")
      toast({
        title: "Success",
        description: "Reply added successfully!",
      })
      loadComments(selectedRequest.id.toString())
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add reply. Please try again.",
        variant: "destructive",
      })
    }
  }

  const loadComments = async (requestId: string) => {
    setIsLoadingComments(true)
    try {
      const commentsData = await getRequestCommentsAction(requestId)
      setComments(commentsData)
    } catch (error) {
      console.error("Failed to load comments:", error)
    } finally {
      setIsLoadingComments(false)
    }
  }

  const openReplyDialog = (request: Request) => {
    setSelectedRequest(request)
    loadComments(request.id.toString())
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="leave">Leave Requests</SelectItem>
                <SelectItem value="expense">Expense Claims</SelectItem>
                <SelectItem value="shift_swap">Shift Swaps</SelectItem>
                <SelectItem value="general">General Requests</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              {filteredRequests.length} of {requests.length} requests
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Cards */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                      {request.requester.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{request.title}</h3>
                      <Badge variant="secondary" className={getTypeColor(request.type)}>
                        <span className="flex items-center space-x-1">
                          {getTypeIcon(request.type)}
                          <span className="capitalize">{request.type.replace("_", " ")}</span>
                        </span>
                      </Badge>
                      <Badge variant="secondary" className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(request.priority)}>
                        {request.priority}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{request.description}</p>

                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>By {request.requester.name}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(request.created_date), { addSuffix: true })}</span>
                      {request.requested_date && (
                        <>
                          <span>•</span>
                          <span>For {new Date(request.requested_date).toLocaleDateString()}</span>
                        </>
                      )}
                      {request.amount && (
                        <>
                          <span>•</span>
                          <span>£{request.amount.toFixed(2)}</span>
                        </>
                      )}
                    </div>

                    {request.approver && request.approved_date && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {request.status === "approved" ? "Approved" : "Rejected"} by {request.approver.name} on{" "}
                        {new Date(request.approved_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {canApprove && request.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-900 bg-transparent"
                        onClick={() => onApprove?.(request.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900 bg-transparent"
                        onClick={() => onReject?.(request.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}

                  {canApprove && request.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 bg-transparent"
                      onClick={() => handleComplete(request.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  )}

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => openReplyDialog(request)}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Reply
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Request Details & Comments</DialogTitle>
                      </DialogHeader>

                      {selectedRequest && (
                        <div className="space-y-4">
                          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h3 className="font-semibold">{selectedRequest.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {selectedRequest.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge className={getStatusColor(selectedRequest.status)}>{selectedRequest.status}</Badge>
                              <Badge variant="outline">{selectedRequest.priority}</Badge>
                            </div>
                          </div>

                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {isLoadingComments ? (
                              <p className="text-sm text-gray-500">Loading comments...</p>
                            ) : comments.length > 0 ? (
                              comments.map((comment) => (
                                <div key={comment.id} className="flex space-x-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                      {comment.profiles?.full_name
                                        ?.split(" ")
                                        .map((n: string) => n[0])
                                        .join("")
                                        .toUpperCase() || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                                      <p className="text-sm">{comment.message}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {comment.profiles?.full_name} •{" "}
                                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500">No comments yet.</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Textarea
                              placeholder="Add a reply..."
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              rows={3}
                            />
                            <Button onClick={handleReply} disabled={!replyMessage.trim()}>
                              Send Reply
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView?.(request)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No requests found matching your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
