-- Add priority column to tasks table
-- Priority levels: low (default), medium, high
-- Tasks are displayed high → medium → low in the frontend

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'low'
    CHECK (priority IN ('low', 'medium', 'high'));

-- Back-fill any existing rows (already covered by DEFAULT, but explicit for clarity)
UPDATE tasks SET priority = 'low' WHERE priority IS NULL;
