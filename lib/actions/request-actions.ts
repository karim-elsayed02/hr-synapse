"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const getSupabaseClient = () => {
  const cookieStore = cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

const getCurrentUserId = async () => {
  try {
    const supabase = getSupabaseClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user.id
  } catch (error) {
    return null
  }
}

const getLineManagerId = async (userId: string) => {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.from("profiles").select("line_manager_id").eq("id", userId).single()

  if (error) {
    console.log("[v0] Error getting line manager:", error)
    return null
  }

  return data?.line_manager_id || null
}

export async function getRequestsAction() {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("profile_id", userId) // Changed from user_id to profile_id
    .order("created_at", { ascending: false })

  if (error) {
    console.log("[v0] Error fetching requests:", error)
    throw new Error("Failed to fetch requests")
  }

  return data
}

export async function createRequestAction(requestData: any) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, error: "Not authenticated" }
  }

  const supabase = getSupabaseClient()

  try {
    const dbRequestData = {
      profile_id: userId,
      line_manager_id: requestData.sendTo,
      type: requestData.type,
      title: requestData.title,
      description: requestData.description,
      priority: requestData.priority || "medium",
      status: "pending",
      created_at: new Date().toISOString(),
    }

    if (requestData.type === "leave") {
      Object.assign(dbRequestData, {
        leave_type: requestData.leaveType,
        start_date: requestData.startDate,
        end_date: requestData.endDate,
        days_requested: requestData.daysRequested,
      })
    } else if (requestData.type === "expense") {
      Object.assign(dbRequestData, {
        expense_amount: requestData.amount,
        expense_category: requestData.category,
        receipt_url: requestData.receipt,
      })
    } else if (requestData.type === "shift_swap") {
      Object.assign(dbRequestData, {
        current_shift_date: requestData.currentShiftDate,
        current_shift_time: requestData.currentShiftTime,
        requested_shift_date: requestData.requestedShiftDate,
        requested_shift_time: requestData.requestedShiftTime,
        swap_with_profile_id: requestData.colleague,
      })
    }

    const { data, error } = await supabase.from("requests").insert([dbRequestData]).select().single()

    if (error) {
      console.error("[v0] Database insert error:", error)
      return { success: false, error: `Database error: ${error.message}` }
    }

    return { success: true, data }
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}` }
  }
}

export async function updateRequestAction(requestId: string, requestData: any) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("requests")
    .update(requestData)
    .eq("id", requestId)
    .eq("profile_id", userId) // Ensure user can only update their own requests
    .select()
    .single()

  if (error) {
    console.log("[v0] Error updating request:", error)
    throw new Error("Failed to update request")
  }

  return data
}

export async function approveRequestAction(requestId: string, approved: boolean, rejectionReason?: string) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  const supabase = getSupabaseClient()

  const updateData = {
    status: approved ? "approved" : "rejected",
    approved_by: userId,
    approved_at: new Date().toISOString(),
    ...(rejectionReason && { rejection_reason: rejectionReason }),
  }

  const { data, error } = await supabase
    .from("requests")
    .update(updateData)
    .eq("id", requestId)
    .eq("line_manager_id", userId) // Ensure only line manager can approve
    .select()
    .single()

  if (error) {
    console.log("[v0] Error approving request:", error)
    throw new Error("Failed to approve request")
  }

  return data
}

export async function completeRequestAction(requestId: string) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("requests")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("line_manager_id", userId) // Ensure only line manager can complete
    .select()
    .single()

  if (error) {
    console.log("[v0] Error completing request:", error)
    throw new Error("Failed to complete request")
  }

  return data
}

export async function addCommentAction(requestId: string, message: string) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("request_comments")
    .insert([
      {
        request_id: requestId,
        profile_id: userId,
        message: message,
      },
    ])
    .select(`
      *,
      profiles:profile_id (
        full_name,
        email
      )
    `)
    .single()

  if (error) {
    console.log("[v0] Error adding comment:", error)
    throw new Error("Failed to add comment")
  }

  return data
}

export async function getRequestCommentsAction(requestId: string) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("request_comments")
    .select(`
      *,
      profiles:profile_id (
        full_name,
        email
      )
    `)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })

  if (error) {
    console.log("[v0] Error fetching comments:", error)
    throw new Error("Failed to fetch comments")
  }

  return data
}
