-- Fix: the old SELECT policy was too restrictive — it only allowed users to see
-- tasks they created or were directly assigned to, blocking branch/sub-branch
-- scoped visibility entirely. The Next.js page already handles all role-based
-- filtering server-side, so we simply allow any authenticated user to read
-- the tasks table and let the application layer do the scoping.

DROP POLICY IF EXISTS "Users can view assigned tasks" ON public.tasks;

CREATE POLICY "Authenticated users can view tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (true);
