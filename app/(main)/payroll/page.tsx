import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PayrollClient from "@/components/payroll/payroll-client";

export default async function PayrollPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (
    !currentProfile ||
    (currentProfile.role !== "admin" &&
      currentProfile.role !== "branch_lead" &&
      currentProfile.role !== "sub_branch_lead")
  ) {
    return (
      <div className="flex items-center justify-center p-16 text-[#001A3D]/50">
        You don&apos;t have permission to view payroll.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <PayrollClient isAdmin={currentProfile.role === "admin"} />
    </div>
  );
}
