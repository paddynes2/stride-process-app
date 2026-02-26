-- =============================================================================
-- Add maturity scoring columns to steps table
-- =============================================================================

ALTER TABLE steps
  ADD COLUMN maturity_score   INT CHECK (maturity_score BETWEEN 1 AND 5),
  ADD COLUMN target_maturity  INT CHECK (target_maturity BETWEEN 1 AND 5);
