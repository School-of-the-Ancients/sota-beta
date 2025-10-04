#!/usr/bin/env bash
set -euo pipefail

REPO="School-of-the-Ancients/sota-beta"

# Soft check; don't exit if this fails
if ! gh api rate_limit >/dev/null 2>&1; then
  echo "⚠️  gh is logged in but may lack scopes for write. If commands fail, run:"
  echo "   gh auth refresh -h github.com -s repo -s project -s read:org"
fi

upsert_label () {
  local name="$1" color="$2" desc="${3:-}"
  if gh label view "$name" -R "$REPO" >/dev/null 2>&1; then
    [[ -n "${desc}" ]] \
      && gh label edit "$name" -R "$REPO" --color "$color" --description "$desc" >/dev/null \
      || gh label edit "$name" -R "$REPO" --color "$color" >/dev/null
    echo "✓ Updated label: $name"
  else
    [[ -n "${desc}" ]] \
      && gh label create "$name" -R "$REPO" --color "$color" --description "$desc" >/dev/null \
      || gh label create "$name" -R "$REPO" --color "$color" >/dev/null
    echo "✓ Created label: $name"
  fi
}

upsert_milestone () {
  local title="$1" desc="$2" due_on="${3:-}"
  local id
  id=$(gh api "repos/$REPO/milestones" --jq '.[] | select(.title=="'"$title"'") | .number' 2>/dev/null || true)
  if [[ -n "$id" ]]; then
    echo "✓ Milestone already exists: $title (#$id)"
    return
  fi
  if [[ -n "$due_on" ]]; then
    gh api "repos/$REPO/milestones" -f title="$title" -f description="$desc" -f due_on="$due_on" >/dev/null
  else
    gh api "repos/$REPO/milestones" -f title="$title" -f description="$desc" >/dev/null
  fi
  echo "✓ Created milestone: $title"
}

# Priorities
upsert_label "priority:P0" "FF0000" "Ship-blocker"
upsert_label "priority:P1" "FFBF00" "MVP must-have"
upsert_label "priority:P2" "71B1FF" "Post-MVP / nice-to-have"

# Types
upsert_label "type:bug"      "D73A4A" "A defect or regression"
upsert_label "type:feature"  "A2EEEF" "New capability"
upsert_label "type:chore"    "C5DEF5" "Refactor, infra, or cleanup"
upsert_label "type:docs"     "0E8A16" "Documentation-only change"

# Areas
upsert_label "area:quests"    "0366D6" "Quest creation/flow"
upsert_label "area:progress"  "0E8A16" "Progress tracking & achievements"
upsert_label "area:auth"      "5319E7" "Login/accounts/storage"
upsert_label "area:ui"        "BFD4F2" "UI/UX styling and components"
upsert_label "area:ai"        "9159F0" "Model prompts, suggestions, eval"
upsert_label "area:infra"     "6F42C1" "Build/deploy/devops"

# Workflow helpers
upsert_label "status:needs-repro" "FBCA04" "Needs reproduction steps"
upsert_label "status:blocked"     "B60205" "Blocked by external or upstream"
upsert_label "good first issue"   "7057FF" "Low-scope task for newcomers"
upsert_label "help wanted"        "008672" "Maintainers welcome assistance"

# Milestones
upsert_milestone "Beta Stabilization" \
  "Stabilize quest completion, progress, suggestions, and quiz MVP" \
  "2025-10-14T23:59:59Z"

upsert_milestone "MVP v0.1" \
  "First public demo-quality build (auth, progress sync, quiz)" \
  "2025-10-31T23:59:59Z"

upsert_milestone "Post-MVP Backlog" \
  "Enhancements queued after MVP (multi-instructor classes, uploads)" \
  ""
