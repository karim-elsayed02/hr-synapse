"use server"

import { createServiceClient } from "@codewords/client"

export const getApiClient = () => {
  const apiKey = process.env.CODEWORDS_API_KEY

  if (!apiKey) {
    // During build time, return null instead of throwing
    if (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV) {
      return null
    }
    throw new Error("CODEWORDS_API_KEY environment variable is not set. Please add it to your Vercel project settings.")
  }

  return createServiceClient(apiKey)
}

export const callStaffManagementAPI = async (operation: string, data?: any, userId?: number) => {
  try {
    const client = getApiClient()

    if (!client) {
      throw new Error("CodeWords API client is not available. Please configure CODEWORDS_API_KEY.")
    }

    const result = await client.runService("synapseuk_staff_management_simple_46b49828", "", {
      operation,
      data,
      user_id: userId,
      filters: {},
    })
    return result
  } catch (error) {
    console.error("[v0] API Error - Operation:", operation, "User ID:", userId, "Error:", error)

    if (error instanceof Error) {
      return { error: error.message, detail: "API call failed" }
    }
    return { error: "Unknown API error", detail: "API call failed" }
  }
}
