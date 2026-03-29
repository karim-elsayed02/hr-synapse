"use server"

import { createClient } from "@/lib/supabase/server"
import { callStaffManagementAPI } from "@/lib/config/api-client"

const getCurrentUserId = async () => {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[v0] Safeguarding auth check:", { hasUser: !!user, userId: user?.id })

    return user?.id || null
  } catch (error) {
    console.log("[v0] Safeguarding auth error:", error)
    return null
  }
}

export async function getSafeguardingCasesAction() {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  return await callStaffManagementAPI("get_safeguarding_cases", {}, userId)
}

export async function submitIncidentReportAction(incidentData: any) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  console.log("[v0] Submitting incident report for user:", userId)
  return await callStaffManagementAPI("create_incident_report", incidentData, userId)
}

export async function updateCaseStatusAction(caseId: number, status: string) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  return await callStaffManagementAPI("update_case_status", { id: caseId, status }, userId)
}

export async function assignCaseAction(caseId: number, assignedTo: string) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  return await callStaffManagementAPI("assign_case", { id: caseId, assigned_to: assignedTo }, userId)
}

export async function getSafeguardingStatsAction() {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error("Not authenticated")

  try {
    const cases = await callStaffManagementAPI("get_safeguarding_cases", {}, userId)

    // Calculate statistics from the cases data
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const openCases = cases.filter((c: any) => c.status === "open" || c.status === "investigating").length
    const thisMonthCases = cases.filter((c: any) => new Date(c.created_at) >= thisMonth).length
    const resolvedCases = cases.filter((c: any) => c.status === "resolved" || c.status === "closed").length

    // Calculate average response time (mock for now, would need response_time field)
    const avgResponseTime = "2.4h" // This would be calculated from actual response times

    return {
      openCases,
      thisMonthCases,
      resolvedCases,
      avgResponseTime,
    }
  } catch (error) {
    console.log("[v0] Error getting safeguarding stats:", error)
    // Return zeros if API fails
    return {
      openCases: 0,
      thisMonthCases: 0,
      resolvedCases: 0,
      avgResponseTime: "0h",
    }
  }
}
