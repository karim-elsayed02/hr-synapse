/** Storage bucket for org-wide branch / sub-branch shared files (path: branchId/subSegment/…). */
export const BRANCH_DOCUMENTS_BUCKET = "branch_documents";

/** Path segment when a file applies to the whole branch (no specific sub-branch). */
export const BRANCH_WIDE_SEGMENT = "_branch";

export function branchDocumentStoragePath(
  branchId: string,
  subBranchId: string | null,
  safeFileName: string
): string {
  const sub = subBranchId?.trim() ? subBranchId.trim() : BRANCH_WIDE_SEGMENT;
  return `${branchId}/${sub}/${Date.now()}_${safeFileName}`;
}
