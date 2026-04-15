import { normalizeBranchSlug, normalizeSubBranchSlug } from "@/lib/utils/org-structure";

type BranchRel = { id: string; name: string } | null;
type SubRel = { id: string; name: string } | null;

export type ProfileSlice = {
  role: string | null;
  branch: string | null;
  department: string | null;
};

export type DocumentRowSlice = {
  scope?: string | null;
  user_id: string;
  branch_id?: string | null;
  sub_branch_id?: string | null;
  branch?: BranchRel | { id: string; name: string }[] | null;
  sub_branch?: SubRel | { id: string; name: string }[] | null;
};

function rel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Resolve profile.branch / profile.department slugs to compare with branch/sub_branch names. */
export function canViewBranchSharedDocument(
  profile: ProfileSlice,
  doc: DocumentRowSlice
): boolean {
  if ((doc.scope ?? "employee") !== "branch") return false;

  const br = rel(doc.branch);
  const sub = rel(doc.sub_branch);
  const userBranch = profile.branch ?? null;
  const userDept = profile.department ?? null;

  const branchName = br?.name ?? null;
  if (!branchName || !userBranch) return false;

  if (normalizeBranchSlug(branchName) !== normalizeBranchSlug(userBranch)) {
    return false;
  }

  if (profile.role === "branch_lead") {
    return true;
  }

  if (!doc.sub_branch_id) {
    return true;
  }

  const subName = sub?.name ?? null;
  if (!subName || !userDept) return false;

  return normalizeSubBranchSlug(subName) === normalizeSubBranchSlug(userDept);
}

export function canUploadBranchDocumentRole(role: string | null): boolean {
  return role === "admin" || role === "branch_lead" || role === "sub_branch_lead";
}

export function assertBranchUploadMatchesProfile(
  profile: ProfileSlice,
  selectedBranchId: string,
  selectedSubBranchId: string | null,
  branchRows: { id: string; name: string }[],
  subBranchRows: { id: string; name: string }[]
): string | null {
  if (profile.role === "admin") return null;

  const branch = branchRows.find((b) => b.id === selectedBranchId);
  if (!branch) return "Invalid branch";

  if (profile.role === "branch_lead") {
    if (normalizeBranchSlug(branch.name) !== normalizeBranchSlug(profile.branch ?? "")) {
      return "You can only upload to your branch";
    }
    return null;
  }

  if (profile.role === "sub_branch_lead") {
    if (normalizeBranchSlug(branch.name) !== normalizeBranchSlug(profile.branch ?? "")) {
      return "You can only upload within your branch";
    }
    if (!selectedSubBranchId) {
      return "Select a sub-branch";
    }
    const sub = subBranchRows.find((s) => s.id === selectedSubBranchId);
    if (!sub) return "Invalid sub-branch";
    if (
      normalizeSubBranchSlug(sub.name) !== normalizeSubBranchSlug(profile.department ?? "")
    ) {
      return "You can only upload to your own sub-branch";
    }
    return null;
  }

  return "You are not allowed to upload branch documents";
}

export function documentVisibleToProfile(
  profile: ProfileSlice,
  doc: DocumentRowSlice,
  userId: string
): boolean {
  if (profile.role === "admin") return true;
  const scope = doc.scope ?? "employee";
  if (scope === "employee") {
    return doc.user_id === userId;
  }
  return canViewBranchSharedDocument(profile, doc);
}

export function canDeleteBranchDocument(
  profile: ProfileSlice,
  doc: DocumentRowSlice,
  userId: string
): boolean {
  if (profile.role === "admin") return true;
  if ((doc.scope ?? "employee") !== "branch") return false;
  if (doc.user_id === userId) return true;
  if (profile.role === "branch_lead") {
    const br = rel(doc.branch);
    return (
      !!br &&
      normalizeBranchSlug(br.name) === normalizeBranchSlug(profile.branch ?? "")
    );
  }
  return false;
}
