import { normalizeBranchSlug } from "@/lib/utils/org-structure";

/** Admins: all tasks. Branch leads: tasks with no branch or same branch as profile (slug-normalized). */
export function userCanManageTaskAsCreator(
  profile: { role: string; branch: string | null },
  taskBranchDisplayName: string | null
): boolean {
  if (profile.role === "admin") return true;
  if (profile.role !== "branch_lead") return false;
  if (!taskBranchDisplayName) return true;
  const userSlug = profile.branch ? normalizeBranchSlug(profile.branch) : null;
  const taskSlug = normalizeBranchSlug(taskBranchDisplayName);
  if (taskSlug && userSlug && taskSlug !== userSlug) return false;
  return true;
}
