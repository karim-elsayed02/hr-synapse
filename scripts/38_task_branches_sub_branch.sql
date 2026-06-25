-- Optional sub-branch per task branch scope.
-- Run after scripts/37_task_branches.sql

ALTER TABLE public.task_branches
  ADD COLUMN IF NOT EXISTS sub_branch_id UUID REFERENCES public.sub_branches (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.task_branches.sub_branch_id IS 'Null = whole branch; set to limit this scope to one sub-branch.';

-- Backfill from tasks.sub_branch_id on single-branch links
UPDATE public.task_branches tb
SET sub_branch_id = t.sub_branch_id
FROM public.tasks t
WHERE t.id = tb.task_id
  AND t.sub_branch_id IS NOT NULL
  AND tb.sub_branch_id IS NULL;
