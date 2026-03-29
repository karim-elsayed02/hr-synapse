import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type BranchRow = {
  id: string;
  name?: string | null;
  description?: string | null;
  created_at?: string | null;
};

type SubBranchRow = {
  id: string;
  name?: string | null;
  description?: string | null;
  branch_id?: string | null;
  created_at?: string | null;
};

export default async function AdminBranchesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!me || me.role !== "admin") {
    return <div className="p-6">Access denied.</div>;
  }

  const [{ data: branchData, error: branchError }, { data: subBranchData, error: subBranchError }] =
    await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase.from("sub_branches").select("*").order("name"),
    ]);

  if (branchError || subBranchError) {
    console.error("Branch page errors:", branchError, subBranchError);
    return <div className="p-6">Failed to load branches.</div>;
  }

  const branches = ((branchData ?? []) as unknown) as BranchRow[];
  const subBranches = ((subBranchData ?? []) as unknown) as SubBranchRow[];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin / Branches</h1>
        <p className="text-sm text-muted-foreground">
          Basic branch and sub-branch overview from Supabase.
        </p>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="mb-4 text-lg font-medium">Branches</h2>

        {branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No branches found.</p>
        ) : (
          <div className="space-y-4">
            {branches.map((branch) => {
              const childSubBranches = subBranches.filter(
                (subBranch) => subBranch.branch_id === branch.id
              );

              return (
                <div key={branch.id} className="rounded-lg border p-4">
                  <div className="mb-2">
                    <p className="font-medium">{branch.name ?? "Unnamed branch"}</p>
                    {branch.description ? (
                      <p className="text-sm text-muted-foreground">{branch.description}</p>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Sub-branches</p>

                    {childSubBranches.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sub-branches.</p>
                    ) : (
                      <div className="space-y-2">
                        {childSubBranches.map((subBranch) => (
                          <div
                            key={subBranch.id}
                            className="rounded-md border px-3 py-2 text-sm"
                          >
                            {subBranch.name ?? "Unnamed sub-branch"}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
