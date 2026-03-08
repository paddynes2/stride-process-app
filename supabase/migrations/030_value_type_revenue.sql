-- 030: Add value_type to steps + revenue fields to workspaces
-- R4 (Cost Model Reframe) + P6 (Tiered Revenue Rendering)

-- value_type on steps: classifies each step as value-adding, necessary waste, or pure waste
ALTER TABLE steps
  ADD COLUMN IF NOT EXISTS value_type text DEFAULT NULL
  CHECK (value_type IS NULL OR value_type IN ('value_adding', 'necessary_waste', 'pure_waste'));

-- Revenue fields on workspaces for engagement-level revenue impact calculations
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS avg_order_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monthly_inquiries numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS close_rate numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reorder_rate numeric DEFAULT NULL;
