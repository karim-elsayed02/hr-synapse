"use server"

export async function createFirstAdmin(email: string, password: string, fullName: string) {
  // Admin already exists, this function is no longer needed
  return { success: false, error: "Admin account already exists" }
}
