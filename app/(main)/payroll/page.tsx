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

  const PAYROLL_ALLOWED_ROLES = ["admin", "executive", "branch_lead", "sub_branch_lead", "staff"];

  if (!currentProfile || !PAYROLL_ALLOWED_ROLES.includes(currentProfile.role ?? "")) {
    return (
      <div className="flex items-center justify-center p-16 text-[#001A3D]/50">
        You don&apos;t have permission to view payroll.
      </div>
    );
  }

  const isAdminOrExecutive =
    currentProfile.role === "admin" || currentProfile.role === "executive";

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <PayrollClient isAdmin={isAdminOrExecutive} />
    </div>
  );
}
