-- =============================================================================
-- Comments — threaded comments on canvas elements with categories
-- =============================================================================

-- Enum for comment categories
CREATE TYPE comment_category AS ENUM ('note', 'decision', 'pain_point', 'idea', 'question');

-- =============================================================================
-- Comments — threaded comments on canvas entities
-- commentable_type reuses the existing annotatable_type enum (step/section/touchpoint/stage)
-- parent_id self-FK enables threading; ON DELETE CASCADE removes all replies
-- =============================================================================
CREATE TABLE comments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  commentable_type annotatable_type NOT NULL,
  commentable_id   UUID NOT NULL,
  parent_id        UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  category         comment_category NOT NULL DEFAULT 'note',
  is_resolved      BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_comments_workspace ON comments(workspace_id);
CREATE INDEX idx_comments_target ON comments(commentable_type, commentable_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

-- =============================================================================
-- RLS Policies
-- comments have workspace_id so we can use can_access_workspace() directly
-- =============================================================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select" ON comments FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "comments_insert" ON comments FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "comments_update" ON comments FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "comments_delete" ON comments FOR DELETE
  USING (can_access_workspace(workspace_id));
