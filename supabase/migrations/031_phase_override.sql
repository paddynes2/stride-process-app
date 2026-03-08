-- 031: Add phase_override to steps for R5 phased roadmap
-- P4: Consultant can override the derived phase assignment (0, 1, or 2)

ALTER TABLE steps
  ADD COLUMN IF NOT EXISTS phase_override smallint DEFAULT NULL
  CHECK (phase_override IS NULL OR phase_override IN (0, 1, 2));
