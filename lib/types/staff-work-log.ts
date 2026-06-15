export type WorkLogStaffOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  branch: string | null;
};

export type WorkLogStatus = "pending" | "approved" | "rejected";

export type WorkLogRow = {
  id: string;
  staff_profile_id: string;
  logged_by_id: string | null;
  work_date: string;
  hours_worked: number;
  description: string;
  status: WorkLogStatus;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  payroll_entry_id: string | null;
  created_at: string;
  staff: WorkLogStaffOption | WorkLogStaffOption[] | null;
};
