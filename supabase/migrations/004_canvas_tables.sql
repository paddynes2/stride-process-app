-- =============================================================================
-- Tabs — each workspace has one or more tabs (canvases)
-- =============================================================================
CREATE TABLE tabs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Tab 1',
  position     INT NOT NULL DEFAULT 0,
  viewport     JSONB, -- { x, y, zoom }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Sections — group nodes on canvas
-- =============================================================================
CREATE TABLE sections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tab_id       UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'New Section',
  summary      TEXT,
  position_x   FLOAT NOT NULL DEFAULT 0,
  position_y   FLOAT NOT NULL DEFAULT 0,
  width        FLOAT NOT NULL DEFAULT 600,
  height       FLOAT NOT NULL DEFAULT 400,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Steps — process step nodes on canvas
-- =============================================================================
CREATE TABLE steps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tab_id              UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
  section_id          UUID REFERENCES sections(id) ON DELETE SET NULL,
  name                TEXT NOT NULL DEFAULT 'Untitled',
  position_x          FLOAT NOT NULL DEFAULT 0,
  position_y          FLOAT NOT NULL DEFAULT 0,
  status              step_status NOT NULL DEFAULT 'draft',
  step_type           TEXT,
  executor            executor_type NOT NULL DEFAULT 'empty',
  notes               TEXT,
  video_url           TEXT,
  attributes          JSONB NOT NULL DEFAULT '{}',
  time_minutes        INT,
  frequency_per_month INT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Connections — edges between steps
-- =============================================================================
CREATE TABLE connections (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tab_id         UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
  source_step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  target_step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_step_id != target_step_id),
  UNIQUE(source_step_id, target_step_id)
);

-- Updated_at triggers
CREATE TRIGGER tabs_updated_at BEFORE UPDATE ON tabs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sections_updated_at BEFORE UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER steps_updated_at BEFORE UPDATE ON steps FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_tabs_workspace ON tabs(workspace_id);
CREATE INDEX idx_sections_tab ON sections(tab_id);
CREATE INDEX idx_steps_tab ON steps(tab_id);
CREATE INDEX idx_steps_section ON steps(section_id);
CREATE INDEX idx_connections_tab ON connections(tab_id);
CREATE INDEX idx_connections_source ON connections(source_step_id);
CREATE INDEX idx_connections_target ON connections(target_step_id);
