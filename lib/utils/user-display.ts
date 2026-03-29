/**
 * Utility functions for consistent user name display across the application
 */

interface UserLike {
  full_name?: string | null
  name?: string | null
  email?: string
}

/**
 * Get a consistent display name for a user across the application
 * Priority: full_name -> name -> email prefix -> "Unknown User"
 */
export function getUserDisplayName(user: UserLike | null | undefined): string {
  if (!user) return "Unknown User"

  // First try full_name (Supabase standard)
  if (user.full_name && user.full_name.trim()) {
    return user.full_name.trim()
  }

  // Then try name (legacy/API standard)
  if (user.name && user.name.trim()) {
    return user.name.trim()
  }

  // Fall back to email prefix
  if (user.email) {
    return user.email.split("@")[0]
  }

  return "Unknown User"
}

/**
 * Get initials from a user's display name
 */
export function getUserInitials(user: UserLike | null | undefined): string {
  const displayName = getUserDisplayName(user)

  if (displayName === "Unknown User") {
    return "??"
  }

  return (
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??"
  )
}

/**
 * Get a fallback name for forms and assignments
 * Returns display name or "Unassigned" for null users
 */
export function getUserAssignmentName(user: UserLike | null | undefined): string {
  if (!user) return "Unassigned"
  return getUserDisplayName(user)
}
