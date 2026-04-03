export type UserRole =
  | "admin"
  | "manager"
  | "branch_lead"
  | "sub_branch_lead"
  | "staff"
  | "Chief Executive Officer"
  | "Chief Operating Officer"
  | "Chief Financial Officer"
  | "Tutoring Lead"
  | "Medical Lead"
  | "Dental Lead"
  | "Medical Admissions Lead"
  | "Dental Admissions Lead"
  | "Oxbridge Admissions Lead"
  | "Medical Work Experience Lead"
  | "Dental Work Experience Lead"
  | "Tutor"
  | "Dental Admissions Mentor"
  | "Medical Admissions Mentor"
  | "Dental Work Experience Mentor"
  | "Medical Work Experience Mentor"
  | "Ambassador"
  | "Medical Education Lead"
  | "Dental Education Lead"
  | "Medical Events Lead"
  | "Dental Events Lead"
  | "Events Curriculum Lead"
  | "Events Representative"
  | "Events Outreach Officer"

export interface User {
  id: string
  email: string
  role: UserRole
  branch?: string
  department?: string
  full_name?: string
}

/** Role values for staff directory API (matches org RBAC + legacy `manager`). */
export const STAFF_PROFILE_ROLES = [
  "staff",
  "branch_lead",
  "sub_branch_lead",
  "admin",
  "manager",
] as const

export type StaffProfileRole = (typeof STAFF_PROFILE_ROLES)[number]

export function isStaffProfileRole(role: string): role is StaffProfileRole {
  return (STAFF_PROFILE_ROLES as readonly string[]).includes(role)
}

/** Treat legacy `manager` like branch leads for permissions. */
export function isManagerLikeRole(role: string | null | undefined): boolean {
  const r = (role ?? "").toLowerCase()
  return r === "manager" || r === "branch_lead" || r === "sub_branch_lead"
}

export function isExecutiveTeam(user: User): boolean {
  return (
    user.role === "admin" ||
    user.role === "Chief Executive Officer" ||
    user.role === "Chief Operating Officer" ||
    user.role === "Chief Financial Officer"
  )
}

export function isBranchLead(user: User): boolean {
  return (
    user.role === "Tutoring Lead" ||
    user.role === "Medical Lead" ||
    user.role === "Dental Lead" ||
    user.role === "Medical Admissions Lead" ||
    user.role === "Dental Admissions Lead" ||
    user.role === "Oxbridge Admissions Lead" ||
    user.role === "Medical Work Experience Lead" ||
    user.role === "Dental Work Experience Lead" ||
    user.role === "Medical Education Lead" ||
    user.role === "Dental Education Lead" ||
    user.role === "Medical Events Lead" ||
    user.role === "Dental Events Lead" ||
    user.role === "Events Curriculum Lead"
  )
}

export function isMentor(user: User): boolean {
  return (
    user.role === "Tutor" ||
    user.role === "Dental Admissions Mentor" ||
    user.role === "Medical Admissions Mentor" ||
    user.role === "Dental Work Experience Mentor" ||
    user.role === "Medical Work Experience Mentor" ||
    user.role === "Ambassador" ||
    user.role === "Events Representative" ||
    user.role === "Events Outreach Officer"
  )
}

// Full access permissions (Executive Team)
export function canAccessUserManagement(user: User): boolean {
  return isExecutiveTeam(user)
}

export function canAccessSettings(user: User): boolean {
  return isExecutiveTeam(user)
}

export function canViewAllStaff(user: User): boolean {
  return isExecutiveTeam(user)
}

export function canCreateUser(user: User): boolean {
  return isExecutiveTeam(user)
}

export function canDeleteUser(currentUser: User, targetUser: User): boolean {
  if (!isExecutiveTeam(currentUser)) return false
  if (currentUser.id === targetUser.id) return false
  return true
}

// Branch-specific permissions (Branch Leads)
export function canViewBranchRequests(user: User, targetBranch?: string): boolean {
  if (isExecutiveTeam(user)) return true
  if (isBranchLead(user) && user.branch === targetBranch) return true
  return false
}

export function canViewBranchTasks(user: User, targetBranch?: string): boolean {
  if (isExecutiveTeam(user)) return true
  if (isBranchLead(user) && user.branch === targetBranch) return true
  return false
}

export function canMakeAnnouncements(user: User): boolean {
  return isExecutiveTeam(user) || isBranchLead(user)
}

export function canViewBranchStaff(user: User, targetBranch?: string): boolean {
  if (isExecutiveTeam(user)) return true
  if (isBranchLead(user) && user.branch === targetBranch) return true
  return false
}

// Basic permissions (Mentors and all users)
export function canViewDirectory(user: User): boolean {
  return true // All users can view directory
}

export function canMakeRequests(user: User): boolean {
  return true // All users can make requests
}

export function canAddTasksToBranch(user: User, targetBranch?: string): boolean {
  if (isExecutiveTeam(user)) return true
  if (isBranchLead(user) && user.branch === targetBranch) return true
  if (isMentor(user) && user.branch === targetBranch) return true
  return false
}

export function canViewOwnDocuments(user: User): boolean {
  return true // All users can view their own documents
}

export function canUploadDocuments(user: User): boolean {
  return true // All users can upload documents
}

export function canEditUser(currentUser: User, targetUser: User): boolean {
  // Executives can edit anyone
  if (isExecutiveTeam(currentUser)) return true

  // Branch leads can edit staff in their branch (mentors only)
  if (isBranchLead(currentUser) && isMentor(targetUser) && currentUser.branch === targetUser.branch) {
    return true
  }

  // Users can edit themselves
  if (currentUser.id === targetUser.id) return true

  return false
}

export function getAccessibleBranches(user: User): string[] {
  if (user.role === "admin") {
    // Admins can see all branches - this would typically come from a database query
    return ["London", "Manchester", "Birmingham", "Leeds", "Glasgow"]
  }

  if (isManagerLikeRole(user.role) && user.branch) {
    return [user.branch]
  }

  if (user.role === "staff" && user.branch) {
    return [user.branch]
  }

  return []
}
