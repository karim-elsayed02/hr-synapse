-- Align UPDATE with SELECT: old policy only allowed updates when the row was
-- assigned_to / created_by the user or the user matched legacy admin roles.
-- Server routes (task-actions, PATCH /api/tasks/...) enforce who may change rows.
--
-- Run after 30_tasks_rls_select_fix.sql if you deployed that separately.

DROP POLICY IF EXISTS "Users can update their tasks" ON public.tasks;

CREATE POLICY "Authenticated users can update tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
