import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
};

export default async function AdminUsersPage() {
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

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin users query error:", error);
    return <div className="p-6">Failed to load users.</div>;
  }

  const users = ((data ?? []) as unknown) as UserRow[];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin / Staff</h1>
          <p className="text-sm text-muted-foreground">
            Basic admin user list from Supabase profiles.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/staff" className="rounded-lg border px-4 py-2 text-sm font-medium">
            Staff directory
          </Link>
        </div>
      </div>

      <div className="rounded-xl border">
        <div className="grid grid-cols-4 gap-4 border-b px-4 py-3 text-sm font-medium">
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Created</div>
        </div>

        {users.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">No users found.</div>
        ) : (
          <div className="divide-y">
            {users.map((person) => (
              <div key={person.id} className="grid grid-cols-4 gap-4 px-4 py-3 text-sm">
                <div>{person.full_name ?? "Unnamed user"}</div>
                <div>{person.email ?? "—"}</div>
                <div className="capitalize">{person.role ?? "staff"}</div>
                <div>
                  {person.created_at ? new Date(person.created_at).toLocaleDateString() : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
