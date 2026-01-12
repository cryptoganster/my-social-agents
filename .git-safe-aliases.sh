#!/bin/bash

# Git Safe Aliases - Prevent accidental data loss and enforce rebase workflow
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

# ============================================================================
# REBASE WORKFLOW ALIASES
# ============================================================================

# Safe update master (replaces git pull)
git-update-master() {
    local current_branch=$(git branch --show-current)
    
    echo "📥 Updating master from origin..."
    git checkout master
    git fetch origin
    git reset --hard origin/master
    echo "✅ Master updated to latest"
    
    if [ "$current_branch" != "master" ]; then
        echo "🔄 Switching back to $current_branch"
        git checkout "$current_branch"
    fi
}

# Safe rebase with checks
git-rebase-safe() {
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo "⚠️  You have uncommitted changes!"
        echo ""
        git status --short
        echo ""
        read -p "Commit changes before rebase? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            git add -A
            git commit -m "WIP: save before rebase ($(date '+%Y-%m-%d %H:%M:%S'))"
            echo "✅ Changes committed"
        else
            echo "❌ Rebase cancelled - commit or stash changes first"
            return 1
        fi
    fi
    
    echo "🔄 Fetching latest from origin..."
    git fetch origin
    
    echo "🔄 Rebasing on origin/master..."
    git rebase origin/master
    
    if [ $? -eq 0 ]; then
        echo "✅ Rebase successful"
        echo "💡 Remember to push with: git push --force-with-lease"
    else
        echo "⚠️  Rebase has conflicts - resolve them and run: git rebase --continue"
    fi
}

# Safe force push (uses --force-with-lease)
git-push-safe() {
    local branch=$(git branch --show-current)
    
    if [ "$branch" = "master" ] || [ "$branch" = "main" ]; then
        echo "❌ Cannot force push to master/main branch!"
        return 1
    fi
    
    echo "🚀 Pushing $branch with --force-with-lease..."
    git push --force-with-lease origin "$branch"
    
    if [ $? -eq 0 ]; then
        echo "✅ Push successful"
    else
        echo "⚠️  Push failed - remote may have changes you don't have"
        echo "💡 Run: git fetch origin && git rebase origin/$branch"
    fi
}

# Auto-save before rebase
git-save-before-rebase() {
    if [ -n "$(git status --porcelain)" ]; then
        echo "💾 Saving work before rebase..."
        git add -A
        git commit -m "WIP: save before rebase ($(date '+%Y-%m-%d %H:%M:%S'))"
        echo "✅ Work saved in commit: $(git rev-parse --short HEAD)"
    else
        echo "✅ Working tree is clean, nothing to save"
    fi
}

# Complete workflow: fetch, rebase, push
git-sync-branch() {
    local branch=$(git branch --show-current)
    
    if [ "$branch" = "master" ] || [ "$branch" = "main" ]; then
        echo "❌ Cannot sync master/main branch - use git-update-master instead"
        return 1
    fi
    
    echo "🔄 Syncing branch: $branch"
    echo ""
    
    # Save uncommitted work
    git-save-before-rebase
    
    # Fetch and rebase
    echo "📥 Fetching from origin..."
    git fetch origin
    
    echo "🔄 Rebasing on origin/master..."
    git rebase origin/master
    
    if [ $? -ne 0 ]; then
        echo "⚠️  Rebase has conflicts - resolve them and run: git rebase --continue"
        echo "💡 After resolving, run: git push --force-with-lease origin $branch"
        return 1
    fi
    
    echo "✅ Rebase successful"
    
    # Push with force-with-lease
    read -p "Push to origin? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        git-push-safe
    else
        echo "💡 Push later with: git push --force-with-lease origin $branch"
    fi
}

# Block dangerous git pull command
git() {
    if [ "$1" = "pull" ] && [ "$2" = "origin" ] && [ "$3" = "master" ]; then
        echo "❌ FORBIDDEN: git pull origin master creates merge commits!"
        echo ""
        echo "✅ Use instead:"
        echo "   git fetch origin && git reset --hard origin/master"
        echo "   OR: git-update-master"
        return 1
    elif [ "$1" = "push" ] && [ "$2" = "--force" ]; then
        echo "❌ FORBIDDEN: git push --force is unsafe!"
        echo ""
        echo "✅ Use instead:"
        echo "   git push --force-with-lease"
        echo "   OR: git-push-safe"
        return 1
    else
        command git "$@"
    fi
}

echo "✅ Git safe aliases loaded!"
echo ""
echo "Available commands:"
echo "  git-clean-safe         - Safe git clean with confirmation"
echo "  git-stash-drop-safe    - Safe stash drop with preview"
echo "  git-save-wip           - Auto-commit all changes as WIP"
echo "  git-cleanup-branches   - Safe branch cleanup with WIP save"
echo ""
echo "Rebase workflow commands:"
echo "  git-update-master      - Safe update master (replaces git pull)"
echo "  git-rebase-safe        - Safe rebase with checks"
echo "  git-push-safe          - Safe force push (uses --force-with-lease)"
echo "  git-save-before-rebase - Auto-save before rebase"
echo "  git-sync-branch        - Complete workflow: fetch, rebase, push"
echo ""
echo "⚠️  Dangerous commands blocked:"
echo "  git pull origin master → Use git-update-master"
echo "  git push --force       → Use git-push-safe"
