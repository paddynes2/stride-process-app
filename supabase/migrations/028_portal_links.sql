-- Portal links: allow steps to link to another tab/step for cross-flow navigation
ALTER TABLE steps ADD COLUMN link_to_tab_id UUID REFERENCES tabs(id) ON DELETE SET NULL;
ALTER TABLE steps ADD COLUMN link_to_step_id UUID REFERENCES steps(id) ON DELETE SET NULL;
