"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const createAuthenticatedSupabaseClient = async () => {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    },
  )
  return supabase
}

const getCurrentUser = async () => {
  const supabase = await createAuthenticatedSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { user, supabase }
}

export async function getDocumentsAction() {
  console.log("[v0] Getting documents...")
  const { user, supabase } = await getCurrentUser()
  if (!user) {
    console.log("[v0] No authenticated user found")
    throw new Error("Not authenticated")
  }

  console.log("[v0] User authenticated:", user.id)

  // This will automatically return documents based on the RLS policies
  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.log("[v0] Error fetching documents:", error)
    throw new Error("Failed to fetch documents")
  }

  console.log("[v0] Documents fetched:", documents?.length || 0)
  return documents || []
}

export async function uploadDocumentAction(documentData: any) {
  console.log("[v0] Uploading document...")
  const { user, supabase } = await getCurrentUser()
  if (!user) {
    console.log("[v0] No authenticated user found")
    throw new Error("Not authenticated")
  }

  console.log("[v0] User authenticated:", user.id)
  console.log("[v0] Document data:", {
    title: documentData.title,
    type: documentData.type,
    category: documentData.category,
    targetUserId: documentData.targetUserId,
  })

  if (!documentData.title || !documentData.type || !documentData.category) {
    console.log("[v0] Missing required fields")
    throw new Error("Missing required fields: title, type, and category are required")
  }

  const { data: authUser } = await supabase.auth.getUser()
  console.log("[v0] Auth context check - User ID:", authUser?.user?.id)
  console.log("[v0] Inserting with user_id:", user.id)

  const { data: document, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title: documentData.title,
      type: documentData.type,
      category: documentData.category,
      description: documentData.description || null,
      expiry_date: documentData.expiryDate || null,
      file_name: documentData.fileName,
      file_size: documentData.fileSize,
      file_type: documentData.fileType,
      target_user_id: documentData.targetUserId || null,
      status: "valid",
    })
    .select()
    .single()

  if (error) {
    console.log("[v0] Error uploading document:", error)
    console.log("[v0] Error details:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    if (error.message.includes("row-level security")) {
      console.log("[v0] RLS Policy violation - checking auth state")
      const { data: currentUser } = await supabase.auth.getUser()
      console.log("[v0] Current auth user:", currentUser?.user?.id)
    }
    throw new Error(`Failed to upload document: ${error.message}`)
  }

  console.log("[v0] Document uploaded successfully:", document.id)
  return document
}

export async function updateDocumentAction(documentId: number, documentData: any) {
  const { user, supabase } = await getCurrentUser()
  if (!user) throw new Error("Not authenticated")

  // Update document in Supabase database
  const { data: updatedDocument, error } = await supabase
    .from("documents")
    .update({
      title: documentData.title,
      type: documentData.type,
      category: documentData.category,
      description: documentData.description || null,
      expiry_date: documentData.expiryDate || null,
      file_name: documentData.fileName,
      file_size: documentData.fileSize,
      file_type: documentData.fileType,
      target_user_id: documentData.targetUserId || null,
      status: "valid",
    })
    .eq("id", documentId)
    .select()
    .single()

  if (error) {
    console.log("[v0] Error updating document:", error)
    throw new Error("Failed to update document")
  }

  console.log("[v0] Document updated successfully:", updatedDocument.id)
  return updatedDocument
}
