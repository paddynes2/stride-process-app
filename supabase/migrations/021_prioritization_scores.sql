-- =============================================================================
-- Add prioritization scoring columns to steps and touchpoints tables
-- =============================================================================

ALTER TABLE steps
  ADD COLUMN effort_score  INT CHECK (effort_score BETWEEN 1 AND 5),
  ADD COLUMN impact_score  INT CHECK (impact_score BETWEEN 1 AND 5);

ALTER TABLE touchpoints
  ADD COLUMN effort_score  INT CHECK (effort_score BETWEEN 1 AND 5),
  ADD COLUMN impact_score  INT CHECK (impact_score BETWEEN 1 AND 5);
