export type WorkLogStaffOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  branch: string | null;
};

export type WorkLogRow = {
  id: string;
  staff_profile_id: string;
  logged_by_id: string | null;
  work_date: string;
  hours_worked: number;
  description: string;
  created_at: string;
  staff: WorkLogStaffOption | WorkLogStaffOption[] | null;
};
