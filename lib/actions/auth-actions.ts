"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

const ADMIN_EMAILS = ["admin@synapseuk.org"]

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/dashboard")
}

export async function logoutAction() {
  const supabase = createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  redirect("/login")
}

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("fullName") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: "Registration successful! Please check your email to verify your account." }
}

export async function getCurrentUserAction() {
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

export async function checkAuthAction() {
  const result = await getCurrentUserAction()

  if (!result) {
    return { authenticated: false, user: null, profile: null }
  }

  return {
    authenticated: true,
    user: result.user,
    profile: result.profile,
  }
}
