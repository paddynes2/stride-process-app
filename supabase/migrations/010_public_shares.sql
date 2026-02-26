-- =============================================================================
-- Public Shares — shareable read-only links for workspaces
-- =============================================================================

CREATE TABLE public_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  share_id    TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_public_shares_workspace ON public_shares(workspace_id);
CREATE INDEX idx_public_shares_share_id ON public_shares(share_id);

-- =============================================================================
-- RLS — workspace members can manage shares
-- =============================================================================

ALTER TABLE public_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_shares_select" ON public_shares FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "public_shares_insert" ON public_shares FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "public_shares_update" ON public_shares FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "public_shares_delete" ON public_shares FOR DELETE
  USING (can_access_workspace(workspace_id));

-- =============================================================================
-- SECURITY DEFINER function — returns workspace data for a public share
-- Bypasses RLS so unauthenticated users can view shared workspaces.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_public_share_data(p_share_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_share RECORD;
  v_workspace RECORD;
  v_result JSONB;
BEGIN
  -- Look up the share (must exist and be active)
  SELECT * INTO v_share FROM public_shares
  WHERE share_id = p_share_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get workspace name
  SELECT id, name INTO v_workspace FROM workspaces WHERE id = v_share.workspace_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Build result with all tabs + canvas data per tab
  v_result := jsonb_build_object(
    'workspace', jsonb_build_object('id', v_workspace.id, 'name', v_workspace.name),
    'tabs', (
      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'position', t.position,
          'sections', (
            SELECT coalesce(jsonb_agg(row_to_json(s)::jsonb ORDER BY s.position_y, s.position_x), '[]'::jsonb)
            FROM sections s WHERE s.tab_id = t.id
          ),
          'steps', (
            SELECT coalesce(jsonb_agg(row_to_json(st)::jsonb ORDER BY st.created_at), '[]'::jsonb)
            FROM steps st WHERE st.tab_id = t.id
          ),
          'connections', (
            SELECT coalesce(jsonb_agg(row_to_json(c)::jsonb), '[]'::jsonb)
            FROM connections c WHERE c.tab_id = t.id
          )
        ) ORDER BY t.position
      ), '[]'::jsonb)
      FROM tabs t WHERE t.workspace_id = v_share.workspace_id
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
