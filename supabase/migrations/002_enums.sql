-- Step lifecycle status
CREATE TYPE step_status AS ENUM ('draft', 'in_progress', 'testing', 'live', 'archived');

-- Who/what executes a step
CREATE TYPE executor_type AS ENUM ('person', 'automation', 'ai_agent', 'empty');

-- Organization membership role
CREATE TYPE workspace_role AS ENUM ('viewer', 'member', 'admin', 'owner');
