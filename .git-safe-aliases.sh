#!/bin/bash

# Git Safe Aliases - Prevent accidental data loss
# Source this file in your shell: source .git-safe-aliases.sh

# Safe git clean - always shows what will be deleted and asks for confirmation
git-clean-safe() {
    echo "🔍 Files that would be deleted:"
    git clean -n "$@"
    echo ""
    read -p "⚠️  Are you sure you want to delete these files? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        git clean "$@"
        echo "✅ Files deleted"
    else
        echo "❌ Operation cancelled"
    fi
}

# Safe stash drop - shows stash content before dropping
git-stash-drop-safe() {
    local stash_ref="${1:-stash@{0}}"
    echo "📦 Stash content that will be dropped:"
    git stash show -p "$stash_ref" | head -50
    echo ""
    echo "... (showing first 50 lines)"
    echo ""
    read -p "⚠️  Are you sure you want to drop this stash? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        git stash drop "$stash_ref"
        echo "✅ Stash dropped"
    else
        echo "❌ Operation cancelled"
    fi
}

# Auto-commit untracked files before dangerous operations
git-save-wip() {
    if [ -n "$(git status --porcelain)" ]; then
        echo "💾 Saving work in progress..."
        git add -A
        git commit -m "WIP: auto-save before cleanup ($(date '+%Y-%m-%d %H:%M:%S'))"
        echo "✅ Work saved in commit: $(git rev-parse --short HEAD)"
    else
        echo "✅ Working tree is clean, nothing to save"
    fi
}

# Safe branch cleanup - commits WIP first
git-cleanup-branches() {
    echo "🧹 Safe branch cleanup"
    echo ""
    
    # Save any uncommitted work
    git-save-wip
    
    # Show branches that will be deleted
    echo ""
    echo "📋 Local branches (excluding master/main/develop):"
    git branch | grep -v "master\|main\|develop" | grep -v "^\*"
    echo ""
    
    read -p "⚠️  Delete all these branches? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        git branch | grep -v "master\|main\|develop" | grep -v "^\*" | xargs git branch -D
        echo "✅ Branches deleted"
    else
        echo "❌ Operation cancelled"
    fi
}

echo "✅ Git safe aliases loaded!"
echo ""
echo "Available commands:"
echo "  git-clean-safe       - Safe git clean with confirmation"
echo "  git-stash-drop-safe  - Safe stash drop with preview"
echo "  git-save-wip         - Auto-commit all changes as WIP"
echo "  git-cleanup-branches - Safe branch cleanup with WIP save"
