-- Multiple branches per task (many-to-many).
-- Run in Supabase SQL Editor after scripts/35/36.

CREATE TABLE IF NOT EXISTS public.task_branches (
  task_id UUID NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches (id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_task_branches_branch_id ON public.task_branches (branch_id);

COMMENT ON TABLE public.task_branches IS 'Branches a task applies to; tasks.branch_id kept as primary/first branch for legacy joins.';

-- Backfill from existing tasks.branch_id
INSERT INTO public.task_branches (task_id, branch_id)
SELECT id, branch_id
FROM public.tasks
WHERE branch_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.task_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_branches_select_authenticated" ON public.task_branches;
DROP POLICY IF EXISTS "task_branches_mutate_elevated" ON public.task_branches;

CREATE POLICY "task_branches_select_authenticated"
  ON public.task_branches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "task_branches_mutate_elevated"
  ON public.task_branches FOR ALL
  TO authenticated
  USING (public.get_my_claim_role() IN ('admin', 'executive', 'branch_lead'))
  WITH CHECK (public.get_my_claim_role() IN ('admin', 'executive', 'branch_lead'));

GRANT SELECT, INSERT, DELETE ON public.task_branches TO authenticated;
