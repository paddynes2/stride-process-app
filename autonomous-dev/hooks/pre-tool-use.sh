#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  PRE-TOOL-USE HOOK — Security Guardrails
# ═══════════════════════════════════════════════════════════════════════════
#
#  Runs before every Bash tool invocation. Blocks dangerous commands.
#  Exit 0 = allow, Exit 2 = block (message shown to Claude).
#
#  Install: Add to .claude/settings.json under hooks.PreToolUse
#  See hooks/README.md for installation instructions.
#
# ═══════════════════════════════════════════════════════════════════════════

TOOL_INPUT="${1:-}"

# If no input provided, allow (non-Bash tools pass through)
if [ -z "$TOOL_INPUT" ]; then
  exit 0
fi

# ─── Blocked Patterns ──────────────────────────────────────────────────────

# Block access to secrets and credentials
if echo "$TOOL_INPUT" | grep -qiE '\.env\b|\.env\.|credentials|secrets|\.pem|\.key|password|token'; then
  # Allow reading .env.example (template files are safe)
  if echo "$TOOL_INPUT" | grep -qiE '\.env\.example|\.env\.template'; then
    exit 0
  fi
  echo "BLOCKED: Accessing secrets/credentials files. Ralph loop rule #13: Never modify .env files."
  exit 2
fi

# Block git push (ralph loop is local-only)
if echo "$TOOL_INPUT" | grep -qE 'git\s+push'; then
  echo "BLOCKED: git push is not allowed in the ralph loop. Rule #14: Never push to remote."
  exit 2
fi

# Block git add . and git add -A (must add specific files)
if echo "$TOOL_INPUT" | grep -qE 'git\s+add\s+(-A|\.)'; then
  echo "BLOCKED: Use 'git add <specific files>' instead. Rule #16: Never use git add . or git add -A."
  exit 2
fi

# Block destructive rm -rf on broad paths
if echo "$TOOL_INPUT" | grep -qE 'rm\s+-rf\s+(/|~|\.\.|\./)'; then
  echo "BLOCKED: Destructive rm -rf on broad path. Rule #15: Never delete files unless PRD says to."
  exit 2
fi

# Block npm/pnpm publish (prevent accidental package releases)
if echo "$TOOL_INPUT" | grep -qE '(npm|pnpm|yarn)\s+publish'; then
  echo "BLOCKED: Package publish not allowed during ralph loop."
  exit 2
fi

# Block docker push (prevent accidental image releases)
if echo "$TOOL_INPUT" | grep -qE 'docker\s+push'; then
  echo "BLOCKED: Docker push not allowed during ralph loop."
  exit 2
fi

# Block modifying PROMPT.md (immutable during loop)
if echo "$TOOL_INPUT" | grep -qE 'PROMPT\.md'; then
  # Allow reading PROMPT.md (cat, head, etc.)
  if echo "$TOOL_INPUT" | grep -qE '(cat|head|tail|less|more|grep|wc)\s.*PROMPT\.md'; then
    exit 0
  fi
  # Block writing/editing
  if echo "$TOOL_INPUT" | grep -qE '(sed|awk|>>|>)\s.*PROMPT\.md'; then
    echo "BLOCKED: PROMPT.md is immutable during the ralph loop. Rule #12: Never modify PROMPT.md."
    exit 2
  fi
fi

# Block force operations
if echo "$TOOL_INPUT" | grep -qE 'git\s+(push|reset)\s+--force|git\s+push\s+-f\b|--no-verify'; then
  echo "BLOCKED: Force operations and hook bypasses are not allowed."
  exit 2
fi

# ─── Allow everything else ─────────────────────────────────────────────────

exit 0
