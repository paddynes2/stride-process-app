#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  SESSION START — Context Injection
# ═══════════════════════════════════════════════════════════════════════════
#
#  Optional helper script. When using Claude Code outside of ralph.sh,
#  this injects the last STATUS.md context so Claude knows where to pick up.
#
#  Usage (standalone, NOT as a hook):
#    claude -p "$(bash hooks/session-start.sh && cat PROMPT.md)"
#
#  NOTE: This is REDUNDANT when using ralph.sh, which already pipes PROMPT.md.
#  PROMPT.md Phase 1 instructs the agent to read STATUS.md. This script is
#  only useful if you're running Claude Code manually without the loop.
#
# ═══════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATUS_FILE="$SCRIPT_DIR/knowledge/STATUS.md"
SIGNAL_FILE="$SCRIPT_DIR/knowledge/SIGNAL"

# ─── Print Context Header ─────────────────────────────────────────────────

echo "<!-- SESSION CONTEXT (auto-injected by session-start.sh) -->"
echo ""

# ─── Signal Check ──────────────────────────────────────────────────────────

if [ -f "$SIGNAL_FILE" ]; then
  SIGNAL=$(cat "$SIGNAL_FILE" 2>/dev/null || echo "")
  echo "Last signal: $SIGNAL"
  echo ""
  if echo "$SIGNAL" | grep -qE "^(COMPLETE|BLOCKED|STOP|PAUSE)"; then
    echo "WARNING: Signal indicates the loop should NOT continue. Check knowledge/SIGNAL."
    echo ""
  fi
fi

# ─── STATUS.md Summary ────────────────────────────────────────────────────

if [ -f "$STATUS_FILE" ]; then
  echo "--- LAST STATUS ---"
  cat "$STATUS_FILE"
  echo ""
  echo "--- END STATUS ---"
  echo ""
else
  echo "WARNING: No STATUS.md found. This may be the first iteration."
  echo ""
fi

echo "<!-- END SESSION CONTEXT -->"
echo ""
