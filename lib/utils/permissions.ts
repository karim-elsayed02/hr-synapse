import { BRANCH_SLUGS } from "./org-structure"

export type UserRole =
  | "admin"
  | "executive"
  | "branch_lead"
  | "sub_branch_lead"
  | "staff"

export interface User {
  id: string
  email: string
  role: UserRole
  branch?: string
  department?: string
  full_name?: string
}

/** Every role value allowed by the profiles table. */
export const STAFF_PROFILE_ROLES = [
  "admin",
  "executive",
  "branch_lead",
  "sub_branch_lead",
  "staff",
] as const

export type StaffProfileRole = (typeof STAFF_PROFILE_ROLES)[number]

const _STAFF_ROLE_SET: ReadonlySet<string> = new Set(STAFF_PROFILE_ROLES)

export function isStaffProfileRole(role: string): role is StaffProfileRole {
  return _STAFF_ROLE_SET.has(role)
}

/** Returns true for branch_lead or sub_branch_lead. */
export function isManagerLikeRole(role: string | null | undefined): boolean {
  if (!role) return false
  return role === "branch_lead" || role === "sub_branch_lead"
}

/** True for admin AND executive — both have full visibility over data/tasks/users. */
export function isExecutiveTeam(user: User): boolean {
  return user.role === "admin" || user.role === "executive"
}

/** True only for admin — required for settings and admin-only system pages. */
export function isAdmin(user: User): boolean {
  return user.role === "admin"
}

export function isBranchLead(user: User): boolean {
  return user.role === "branch_lead"
}

export function isMentor(user: User): boolean {
  return user.role === "sub_branch_lead"
}

// Full access permissions (Executive Team = admin + executive)
export function canAccessUserManagement(user: User): boolean {
  return isExecutiveTeam(user)
}

/** Settings page is admin-only; executive team does not have access. */
export function canAccessSettings(user: User): boolean {
  return isAdmin(user)
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

/** Any authenticated staff member can open the work log page (submit or review). */
export function canAccessStaffWorkLog(role: string | null | undefined): boolean {
  return isStaffProfileRole(role ?? "")
}

/** Admin and executive can approve/reject work log requests. */
export function canApproveWorkLog(role: string | null | undefined): boolean {
  return role === "admin" || role === "executive"
}

/** Elevated roles see all work logs; others only see their own (enforced in page/API). */
export function canViewAllWorkLogs(role: string | null | undefined): boolean {
  return role === "admin" || role === "executive" || role === "branch_lead"
}

export function canViewBranchStaff(user: User, targetBranch?: string): boolean {
  if (isExecutiveTeam(user)) return true
  if (isBranchLead(user) && user.branch === targetBranch) return true
  return false
}

// Basic permissions (Mentors and all users)
export function canViewDirectory(user: User): boolean {
  return true
}

export function canMakeRequests(user: User): boolean {
  return true
}

export function canAddTasksToBranch(user: User, targetBranch?: string): boolean {
  if (isExecutiveTeam(user)) return true
  if (isBranchLead(user) && user.branch === targetBranch) return true
  if (isMentor(user) && user.branch === targetBranch) return true
  return false
}

export function canViewOwnDocuments(user: User): boolean {
  return true
}

export function canUploadDocuments(user: User): boolean {
  return true
}

export function canEditUser(currentUser: User, targetUser: User): boolean {
  if (isExecutiveTeam(currentUser)) return true

  if (isBranchLead(currentUser) && currentUser.branch === targetUser.branch) {
    return true
  }

  if (currentUser.id === targetUser.id) return true

  return false
}

export function getAccessibleBranches(user: User): string[] {
  if (isExecutiveTeam(user)) {
    return [...BRANCH_SLUGS]
  }

  if (isManagerLikeRole(user.role) && user.branch) {
    return [user.branch]
  }

  if (user.role === "staff" && user.branch) {
    return [user.branch]
  }

  return []
}
