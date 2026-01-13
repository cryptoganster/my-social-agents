#!/bin/bash

# Git Aliases for Detecting Merged Branches with Rebase
# Source this file in your shell: source .git-merged-aliases.sh

# Detect branches merged via rebase by comparing patch-id
git-merged-rebase() {
  local base_branch="${1:-origin/master}"
  
  echo "🔍 Detecting branches merged into $base_branch (rebase-aware)..."
  echo ""
  
  for branch in $(git branch | grep -v "^\*" | grep -v "master" | sed 's/^[ \t]*//'); do
    # Get the merge base
    merge_base=$(git merge-base "$branch" "$base_branch" 2>/dev/null)
    
    if [ -z "$merge_base" ]; then
      echo "❌ $branch - No common ancestor"
      continue
    fi
    
    # Get commits in branch but not in base
    commits=$(git rev-list "$merge_base".."$branch" 2>/dev/null)
    
    if [ -z "$commits" ]; then
      echo "✅ $branch - MERGED (no unique commits)"
      continue
    fi
    
    # Check if all commits have equivalent patch-ids in base
    all_merged=true
    for commit in $commits; do
      patch_id=$(git show "$commit" | git patch-id | cut -d' ' -f1)
      
      # Search for this patch-id in base branch
      if ! git log "$base_branch" --pretty=format:"%H" | while read base_commit; do
        base_patch_id=$(git show "$base_commit" | git patch-id | cut -d' ' -f1)
        if [ "$patch_id" = "$base_patch_id" ]; then
          exit 0
        fi
      done; then
        all_merged=false
        break
      fi
    done
    
    if $all_merged; then
      echo "✅ $branch - MERGED (all patches in $base_branch)"
    else
      echo "❌ $branch - NOT MERGED"
    fi
  done
}

# Detect branches with merged PRs in GitHub
git-merged-pr() {
  echo "🔍 Detecting branches with merged PRs in GitHub..."
  echo ""
  
  for branch in $(git branch | grep -v "^\*" | grep -v "master" | sed 's/^[ \t]*//'); do
    pr_state=$(gh pr list --head "$branch" --state all --json state,number --jq '.[0] | "\(.state)|\(.number)"' 2>/dev/null || echo "")
    
    if [ -z "$pr_state" ]; then
      echo "❓ $branch - No PR found"
    else
      state=$(echo "$pr_state" | cut -d'|' -f1)
      number=$(echo "$pr_state" | cut -d'|' -f2)
      
      case "$state" in
        MERGED)
          echo "✅ $branch - MERGED (PR #$number)"
          ;;
        OPEN)
          echo "🔄 $branch - OPEN (PR #$number)"
          ;;
        CLOSED)
          echo "⚠️  $branch - CLOSED (PR #$number)"
          ;;
      esac
    fi
  done
}

# Delete branches with merged PRs
git-delete-merged-pr() {
  echo "🗑️  Deleting branches with merged PRs..."
  echo ""
  
  for branch in $(git branch | grep -v "^\*" | grep -v "master" | sed 's/^[ \t]*//'); do
    pr_state=$(gh pr list --head "$branch" --state merged --json state --jq '.[0].state' 2>/dev/null || echo "")
    
    if [ "$pr_state" = "MERGED" ]; then
      echo "🗑️  Deleting: $branch"
      git branch -D "$branch"
    fi
  done
  
  echo ""
  echo "✅ Cleanup complete!"
}

echo "✅ Git merged branch aliases loaded!"
echo ""
echo "Available commands:"
echo "  git-merged-rebase [base]  - Detect merged branches by comparing patches"
echo "  git-merged-pr             - Detect branches with merged PRs in GitHub"
echo "  git-delete-merged-pr      - Delete branches with merged PRs"
echo ""
