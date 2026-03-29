"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RequestList } from "@/components/requests/request-list"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { approveRequestAction } from "@/lib/actions/request-actions"
import { toast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function RequestsPage() {
  const { user } = useAuth()
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [requestsForMe, setRequestsForMe] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = async () => {
    if (!user?.id) return

    try {
      const myRequestsResponse = await fetch("/api/requests/my-requests")
      const myRequestsData = myRequestsResponse.ok ? await myRequestsResponse.json() : []

      const requestsForMeResponse = await fetch("/api/requests/for-approval")
      const requestsForMeData = requestsForMeResponse.ok ? await requestsForMeResponse.json() : []

      const transformRequest = (req: any) => ({
        id: req.id,
        type: req.type,
        title: req.title,
        description: req.description,
        status: req.status,
        priority: req.priority,
        created_date: req.created_at,
        requested_date: req.start_date || req.current_shift_date,
        amount: req.expense_amount,
        requester: {
          id: req.profile_id,
          name: req.profiles?.full_name || "Unknown User",
          role: req.profiles?.position || "Staff",
        },
        approver: req.approved_by
          ? {
              id: req.approved_by,
              name: "Approver", // Could be enhanced with actual approver data
            }
          : undefined,
        approved_date: req.approved_at,
      })

      setMyRequests(myRequestsData.map(transformRequest))
      setRequestsForMe(requestsForMeData.map(transformRequest))
    } catch (error) {
      console.error("Failed to fetch requests:", error)
      setMyRequests([])
      setRequestsForMe([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [user?.id])

  const handleApprove = async (requestId: number) => {
    try {
      await approveRequestAction(requestId.toString(), true)
      toast({
        title: "Success",
        description: "Request approved successfully!",
      })
      fetchRequests() // Refresh the data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (requestId: number) => {
    try {
      await approveRequestAction(requestId.toString(), false, "Request rejected")
      toast({
        title: "Success",
        description: "Request rejected successfully!",
      })
      fetchRequests() // Refresh the data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleView = (request: any) => {
    // Could implement a detailed view modal here
    console.log("View request:", request)
  }

  if (loading) {
    return <LoadingSpinner text="Loading requests..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Requests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your requests and approvals</p>
        </div>
        <Link href="/requests/new">
          <Button>New Request</Button>
        </Link>
      </div>

      <Tabs defaultValue="my-requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-requests">My Requests ({myRequests.length})</TabsTrigger>
          <TabsTrigger value="for-approval">For My Approval ({requestsForMe.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my-requests" className="space-y-4">
          {myRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No requests yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You haven't submitted any requests. Click "New Request" to get started.
                  </p>
                  <Link href="/requests/new">
                    <Button>Create Your First Request</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <RequestList requests={myRequests} canApprove={false} onView={handleView} onUpdate={fetchRequests} />
          )}
        </TabsContent>

        <TabsContent value="for-approval" className="space-y-4">
          {requestsForMe.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No requests to approve</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No requests have been assigned to you for approval.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <RequestList
              requests={requestsForMe}
              canApprove={true}
              onApprove={handleApprove}
              onReject={handleReject}
              onView={handleView}
              onUpdate={fetchRequests}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
