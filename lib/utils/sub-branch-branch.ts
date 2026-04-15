import type { SupabaseClient } from "@supabase/supabase-js";

/** Row from `public.sub_branches` (id, name, created_at, …). */
export type SubBranchRow = {
  id: string;
  name: string;
};

/** Ensure `branch_id` exists in `branches` (avoids opaque FK violations on `tasks_branch_id_fkey`). */
export async function assertBranchExists(
  supabase: SupabaseClient,
  branchId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("branches")
    .select("id")
    .eq("id", branchId)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      message:
        "That branch no longer exists in the database. Refresh the page and choose a branch again.",
    };
  }
  return { ok: true };
}

/** Ensure `sub_branch_id` exists in `sub_branches` (no parent-branch column in DB). */
export async function assertSubBranchExists(
  supabase: SupabaseClient,
  subBranchId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("sub_branches")
    .select("id")
    .eq("id", subBranchId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Invalid sub-branch" };
  }
  return { ok: true };
}
