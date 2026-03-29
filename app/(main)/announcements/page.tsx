"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AnnouncementList } from "@/components/announcements/announcement-list"
import { NewAnnouncementModal } from "@/components/announcements/new-announcement-modal"
import { useCodeWords } from "@/lib/codewords-client"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

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

export default function AnnouncementsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { getAnnouncements, createAnnouncement, markAnnouncementRead } = useCodeWords()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number>(1) // TODO: Get from auth

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const data = await getAnnouncements()
      setAnnouncements(data || [])
    } catch (error) {
      console.error("Error loading announcements:", error)
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnnouncement = async (announcementData: any) => {
    try {
      await createAnnouncement(announcementData)
      toast({
        title: "Success",
        description: "Announcement created successfully",
      })
      loadAnnouncements() // Refresh the list
      return true
    } catch (error) {
      console.error("Error creating announcement:", error)
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      })
      return false
    }
  }

  const handleMarkAsRead = async (announcementId: number) => {
    try {
      await markAnnouncementRead(announcementId)
      // Update local state
      setAnnouncements((prev) =>
        prev.map((ann) => (ann.id === announcementId ? { ...ann, read_by: [...ann.read_by, currentUserId] } : ann)),
      )
    } catch (error) {
      console.error("Error marking announcement as read:", error)
    }
  }

  const handlePin = async (announcementId: number) => {
    // TODO: Implement pin functionality
    console.log("Pin announcement:", announcementId)
  }

  const handleUnpin = async (announcementId: number) => {
    // TODO: Implement unpin functionality
    console.log("Unpin announcement:", announcementId)
  }

  if (loading) {
    return <LoadingSpinner text="Loading announcements..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Announcements</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Stay updated with company news and updates</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowNewModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
          <Button variant="outline" onClick={() => router.push("/announcements/new")}>
            Create (Full Page)
          </Button>
        </div>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No announcements yet</p>
            <Button onClick={() => setShowNewModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create First Announcement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AnnouncementList
          announcements={announcements}
          currentUserId={currentUserId}
          onMarkAsRead={handleMarkAsRead}
          onPin={handlePin}
          onUnpin={handleUnpin}
          canManage={true} // TODO: Check user permissions
        />
      )}

      <NewAnnouncementModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleCreateAnnouncement}
      />
    </div>
  )
}
