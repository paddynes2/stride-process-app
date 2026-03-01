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

# Multi-agent defaults
AGENT_MODE="${AGENT_MODE:-multi}"
AGENT_PROMPT_DIR="${AGENT_PROMPT_DIR:-agents}"
MAX_PARALLEL_BUILDERS="${MAX_PARALLEL_BUILDERS:-3}"
PLANNER_MODEL="${PLANNER_MODEL:-opus}"
BUILDER_MODEL="${BUILDER_MODEL:-sonnet}"
TESTER_MODEL="${TESTER_MODEL:-sonnet}"
REVIEWER_MODEL="${REVIEWER_MODEL:-opus}"
PLAYWRIGHT_AVAILABLE="${PLAYWRIGHT_AVAILABLE:-auto}"
WORKTREE_DIR="${WORKTREE_DIR:-.ralph/worktrees}"

# ─── Knowledge file paths (MUST be after conf for PROJECT_ROOT) ──────────
# NOTE: Agents reference these as knowledge/... relative to their cwd (PROJECT_ROOT).
# ralph.sh must read/write the SAME files, so we use PROJECT_ROOT, not SCRIPT_DIR.
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
elif [ "$1" == "--legacy" ]; then
  AGENT_MODE="single"
  MODE="single"
  MAX_ITERATIONS=1
elif [ "$1" == "--agents" ]; then
  MODE="show_agents"
elif [[ "$1" =~ ^[0-9]+$ ]]; then
  MODE="afk"
  MAX_ITERATIONS="$1"
else
  echo "Usage: ./ralph.sh [iterations | --monitor | --rollback N | --status | --init PATH | --dashboard | --resume | --legacy | --agents]"
  echo ""
  echo "  (no args)       Single iteration, pause after (HITL)"
  echo "  N               Run up to N iterations autonomously (AFK)"
  echo "  --monitor       Run continuously, pause between iterations (supervised)"
  echo "  --rollback N    Revert to ralph-iter-N checkpoint"
  echo "  --status        Show current loop status"
  echo "  --init PATH     Initialize Ralph for a new project"
  echo "  --dashboard     Show metrics dashboard"
  echo "  --resume        Resume after fixing a blocker (single iteration)"
  echo "  --legacy        Force legacy single-agent mode (uses PROMPT.md)"
  echo "  --agents        Show multi-agent configuration"
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
  # Only stash if there are stashable changes (modified/staged/deleted tracked files).
  # Untracked-only state (?? lines) causes "git stash push" to fail with exit 1
  # ("No local changes to save"), which crashes the script under set -e.
  local stashable
  stashable=$(echo "$status" | grep -v '^??' || true)
  if [ -n "$stashable" ]; then
    log "WARNING: Uncommitted changes detected. Stashing."
    (cd "$PROJECT_ROOT" && git stash push -m "ralph-auto-stash-$(date +%s)")
  elif [ -n "$status" ]; then
    log "NOTE: Untracked files present (ignored — not stashable)"
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

# ─── JSON Parsing Helpers ─────────────────────────────────────────────────
# Centralized JSON extraction: tries python3, then jq, then grep fallback.
# Eliminates fragile inline python3/grep blocks throughout the script.

# json_val <file> <dot.path> [default]
# Extract a scalar value by dot-path. Examples:
#   json_val plan.json .mode              → "multi_task"
#   json_val plan.json .validation.revert_needed "false"  → "true"
json_val() {
  local file="$1" path="$2" default="${3:-}"

  if command -v python3 &>/dev/null; then
    local result
    result=$(python3 -c "
import json, sys
data = json.load(open(sys.argv[1]))
keys = sys.argv[2].lstrip('.').split('.')
val = data
for k in keys:
    if isinstance(val, dict):
        val = val.get(k)
    else:
        val = None
        break
if val is None:
    sys.exit(1)
print(str(val).lower() if isinstance(val, bool) else val)
" "$file" "$path" 2>/dev/null) && { echo "$result"; return 0; }
  fi

  if command -v jq &>/dev/null; then
    local result
    result=$(jq -r "$path // empty" "$file" 2>/dev/null) && [ -n "$result" ] && { echo "$result"; return 0; }
  fi

  # Grep fallback: only works for top-level or leaf keys
  local key
  key="${path##*.}"
  local result
  # Try quoted string value
  result=$(grep -oE "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$file" 2>/dev/null | head -1 | sed "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"//;s/\"$//")
  if [ -n "$result" ]; then echo "$result"; return 0; fi
  # Try boolean/numeric value
  result=$(grep -oE "\"$key\"[[:space:]]*:[[:space:]]*(true|false|[0-9]+)" "$file" 2>/dev/null | head -1 | grep -oE '(true|false|[0-9]+)$')
  if [ -n "$result" ]; then echo "$result"; return 0; fi

  echo "$default"
}

# json_count <file> <array_path>
# Count elements in an array. Example: json_count plan.json .tasks → "3"
json_count() {
  local file="$1" path="$2"

  if command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
data = json.load(open(sys.argv[1]))
keys = sys.argv[2].lstrip('.').split('.')
val = data
for k in keys:
    val = val.get(k, []) if isinstance(val, dict) else []
print(len(val))
" "$file" "$path" 2>/dev/null && return 0
  fi

  if command -v jq &>/dev/null; then
    jq -r "$path | length" "$file" 2>/dev/null && return 0
  fi

  # Grep fallback: count occurrences of "slot" (array-element indicator)
  grep -c '"slot"' "$file" 2>/dev/null || echo "0"
}

# json_pluck <file> <array_path> <field>
# Extract one field from each element of an array, one per line.
# Example: json_pluck plan.json .tasks slot → "1\n2\n3"
json_pluck() {
  local file="$1" array_path="$2" field="$3"

  if command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
data = json.load(open(sys.argv[1]))
keys = sys.argv[2].lstrip('.').split('.')
val = data
for k in keys:
    val = val.get(k, []) if isinstance(val, dict) else []
for item in val:
    if isinstance(item, dict) and sys.argv[3] in item:
        print(item[sys.argv[3]])
" "$file" "$array_path" "$field" 2>/dev/null && return 0
  fi

  if command -v jq &>/dev/null; then
    jq -r "${array_path}[].${field}" "$file" 2>/dev/null && return 0
  fi

  # Grep fallback: extract all values for the field key
  grep -oE "\"$field\"[[:space:]]*:[[:space:]]*[0-9]+" "$file" 2>/dev/null | grep -oE '[0-9]+$' | sort -n
}

# json_extract <file> <array_path> <match_key> <match_value>
# Extract full JSON object from an array where match_key == match_value.
# Example: json_extract plan.json .tasks slot 2 → '{"slot":2, ...}'
json_extract() {
  local file="$1" array_path="$2" match_key="$3" match_value="$4"

  if command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
data = json.load(open(sys.argv[1]))
keys = sys.argv[2].lstrip('.').split('.')
val = data
for k in keys:
    val = val.get(k, []) if isinstance(val, dict) else []
for item in val:
    if isinstance(item, dict) and str(item.get(sys.argv[3])) == sys.argv[4]:
        print(json.dumps(item, indent=2))
        break
" "$file" "$array_path" "$match_key" "$match_value" 2>/dev/null && return 0
  fi

  if command -v jq &>/dev/null; then
    jq -r "${array_path}[] | select(.${match_key} == ${match_value})" "$file" 2>/dev/null && return 0
  fi

  # No reliable grep fallback for complex extraction
  echo "{}"
}

# json_any <file> <array_path> <field>
# Check if ANY element in an array has truthy value for a field.
# Example: json_any plan.json .tasks has_ui_changes → "true" or "false"
json_any() {
  local file="$1" array_path="$2" field="$3"

  if command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
data = json.load(open(sys.argv[1]))
keys = sys.argv[2].lstrip('.').split('.')
val = data
for k in keys:
    val = val.get(k, []) if isinstance(val, dict) else []
print(str(any(item.get(sys.argv[3], False) for item in val if isinstance(item, dict))).lower())
" "$file" "$array_path" "$field" 2>/dev/null && return 0
  fi

  if command -v jq &>/dev/null; then
    jq -r "[${array_path}[].${field}] | any" "$file" 2>/dev/null && return 0
  fi

  # Grep fallback
  if grep -qE "\"$field\"[[:space:]]*:[[:space:]]*true" "$file" 2>/dev/null; then
    echo "true"
  else
    echo "false"
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

  # ── Copy agent prompts and schemas ──
  if [ -d "$SCRIPT_DIR/agents" ]; then
    cp -r "$SCRIPT_DIR/agents" "$dest/"
    echo "  Copied agent prompts to agents/"
  fi
  if [ -d "$SCRIPT_DIR/schemas" ]; then
    cp -r "$SCRIPT_DIR/schemas" "$dest/"
    echo "  Copied JSON schemas to schemas/"
  fi

  # ── Move knowledge/, prd/, testing/ to project root ──
  # Agents run with cwd=PROJECT_ROOT and reference files as knowledge/STATUS.md,
  # prd/FEATURES.md, etc. These MUST live at the project root, not under autonomous-dev/.
  for dir_name in knowledge prd testing; do
    if [ -d "$dest/$dir_name" ]; then
      if [ -d "$target/$dir_name" ]; then
        # Merge: copy files that don't already exist at the project root
        cp -rn "$dest/$dir_name/"* "$target/$dir_name/" 2>/dev/null || true
      else
        mv "$dest/$dir_name" "$target/$dir_name"
      fi
      rm -rf "$dest/$dir_name"
      echo "  Moved $dir_name/ to project root ($target/$dir_name/)"
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
  local agents="$target/knowledge/AGENTS.md"
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
  local testing_dir="$target/testing/apps"
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
  echo "  2. Populate prd/FEATURES.md and knowledge/IMPLEMENTATION-PLAN.md"
  echo "  3. Review knowledge/AGENTS.md (auto-filled with project info)"
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

# ─── Show Agents Mode ──────────────────────────────────────────────────────

if [ "$MODE" == "show_agents" ]; then
  echo "═══ Ralph Multi-Agent Configuration ═══"
  echo ""
  echo "  Agent mode:         $AGENT_MODE"
  echo "  Max builders:       $MAX_PARALLEL_BUILDERS"
  echo "  Planner model:      $PLANNER_MODEL"
  echo "  Builder model:      $BUILDER_MODEL"
  echo "  Tester model:       $TESTER_MODEL"
  echo "  Reviewer model:     $REVIEWER_MODEL"
  echo "  Playwright:         $PLAYWRIGHT_AVAILABLE"
  echo "  Worktree dir:       $WORKTREE_DIR"
  echo "  Prompt dir:         $AGENT_PROMPT_DIR"
  echo ""
  echo "Agent prompts:"
  for f in "$SCRIPT_DIR/$AGENT_PROMPT_DIR"/*.md; do
    if [ -f "$f" ]; then
      local_name=$(basename "$f")
      local_lines=$(wc -l < "$f")
      echo "  $local_name ($local_lines lines)"
    fi
  done
  echo ""
  echo "Schemas:"
  for f in "$SCRIPT_DIR/schemas"/*.json; do
    if [ -f "$f" ]; then
      echo "  $(basename "$f")"
    fi
  done
  echo "═══════════════════════════════════════"
  exit 0
fi

# ─── Multi-Agent Functions ────────────────────────────────────────────────

run_agent() {
  local agent_name="$1"
  local prompt_file="$2"
  local model="${3:-}"
  shift 3 || shift $#

  local start_time end_time duration
  start_time=$(date +%s)
  local stderr_file="$SCRIPT_DIR/.claude_stderr_${agent_name}"
  local exit_code=0

  log "  ├── Running $agent_name agent (model: ${model:-default})..."

  # Unset CLAUDECODE for nested launches
  unset CLAUDECODE 2>/dev/null || true

  # Build claude command with optional model flag
  local model_flag=""
  if [ -n "$model" ]; then
    model_flag="--model $model"
  fi

  # Set agent identity env var (used by hooks)
  export RALPH_AGENT="$agent_name"

  # Pipe prompt via stdin
  # --no-session-persistence: prevents concurrent agents from conflicting on session files
  # NOTE: Do NOT use `if ! (cmd); then exit_code=$?` — the `!` negation
  # makes $? always 0 inside the then-block. Use `cmd || exit_code=$?` instead.
  # shellcheck disable=SC2086
  (cd "$PROJECT_ROOT" && cat "$prompt_file" | \
    claude --print --no-session-persistence --permission-mode bypassPermissions $model_flag \
    2>"$stderr_file") || exit_code=$?

  end_time=$(date +%s)
  duration=$((end_time - start_time))

  # Parse tokens from stderr
  local tokens_in tokens_out
  tokens_in=$(grep -oE 'input[_: ]+[0-9,]+' "$stderr_file" 2>/dev/null | grep -oE '[0-9,]+' | tr -d ',' | head -1 || true)
  tokens_out=$(grep -oE 'output[_: ]+[0-9,]+' "$stderr_file" 2>/dev/null | grep -oE '[0-9,]+' | tr -d ',' | head -1 || true)

  log "  │   └── $agent_name: ${duration}s, tokens in=${tokens_in:-?} out=${tokens_out:-?}, exit=$exit_code"
  log_structured "$ITER_NUM" "agent_done" "agent=$agent_name,duration=${duration}s,tokens_in=${tokens_in:-0},tokens_out=${tokens_out:-0},exit=$exit_code"

  rm -f "$stderr_file"
  unset RALPH_AGENT

  return $exit_code
}

create_worktree() {
  local slot="$1"
  local worktree_path="$SCRIPT_DIR/$WORKTREE_DIR/build-${slot}"
  local branch_name="ralph-build-${ITER_NUM}-slot-${slot}"

  # Clean up stale worktree if exists
  if [ -d "$worktree_path" ]; then
    (cd "$PROJECT_ROOT" && git worktree remove --force "$worktree_path" 2>/dev/null || true)
  fi

  # Delete stale branch from a previous crashed run (git worktree add -b fails if branch exists)
  (cd "$PROJECT_ROOT" && git branch -D "$branch_name" 2>/dev/null || true)

  # Create worktree on new branch from current HEAD
  # IMPORTANT: Redirect git output to stderr — stdout is used for the return value
  (cd "$PROJECT_ROOT" && git worktree add "$worktree_path" -b "$branch_name" HEAD) >/dev/null 2>&1

  # Verify worktree was actually created
  if [ ! -d "$worktree_path/.git" ] && [ ! -f "$worktree_path/.git" ]; then
    log "ERROR: Failed to create worktree at $worktree_path" >&2
    return 1
  fi

  # Log to stderr so it doesn't pollute the captured return value
  log "  │   Created worktree: $worktree_path (branch: $branch_name)" >&2
  echo "$worktree_path"
}

merge_worktrees() {
  local plan_file="$PROJECT_ROOT/knowledge/handoffs/EXECUTION_PLAN.json"
  local merge_order
  local session_branch

  session_branch=$(cd "$PROJECT_ROOT" && git branch --show-current)

  # Read merge order from execution plan (slot numbers)
  merge_order=$(json_pluck "$plan_file" .tasks slot)
  if [ -z "$merge_order" ]; then
    # Fallback: merge in directory order
    merge_order=$(ls "$SCRIPT_DIR/$WORKTREE_DIR/" 2>/dev/null | grep -oE '[0-9]+' | sort -n)
  fi

  local merge_failed=false
  local merged_count=0

  for slot in $merge_order; do
    local branch_name="ralph-build-${ITER_NUM}-slot-${slot}"
    local build_result="$PROJECT_ROOT/knowledge/handoffs/BUILD_RESULT_${slot}.json"

    # Skip failed or crashed builders
    if [ -f "$build_result" ]; then
      local status
      status=$(json_val "$build_result" .status "unknown")

      if [ "$status" = "failed" ]; then
        log "  │   Skipping merge for slot $slot (build failed)"
        continue
      fi
    else
      # No BUILD_RESULT file — builder likely crashed without producing output
      # Check if branch has any commits beyond base; if not, skip the merge
      local branch_exists
      branch_exists=$(cd "$PROJECT_ROOT" && git rev-parse --verify "$branch_name" >/dev/null 2>/dev/null && echo "yes" || echo "no")
      if [ "$branch_exists" = "no" ]; then
        log "  │   Skipping merge for slot $slot (branch missing — builder crashed)"
        continue
      fi
    fi

    # Merge with --no-ff to preserve branch history
    log "  │   Merging slot $slot (branch: $branch_name)..."
    if (cd "$PROJECT_ROOT" && git merge --no-ff "$branch_name" -m "ralph: merge builder slot $slot for iteration $ITER_NUM" 2>/dev/null); then
      merged_count=$((merged_count + 1))
      log "  │   └── Merged successfully"
    else
      log "  │   └── MERGE CONFLICT in slot $slot — aborting merge"
      (cd "$PROJECT_ROOT" && git merge --abort 2>/dev/null || true)
      merge_failed=true
    fi
  done

  log "  │   Merged $merged_count worktrees"

  if [ "$merge_failed" = true ]; then
    return 1
  fi
  return 0
}

cleanup_worktrees() {
  local worktree_dir="$SCRIPT_DIR/$WORKTREE_DIR"

  if [ ! -d "$worktree_dir" ]; then
    return 0
  fi

  for wt in "$worktree_dir"/build-*; do
    if [ -d "$wt" ]; then
      local branch_name
      branch_name=$(cd "$wt" && git branch --show-current 2>/dev/null || echo "")

      # Remove symlinked/junctioned node_modules FIRST to prevent
      # rm -rf from following the link and deleting the real node_modules
      if [ -L "$wt/node_modules" ]; then
        rm "$wt/node_modules" 2>/dev/null || true
      elif [ -e "$wt/node_modules" ]; then
        # Windows junction: rmdir removes junction without following it
        rmdir "$wt/node_modules" 2>/dev/null || \
          cmd //c "rmdir \"$(cygpath -w "$wt/node_modules" 2>/dev/null)\"" 2>/dev/null || true
      fi

      # Remove worktree
      (cd "$PROJECT_ROOT" && git worktree remove --force "$wt" 2>/dev/null) || rm -rf "$wt"

      # Delete the temporary branch
      if [ -n "$branch_name" ]; then
        (cd "$PROJECT_ROOT" && git branch -D "$branch_name" 2>/dev/null || true)
      fi
    fi
  done

  # Prune stale worktree metadata
  (cd "$PROJECT_ROOT" && git worktree prune 2>/dev/null || true)
}

prepare_builder_prompt() {
  local slot="$1"
  local template="$SCRIPT_DIR/$AGENT_PROMPT_DIR/builder.md"
  local plan_file="$PROJECT_ROOT/knowledge/handoffs/EXECUTION_PLAN.json"
  local output_file="$SCRIPT_DIR/.ralph/builder-prompt-${slot}.md"
  local worktree_path="$SCRIPT_DIR/$WORKTREE_DIR/build-${slot}"

  # Extract task JSON for this slot
  local task_json=""
  task_json=$(json_extract "$plan_file" .tasks slot "$slot")

  # Template substitution
  sed -e "s|{{SLOT}}|${slot}|g" \
      -e "s|{{WORKTREE_PATH}}|${worktree_path}|g" \
      "$template" > "$output_file"

  # Append task JSON at the end
  {
    echo ""
    echo "---"
    echo ""
    echo "## YOUR TASK (from EXECUTION_PLAN.json, slot $slot)"
    echo '```json'
    echo "$task_json"
    echo '```'
  } >> "$output_file"

  echo "$output_file"
}

prepare_tester_prompt() {
  local test_type="$1"   # "acceptance" or "regression"
  local test_n="$2"      # 1 or 2
  local template="$SCRIPT_DIR/$AGENT_PROMPT_DIR/tester.md"
  local output_file="$SCRIPT_DIR/.ralph/tester-prompt-${test_n}.md"

  local action_budget test_focus
  if [ "$test_type" = "acceptance" ]; then
    action_budget="10"
    test_focus="**Primary focus:** ACCEPTANCE TESTING and QUALITY GATE sections. Run regression only if time permits within your action budget."
  else
    action_budget="40"
    test_focus="**Primary focus:** REGRESSION TESTING and SUITE TESTING sections. Skip acceptance testing — another tester agent handles that."
  fi

  sed -e "s|{{TEST_TYPE}}|${test_type}|g" \
      -e "s|{{TEST_N}}|${test_n}|g" \
      -e "s|{{ACTION_BUDGET}}|${action_budget}|g" \
      -e "s|{{TEST_FOCUS}}|${test_focus}|g" \
      "$template" > "$output_file"

  echo "$output_file"
}

run_pipeline() {
  local plan_file="$PROJECT_ROOT/knowledge/handoffs/EXECUTION_PLAN.json"

  # ── Clean stale handoff files ──
  rm -f "$PROJECT_ROOT"/knowledge/handoffs/*.json
  mkdir -p "$PROJECT_ROOT/knowledge/handoffs"
  mkdir -p "$SCRIPT_DIR/$WORKTREE_DIR"
  mkdir -p "$SCRIPT_DIR/.ralph"

  # ═══════════════════════════════════════════════════════════════
  # STAGE 1: PLANNER (serial, Opus)
  # ═══════════════════════════════════════════════════════════════
  log "  ┌── Stage 1: PLANNER"

  if ! run_agent "planner" "$SCRIPT_DIR/$AGENT_PROMPT_DIR/planner.md" "$PLANNER_MODEL"; then
    log "  └── PLANNER failed (exit code $?)"
    # Run reviewer to document the failure
    run_agent "reviewer" "$SCRIPT_DIR/$AGENT_PROMPT_DIR/reviewer.md" "$REVIEWER_MODEL" || true
    return 1
  fi

  # Validate planner output
  if [ ! -f "$plan_file" ]; then
    log "  └── PLANNER did not produce EXECUTION_PLAN.json"
    run_agent "reviewer" "$SCRIPT_DIR/$AGENT_PROMPT_DIR/reviewer.md" "$REVIEWER_MODEL" || true
    return 1
  fi

  # Check plan mode
  local plan_mode
  plan_mode=$(json_val "$plan_file" .mode "unknown")

  case "$plan_mode" in
    blocked)
      log "  └── PLANNER: BLOCKED — running reviewer for documentation"
      run_agent "reviewer" "$SCRIPT_DIR/$AGENT_PROMPT_DIR/reviewer.md" "$REVIEWER_MODEL" || true
      return 0
      ;;
    testing_only)
      log "  └── PLANNER: Testing-only iteration (cadence trigger)"
      # Skip builders, go straight to testing
      ;;
    single_task|multi_task)
      # Continue to builders
      ;;
    *)
      log "  └── PLANNER: Unknown mode '$plan_mode'"
      run_agent "reviewer" "$SCRIPT_DIR/$AGENT_PROMPT_DIR/reviewer.md" "$REVIEWER_MODEL" || true
      return 1
      ;;
  esac

  # Handle revert if needed
  local revert_needed
  revert_needed=$(json_val "$plan_file" .validation.revert_needed "false")

  if [ "$revert_needed" = "true" ]; then
    log "  │   Reverting last commit (planner flagged as invalid)..."
    # Use -m 1 if HEAD is a merge commit (keeps first-parent side).
    # git rev-parse HEAD^2 succeeds only if HEAD has a second parent.
    local revert_flag=""
    if (cd "$PROJECT_ROOT" && git rev-parse HEAD^2 &>/dev/null); then
      revert_flag="-m 1"
    fi
    # shellcheck disable=SC2086
    (cd "$PROJECT_ROOT" && git revert HEAD --no-edit $revert_flag) || {
      log "  │   WARNING: Revert failed"
    }
  fi

  # ═══════════════════════════════════════════════════════════════
  # STAGE 2: BUILDERS (parallel, Sonnet, git worktrees)
  # ═══════════════════════════════════════════════════════════════

  if [ "$plan_mode" != "testing_only" ]; then
    # Count tasks (capped at MAX_PARALLEL_BUILDERS to prevent resource exhaustion)
    local task_count
    task_count=$(json_count "$plan_file" .tasks)
    if [ "$task_count" -gt "$MAX_PARALLEL_BUILDERS" ] 2>/dev/null; then
      log "  │   Planner requested $task_count tasks — capping at $MAX_PARALLEL_BUILDERS"
      task_count="$MAX_PARALLEL_BUILDERS"
    fi

    log "  ├── Stage 2: BUILDERS ($task_count tasks)"

    local builder_pids=()
    local builder_slots=()

    for ((slot=1; slot<=task_count; slot++)); do
      # Create worktree
      local wt_path
      wt_path=$(create_worktree "$slot") || true
      if [ -z "$wt_path" ] || [ ! -d "$wt_path" ]; then
        log "  │   ERROR: Worktree creation failed for slot $slot — skipping"
        continue
      fi

      # ── Provision worktree with gitignored dependencies ──
      # Worktrees only contain committed files. node_modules/ is gitignored but
      # required for type-check, lint, and build. Link it from the main project.
      if [ -d "$PROJECT_ROOT/node_modules" ] && [ ! -e "$wt_path/node_modules" ]; then
        # Try Windows NTFS junction (fast, no admin), then POSIX symlink
        local wt_win proj_win
        wt_win=$(cygpath -w "$wt_path/node_modules" 2>/dev/null || echo "")
        proj_win=$(cygpath -w "$PROJECT_ROOT/node_modules" 2>/dev/null || echo "")
        if [ -n "$wt_win" ] && [ -n "$proj_win" ]; then
          cmd //c "mklink /J \"$wt_win\" \"$proj_win\"" >/dev/null 2>&1 || true
        fi
        if [ ! -e "$wt_path/node_modules" ]; then
          ln -s "$PROJECT_ROOT/node_modules" "$wt_path/node_modules" 2>/dev/null || true
        fi
        if [ ! -e "$wt_path/node_modules" ]; then
          log "  │   WARNING: Could not link node_modules to worktree $slot — verification may fail" >&2
        fi
      fi
      # Also link .env.local if present (needed for NEXT_PUBLIC_ vars during build)
      if [ -f "$PROJECT_ROOT/.env.local" ] && [ ! -f "$wt_path/.env.local" ]; then
        cp "$PROJECT_ROOT/.env.local" "$wt_path/.env.local" 2>/dev/null || true
      fi

      # Copy handoff files to worktree (builders need to read EXECUTION_PLAN)
      mkdir -p "$wt_path/knowledge/handoffs"
      cp "$plan_file" "$wt_path/knowledge/handoffs/"

      # Prepare customized builder prompt
      local prompt_file_path
      prompt_file_path=$(prepare_builder_prompt "$slot")

      # Launch builder in background, working in worktree
      # NOTE: Capture main PROJECT_ROOT before subshell overrides it
      local main_handoffs_dir="$PROJECT_ROOT/knowledge/handoffs"
      local iter_num="$ITER_NUM"
      (
        export PROJECT_ROOT="$wt_path"
        run_agent "builder-${slot}" "$prompt_file_path" "$BUILDER_MODEL"

        # ── Health check: ensure BUILD_RESULT was produced ──
        if [ ! -f "$wt_path/knowledge/handoffs/BUILD_RESULT_${slot}.json" ]; then
          printf '{"status":"failed","failure_details":"Agent process exited without producing output"}\n' \
            > "$wt_path/knowledge/handoffs/BUILD_RESULT_${slot}.json"
        fi

        # ── Copy BUILD_RESULT back FIRST (before cleanup) ──
        if [ -f "$wt_path/knowledge/handoffs/BUILD_RESULT_${slot}.json" ]; then
          cp "$wt_path/knowledge/handoffs/BUILD_RESULT_${slot}.json" \
             "$main_handoffs_dir/"
        fi

        # ── Remove handoff files BEFORE staging ──
        # EXECUTION_PLAN.json was copied for the builder to read, but must not
        # be committed — it causes merge conflicts when merging worktrees back.
        rm -f "$wt_path"/knowledge/handoffs/*.json 2>/dev/null || true

        # ── Stage and commit all changes ──
        # Builder may create files but miss git-adding some. Since this is a
        # disposable worktree, git add -A is safe — stage everything, then commit.
        # Without a commit, merge_worktrees sees "Already up to date."
        (cd "$wt_path" && git add -A) 2>/dev/null || true
        if ! (cd "$wt_path" && git diff --cached --quiet) 2>/dev/null; then
          (cd "$wt_path" && git commit -m "ralph: builder slot $slot iteration $iter_num" --no-verify) >/dev/null 2>&1
        fi
      ) &

      builder_pids+=($!)
      builder_slots+=($slot)
      log "  │   └── Builder #$slot launched (PID ${builder_pids[-1]})"

      # Stagger builder launches to avoid concurrent Claude CLI conflicts
      # (builder-2 ran 0 seconds in iter 71 — likely stdin/pipe race condition)
      if [ "$slot" -lt "$task_count" ]; then
        sleep 3
      fi
    done

    # Wait for all builders
    local any_builder_failed=false
    for idx in "${!builder_pids[@]}"; do
      local pid=${builder_pids[$idx]}
      local bslot=${builder_slots[$idx]}
      local bslot_exit=0
      if wait "$pid"; then
        log "  │   Builder #$bslot completed"
      else
        bslot_exit=$?
        any_builder_failed=true
        log "  │   Builder #$bslot FAILED (exit $bslot_exit)"
      fi
    done

    # ── Check builder results ──
    local build_result_count=0
    for ((chk_slot=1; chk_slot<=task_count; chk_slot++)); do
      if [ -f "$PROJECT_ROOT/knowledge/handoffs/BUILD_RESULT_${chk_slot}.json" ]; then
        build_result_count=$((build_result_count + 1))
      else
        log "  │   WARNING: No BUILD_RESULT for slot $chk_slot"
      fi
    done
    log "  │   Build results: $build_result_count/$task_count"

    local skip_testers=false

    if [ "$build_result_count" -eq 0 ]; then
      log "  │   ALL builders failed — skipping merge and testers"
      cleanup_worktrees
      skip_testers=true
    else
      # ═══════════════════════════════════════════════════════════════
      # STAGE 3: INTEGRATION (bash — no LLM)
      # ═══════════════════════════════════════════════════════════════
      log "  ├── Stage 3: INTEGRATION"

      if ! merge_worktrees; then
        log "  │   └── Merge conflicts detected — reviewer will handle"
      fi

      # Cleanup worktrees
      cleanup_worktrees

      # ── Post-merge build verification gate ──
      # Catch type errors introduced by merge before reviewer runs.
      # Result written to handoffs for reviewer to read.
      local tsc_result_file="$PROJECT_ROOT/knowledge/handoffs/POST_MERGE_CHECK.txt"
      log "  │   Running post-merge type check..."
      if (cd "$PROJECT_ROOT" && npx tsc --noEmit 2>&1 | tail -30 > "$tsc_result_file"); then
        echo "RESULT: PASS" >> "$tsc_result_file"
        log "  │   └── Type check PASSED"
      else
        echo "RESULT: FAIL" >> "$tsc_result_file"
        log "  │   └── WARNING: Type check FAILED after merge — skipping testers"
        skip_testers=true
      fi
    fi
  fi

  # ═══════════════════════════════════════════════════════════════
  # STAGE 4: TESTERS (parallel, Sonnet, conditional)
  # ═══════════════════════════════════════════════════════════════

  # skip_testers may already be set by builder failure or type check failure
  if [ "${skip_testers:-false}" = true ]; then
    log "  ├── Stage 4: TESTERS (skipped — upstream failure)"
  else
    # Determine if testing should run
    local run_acceptance run_regression
    run_acceptance=$(json_val "$plan_file" .testing_plan.run_acceptance "false")
    run_regression=$(json_val "$plan_file" .testing_plan.run_regression "false")

    # Check Playwright availability
    local playwright_ok=false
    if [ "$PLAYWRIGHT_AVAILABLE" = "true" ]; then
      playwright_ok=true
    elif [ "$PLAYWRIGHT_AVAILABLE" = "false" ]; then
      playwright_ok=false
    else
      # Auto-detect
      if claude mcp list 2>/dev/null | grep -qi playwright; then
        playwright_ok=true
      fi
    fi

    # Check if any task has UI changes
    local has_ui_changes
    has_ui_changes=$(json_any "$plan_file" .tasks has_ui_changes)

    # In testing_only mode, the planner explicitly requested testing — honor it
    if [ "$plan_mode" = "testing_only" ]; then
      has_ui_changes="true"
    fi

    local tester_pids=()
    local tester_count=0

    # ── Acceptance tester (requires Playwright + UI changes) ──
    if [ "$playwright_ok" = true ] && [ "$run_acceptance" = "true" ] && [ "$has_ui_changes" = "true" ]; then
      local accept_prompt
      accept_prompt=$(prepare_tester_prompt "acceptance" "1")
      (run_agent "tester-acceptance" "$accept_prompt" "$TESTER_MODEL") &
      tester_pids+=($!)
      tester_count=$((tester_count + 1))
      log "  │   └── Acceptance tester launched"
    else
      local skip_reason=""
      if [ "$playwright_ok" != true ]; then
        skip_reason="Playwright unavailable"
      elif [ "$run_acceptance" != "true" ]; then
        skip_reason="not requested"
      else
        skip_reason="no UI changes"
      fi
      log "  │   └── Acceptance tester skipped ($skip_reason)"
    fi

    # ── Regression tester (static analysis — no Playwright needed) ──
    if [ "$run_regression" = "true" ]; then
      local regress_prompt
      regress_prompt=$(prepare_tester_prompt "regression" "2")
      (run_agent "tester-regression" "$regress_prompt" "$TESTER_MODEL") &
      tester_pids+=($!)
      tester_count=$((tester_count + 1))
      log "  │   └── Regression tester launched"
    else
      log "  │   └── Regression tester skipped (not requested)"
    fi

    if [ "$tester_count" -gt 0 ]; then
      log "  ├── Stage 4: TESTERS ($tester_count launched)"
      # Wait for testers (non-fatal — reviewer always runs)
      for pid in "${tester_pids[@]}"; do
        wait "$pid" || log "  │   WARNING: Tester exited with error"
      done
    else
      log "  ├── Stage 4: TESTERS (skipped — none triggered)"
    fi
  fi

  # ═══════════════════════════════════════════════════════════════
  # STAGE 5: REVIEWER (serial, Opus)
  # ═══════════════════════════════════════════════════════════════
  log "  ├── Stage 5: REVIEWER"

  run_agent "reviewer" "$SCRIPT_DIR/$AGENT_PROMPT_DIR/reviewer.md" "$REVIEWER_MODEL" || {
    log "  └── REVIEWER failed"
    return 1
  }

  log "  └── Pipeline complete"
  return 0
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
  http_code=$(check_dev_server)
  if [ "$http_code" == "200" ] || [ "$http_code" == "304" ]; then
    echo "Running at $APP_URL (HTTP $http_code)"
  else
    echo "NOT RUNNING (HTTP $http_code)"
  fi
  exit 0
fi

# ─── Preflight Checks ────────────────────────────────────────────────────

if [ "$AGENT_MODE" = "single" ]; then
  if [ ! -f "$PROMPT_FILE" ]; then
    echo "ERROR: PROMPT.md not found at $PROMPT_FILE"
    exit 1
  fi
else
  # Multi-agent mode: verify agent prompts exist
  for agent_file in planner.md builder.md tester.md reviewer.md; do
    if [ ! -f "$SCRIPT_DIR/$AGENT_PROMPT_DIR/$agent_file" ]; then
      echo "ERROR: Agent prompt $agent_file not found in $SCRIPT_DIR/$AGENT_PROMPT_DIR/"
      echo "Run --legacy mode or create the agent prompts."
      exit 1
    fi
  done
fi

if ! command -v claude &> /dev/null; then
  echo "ERROR: Claude Code CLI not found. Install it first."
  exit 1
fi

# JSON parsing check (multi-agent mode needs JSON extraction from handoff files)
if [ "$AGENT_MODE" = "multi" ]; then
  if ! command -v python3 &>/dev/null && ! command -v jq &>/dev/null; then
    echo "WARNING: Neither python3 nor jq found. Multi-agent JSON parsing will use"
    echo "         grep fallbacks, which may fail on complex handoff files."
    echo "         Install python3 or jq for reliable operation."
  fi
fi

# ─── Banner ───────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════"
echo "  RALPH LOOP"
echo "  Mode: $MODE"
echo "  Agent mode: $AGENT_MODE"
echo "  Max iterations: $MAX_ITERATIONS"
echo "  Circuit breaker: $LOOP_CIRCUIT_BREAKER consecutive failures"
echo "  Project: $PROJECT_ROOT"
echo "  App: $APP_URL"
echo "  Started: $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════"
echo ""

log "Session started: mode=$MODE max=$MAX_ITERATIONS"

# ─── Trap: Cleanup on interrupt ──────────────────────────────────────────
# Ctrl+C or SIGTERM during an iteration leaves stale worktrees, branches,
# and node_modules junctions. Clean them up and write session summary.
trap_cleanup() {
  echo ""
  log "Signal received — cleaning up..."
  cleanup_worktrees 2>/dev/null || true
  write_session_summary 2>/dev/null || true
  log "Cleanup complete. Exiting."
  exit 130
}
trap trap_cleanup INT TERM

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
  # Preserve context-rich SIGNAL (e.g., "CONTINUE: Phase 4 — start FEAT-045")
  # Only overwrite if SIGNAL is missing, empty, or contains a stop/block state
  current_signal=$(cat "$SIGNAL_FILE" 2>/dev/null || echo "")
  case "$current_signal" in
    CONTINUE*) ;; # Already a continue signal — keep the context message
    *) echo "CONTINUE" > "$SIGNAL_FILE" ;;
  esac
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

  if [ "$AGENT_MODE" = "multi" ]; then
    # ── Multi-agent pipeline ──
    log "  Agent mode: multi-agent pipeline"
    run_pipeline
  else
    # ── Legacy single-agent mode ──
    log "  Agent mode: legacy (single agent)"

    # Unset CLAUDECODE to allow launching from within a Claude Code session
    unset CLAUDECODE 2>/dev/null || true

    RESULT=""
    CLAUDE_STDERR=""
    # Pipe prompt via stdin to avoid "Argument list too long" on Windows/MSYS2
    if RESULT=$(cd "$PROJECT_ROOT" && cat "$PROMPT_FILE" | claude --print --no-session-persistence --permission-mode bypassPermissions 2>"$SCRIPT_DIR/.claude_stderr_tmp"); then
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
