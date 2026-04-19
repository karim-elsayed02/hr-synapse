/**
 * Canonical org structure for SynapseUK profiles (`branch` + `department` columns)
 * and task branch / sub-branch allowlists (matched against `branches.name` / `sub_branches.name`).
 * Stored profile values are lowercase slugs; use formatters for display.
 *
 * Branches: Executives, Admissions, Work Experience, Tutoring, Education, Social Media.
 * Sub-branches: Medical, Dental only.
 *
 * Keep rows in Supabase `branches` / `sub_branches` aligned with these names so slugify(name)
 * matches (e.g. "Work Experience" → work_experience).
 */

export const BRANCH_SLUGS = [
  "executives",
  "admissions",
  "work_experience",
  "tutoring",
  "education",
  "social_media",
] as const;
export type BranchSlug = (typeof BRANCH_SLUGS)[number];

export const SUB_BRANCH_SLUGS = ["medical", "dental"] as const;
export type SubBranchSlug = (typeof SUB_BRANCH_SLUGS)[number];

const BRANCH_SET = new Set<string>(BRANCH_SLUGS);
const SUB_BRANCH_SET = new Set<string>(SUB_BRANCH_SLUGS);

export const BRANCH_LABELS: Record<BranchSlug, string> = {
  executives: "Executives",
  admissions: "Admissions",
  work_experience: "Work Experience",
  tutoring: "Tutoring",
  education: "Education",
  social_media: "Social Media",
};

export const SUB_BRANCH_LABELS: Record<SubBranchSlug, string> = {
  medical: "Medical",
  dental: "Dental",
};

/** Map common legacy / human text to branch slug */
const BRANCH_ALIASES: Record<string, BranchSlug> = {
  executives: "executives",
  executive: "executives",
  admissions: "admissions",
  admission: "admissions",
  work_experience: "work_experience",
  workexperience: "work_experience",
  tutoring: "tutoring",
  education: "education",
  social_media: "social_media",
  socialmedia: "social_media",
};

const SUB_BRANCH_ALIASES: Record<string, SubBranchSlug> = {
  medical: "medical",
  dental: "dental",
};

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/** Normalize free text to a branch slug, or null if unknown */
export function normalizeBranchSlug(raw: string | null | undefined): BranchSlug | null {
  if (!raw?.trim()) return null;
  const key = slugify(raw);
  if (BRANCH_SET.has(key)) return key as BranchSlug;
  const alias = BRANCH_ALIASES[key];
  return alias ?? null;
}

/** Normalize free text to a sub-branch slug, or null if unknown */
export function normalizeSubBranchSlug(raw: string | null | undefined): SubBranchSlug | null {
  if (!raw?.trim()) return null;
  const key = slugify(raw);
  if (SUB_BRANCH_SET.has(key)) return key as SubBranchSlug;
  const alias = SUB_BRANCH_ALIASES[key];
  return alias ?? null;
}

export function formatBranchLabel(branch: string | null | undefined): string {
  const slug = normalizeBranchSlug(branch ?? "");
  if (slug) return BRANCH_LABELS[slug];
  if (!branch?.trim()) return "—";
  return branch.trim();
}

export function formatSubBranchLabel(department: string | null | undefined): string {
  const slug = normalizeSubBranchSlug(department ?? "");
  if (slug) return SUB_BRANCH_LABELS[slug];
  if (!department?.trim()) return "—";
  return department.trim();
}

/** Task board / DB branch name filter */
export function isAllowedBranchName(name: string | null | undefined): boolean {
  return normalizeBranchSlug(name ?? "") !== null;
}

export function isAllowedSubBranchName(name: string | null | undefined): boolean {
  return normalizeSubBranchSlug(name ?? "") !== null;
}

export type BranchDeptValidation =
  | { ok: true; branch: string | null; department: string | null }
  | { ok: false; error: string };

/**
 * Validate API payloads: empty → null; otherwise must be known slugs.
 */
export function validateProfileBranchDept(
  branchRaw: unknown,
  departmentRaw: unknown
): BranchDeptValidation {
  const branchStr = typeof branchRaw === "string" ? branchRaw.trim() : "";
  const deptStr = typeof departmentRaw === "string" ? departmentRaw.trim() : "";

  const branch = branchStr === "" ? null : normalizeBranchSlug(branchStr);
  if (branchStr !== "" && !branch) {
    return {
      ok: false,
      error: `Invalid branch. Choose one of: ${BRANCH_SLUGS.join(", ")}`,
    };
  }

  const department = deptStr === "" ? null : normalizeSubBranchSlug(deptStr);
  if (deptStr !== "" && !department) {
    return {
      ok: false,
      error: `Invalid sub-branch. Choose one of: ${SUB_BRANCH_SLUGS.join(", ")}`,
    };
  }

  return { ok: true, branch, department };
}
