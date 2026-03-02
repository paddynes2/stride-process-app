-- =============================================================================
-- clone_workspace: deep-copies a workspace and all its canvas data.
-- Uses SECURITY DEFINER to bypass RLS for the duration of the clone.
-- Tables copied (in FK dependency order):
--   workspace → tabs → sections → steps → connections
--   → teams → roles → people → tools → step_roles
--   → stages → touchpoints → touchpoint_connections
-- Tables NOT copied: perspectives, annotations, comments, tasks, runbooks,
--   activity_log, public_shares
-- =============================================================================

CREATE OR REPLACE FUNCTION clone_workspace(
  p_source_workspace_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id    UUID;
  v_src_ws     workspaces%ROWTYPE;
  v_new_ws_id  UUID;
  v_rec        RECORD;
  v_new_id     UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch source workspace and verify it exists
  SELECT * INTO v_src_ws FROM workspaces WHERE id = p_source_workspace_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace not found';
  END IF;

  -- Verify caller is an org member (manual RLS check, since SECURITY DEFINER bypasses RLS)
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = v_src_ws.organization_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_new_ws_id := gen_random_uuid();

  -- Temp tables for old→new UUID mapping (dropped at end of transaction)
  CREATE TEMP TABLE _cwt_tab        (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE _cwt_section    (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE _cwt_step       (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE _cwt_team       (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE _cwt_role       (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE _cwt_stage      (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE _cwt_touchpoint (old_id UUID, new_id UUID) ON COMMIT DROP;

  -- -------------------------------------------------------------------------
  -- 1. Workspace
  -- -------------------------------------------------------------------------
  INSERT INTO workspaces (id, organization_id, name, slug, image_url, is_active, settings)
  VALUES (
    v_new_ws_id,
    v_src_ws.organization_id,
    v_src_ws.name || ' (Copy)',
    v_src_ws.slug || '-copy-' || substr(v_new_ws_id::text, 1, 8),
    v_src_ws.image_url,
    true,
    v_src_ws.settings
  );

  -- -------------------------------------------------------------------------
  -- 2. Tabs
  -- -------------------------------------------------------------------------
  FOR v_rec IN SELECT * FROM tabs WHERE workspace_id = p_source_workspace_id LOOP
    v_new_id := gen_random_uuid();
    INSERT INTO _cwt_tab VALUES (v_rec.id, v_new_id);
    INSERT INTO tabs (id, workspace_id, name, position, viewport, canvas_type)
    VALUES (v_new_id, v_new_ws_id, v_rec.name, v_rec.position, v_rec.viewport, v_rec.canvas_type);
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 3. Sections
  -- -------------------------------------------------------------------------
  FOR v_rec IN SELECT * FROM sections WHERE workspace_id = p_source_workspace_id LOOP
    v_new_id := gen_random_uuid();
    INSERT INTO _cwt_section VALUES (v_rec.id, v_new_id);
    INSERT INTO sections (id, workspace_id, tab_id, name, summary, position_x, position_y, width, height, notes)
    VALUES (
      v_new_id, v_new_ws_id,
      (SELECT new_id FROM _cwt_tab WHERE old_id = v_rec.tab_id),
      v_rec.name, v_rec.summary, v_rec.position_x, v_rec.position_y,
      v_rec.width, v_rec.height, v_rec.notes
    );
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 4. Steps (includes maturity_score and target_maturity from migration 007)
  -- -------------------------------------------------------------------------
  FOR v_rec IN SELECT * FROM steps WHERE workspace_id = p_source_workspace_id LOOP
    v_new_id := gen_random_uuid();
    INSERT INTO _cwt_step VALUES (v_rec.id, v_new_id);
    INSERT INTO steps (
      id, workspace_id, tab_id, section_id,
      name, position_x, position_y, status, step_type, executor,
      notes, video_url, attributes, time_minutes, frequency_per_month,
      maturity_score, target_maturity
    ) VALUES (
      v_new_id, v_new_ws_id,
      (SELECT new_id FROM _cwt_tab WHERE old_id = v_rec.tab_id),
      CASE WHEN v_rec.section_id IS NOT NULL
        THEN (SELECT new_id FROM _cwt_section WHERE old_id = v_rec.section_id)
      END,
      v_rec.name, v_rec.position_x, v_rec.position_y, v_rec.status,
      v_rec.step_type, v_rec.executor, v_rec.notes, v_rec.video_url,
      v_rec.attributes, v_rec.time_minutes, v_rec.frequency_per_month,
      v_rec.maturity_score, v_rec.target_maturity
    );
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 5. Connections
  -- -------------------------------------------------------------------------
  FOR v_rec IN SELECT * FROM connections WHERE workspace_id = p_source_workspace_id LOOP
    INSERT INTO connections (id, workspace_id, tab_id, source_step_id, target_step_id)
    VALUES (
      gen_random_uuid(), v_new_ws_id,
      (SELECT new_id FROM _cwt_tab WHERE old_id = v_rec.tab_id),
      (SELECT new_id FROM _cwt_step WHERE old_id = v_rec.source_step_id),
      (SELECT new_id FROM _cwt_step WHERE old_id = v_rec.target_step_id)
    );
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 6. Teams
  -- -------------------------------------------------------------------------
  FOR v_rec IN SELECT * FROM teams WHERE workspace_id = p_source_workspace_id LOOP
    v_new_id := gen_random_uuid();
    INSERT INTO _cwt_team VALUES (v_rec.id, v_new_id);
    INSERT INTO teams (id, workspace_id, name)
    VALUES (v_new_id, v_new_ws_id, v_rec.name);
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 7. Roles (via team mapping; roles have no workspace_id column)
  -- -------------------------------------------------------------------------
  FOR v_rec IN
    SELECT r.* FROM roles r
    WHERE r.team_id IN (SELECT old_id FROM _cwt_team)
  LOOP
    v_new_id := gen_random_uuid();
    INSERT INTO _cwt_role VALUES (v_rec.id, v_new_id);
    INSERT INTO roles (id, team_id, name, hourly_rate)
    VALUES (
      v_new_id,
      (SELECT new_id FROM _cwt_team WHERE old_id = v_rec.team_id),
      v_rec.name, v_rec.hourly_rate
    );
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 8. People (via role mapping; people have no workspace_id column)
  -- -------------------------------------------------------------------------
  FOR v_rec IN
    SELECT p.* FROM people p
    WHERE p.role_id IN (SELECT old_id FROM _cwt_role)
  LOOP
    INSERT INTO people (id, role_id, name, email)
    VALUES (
      gen_random_uuid(),
      (SELECT new_id FROM _cwt_role WHERE old_id = v_rec.role_id),
      v_rec.name, v_rec.email
    );
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 9. Tools
  -- -------------------------------------------------------------------------
  FOR v_rec IN SELECT * FROM tools WHERE workspace_id = p_source_workspace_id LOOP
    INSERT INTO tools (id, workspace_id, name, description, category, vendor, url, cost_per_month)
    VALUES (
      gen_random_uuid(), v_new_ws_id,
      v_rec.name, v_rec.description, v_rec.category,
      v_rec.vendor, v_rec.url, v_rec.cost_per_month
    );
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 10. Step-roles (only where both step and role were cloned)
  -- -------------------------------------------------------------------------
  FOR v_rec IN
    SELECT sr.* FROM step_roles sr
    WHERE sr.step_id IN (SELECT old_id FROM _cwt_step)
      AND sr.role_id IN (SELECT old_id FROM _cwt_role)
  LOOP
    INSERT INTO step_roles (id, step_id, role_id)
    VALUES (
      gen_random_uuid(),
      (SELECT new_id FROM _cwt_step WHERE old_id = v_rec.step_id),
      (SELECT new_id FROM _cwt_role WHERE old_id = v_rec.role_id)
    );
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 11. Stages
  -- -------------------------------------------------------------------------
  FOR v_rec IN SELECT * FROM stages WHERE workspace_id = p_source_workspace_id LOOP
    v_new_id := gen_random_uuid();
    INSERT INTO _cwt_stage VALUES (v_rec.id, v_new_id);
    INSERT INTO stages (id, workspace_id, tab_id, name, description, channel, owner, position_x, position_y, width, height)
    VALUES (
      v_new_id, v_new_ws_id,
      (SELECT new_id FROM _cwt_tab WHERE old_id = v_rec.tab_id),
      v_rec.name, v_rec.description, v_rec.channel, v_rec.owner,
      v_rec.position_x, v_rec.position_y, v_rec.width, v_rec.height
    );
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 12. Touchpoints
  -- -------------------------------------------------------------------------
  FOR v_rec IN SELECT * FROM touchpoints WHERE workspace_id = p_source_workspace_id LOOP
    v_new_id := gen_random_uuid();
    INSERT INTO _cwt_touchpoint VALUES (v_rec.id, v_new_id);
    INSERT INTO touchpoints (
      id, workspace_id, tab_id, stage_id,
      name, pain_score, gain_score, sentiment, customer_emotion, notes,
      position_x, position_y
    ) VALUES (
      v_new_id, v_new_ws_id,
      (SELECT new_id FROM _cwt_tab WHERE old_id = v_rec.tab_id),
      CASE WHEN v_rec.stage_id IS NOT NULL
        THEN (SELECT new_id FROM _cwt_stage WHERE old_id = v_rec.stage_id)
      END,
      v_rec.name, v_rec.pain_score, v_rec.gain_score, v_rec.sentiment,
      v_rec.customer_emotion, v_rec.notes, v_rec.position_x, v_rec.position_y
    );
  END LOOP;

  -- -------------------------------------------------------------------------
  -- 13. Touchpoint connections
  -- -------------------------------------------------------------------------
  FOR v_rec IN SELECT * FROM touchpoint_connections WHERE workspace_id = p_source_workspace_id LOOP
    INSERT INTO touchpoint_connections (id, workspace_id, tab_id, source_touchpoint_id, target_touchpoint_id)
    VALUES (
      gen_random_uuid(), v_new_ws_id,
      (SELECT new_id FROM _cwt_tab WHERE old_id = v_rec.tab_id),
      (SELECT new_id FROM _cwt_touchpoint WHERE old_id = v_rec.source_touchpoint_id),
      (SELECT new_id FROM _cwt_touchpoint WHERE old_id = v_rec.target_touchpoint_id)
    );
  END LOOP;

  RETURN jsonb_build_object('workspace_id', v_new_ws_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
