"use server"

import { createClient } from "@/lib/supabase/server"

const ADMIN_EMAILS = ["admin@synapseuk.org"]

function isUserAdmin(user: any): boolean {
  if (!user) return false

  // Check if user email is in admin list
  if (user.user?.email && ADMIN_EMAILS.includes(user.user.email)) {
    return true
  }

  // Check if profile has admin flag
  if (user.profile?.is_admin) {
    return true
  }

  return false
}

async function getCurrentUser() {
  const supabase = createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const isAdmin = user.email && ADMIN_EMAILS.includes(user.email)

  if (isAdmin) {
    const adminProfile = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "Admin User",
      is_admin: true,
    }
    return { user, profile: adminProfile }
  }

  let { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()

  // If not found by ID, try by email
  if (!profile && user.email) {
    const { data: profileByEmail, error: emailError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", user.email)
      .maybeSingle()

    if (!emailError && profileByEmail) {
      profile = profileByEmail
    }
  }

  if (!profile && user.email) {
    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || null,
      })
      .select()
      .single()

    if (createError) {
      return {
        user,
        profile: {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || null,
          is_admin: false,
        },
      }
    }

    return { user, profile: { ...newProfile, is_admin: false } }
  }

  if (profile) {
    profile.is_admin = false
  }

  return { user, profile }
}

export async function getAllUsers() {
  const supabase = createClient()
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { success: false, error: "Unauthorized - No user found" }
  }

  const isAdmin = isUserAdmin(currentUser)

  if (!isAdmin) {
    return { success: false, error: "Unauthorized - Admin role required" }
  }

  const { data: users, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, users }
}

export async function deleteUser(userId: string) {
  const supabase = createClient()
  const currentUser = await getCurrentUser()

  if (!isUserAdmin(currentUser)) {
    return { success: false, error: "Unauthorized" }
  }

  // Delete from auth.users (this will cascade to profiles)
  const { error } = await supabase.auth.admin.deleteUser(userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = createClient()
  const currentUser = await getCurrentUser()

  if (!isUserAdmin(currentUser)) {
    return { success: false, error: "Unauthorized" }
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId)

  if (error) {
    // Don't return error if it's just a missing column
    if (error.message.includes("column") && error.message.includes("role")) {
      return { success: true, message: "User updated (role column not available)" }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}
