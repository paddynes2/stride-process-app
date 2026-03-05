-- Migration 027: Add actor_type column to activity_log
-- Tracks whether the action was performed by a user, system, or automation

ALTER TABLE activity_log
  ADD COLUMN actor_type TEXT NOT NULL DEFAULT 'user';

COMMENT ON COLUMN activity_log.actor_type IS 'Who performed the action: user, system, automation, api';
