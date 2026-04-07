import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StaffDirectoryClient from "@/components/staff/staff-directory-client";

export type StaffRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  branch: string | null;
  department: string | null;
  phone: string | null;
  emergency_contact: string | null;
  hourly_rate: number | null;
  avatar_path: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type StaffPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  const { data: staff, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, branch, department, phone, emergency_contact, hourly_rate, avatar_path, created_at, updated_at"
    )
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Failed to load staff directory:", error);
  }

  const isAdmin = currentProfile?.role === "admin";

  const addStaffRaw = searchParams.addStaff;
  const addStaffParam = Array.isArray(addStaffRaw) ? addStaffRaw[0] : addStaffRaw;
  const openAddStaffModal =
    isAdmin && (addStaffParam === "1" || addStaffParam === "true");

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <StaffDirectoryClient
        initialStaff={(staff ?? []) as StaffRow[]}
        currentUserRole={currentProfile?.role ?? "staff"}
        canManageStaff={isAdmin}
        initialOpenAddStaff={openAddStaffModal}
      />
    </div>
  );
}
