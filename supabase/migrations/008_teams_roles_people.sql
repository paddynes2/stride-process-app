-- =============================================================================
-- Teams, Roles, People tables for process costing
-- =============================================================================

-- Teams — groups within a workspace (e.g., "Engineering", "Operations")
CREATE TABLE teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'New Team',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roles — positions within a team (e.g., "Senior Engineer", "Analyst")
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'New Role',
  hourly_rate NUMERIC(10,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- People — individuals assigned to roles
CREATE TABLE people (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'New Person',
  email      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at triggers
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER people_updated_at BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_teams_workspace ON teams(workspace_id);
CREATE INDEX idx_roles_team ON roles(team_id);
CREATE INDEX idx_people_role ON people(role_id);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

-- Teams (workspace-scoped via can_access_workspace)
CREATE POLICY "teams_select" ON teams FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "teams_insert" ON teams FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "teams_update" ON teams FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "teams_delete" ON teams FOR DELETE
  USING (can_access_workspace(workspace_id));

-- Roles (access via team → workspace)
CREATE POLICY "roles_select" ON roles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM teams t WHERE t.id = roles.team_id AND can_access_workspace(t.workspace_id)
  ));

CREATE POLICY "roles_insert" ON roles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM teams t WHERE t.id = roles.team_id AND can_access_workspace(t.workspace_id)
  ));

CREATE POLICY "roles_update" ON roles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM teams t WHERE t.id = roles.team_id AND can_access_workspace(t.workspace_id)
  ));

CREATE POLICY "roles_delete" ON roles FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM teams t WHERE t.id = roles.team_id AND can_access_workspace(t.workspace_id)
  ));

-- People (access via role → team → workspace)
CREATE POLICY "people_select" ON people FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM roles r JOIN teams t ON t.id = r.team_id
    WHERE r.id = people.role_id AND can_access_workspace(t.workspace_id)
  ));

CREATE POLICY "people_insert" ON people FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM roles r JOIN teams t ON t.id = r.team_id
    WHERE r.id = people.role_id AND can_access_workspace(t.workspace_id)
  ));

CREATE POLICY "people_update" ON people FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM roles r JOIN teams t ON t.id = r.team_id
    WHERE r.id = people.role_id AND can_access_workspace(t.workspace_id)
  ));

CREATE POLICY "people_delete" ON people FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM roles r JOIN teams t ON t.id = r.team_id
    WHERE r.id = people.role_id AND can_access_workspace(t.workspace_id)
  ));
