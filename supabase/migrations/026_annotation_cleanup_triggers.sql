-- Migration 026: Clean up orphaned perspective_annotations on entity delete
--
-- perspective_annotations uses a polymorphic annotatable_id (no FK constraint).
-- These triggers delete annotations when their parent entity is removed.

CREATE OR REPLACE FUNCTION cleanup_annotations_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM perspective_annotations
  WHERE annotatable_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_annotations_on_step_delete
  AFTER DELETE ON steps
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_annotations_on_delete();

CREATE TRIGGER trg_cleanup_annotations_on_section_delete
  AFTER DELETE ON sections
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_annotations_on_delete();

CREATE TRIGGER trg_cleanup_annotations_on_stage_delete
  AFTER DELETE ON stages
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_annotations_on_delete();

CREATE TRIGGER trg_cleanup_annotations_on_touchpoint_delete
  AFTER DELETE ON touchpoints
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_annotations_on_delete();
