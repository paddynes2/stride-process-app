#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  RALPH LOOP — Autonomous Build + Test + Fix Development Agent
# ═══════════════════════════════════════════════════════════════════════════
#
#  Usage:
#    ./ralph.sh                    # HITL: single iteration, pause after
#    ./ralph.sh 10                 # AFK: up to 10 iterations
#    ./ralph.sh --monitor          # HITL: continuous, pause between each
#    ./ralph.sh --rollback 5       # Revert to ralph-iter-5 checkpoint
#    ./ralph.sh --status           # Show current loop status
#    ./ralph.sh --init /path/to/project  # Initialize Ralph for a new project
#    ./ralph.sh --dashboard              # Show metrics dashboard
#    ./ralph.sh --resume                 # Resume after fixing a blocker
#
#  Prerequisites:
#    - Claude Code CLI installed and authenticated
#    - Playwright MCP: claude mcp add playwright -- npx @playwright/mcp@latest
#    - Dev server running (or ralph will attempt to start it)
#    - ralph.conf configured for your project
#    - PRD and IMPLEMENTATION-PLAN.md populated
#
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_FILE="$SCRIPT_DIR/ralph.conf"
PROMPT_FILE="$SCRIPT_DIR/PROMPT.md"
LOG_FILE="$SCRIPT_DIR/ralph.log"

# ─── Load Configuration ──────────────────────────────────────────────────

if [ ! -f "$CONF_FILE" ]; then
  echo "ERROR: ralph.conf not found at $CONF_FILE"
  echo "Copy ralph.conf.example and configure for your project."
  exit 1
fi

# shellcheck source=/dev/null
source "$CONF_FILE"

# Defaults for any missing config values
APP_URL="${APP_URL:-http://localhost:3000}"
APP_PORT="${APP_PORT:-3000}"
APP_DEV_COMMAND="${APP_DEV_COMMAND:-pnpm dev}"
APP_HEALTH_ENDPOINT="${APP_HEALTH_ENDPOINT:-/}"
PROJECT_ROOT="${PROJECT_ROOT:-.}"
LOOP_MAX_ITERATIONS="${LOOP_MAX_ITERATIONS:-20}"
LOOP_CIRCUIT_BREAKER="${LOOP_CIRCUIT_BREAKER:-3}"
LOOP_SLEEP_BETWEEN="${LOOP_SLEEP_BETWEEN:-2}"
GIT_BRANCH_PREFIX="${GIT_BRANCH_PREFIX:-ralph}"
GIT_TAG_PREFIX="${GIT_TAG_PREFIX:-ralph-iter}"

# ─── Knowledge file paths (must be AFTER conf is sourced for PROJECT_ROOT) ──
# NOTE: These point at PROJECT_ROOT/knowledge/, NOT SCRIPT_DIR/knowledge/.
# Ralph (Claude) reads/writes knowledge/ relative to PROJECT_ROOT.
# ralph.sh must read from the same paths so signal, circuit breaker, and
# session tracking all work against the live files, not stale copies.
SIGNAL_FILE="$PROJECT_ROOT/knowledge/SIGNAL"
PROGRESS_FILE="$PROJECT_ROOT/knowledge/PROGRESS.md"
STATUS_FILE="$PROJECT_ROOT/knowledge/STATUS.md"

# ─── Parse Arguments ──────────────────────────────────────────────────────

MODE="single"
MAX_ITERATIONS=1
ROLLBACK_TARGET=""

if [ $# -eq 0 ]; then
  MODE="single"
  MAX_ITERATIONS=1
elif [ "$1" == "--monitor" ]; then
  MODE="monitor"
  MAX_ITERATIONS="${LOOP_MAX_ITERATIONS}"
elif [ "$1" == "--rollback" ]; then
  if [ -z "${2:-}" ]; then
    echo "Usage: ./ralph.sh --rollback <iteration-number>"
    exit 1
  fi
  ROLLBACK_TARGET="$2"
  MODE="rollback"
elif [ "$1" == "--status" ]; then
  MODE="status"
elif [ "$1" == "--init" ]; then
  if [ -z "${2:-}" ]; then
    echo "Usage: ./ralph.sh --init /path/to/project"
    exit 1
  fi
  MODE="init"
  INIT_TARGET="$2"
  shift
elif [ "$1" == "--dashboard" ]; then
  MODE="dashboard"
elif [ "$1" == "--resume" ]; then
  MODE="resume"
  MAX_ITERATIONS=1
elif [[ "$1" =~ ^[0-9]+$ ]]; then
  MODE="afk"
  MAX_ITERATIONS="$1"
else
  echo "Usage: ./ralph.sh [iterations | --monitor | --rollback N | --status | --init PATH | --dashboard | --resume]"
  echo ""
  echo "  (no args)       Single iteration, pause after (HITL)"
  echo "  N               Run up to N iterations autonomously (AFK)"
  echo "  --monitor       Run continuously, pause between iterations (supervised)"
  echo "  --rollback N    Revert to ralph-iter-N checkpoint"
  echo "  --status        Show current loop status"
  echo "  --init PATH     Initialize Ralph for a new project"
  echo "  --dashboard     Show metrics dashboard"
  echo "  --resume        Resume after fixing a blocker (single iteration)"
  exit 1
fi

# ─── Utility Functions ────────────────────────────────────────────────────

log() {
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] $*" | tee -a "$LOG_FILE"
}

log_structured() {
  local timestamp iteration status task
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  iteration="$1"
  status="$2"
  task="${3:-}"
  echo "RALPH|$timestamp|iter=$iteration|status=$status|task=$task" >> "$LOG_FILE"
}

get_iteration_count() {
  if [ ! -f "$PROGRESS_FILE" ]; then
    echo "0"
    return
  fi
  grep -c "^## Iteration" "$PROGRESS_FILE" 2>/dev/null || echo "0"
}

get_consecutive_failures() {
  if [ ! -f "$PROGRESS_FILE" ]; then
    echo "0"
    return
  fi
  # Count consecutive blocked/partial results from the bottom of PROGRESS.md
  local count=0
  # Read results in reverse order
  while IFS= read -r line; do
    if echo "$line" | grep -qE "^\*\*Result:\*\* (blocked|partial)"; then
      count=$((count + 1))
    elif echo "$line" | grep -qE "^\*\*Result:\*\* (completed|reverted)"; then
      break
    fi
  done < <(tac "$PROGRESS_FILE" | grep -E "^\*\*Result:\*\*")
  echo "$count"
}

check_signal() {
  # Human override file — Claude never touches this one
  local human_signal_file="$PROJECT_ROOT/knowledge/HUMAN_SIGNAL"
  if [ -f "$human_signal_file" ]; then
    local hsig
    hsig=$(cat "$human_signal_file" 2>/dev/null || echo "")
    if [ -n "$hsig" ]; then
      log "Signal: Human override — $hsig"
      rm -f "$human_signal_file"
      return 1
    fi
  fi
  if [ ! -f "$SIGNAL_FILE" ]; then
    return 0
  fi
  local signal
  signal=$(cat "$SIGNAL_FILE" 2>/dev/null || echo "")
  case "$signal" in
    COMPLETE*)
      log "Signal: ALL TASKS COMPLETE"
      return 1
      ;;
    STOP*|PAUSE*)
      log "Signal: Human override — $signal"
      return 1
      ;;
    BLOCKED*)
      log "Signal: $signal"
      return 1
      ;;
    *)
      return 0
      ;;
  esac
}

check_dev_server() {
  if command -v curl &> /dev/null; then
    curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${APP_URL}${APP_HEALTH_ENDPOINT}" 2>/dev/null || echo "000"
  else
    # Fallback: try to connect with bash
    (echo > /dev/tcp/localhost/"$APP_PORT") 2>/dev/null && echo "200" || echo "000"
  fi
}

verify_clean_git_state() {
  local status
  status=$(cd "$PROJECT_ROOT" && git status --porcelain 2>/dev/null || echo "ERROR")
  if [ "$status" == "ERROR" ]; then
    log "ERROR: Not a git repository or git not available at $PROJECT_ROOT"
    return 1
  fi
  if [ -n "$status" ]; then
    log "WARNING: Uncommitted changes detected. Stashing."
    (cd "$PROJECT_ROOT" && git stash push -m "ralph-auto-stash-$(date +%s)")
  fi
  return 0
}

ensure_ralph_branch() {
  local current_branch
  current_branch=$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo "")
  if [[ ! "$current_branch" == ${GIT_BRANCH_PREFIX}/* ]]; then
    local branch_name="${GIT_BRANCH_PREFIX}/session-$(date +%Y%m%d-%H%M%S)"
    log "Creating branch: $branch_name"
    (cd "$PROJECT_ROOT" && git checkout -b "$branch_name")
  else
    log "On branch: $current_branch"
  fi
}

# ─── Init Function ────────────────────────────────────────────────────────

do_init() {
  local target="$INIT_TARGET"

  if [ ! -d "$target" ]; then
    echo "ERROR: Directory does not exist: $target"
    exit 1
  fi

  # Resolve to absolute path
  target="$(cd "$target" && pwd)"
  echo "═══ Initializing Ralph for: $target ═══"
  echo ""

  # ── Detect package manager ──
  local pkg_manager="npm"
  if [ -f "$target/pnpm-lock.yaml" ]; then
    pkg_manager="pnpm"
  elif [ -f "$target/yarn.lock" ]; then
    pkg_manager="yarn"
  elif [ -f "$target/bun.lock" ]; then
    pkg_manager="bun"
  elif [ -f "$target/package-lock.json" ]; then
    pkg_manager="npm"
  fi
  echo "  Package manager: $pkg_manager"

  # ── Detect framework ──
  local framework="unknown"
  if ls "$target"/next.config.* &>/dev/null; then
    framework="nextjs"
  elif ls "$target"/vite.config.* &>/dev/null; then
    framework="vite"
  elif ls "$target"/nuxt.config.* &>/dev/null; then
    framework="nuxt"
  elif ls "$target"/svelte.config.* &>/dev/null; then
    framework="sveltekit"
  elif [ -f "$target/Cargo.toml" ]; then
    framework="rust"
  fi
  echo "  Framework: $framework"

  # ── Extract project name ──
  local project_name="my-project"
  if [ -f "$target/package.json" ]; then
    local extracted
    extracted=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$target/package.json" | head -1 | sed 's/.*"name"[[:space:]]*:[[:space:]]*"//;s/"$//')
    if [ -n "$extracted" ]; then
      project_name="$extracted"
    fi
  fi
  echo "  Project name: $project_name"

  # ── Extract git remote ──
  local git_remote
  git_remote=$(cd "$target" && git remote get-url origin 2>/dev/null || echo "(none)")
  echo "  Git remote: $git_remote"

  # ── Detect port from package.json scripts.dev ──
  local app_port="3000"
  if [ -f "$target/package.json" ]; then
    local port_match
    port_match=$(grep -oE '(-p|--port)[[:space:]]+[0-9]+' "$target/package.json" 2>/dev/null | head -1 | grep -oE '[0-9]+$' || true)
    if [ -n "$port_match" ]; then
      app_port="$port_match"
    fi
  fi
  echo "  App port: $app_port"

  # ── Detect test command ──
  local test_cmd=""
  if [ -f "$target/package.json" ]; then
    local test_match
    test_match=$(grep -oE '"test"[[:space:]]*:[[:space:]]*"[^"]*"' "$target/package.json" 2>/dev/null | head -1 | sed 's/.*"test"[[:space:]]*:[[:space:]]*"//;s/"$//' || true)
    if [ -n "$test_match" ]; then
      test_cmd="$test_match"
    fi
  fi
  echo "  Test command: ${test_cmd:-(none detected)}"

  # ── Detect stack from dependencies ──
  local stack=""
  if [ -f "$target/package.json" ]; then
    if grep -q '"react"' "$target/package.json"; then
      stack="react"
    elif grep -q '"vue"' "$target/package.json"; then
      stack="vue"
    elif grep -q '"svelte"' "$target/package.json"; then
      stack="svelte"
    elif grep -q '"@angular/core"' "$target/package.json"; then
      stack="angular"
    elif grep -q '"solid-js"' "$target/package.json"; then
      stack="solid"
    fi
  fi
  echo "  Stack: ${stack:-(none detected)}"

  # ── Copy autonomous-dev directory to target ──
  echo ""
  echo "Copying Ralph files to $target/autonomous-dev/..."
  local dest="$target/autonomous-dev"
  mkdir -p "$dest"

  # Copy everything except .git and avoid recursion if target is within SCRIPT_DIR
  local item
  for item in "$SCRIPT_DIR"/*; do
    local basename
    basename=$(basename "$item")
    if [ "$basename" == ".git" ]; then
      continue
    fi
    if [ -d "$item" ]; then
      cp -r "$item" "$dest/"
    else
      cp "$item" "$dest/"
    fi
  done

  # ── Auto-fill ralph.conf ──
  echo "Auto-filling ralph.conf..."
  local dev_cmd="${pkg_manager} dev"
  local conf="$dest/ralph.conf"
  if [ -f "$conf" ]; then
    sed -i "s|^PROJECT_ROOT=.*|PROJECT_ROOT=\"$target\"|" "$conf"
    sed -i "s|^APP_PORT=.*|APP_PORT=$app_port|" "$conf"
    sed -i "s|^APP_URL=.*|APP_URL=\"http://localhost:$app_port\"|" "$conf"
    sed -i "s|^APP_DEV_COMMAND=.*|APP_DEV_COMMAND=\"$dev_cmd\"|" "$conf"
  fi

  # ── Auto-fill AGENTS.md header ──
  local agents="$dest/AGENTS.md"
  if [ -f "$agents" ]; then
    sed -i "s|{{PROJECT_NAME}}|$project_name|g" "$agents"
    sed -i "s|{{PROJECT_ROOT}}|$target|g" "$agents"
    sed -i "s|{{DEV_COMMAND}}|$dev_cmd|g" "$agents"
    sed -i "s|{{TEST_COMMAND}}|${test_cmd:-$pkg_manager test}|g" "$agents"
  fi

  # ── Auto-fill PROMPT.md header ──
  local prompt="$dest/PROMPT.md"
  if [ -f "$prompt" ]; then
    sed -i "s|{{PROJECT_NAME}}|$project_name|g" "$prompt"
    sed -i "s|{{PROJECT_ROOT}}|$target|g" "$prompt"
    sed -i "s|{{APP_PORT}}|$app_port|g" "$prompt"
  fi

  # ── Create testing app spec ──
  local testing_dir="$dest/testing/apps"
  local template="$testing_dir/TEMPLATE.md"
  local app_spec="$testing_dir/${project_name}.md"
  if [ -f "$template" ] && [ ! -f "$app_spec" ]; then
    cp "$template" "$app_spec"
    sed -i "s|{{PROJECT_NAME}}|$project_name|g" "$app_spec"
    sed -i "s|{{APP_PORT}}|$app_port|g" "$app_spec"
    echo "  Created testing spec: testing/apps/${project_name}.md"
  fi

  # ── Create ralph/init branch ──
  local init_branch="ralph/init-${project_name}"
  if (cd "$target" && git rev-parse --git-dir &>/dev/null); then
    echo "Creating branch: $init_branch"
    (cd "$target" && git checkout -b "$init_branch" 2>/dev/null) || echo "  Branch already exists or could not be created"
  fi

  # ── Preflight checks ──
  echo ""
  echo "─── Preflight Checks ───"

  # Claude CLI
  if command -v claude &>/dev/null; then
    echo "  [OK] Claude CLI found"
  else
    echo "  [!!] Claude CLI NOT found — install before running Ralph"
  fi

  # Playwright MCP
  if claude mcp list 2>/dev/null | grep -qi playwright; then
    echo "  [OK] Playwright MCP configured"
  else
    echo "  [!!] Playwright MCP not detected — run: claude mcp add playwright -- npx @playwright/mcp@latest"
  fi

  # Dev server
  local http_code
  http_code=$(check_dev_server)
  if [ "$http_code" == "200" ] || [ "$http_code" == "304" ]; then
    echo "  [OK] Dev server running at http://localhost:$app_port"
  else
    echo "  [--] Dev server not running — start with: $dev_cmd"
  fi

  echo ""
  echo "═══ Init Complete ═══════════════════════════════"
  echo ""
  echo "Auto-detected:"
  echo "  Package manager: $pkg_manager"
  echo "  Framework:       $framework"
  echo "  Stack:           ${stack:-(none)}"
  echo "  Port:            $app_port"
  echo "  Test command:    ${test_cmd:-(none)}"
  echo ""
  echo "Manual steps needed:"
  echo "  1. Review and edit autonomous-dev/ralph.conf"
  echo "  2. Populate autonomous-dev/prd/ with your PRD and IMPLEMENTATION-PLAN.md"
  echo "  3. Review autonomous-dev/PROMPT.md and autonomous-dev/AGENTS.md"
  echo "  4. Start your dev server: $dev_cmd"
  echo "  5. Run: cd $dest && ./ralph.sh"
  echo "═════════════════════════════════════════════════"
}

# ─── Rollback Mode ───────────────────────────────────────────────────────

if [ "$MODE" == "rollback" ]; then
  local_tag="${GIT_TAG_PREFIX}-${ROLLBACK_TARGET}"
  echo "Rolling back to $local_tag..."
  if ! (cd "$PROJECT_ROOT" && git rev-parse "$local_tag" &>/dev/null); then
    echo "ERROR: Tag $local_tag does not exist."
    echo "Available checkpoints:"
    (cd "$PROJECT_ROOT" && git tag -l "${GIT_TAG_PREFIX}-*" | sort -t- -k3 -n | tail -10)
    exit 1
  fi
  echo "This will reset the current branch to $local_tag."
  echo "Current HEAD: $(cd "$PROJECT_ROOT" && git log --oneline -1)"
  echo "Target:       $(cd "$PROJECT_ROOT" && git log --oneline "$local_tag")"
  echo ""
  read -r -p "Proceed? (y/N) " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    (cd "$PROJECT_ROOT" && git reset --hard "$local_tag")
    log "Rolled back to $local_tag"
    echo "Done. Run ./ralph.sh to continue from this checkpoint."
  else
    echo "Cancelled."
  fi
  exit 0
fi

# ─── Dashboard Functions ──────────────────────────────────────────────────

dashboard_from_metrics() {
  local metrics_file="$PROJECT_ROOT/knowledge/METRICS.jsonl"
  local total success_count streak circuit_trips

  total=$(wc -l < "$metrics_file")
  success_count=$(grep -c '"completed"' "$metrics_file" 2>/dev/null || echo "0")
  local rate=0
  if [ "$total" -gt 0 ]; then
    rate=$((success_count * 100 / total))
  fi

  # Success by type
  local feature_total feature_ok bug_total bug_ok improve_total improve_ok
  feature_total=$(grep -c '"feature"' "$metrics_file" 2>/dev/null || echo "0")
  feature_ok=$(grep '"feature"' "$metrics_file" 2>/dev/null | grep -c '"completed"' 2>/dev/null || echo "0")
  bug_total=$(grep -c '"bug"' "$metrics_file" 2>/dev/null || echo "0")
  bug_ok=$(grep '"bug"' "$metrics_file" 2>/dev/null | grep -c '"completed"' 2>/dev/null || echo "0")
  improve_total=$(grep -c '"improvement"' "$metrics_file" 2>/dev/null || echo "0")
  improve_ok=$(grep '"improvement"' "$metrics_file" 2>/dev/null | grep -c '"completed"' 2>/dev/null || echo "0")

  # Current streak: count consecutive "completed" from bottom
  streak=0
  while IFS= read -r line; do
    if echo "$line" | grep -q '"completed"'; then
      streak=$((streak + 1))
    else
      break
    fi
  done < <(tac "$metrics_file")

  # Circuit trips from ralph.log
  circuit_trips=$(grep -c "CIRCUIT BREAKER" "$LOG_FILE" 2>/dev/null || echo "0")

  # Hotspot files: extract files_list values, count occurrences, top 5
  local hotspots
  hotspots=$(grep -oE '"files_list"[[:space:]]*:[[:space:]]*"[^"]*"' "$metrics_file" 2>/dev/null \
    | sed 's/.*"files_list"[[:space:]]*:[[:space:]]*"//;s/"$//' \
    | tr ',' '\n' \
    | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' \
    | grep -v '^$' \
    | sort | uniq -c | sort -rn | head -5)

  # Current phase and last signal
  local current_phase last_signal
  current_phase=$(grep -oE 'Phase [0-9]+' "$STATUS_FILE" 2>/dev/null | tail -1 || echo "(unknown)")
  last_signal=$(cat "$SIGNAL_FILE" 2>/dev/null || echo "(none)")

  echo "═══ Ralph Dashboard ═══════════════════════════════"
  echo "Iterations:    $total total"
  echo "Success rate:  ${rate}% (${success_count}/${total})"
  if [ "$feature_total" -gt 0 ]; then
    local fr=$((feature_ok * 100 / feature_total))
    echo "  ├─ Features:     ${fr}% (${feature_ok}/${feature_total})"
  fi
  if [ "$bug_total" -gt 0 ]; then
    local br=$((bug_ok * 100 / bug_total))
    echo "  ├─ Bugs:         ${br}% (${bug_ok}/${bug_total})"
  fi
  if [ "$improve_total" -gt 0 ]; then
    local ir=$((improve_ok * 100 / improve_total))
    echo "  └─ Improvements: ${ir}% (${improve_ok}/${improve_total})"
  fi
  echo "Streak:        $streak consecutive successes"
  echo "Circuit trips: $circuit_trips"
  echo ""
  if [ -n "$hotspots" ]; then
    echo "Hotspot files:"
    echo "$hotspots" | while read -r count file; do
      printf "  %-20s %d touches\n" "$file" "$count"
    done
    echo ""
  fi
  echo "Current phase: $current_phase"
  echo "Last signal:   $last_signal"
  echo "═══════════════════════════════════════════════════"
}

dashboard_from_progress() {
  local total success_count streak rate

  total=$(grep -c "^## Iteration" "$PROGRESS_FILE" 2>/dev/null || echo "0")
  success_count=$(grep -c '^\*\*Result:\*\* completed' "$PROGRESS_FILE" 2>/dev/null || echo "0")
  rate=0
  if [ "$total" -gt 0 ]; then
    rate=$((success_count * 100 / total))
  fi

  # Streak: count consecutive completed from bottom
  streak=0
  while IFS= read -r line; do
    if echo "$line" | grep -qE '^\*\*Result:\*\* completed'; then
      streak=$((streak + 1))
    elif echo "$line" | grep -qE '^\*\*Result:\*\*'; then
      break
    fi
  done < <(tac "$PROGRESS_FILE" | grep -E '^\*\*Result:\*\*')

  local last_signal
  last_signal=$(cat "$SIGNAL_FILE" 2>/dev/null || echo "(none)")

  echo "═══ Ralph Dashboard ═══════════════════════════════"
  echo "Iterations:    $total total"
  echo "Success rate:  ${rate}% (${success_count}/${total})"
  echo "Streak:        $streak consecutive successes"
  echo "Last signal:   $last_signal"
  echo "═══════════════════════════════════════════════════"
}

do_dashboard() {
  local metrics_file="$PROJECT_ROOT/knowledge/METRICS.jsonl"
  if [ -f "$metrics_file" ] && [ -s "$metrics_file" ]; then
    dashboard_from_metrics
  elif [ -f "$PROGRESS_FILE" ]; then
    dashboard_from_progress
  else
    echo "No iteration data found. Run Ralph first."
    exit 1
  fi
}

# ─── Session Summary Function ─────────────────────────────────────────────

write_session_summary() {
  local end_iter session_history_file start_tag end_tag commits
  end_iter=$(get_iteration_count)
  session_history_file="$PROJECT_ROOT/knowledge/SESSION-HISTORY.md"

  # Only write if iterations were completed
  if [ "$end_iter" -le "$SESSION_START_ITER" ]; then
    return
  fi

  start_tag="${GIT_TAG_PREFIX}-$((SESSION_START_ITER + 1))"
  end_tag="${GIT_TAG_PREFIX}-${end_iter}"

  # Get commit log between start and end
  if (cd "$PROJECT_ROOT" && git rev-parse "$start_tag" &>/dev/null && git rev-parse "$end_tag" &>/dev/null); then
    commits=$(cd "$PROJECT_ROOT" && git log --oneline "$start_tag".."$end_tag" 2>/dev/null || echo "  (could not retrieve)")
  else
    commits=$(cd "$PROJECT_ROOT" && git log --oneline -$((end_iter - SESSION_START_ITER)) 2>/dev/null || echo "  (could not retrieve)")
  fi

  cat >> "$session_history_file" << EOF

## Session $SESSION_START_TIME
- **Branch:** $SESSION_BRANCH
- **Iterations:** $((SESSION_START_ITER + 1))-${end_iter}
- **Key commits:**
${commits}
- **Signal at exit:** $(cat "$SIGNAL_FILE" 2>/dev/null || echo "(none)")
EOF

  log "Session summary written to SESSION-HISTORY.md"
}

# ─── Init Mode ────────────────────────────────────────────────────────────

if [ "$MODE" == "init" ]; then
  do_init
  exit 0
fi

# ─── Dashboard Mode ──────────────────────────────────────────────────────

if [ "$MODE" == "dashboard" ]; then
  do_dashboard
  exit 0
fi

# ─── Status Mode ──────────────────────────────────────────────────────────

if [ "$MODE" == "status" ]; then
  echo "═══════════════════════════════════════════════"
  echo "  RALPH LOOP STATUS"
  echo "═══════════════════════════════════════════════"
  echo ""
  echo "Iterations completed: $(get_iteration_count)"
  echo "Consecutive failures: $(get_consecutive_failures)"
  echo "Signal file: $(cat "$SIGNAL_FILE" 2>/dev/null || echo "(none)")"
  echo ""
  if [ -f "$STATUS_FILE" ]; then
    echo "─── Last Status ───"
    head -20 "$STATUS_FILE"
  fi
  echo ""
  echo "─── Available Checkpoints ───"
  (cd "$PROJECT_ROOT" && git tag -l "${GIT_TAG_PREFIX}-*" | sort -t- -k3 -n | tail -10) 2>/dev/null || echo "(none)"
  echo ""
  echo "─── Dev Server ───"
  local http_code
  http_code=$(check_dev_server)
  if [ "$http_code" == "200" ] || [ "$http_code" == "304" ]; then
    echo "Running at $APP_URL (HTTP $http_code)"
  else
    echo "NOT RUNNING (HTTP $http_code)"
  fi
  exit 0
fi

# ─── Preflight Checks ────────────────────────────────────────────────────

if [ ! -f "$PROMPT_FILE" ]; then
  echo "ERROR: PROMPT.md not found at $PROMPT_FILE"
  exit 1
fi

if ! command -v claude &> /dev/null; then
  echo "ERROR: Claude Code CLI not found. Install it first."
  exit 1
fi

# ─── Banner ───────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════"
echo "  RALPH LOOP"
echo "  Mode: $MODE"
echo "  Max iterations: $MAX_ITERATIONS"
echo "  Circuit breaker: $LOOP_CIRCUIT_BREAKER consecutive failures"
echo "  Project: $PROJECT_ROOT"
echo "  App: $APP_URL"
echo "  Started: $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════"
echo ""

log "Session started: mode=$MODE max=$MAX_ITERATIONS"

# ─── Pre-Session Setup ────────────────────────────────────────────────────

SESSION_START_TIME=$(date '+%Y-%m-%d %H:%M')
SESSION_START_ITER=$(get_iteration_count)

# Verify and clean git state
verify_clean_git_state || exit 1

# Resume mode: verify existing ralph branch; otherwise create new one
if [ "$MODE" == "resume" ]; then
  # Verify we're on a ralph branch
  current_branch=$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo "")
  if [[ ! "$current_branch" == ${GIT_BRANCH_PREFIX}/* ]]; then
    echo "ERROR: --resume requires an existing ralph/* branch. Currently on: $current_branch"
    exit 1
  fi
  log "Resuming on branch: $current_branch"
  echo "CONTINUE: blocker resolved, resuming" > "$SIGNAL_FILE"
else
  ensure_ralph_branch
  echo "CONTINUE" > "$SIGNAL_FILE"
fi

SESSION_BRANCH=$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo "unknown")

# ─── The Loop ─────────────────────────────────────────────────────────────

for ((i=1; i<=MAX_ITERATIONS; i++)); do
  ITERATION_START=$(date +%s)
  ITER_NUM=$(($(get_iteration_count) + 1))

  echo ""
  log "─── Iteration $i/$MAX_ITERATIONS (global #$ITER_NUM) ───"

  # ── Check signal file ───────────────────────────────────────────────
  if ! check_signal; then
    echo ""
    echo "═══════════════════════════════════════════════"
    echo "  Loop stopped by signal: $(cat "$SIGNAL_FILE")"
    echo "  Iterations completed: $((i - 1))"
    echo "═══════════════════════════════════════════════"
    write_session_summary
    exit 0
  fi

  # ── Circuit breaker ─────────────────────────────────────────────────
  FAILURES=$(get_consecutive_failures)
  if [ "$FAILURES" -ge "$LOOP_CIRCUIT_BREAKER" ]; then
    log "CIRCUIT BREAKER: $FAILURES consecutive failures (threshold: $LOOP_CIRCUIT_BREAKER)"
    echo ""
    echo "═══════════════════════════════════════════════"
    echo "  CIRCUIT BREAKER TRIPPED"
    echo "  $FAILURES consecutive failures detected"
    echo "  Threshold: $LOOP_CIRCUIT_BREAKER"
    echo "  Check knowledge/STATUS.md and prd/BUGS.md"
    echo "═══════════════════════════════════════════════"
    echo "BLOCKED: Circuit breaker — $FAILURES consecutive failures" > "$SIGNAL_FILE"
    write_session_summary
    exit 1
  fi

  # ── Dev server health check ─────────────────────────────────────────
  HTTP_CODE=$(check_dev_server)
  if [ "$HTTP_CODE" == "000" ]; then
    log "WARNING: Dev server not responding. Agent will handle in Phase 0."
  fi

  # ── Run Claude ──────────────────────────────────────────────────────
  log_structured "$ITER_NUM" "started" ""

  RESULT=""
  CLAUDE_STDERR=""
  # Unset CLAUDECODE to allow launching from within a Claude Code session
  unset CLAUDECODE 2>/dev/null || true

  if RESULT=$(cd "$PROJECT_ROOT" && cat "$PROMPT_FILE" | claude --print --permission-mode bypassPermissions 2>"$SCRIPT_DIR/.claude_stderr_tmp"); then
    log_structured "$ITER_NUM" "completed" ""
  else
    CLAUDE_EXIT=$?
    CLAUDE_ERR=$(cat "$SCRIPT_DIR/.claude_stderr_tmp" 2>/dev/null || echo "")
    log_structured "$ITER_NUM" "error" "claude exit=$CLAUDE_EXIT stderr=$CLAUDE_ERR"
  fi
  CLAUDE_STDERR=$(cat "$SCRIPT_DIR/.claude_stderr_tmp" 2>/dev/null || echo "")
  rm -f "$SCRIPT_DIR/.claude_stderr_tmp"

  echo "$RESULT" >> "$LOG_FILE"

  # ── Token / cost tracking ──────────────────────────────────────────
  TOKENS_IN=$(echo "$CLAUDE_STDERR" | grep -oE 'input[_: ]+[0-9,]+' | grep -oE '[0-9,]+' | tr -d ',' | head -1 || true)
  TOKENS_OUT=$(echo "$CLAUDE_STDERR" | grep -oE 'output[_: ]+[0-9,]+' | grep -oE '[0-9,]+' | tr -d ',' | head -1 || true)
  if [ -n "$TOKENS_IN" ] || [ -n "$TOKENS_OUT" ]; then
    log "Tokens: in=${TOKENS_IN:-?} out=${TOKENS_OUT:-?}"
    log_structured "$ITER_NUM" "tokens" "in=${TOKENS_IN:-0},out=${TOKENS_OUT:-0}"
  fi

  # ── Parse result ────────────────────────────────────────────────────
  ITERATION_END=$(date +%s)
  DURATION=$((ITERATION_END - ITERATION_START))
  log "Iteration $ITER_NUM finished in ${DURATION}s"

  # ── Check signal file (agent may have updated it) ───────────────────
  if ! check_signal; then
    echo ""
    echo "═══════════════════════════════════════════════"
    echo "  Loop stopped by signal: $(cat "$SIGNAL_FILE")"
    echo "  Iterations completed: $i"
    echo "  Total time: ${DURATION}s for last iteration"
    echo "═══════════════════════════════════════════════"
    write_session_summary
    exit 0
  fi

  # ── Inter-iteration behavior ────────────────────────────────────────
  case $MODE in
    single|resume)
      echo ""
      log "─── Single iteration complete. ───"
      echo "Review changes, then run ./ralph.sh again."
      write_session_summary
      exit 0
      ;;
    monitor)
      echo ""
      echo "─── Iteration $i complete (${DURATION}s). Press Enter to continue, Ctrl+C to stop. ───"
      read -r
      ;;
    afk)
      echo ""
      log "─── Iteration $i complete (${DURATION}s). Continuing in ${LOOP_SLEEP_BETWEEN}s... ───"
      sleep "$LOOP_SLEEP_BETWEEN"
      ;;
  esac

done

echo ""
echo "═══════════════════════════════════════════════"
echo "  Reached iteration limit ($MAX_ITERATIONS)"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Check knowledge/STATUS.md for current state"
echo "═══════════════════════════════════════════════"
write_session_summary
log "Session ended: reached iteration limit ($MAX_ITERATIONS)"
