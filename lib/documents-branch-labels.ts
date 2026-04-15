import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * PostgREST cannot embed `branches` / `sub_branches` on `documents` without FKs in the DB.
 * After loading documents (with `branch_id` / `sub_branch_id` only), attach `branch` and
 * `sub_branch` `{ id, name }` objects by querying those tables — same shape the UI and
 * `branch-document-access` helpers expect.
 */
export async function enrichDocumentsWithBranchLabels(
  supabase: SupabaseClient,
  docs: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const branchIds = new Set<string>();
  const subIds = new Set<string>();

  for (const d of docs) {
    const scope = (d.scope as string | null | undefined) ?? "employee";
    if (scope !== "branch") continue;
    if (d.branch_id) branchIds.add(String(d.branch_id));
    if (d.sub_branch_id) subIds.add(String(d.sub_branch_id));
  }

  const [brRes, subRes] = await Promise.all([
    branchIds.size > 0
      ? supabase.from("branches").select("id, name").in("id", Array.from(branchIds))
      : Promise.resolve({ data: null as { id: string; name: string }[] | null, error: null }),
    subIds.size > 0
      ? supabase.from("sub_branches").select("id, name").in("id", Array.from(subIds))
      : Promise.resolve({ data: null as { id: string; name: string }[] | null, error: null }),
  ]);

  const brMap = new Map<string, { id: string; name: string }>();
  for (const r of brRes.data ?? []) {
    brMap.set(r.id, { id: r.id, name: r.name });
  }
  const subMap = new Map<string, { id: string; name: string }>();
  for (const r of subRes.data ?? []) {
    subMap.set(r.id, { id: r.id, name: r.name });
  }

  return docs.map((d) => {
    const scope = (d.scope as string | null | undefined) ?? "employee";
    if (scope !== "branch") return d;

    const bid = d.branch_id ? String(d.branch_id) : null;
    const sid = d.sub_branch_id ? String(d.sub_branch_id) : null;
    const branch = bid && brMap.has(bid) ? brMap.get(bid)! : null;
    const sub_branch = sid && subMap.has(sid) ? subMap.get(sid)! : null;

    return { ...d, branch, sub_branch };
  });
}
