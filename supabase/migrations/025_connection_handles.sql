-- Add handle position columns to connections so React Flow can restore
-- which side of the node the user connected from/to (top/bottom/left/right).
-- Nullable: existing rows render as bottom→top (React Flow default).
ALTER TABLE connections ADD COLUMN source_handle TEXT;
ALTER TABLE connections ADD COLUMN target_handle TEXT;
