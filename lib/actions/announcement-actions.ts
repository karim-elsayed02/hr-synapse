"use server"

import { createClient } from "@/lib/supabase/server"
import { callStaffManagementAPI } from "@/lib/config/api-client"

const getCurrentUserId = async () => {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      console.log("[v0] Auth error in announcement actions:", error)
      return null
    }

    // For now, return a mock user ID since we're using CodeWords API
    // TODO: Map Supabase user to CodeWords user ID
    return 1
  } catch (error) {
    console.error("[v0] Error getting current user:", error)
    return null
  }
}

export async function getAnnouncementsAction() {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  return await callStaffManagementAPI("get_announcements", {}, userId)
}

export async function createAnnouncementAction(announcementData: any) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  return await callStaffManagementAPI("create_announcement", announcementData, userId)
}

export async function markAnnouncementReadAction(announcementId: number) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  return await callStaffManagementAPI(
    "mark_announcement_read",
    { announcement_id: announcementId, user_id: userId },
    userId,
  )
}
