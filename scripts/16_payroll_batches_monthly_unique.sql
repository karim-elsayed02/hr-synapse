-- One monthly batch per staff member (optional but recommended for concurrent safety).
-- Run after payroll_batches uses (total_payment_user_id, month, year) and no duplicate rows exist.
-- alter table public.payroll_batches drop constraint if exists payroll_batches_user_month_year_key;
alter table public.payroll_batches
  add constraint payroll_batches_user_month_year_key
  unique (total_payment_user_id, month, year);
