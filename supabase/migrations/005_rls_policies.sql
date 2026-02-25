-- =============================================================================
-- RLS Policies
-- =============================================================================

-- Helper: check if current user is a member of the given organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper: check if current user can access a workspace
CREATE OR REPLACE FUNCTION can_access_workspace(ws_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = ws_id AND is_org_member(w.organization_id)
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Users
-- =============================================================================
CREATE POLICY "users_select_own" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());

-- =============================================================================
-- Organizations
-- =============================================================================
CREATE POLICY "orgs_select" ON organizations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "orgs_insert" ON organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "orgs_update" ON organizations FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "orgs_delete" ON organizations FOR DELETE
  USING (owner_id = auth.uid());

-- =============================================================================
-- Organization Members
-- =============================================================================
CREATE POLICY "org_members_select" ON organization_members FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "org_members_insert" ON organization_members FOR INSERT
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "org_members_delete" ON organization_members FOR DELETE
  USING (is_org_member(organization_id));

-- =============================================================================
-- Workspaces
-- =============================================================================
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE
  USING (is_org_member(organization_id));

CREATE POLICY "workspaces_delete" ON workspaces FOR DELETE
  USING (is_org_member(organization_id));

-- =============================================================================
-- Tabs (workspace-scoped)
-- =============================================================================
CREATE POLICY "tabs_select" ON tabs FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "tabs_insert" ON tabs FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "tabs_update" ON tabs FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "tabs_delete" ON tabs FOR DELETE
  USING (can_access_workspace(workspace_id));

-- =============================================================================
-- Sections (workspace-scoped)
-- =============================================================================
CREATE POLICY "sections_select" ON sections FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "sections_insert" ON sections FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "sections_update" ON sections FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "sections_delete" ON sections FOR DELETE
  USING (can_access_workspace(workspace_id));

-- =============================================================================
-- Steps (workspace-scoped)
-- =============================================================================
CREATE POLICY "steps_select" ON steps FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "steps_insert" ON steps FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "steps_update" ON steps FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "steps_delete" ON steps FOR DELETE
  USING (can_access_workspace(workspace_id));

-- =============================================================================
-- Connections (workspace-scoped)
-- =============================================================================
CREATE POLICY "connections_select" ON connections FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "connections_insert" ON connections FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "connections_delete" ON connections FOR DELETE
  USING (can_access_workspace(workspace_id));
