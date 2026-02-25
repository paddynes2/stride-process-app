-- =============================================================================
-- Bootstrap workspace: creates org + membership + workspace + first tab
-- Called from the signup flow. Uses SECURITY DEFINER because the user row
-- hasn't been created yet via the trigger during INSERT...RETURNING.
-- =============================================================================
CREATE OR REPLACE FUNCTION bootstrap_workspace(
  p_workspace_name TEXT DEFAULT 'My Workspace'
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_ws_id UUID;
  v_tab_id UUID;
  v_slug TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate a unique slug from the workspace name
  v_slug := lower(regexp_replace(p_workspace_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Create organization
  INSERT INTO organizations (name, slug, owner_id)
  VALUES (p_workspace_name, v_slug, v_user_id)
  RETURNING id INTO v_org_id;

  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');

  -- Create workspace
  INSERT INTO workspaces (organization_id, name, slug)
  VALUES (v_org_id, p_workspace_name, 'default')
  RETURNING id INTO v_ws_id;

  -- Create first tab
  INSERT INTO tabs (workspace_id, name, position)
  VALUES (v_ws_id, 'Workflow', 0)
  RETURNING id INTO v_tab_id;

  RETURN jsonb_build_object(
    'organization_id', v_org_id,
    'workspace_id', v_ws_id,
    'tab_id', v_tab_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
