-- =============================================================================
-- Activity Log — append-only audit trail of workspace actions
-- =============================================================================

-- Enum for activity actions
CREATE TYPE activity_action AS ENUM (
  'created',
  'updated',
  'deleted',
  'completed',
  'assigned',
  'commented',
  'exported',
  'shared'
);

-- =============================================================================
-- activity_log table
-- Append-only: no updated_at column, no UPDATE/DELETE policies.
-- =============================================================================

CREATE TABLE activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action       activity_action NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID NOT NULL,
  entity_name  TEXT NOT NULL,
  details      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient pagination ordered by recency per workspace
CREATE INDEX idx_activity_log_workspace ON activity_log(workspace_id, created_at DESC);

-- =============================================================================
-- RLS Policies — SELECT and INSERT only (append-only log)
-- No UPDATE or DELETE policies: activity entries are immutable.
-- =============================================================================

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select" ON activity_log FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));
