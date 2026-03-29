"use server"

import { createServerClient } from "@/lib/supabase/server"
import { callStaffManagementAPI } from "@/lib/config/api-client"

const getCurrentUserId = async () => {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      console.log("[v0] Server action: No authenticated user found")
      return null
    }

    console.log("[v0] Server action: Found authenticated user:", user.id)
    return user.id
  } catch (error) {
    console.log("[v0] Server action: Error getting user:", error)
    return null
  }
}

export async function getUsersAction() {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  return await callStaffManagementAPI("get_users", {}, userId)
}

export async function createUserAction(userData: any) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  return await callStaffManagementAPI("create_user", userData, userId)
}

export async function updateUserAction(targetUserId: number, userData: any) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  return await callStaffManagementAPI("update_user", { id: targetUserId, ...userData }, userId)
}
