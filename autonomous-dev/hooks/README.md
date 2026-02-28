# Claude Code Hooks for Ralph Loop

> Optional but recommended. These hooks add safety guardrails and quality
> enforcement that run INSIDE Claude Code's lifecycle, complementing the
> external guardrails in ralph.sh.

---

## What Are Hooks?

Claude Code hooks are shell scripts that execute at lifecycle events:
- **PreToolUse** — before Claude runs any tool (Bash, Edit, Write, etc.)
- **PostToolUse** — after a tool completes
- **Stop** — when Claude tries to end the session
- **SessionStart** — when a new Claude session begins

Hooks can BLOCK an action (exit 2) or just observe (exit 0).

## Installation

Add these to your project's `.claude/settings.json` (or global `~/.claude/settings.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash /path/to/autonomous-dev/hooks/pre-tool-use.sh \"$TOOL_INPUT\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash /path/to/autonomous-dev/hooks/post-tool-use.sh \"$TOOL_INPUT\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash /path/to/autonomous-dev/hooks/stop-hook.sh"
          }
        ]
      }
    ]
  }
}
```

Replace `/path/to/autonomous-dev/` with your actual path.

## Hook Descriptions

### `pre-tool-use.sh` — Security Guardrails

Runs before every Bash command. Blocks dangerous operations:
- Accessing `.env`, credentials, secrets
- `rm -rf` without confirmation
- `git push` (ralph loop is local-only)
- `git add .` or `git add -A` (must add specific files)
- `npm publish`, `docker push` (prevent accidental releases)

Exit codes: 0 = allow, 2 = block (Claude sees the rejection message).

### `post-tool-use.sh` — Auto Quality Checks

Runs after Edit/Write operations on source files. Triggers:
- Lint check on modified file (if lint command is configured)
- Type check reminder after TypeScript file edits
- Warns if a file grew significantly (possible paste error)

Exit codes: 0 = continue (messages shown to Claude as feedback).

### `stop-hook.sh` — Completion Enforcement

Runs when Claude tries to exit the session. Verifies:
- `knowledge/STATUS.md` was updated this iteration
- `knowledge/PROGRESS.md` has an entry for this iteration
- `knowledge/SIGNAL` file was written
- No uncommitted changes remain (everything committed or stashed)

**Multi-agent bypass (v3.0):** In multi-agent mode, ralph.sh sets the `RALPH_AGENT`
environment variable to identify which agent is running. Non-reviewer agents
(planner, builder, tester) bypass the stop-hook entirely — they exit freely because
documentation is NOT their responsibility. Only the reviewer agent is subject to
the full doc-completion checks.

Exit codes: 0 = allow exit, 2 = block exit (forces Claude to complete docs).

### `session-start.sh` — Context Injection (Optional)

Not a hook per se — this is a script you can source or pipe before the prompt
to inject current STATUS.md context. ralph.sh already handles this by piping
PROMPT.md which instructs the agent to read STATUS.md, so this hook is
redundant if using ralph.sh. Useful if running Claude Code manually.

## Customization

These are TEMPLATES. Edit them for your project:
- Update file path patterns in pre-tool-use.sh for your repo structure
- Update lint/format commands in post-tool-use.sh to match your toolchain
- Adjust stop-hook.sh doc verification paths if you renamed knowledge files

## Interaction with ralph.sh

ralph.sh provides EXTERNAL guardrails (circuit breaker, branch management).
Hooks provide INTERNAL guardrails (within the Claude session itself).
They are complementary — use both for maximum robustness.

```
ralph.sh (external)          Claude Code session (internal)
├── branch isolation         ├── pre-tool-use.sh (block danger)
├── circuit breaker          ├── post-tool-use.sh (auto quality)
├── signal file check        └── stop-hook.sh (enforce docs)
├── health check
└── git state verification
```

## Multi-Agent Mode (v3.0)

In multi-agent mode, ralph.sh launches multiple Claude sessions (planner, builders,
testers, reviewer). Each session inherits the hooks configuration.

**Key behavior:**
- `RALPH_AGENT` env var is set by ralph.sh to identify the current agent
- `stop-hook.sh` checks this var and bypasses for non-reviewer agents
- `pre-tool-use.sh` applies equally to ALL agents (security is universal)
- `post-tool-use.sh` applies equally to ALL agents (quality feedback is universal)

| Agent | pre-tool-use | post-tool-use | stop-hook |
|-------|-------------|---------------|-----------|
| planner | enforced | enforced | bypassed |
| builder | enforced | enforced | bypassed |
| tester | enforced | enforced | bypassed |
| reviewer | enforced | enforced | **enforced** |
