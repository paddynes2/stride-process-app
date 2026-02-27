#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  STOP HOOK — Completion Enforcement
# ═══════════════════════════════════════════════════════════════════════════
#
#  Runs when Claude tries to exit the session. Blocks exit if critical
#  documentation was not updated, preventing incomplete iterations.
#
#  Exit 0 = allow exit, Exit 2 = block exit (Claude must complete docs).
#
#  Install: Add to .claude/settings.json under hooks.Stop
#  See hooks/README.md for installation instructions.
#
# ═══════════════════════════════════════════════════════════════════════════

# ─── Configuration ─────────────────────────────────────────────────────────

# Path to the autonomous-dev directory (adjust for your setup)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Source config to get PROJECT_ROOT (where Ralph actually reads/writes knowledge files)
if [ -f "$SCRIPT_DIR/ralph.conf" ]; then
  source "$SCRIPT_DIR/ralph.conf"
else
  echo "WARNING: ralph.conf not found at $SCRIPT_DIR/ralph.conf — falling back to SCRIPT_DIR"
  PROJECT_ROOT="$SCRIPT_DIR"
fi

STATUS_FILE="$PROJECT_ROOT/knowledge/STATUS.md"
PROGRESS_FILE="$PROJECT_ROOT/knowledge/PROGRESS.md"
SIGNAL_FILE="$PROJECT_ROOT/knowledge/SIGNAL"

ERRORS=()

# ─── Check STATUS.md was updated ──────────────────────────────────────────

if [ ! -f "$STATUS_FILE" ]; then
  ERRORS+=("STATUS.md does not exist. Phase 6 requires updating knowledge/STATUS.md.")
elif [ -z "$(cat "$STATUS_FILE" 2>/dev/null)" ]; then
  ERRORS+=("STATUS.md is empty. Phase 6 requires a structured handoff in knowledge/STATUS.md.")
else
  # Check if STATUS.md has today's date (basic freshness check)
  TODAY=$(date '+%Y-%m-%d')
  if ! grep -q "$TODAY" "$STATUS_FILE" 2>/dev/null; then
    ERRORS+=("STATUS.md does not contain today's date ($TODAY). Was it updated this iteration?")
  fi
fi

# ─── Check PROGRESS.md has a recent entry ──────────────────────────────────

if [ ! -f "$PROGRESS_FILE" ]; then
  ERRORS+=("PROGRESS.md does not exist. Phase 6 requires appending an iteration entry.")
elif [ -z "$(cat "$PROGRESS_FILE" 2>/dev/null)" ]; then
  ERRORS+=("PROGRESS.md is empty. Phase 6 requires appending an iteration entry.")
else
  # Check for a recent Iteration header with today's date
  TODAY=$(date '+%Y-%m-%d')
  if ! grep -q "## Iteration.*$TODAY" "$PROGRESS_FILE" 2>/dev/null; then
    ERRORS+=("PROGRESS.md has no iteration entry for today ($TODAY). Did you complete Phase 6?")
  fi
fi

# ─── Check SIGNAL file was written ────────────────────────────────────────

if [ ! -f "$SIGNAL_FILE" ]; then
  ERRORS+=("SIGNAL file does not exist. Phase 7 requires writing to knowledge/SIGNAL.")
elif [ -z "$(cat "$SIGNAL_FILE" 2>/dev/null)" ]; then
  ERRORS+=("SIGNAL file is empty. Phase 7 requires writing CONTINUE, COMPLETE, or BLOCKED.")
fi

# ─── Check for uncommitted changes ────────────────────────────────────────

GIT_STATUS=$(git status --porcelain 2>/dev/null || echo "")
if [ -n "$GIT_STATUS" ]; then
  # Count uncommitted files
  UNCOMMITTED=$(echo "$GIT_STATUS" | wc -l)
  ERRORS+=("$UNCOMMITTED uncommitted files remain. Phase 5 requires committing all changes before exit.")
fi

# ─── Check METRICS.jsonl was updated (warning only) ─────────────────────

METRICS_FILE="$PROJECT_ROOT/knowledge/METRICS.jsonl"
if [ -f "$METRICS_FILE" ]; then
  TODAY=$(date '+%Y-%m-%d')
  if ! grep -q "$TODAY" "$METRICS_FILE" 2>/dev/null; then
    # Warn but don't block — agent might have had a legitimate skip
    echo "WARNING: METRICS.jsonl has no entry for today ($TODAY). Consider appending metrics."
  fi
fi

# ─── Report ────────────────────────────────────────────────────────────────

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo "STOP BLOCKED: Iteration documentation is incomplete."
  echo ""
  for err in "${ERRORS[@]}"; do
    echo "  - $err"
  done
  echo ""
  echo "Complete Phase 5 (commit), Phase 6 (update docs), and Phase 7 (signal) before exiting."
  exit 2
fi

# All checks passed
exit 0
