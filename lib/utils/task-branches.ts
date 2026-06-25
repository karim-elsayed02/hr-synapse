import { normalizeBranchSlug, normalizeSubBranchSlug } from "@/lib/utils/org-structure";

type BranchRef = { id: string; name: string } | null;
type SubBranchRef = { id: string; name: string } | null;

type BranchRel = BranchRef | BranchRef[];
type SubBranchRel = SubBranchRef | SubBranchRef[];

export type TaskBranchLink = {
  branch: BranchRel;
  sub_branch_id?: string | null;
  sub_branch?: SubBranchRel;
};

export type TaskBranchScope = {
  branchSlug: string;
  subBranchSlug: string | null;
  branchName: string;
  subBranchName: string | null;
};

function one<T>(ref: T | T[] | null | undefined): T | null {
  if (ref == null) return null;
  return Array.isArray(ref) ? ref[0] ?? null : ref;
}

/** Branch + optional sub-branch scopes from junction table (falls back to tasks.branch_id). */
export function resolveTaskBranchScopes(task: {
  branch?: BranchRel;
  sub_branch?: SubBranchRel;
  task_branches?: TaskBranchLink[] | null;
}): TaskBranchScope[] {
  const links = task.task_branches ?? [];
  if (links.length > 0) {
    const scopes: TaskBranchScope[] = [];
    for (const link of links) {
      const branch = one(link.branch);
      if (!branch?.name) continue;
      const sub = one(link.sub_branch ?? null);
      scopes.push({
        branchSlug: normalizeBranchSlug(branch.name),
        subBranchSlug: sub?.name ? normalizeSubBranchSlug(sub.name) : null,
        branchName: branch.name,
        subBranchName: sub?.name ?? null,
      });
    }
    return scopes;
  }

  const branch = one(task.branch ?? null);
  if (!branch?.name) return [];

  const sub = one(task.sub_branch ?? null);
  return [
    {
      branchSlug: normalizeBranchSlug(branch.name),
      subBranchSlug: sub?.name ? normalizeSubBranchSlug(sub.name) : null,
      branchName: branch.name,
      subBranchName: sub?.name ?? null,
    },
  ];
}

/** All branch rows for badges (deduped by branch id/name). */
export function resolveTaskBranches(task: {
  branch?: BranchRel;
  task_branches?: TaskBranchLink[] | null;
}): { id: string; name: string }[] {
  const fromLinks = (task.task_branches ?? [])
    .map((link) => one(link.branch))
    .filter((b): b is { id: string; name: string } => Boolean(b?.id && b?.name));

  if (fromLinks.length > 0) {
    const seen = new Set<string>();
    return fromLinks.filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }

  const single = one(task.branch ?? null);
  return single?.id && single?.name ? [single] : [];
}

export function resolveTaskBranchSlugs(task: {
  branch?: BranchRel;
  task_branches?: TaskBranchLink[] | null;
}): string[] {
  return resolveTaskBranchScopes(task).map((s) => s.branchSlug).filter(Boolean);
}

/** User sees task if they match any branch scope (or task has no scopes). */
export function userMatchesTaskBranchScopes(
  task: {
    branch?: BranchRel;
    sub_branch?: SubBranchRel;
    task_branches?: TaskBranchLink[] | null;
  },
  userBranchSlug: string,
  userSubBranchSlug: string,
): boolean {
  const scopes = resolveTaskBranchScopes(task);
  if (scopes.length === 0) return true;
  return scopes.some((scope) => {
    if (scope.branchSlug !== userBranchSlug) return false;
    if (!scope.subBranchSlug) return true;
    return userSubBranchSlug === scope.subBranchSlug;
  });
}
