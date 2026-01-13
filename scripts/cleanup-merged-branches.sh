#!/bin/bash

# Cleanup Merged Branches
# Detects and deletes local branches that have been merged via rebase

set -e

echo "🔍 Detecting merged branches..."
echo ""

# Fetch latest from remote
git fetch origin --prune

# Get all local branches except master
branches=$(git branch | grep -v "^\*" | grep -v "master" | sed 's/^[ \t]*//')

if [ -z "$branches" ]; then
  echo "✅ No branches to clean up!"
  exit 0
fi

merged_branches=()
not_merged_branches=()

for branch in $branches; do
  # Check if branch has a PR in GitHub
  pr_state=$(gh pr list --head "$branch" --state all --json state --jq '.[0].state' 2>/dev/null || echo "")
  
  if [ "$pr_state" = "MERGED" ]; then
    merged_branches+=("$branch")
    echo "✅ $branch - MERGED (PR merged in GitHub)"
  elif [ "$pr_state" = "CLOSED" ]; then
    not_merged_branches+=("$branch")
    echo "⚠️  $branch - CLOSED (PR closed without merge)"
  elif [ "$pr_state" = "OPEN" ]; then
    not_merged_branches+=("$branch")
    echo "🔄 $branch - OPEN (PR still open)"
  else
    # No PR found, check if commits are in master
    if git merge-base --is-ancestor "$branch" origin/master 2>/dev/null; then
      merged_branches+=("$branch")
      echo "✅ $branch - MERGED (commits in master)"
    else
      not_merged_branches+=("$branch")
      echo "❌ $branch - NOT MERGED (no PR or commits not in master)"
    fi
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ${#merged_branches[@]} -eq 0 ]; then
  echo "✅ No merged branches to delete"
  exit 0
fi

echo "📋 Merged branches to delete:"
for branch in "${merged_branches[@]}"; do
  echo "   - $branch"
done
echo ""

read -p "Delete these branches? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  for branch in "${merged_branches[@]}"; do
    git branch -D "$branch"
    echo "🗑️  Deleted: $branch"
  done
  echo ""
  echo "✅ Cleanup complete!"
else
  echo "❌ Cleanup cancelled"
fi
