#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  POST-TOOL-USE HOOK — Auto Quality Checks
# ═══════════════════════════════════════════════════════════════════════════
#
#  Runs after Edit/Write tool operations. Provides quality feedback.
#  Exit 0 always (informational only, never blocks).
#
#  Install: Add to .claude/settings.json under hooks.PostToolUse
#  See hooks/README.md for installation instructions.
#
# ═══════════════════════════════════════════════════════════════════════════

TOOL_INPUT="${1:-}"

# If no input, nothing to check
if [ -z "$TOOL_INPUT" ]; then
  exit 0
fi

# ─── Extract file path from tool input ──────────────────────────────────────

# Try to extract a file path (heuristic — tool input format varies)
FILE_PATH=""
if echo "$TOOL_INPUT" | grep -qoE '[a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|py|rs|go|css|html)'; then
  FILE_PATH=$(echo "$TOOL_INPUT" | grep -oE '[a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|py|rs|go|css|html)' | head -1)
fi

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# ─── File Size Check ──────────────────────────────────────────────────────

# Warn if file is unusually large (possible paste error or generated code)
if [ -f "$FILE_PATH" ]; then
  LINE_COUNT=$(wc -l < "$FILE_PATH" 2>/dev/null || echo "0")
  if [ "$LINE_COUNT" -gt 500 ]; then
    echo "NOTE: $FILE_PATH is $LINE_COUNT lines. Verify this isn't a paste error or generated code that should be in a separate file."
  fi
fi

# ─── TypeScript Reminder ──────────────────────────────────────────────────

# Remind to run type check after TS file modifications
if echo "$FILE_PATH" | grep -qE '\.(ts|tsx)$'; then
  echo "REMINDER: TypeScript file modified ($FILE_PATH). Run type check before committing."
fi

# ─── Auto Lint on Edit ──────────────────────────────────────────────────

# Actually run the linter on modified JS/TS files for immediate feedback
if echo "$FILE_PATH" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  # Try common lint commands in order of preference
  if [ -f "pnpm-lock.yaml" ] && command -v pnpm &> /dev/null; then
    LINT_RESULT=$(pnpm eslint "$FILE_PATH" --no-error-on-unmatched-pattern 2>&1 || true)
  elif [ -f "yarn.lock" ] && command -v yarn &> /dev/null; then
    LINT_RESULT=$(yarn eslint "$FILE_PATH" --no-error-on-unmatched-pattern 2>&1 || true)
  elif [ -f "package-lock.json" ] && command -v npx &> /dev/null; then
    LINT_RESULT=$(npx eslint "$FILE_PATH" --no-error-on-unmatched-pattern 2>&1 || true)
  else
    LINT_RESULT=""
  fi
  if [ -n "$LINT_RESULT" ] && ! echo "$LINT_RESULT" | grep -q "^$"; then
    echo "LINT ISSUES in $FILE_PATH:"
    echo "$LINT_RESULT"
  fi
fi

# ─── Style File Check ────────────────────────────────────────────────────

# Warn about CSS modifications that might have broad impact
if echo "$FILE_PATH" | grep -qE '\.(css|scss)$'; then
  if echo "$FILE_PATH" | grep -qiE 'global|app|index|theme|variables'; then
    echo "CAUTION: Global stylesheet modified ($FILE_PATH). Verify no unintended visual changes."
  fi
fi

# ─── Knowledge File Validation ────────────────────────────────────────────

# If a knowledge file was modified, verify it's not empty
if echo "$FILE_PATH" | grep -qE 'knowledge/(STATUS|PROGRESS|LEARNINGS|AGENTS)\.md'; then
  if [ -f "$FILE_PATH" ]; then
    FILE_SIZE=$(wc -c < "$FILE_PATH" 2>/dev/null || echo "0")
    if [ "$FILE_SIZE" -lt 50 ]; then
      echo "WARNING: Knowledge file $FILE_PATH appears truncated ($FILE_SIZE bytes). Verify content."
    fi
  fi
fi

exit 0
