import { normalizeBranchSlug, normalizeSubBranchSlug } from "@/lib/utils/org-structure";

export type StaffProfileSlice = {
  id: string;
  full_name: string | null;
  role?: string | null;
  branch?: string | null;
  department?: string | null;
  active?: boolean | null;
};

export type CreatorProfileSlice = {
  role: string;
  branch?: string | null;
  department?: string | null;
};

export type TaskScopeSlice = {
  branchSlug?: string | null;
  subBranchSlug?: string | null;
};

function isElevated(role: string): boolean {
  return role === "admin" || role === "executive";
}

function profileBranchSlug(p: StaffProfileSlice): string | null {
  return normalizeBranchSlug(p.branch ?? "");
}

function profileDeptSlug(p: StaffProfileSlice): string | null {
  return normalizeSubBranchSlug(p.department ?? "");
}

/**
 * Staff members a creator may assign tasks to, respecting role hierarchy.
 * Optionally narrowed by the task's branch / sub-branch.
 */
export function filterAssignableStaff(
  creator: CreatorProfileSlice,
  candidates: StaffProfileSlice[],
  taskScope?: TaskScopeSlice
): StaffProfileSlice[] {
  const active = candidates.filter((c) => c.active !== false && c.id);

  let pool: StaffProfileSlice[];

  if (isElevated(creator.role)) {
    pool = active;
  } else if (creator.role === "branch_lead") {
    const creatorBranch = normalizeBranchSlug(creator.branch ?? "");
    if (!creatorBranch) return [];
    pool = active.filter((c) => profileBranchSlug(c) === creatorBranch);
  } else if (creator.role === "sub_branch_lead") {
    const creatorBranch = normalizeBranchSlug(creator.branch ?? "");
    const creatorDept = normalizeSubBranchSlug(creator.department ?? "");
    if (!creatorBranch) return [];
    pool = active.filter((c) => {
      if (profileBranchSlug(c) !== creatorBranch) return false;
      if (!creatorDept) return true;
      const cDept = profileDeptSlug(c);
      return !cDept || cDept === creatorDept;
    });
  } else {
    pool = [];
  }

  if (taskScope?.branchSlug) {
    pool = pool.filter((c) => profileBranchSlug(c) === taskScope.branchSlug);
  }

  if (taskScope?.subBranchSlug) {
    pool = pool.filter((c) => {
      const cDept = profileDeptSlug(c);
      return !cDept || cDept === taskScope.subBranchSlug;
    });
  }

  return pool.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
}

export function canAssignToProfile(
  creator: CreatorProfileSlice,
  assignee: StaffProfileSlice,
  taskScope?: TaskScopeSlice
): boolean {
  return filterAssignableStaff(creator, [assignee], taskScope).length > 0;
}
