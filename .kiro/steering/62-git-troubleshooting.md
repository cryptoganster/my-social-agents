---
inclusion: manual
---

# Git Troubleshooting & Migration Guide

This document provides troubleshooting guidance, migration steps, and FAQ for the rebase-based Git workflow.

## Quick Reference

**Common Issues**:
- [Pre-rebase hook failed](#pre-rebase-hook-failed)
- [Force-with-lease rejected](#force-with-lease-rejected)
- [Push rejected: remote contains work](#push-rejected-remote-contains-work)
- [Rebase failed with conflicts](#rebase-failed-with-conflicts)
- [Blocked: git pull origin master](#blocked-git-pull-origin-master)
- [Pre-commit-branch-check failed](#pre-commit-branch-check-failed)
- [Pre-checkout hook failed](#pre-checkout-hook-failed)

**Migration**:
- [Migration Steps](#migration-steps)
- [Common Scenarios](#common-scenarios)
- [FAQ](#faq)

---

## Troubleshooting

### Pre-rebase hook failed

**Error**: "You have uncommitted changes!"

**Cause**: Attempting to rebase with uncommitted changes can cause data loss.

**Solution**:
```bash
# Option 1: Commit changes
git add -A
git commit -m "WIP: save before rebase"
git rebase origin/master

# Option 2: Stash changes
git stash -u
git rebase origin/master
git stash pop
```

---

### Force-with-lease rejected

**Error**: "Remote has changes you don't have locally"

**Cause**: Someone else pushed to your branch, or you pushed from another machine.

**Solution**:
```bash
# Fetch and check what changed
git fetch origin
git log HEAD..origin/feat/your-branch

# If changes are yours (from another machine):
git rebase origin/feat/your-branch
git push --force-with-lease origin feat/your-branch

# If changes are from someone else:
# Coordinate with them before force pushing
```

---

### Push rejected: remote contains work

**Error**: "Updates were rejected because the remote contains work that you do not have locally"

**Cause**: Remote branch has commits you don't have.

**Solution**:
```bash
# Fetch latest changes
git fetch origin

# Rebase on remote branch
git rebase origin/feat/your-branch

# Push with force-with-lease
git push --force-with-lease origin feat/your-branch
```

---

### Rebase failed with conflicts

**Error**: "CONFLICT (content): Merge conflict in file.ts"

**Solution**:
```bash
# Option 1: Resolve conflicts and continue
# 1. Open conflicted files and resolve manually
# 2. Stage resolved files
git add <resolved-files>
# 3. Continue rebase
git rebase --continue
# 4. Repeat until rebase completes

# Option 2: Abort and try again
git rebase --abort
```

**Tips for resolving conflicts**:
- Look for `<<<<<<<`, `=======`, `>>>>>>>` markers
- Keep both changes if both are valid
- Test after resolving
- Run `npm run lint && npm run type-check` after resolution

---

### Blocked: git pull origin master

**Error**: "Merge commit from 'origin/master' detected!"

**Cause**: `git pull` creates merge commits that pollute history.

**Solution**:
```bash
# Use the correct command
git fetch origin && git reset --hard origin/master

# Or use the safe alias
git-update-master
```

---

### Pre-commit-branch-check failed

**Error**: "Direct commits to 'master' are not allowed!"

**Cause**: Attempting to commit directly on master branch.

**Solution**:
```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Your changes are still staged, just commit now
git commit -m "feat: your changes"
```

---

### Pre-checkout hook failed

**Error**: "Uncommitted changes detected!"

**Cause**: Attempting to switch branches with uncommitted changes.

**Solution**:
```bash
# Option 1: Commit changes
git add .
git commit -m "feat: your changes"
git checkout other-branch

# Option 2: Stash changes
git stash
git checkout other-branch
# ... work on other branch ...
git checkout original-branch
git stash pop
```

---

### Master out of sync warning

**Warning**: "Your local master is out of sync with origin/master!"

**Cause**: Local master is behind or ahead of remote master.

**Solution**:
```bash
# Synchronize master
git fetch origin
git reset --hard origin/master
```

---

## Migration Steps

### 1. Load New Aliases

```bash
# Add to ~/.zshrc or ~/.bashrc
source ~/my-social-agents/.git-safe-aliases.sh

# Reload shell
source ~/.zshrc  # or source ~/.bashrc
```

### 2. Clean Master Local

**One-time setup to start clean**:

```bash
# 1. Verify no uncommitted changes
git status

# 2. If there are changes, commit or stash
git stash

# 3. Go to master
git checkout master

# 4. Synchronize with remote (new method)
git fetch origin
git reset --hard origin/master

# 5. Restore changes if stashed
git stash pop
```

### 3. Update Existing Feature Branches

**If you have open feature branches**:

```bash
# For each feature branch
git checkout feature/my-branch

# Option 1: Rebase (recommended)
git fetch origin
git rebase origin/master

# If conflicts occur:
# 1. Resolve conflicts in files
# 2. git add <resolved-files>
# 3. git rebase --continue

# Push with force-with-lease
git push --force-with-lease origin feature/my-branch

# Option 2: If rebase is too complex, recreate branch
git checkout master
git fetch origin
git reset --hard origin/master
git checkout -b feature/my-branch-new
# Apply changes manually
```

### 4. Adopt New Workflow

**From now on, use the new workflow**:

```bash
# CYCLE 0 - Start of day
git checkout master
git fetch origin
git reset --hard origin/master

# CYCLE 1 - Feature branch
git checkout -b feature/new-feature
# ... work ...
git add .
git commit -m "feat: description"
npm run ci
git fetch origin && git rebase origin/master
git push -u origin feature/new-feature

# CYCLE 2+ - Multiple PRs in parallel
git checkout master  # No pull!
git checkout -b feature/another-feature
# ... work ...
```

---

## Common Scenarios

### Starting a New Feature

```bash
git-update-master
git checkout -b feat/new-feature
# Work on feature
git add .
git commit -m "feat: implement feature"
git-sync-branch
```

### Fixing CI Failures

```bash
git checkout feat/failing-branch
# Fix issues
git add .
git commit -m "fix: resolve CI failures"
git-rebase-safe
git-push-safe
```

### Handling Conflicts

```bash
git-rebase-safe
# Conflicts occur
# Resolve conflicts in files
git add <resolved-files>
git rebase --continue
git-push-safe
```

### Working on Multiple PRs

```bash
# PR 1
git-update-master
git checkout -b feat/feature-1
# ... work ...
git-sync-branch

# PR 2 (don't wait for PR 1 CI)
git-update-master
git checkout -b feat/feature-2
# ... work ...
git-sync-branch

# Both PRs are independent!
```

---

## FAQ

### Q: Why can't I use `git pull origin master`?

**A**: It creates merge commits that pollute history. Use `git fetch origin && git reset --hard origin/master` instead.

**Why this matters**:
- Merge commits make history non-linear
- Harder to understand what changed
- Complicates git bisect and debugging
- GitHub branch protection requires linear history

---

### Q: Why `--force-with-lease` instead of `--force`?

**A**: `--force-with-lease` is safer - it fails if remote has changes you don't have locally, preventing accidental overwrites.

**Comparison**:
```bash
# --force: Overwrites without checking (DANGEROUS)
git push --force origin feat/branch

# --force-with-lease: Only overwrites if no new remote changes (SAFE)
git push --force-with-lease origin feat/branch
```

---

### Q: Do I need to rebase before every push?

**A**: Yes, to ensure your changes apply cleanly on latest master and maintain linear history.

**Why**:
- Catches integration issues early
- Ensures your changes work with latest code
- Maintains clean, linear history
- Required by pre-push-safety hook

---

### Q: Can I still use the old workflow?

**A**: No, the old workflow is deprecated. The project now requires rebase workflow for all PRs.

**Enforcement**:
- Pre-commit-branch-check blocks commits on master
- Pre-push-safety blocks push without rebase
- Pre-push-safety blocks `--force`
- GitHub branch protection requires linear history

---

### Q: What if I forget to rebase?

**A**: The pre-push-safety hook will block your push and remind you to rebase first.

**What happens**:
```bash
git push origin feat/branch

# Hook output:
# ❌ ERROR: Branch is not rebased on latest origin/master!
# ✅ REQUIRED STEPS:
#    1. git fetch origin
#    2. git rebase origin/master
#    3. git push --force-with-lease origin feat/branch
```

---

### Q: What if I have conflicts during rebase?

**A**: Resolve them step by step:

```bash
# 1. Rebase starts
git rebase origin/master

# 2. Conflict occurs - Git pauses
# CONFLICT (content): Merge conflict in src/file.ts

# 3. Open file and resolve conflicts
# Look for <<<<<<< markers

# 4. Stage resolved files
git add src/file.ts

# 5. Continue rebase
git rebase --continue

# 6. Repeat steps 3-5 for each conflict

# 7. Push when done
git push --force-with-lease origin feat/branch
```

---

### Q: Can I bypass the hooks in an emergency?

**A**: No, `--no-verify` is prohibited and documented as bad practice.

**Why**:
- Hooks enforce critical workflow rules
- Bypassing hooks leads to broken history
- Emergencies are rare - fix the issue properly
- If hook is broken, fix the hook, don't bypass it

**If you think you need to bypass**:
1. Identify which validation is failing
2. Fix the specific problem
3. Push normally

---

### Q: What if I accidentally commit on master?

**A**: The pre-commit-branch-check hook will block it before the commit happens.

**If it somehow happened**:
```bash
# Reset the commit (keeps changes)
git reset HEAD~1

# Create feature branch
git checkout -b feature/my-feature

# Commit properly
git add .
git commit -m "feat: my changes"
```

---

### Q: How do I recover if I lose changes?

**A**: Use `git reflog` to find lost commits:

```bash
# View reflog
git reflog

# Find your lost commit
# Example output:
# abc1234 HEAD@{0}: rebase: aborting
# def5678 HEAD@{1}: commit: feat: my changes  ← This one!

# Recover the commit
git checkout def5678
git checkout -b recovery-branch

# Or reset to it
git reset --hard def5678
```

---

## Branch Protection Rules

Configure these on GitHub (Settings → Branches → Add rule):

**Branch name pattern**: `master`

**Required settings**:
- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ **Require linear history** (CRITICAL)
- ✅ Do not allow bypassing the above settings
- ✅ Restrict who can push to matching branches

---

## Comparison: Old vs New Workflow

### Old Workflow (Deprecated)

```bash
# Sync master
git pull origin master  # ❌ Creates merge commits

# Create feature
git checkout -b feat/feature

# Work and push
git push origin feat/feature  # ❌ No rebase check

# Force push
git push --force origin feat/feature  # ❌ Unsafe

# Wait for CI before continuing
# ❌ Blocks productivity
```

**Problems**:
- Merge commits pollute history
- No rebase enforcement
- Unsafe force pushes
- Blocks on CI
- Dependent PRs

### New Workflow (Current)

```bash
# Sync master
git fetch origin && git reset --hard origin/master  # ✅ Clean

# Create feature
git checkout -b feat/feature

# Work and push
git fetch origin && git rebase origin/master  # ✅ Required
git push -u origin feat/feature

# Force push
git push --force-with-lease origin feat/feature  # ✅ Safe

# Continue working while CI runs
# ✅ Continuous productivity
```

**Benefits**:
- ✅ Linear history
- ✅ Automatic rebase enforcement
- ✅ Safe force pushes
- ✅ Continuous productivity
- ✅ Independent PRs

---

## Enforcement Levels

### Before (3/5)

```
❌ NO block commits on master
❌ NO block checkout with changes
❌ NO warn master out of sync
❌ NO block push without rebase
❌ NO block force push
✅ Validate code pre-commit
✅ Validate code pre-push
✅ Validate commit messages
✅ Block rebase with changes
```

### After (5/5) ⭐

```
✅ Block commits on master
✅ Block checkout with changes
✅ Warn master out of sync
✅ Block push without rebase
✅ Block force push
✅ Validate code pre-commit
✅ Validate code pre-push
✅ Validate commit messages
✅ Block rebase with changes
```

---

## Safe Aliases Reference

Load aliases: `source ~/my-social-agents/.git-safe-aliases.sh`

| Alias | Replaces | Purpose |
|-------|----------|---------|
| `git-update-master` | `git pull origin master` | Safe master sync |
| `git-rebase-safe` | `git rebase origin/master` | Rebase with checks |
| `git-push-safe` | `git push --force` | Safe force push |
| `git-save-before-rebase` | Manual save | Auto-save before rebase |
| `git-sync-branch` | Multiple commands | Complete workflow |

---

## Resources

- **Main Workflow**: `60-git-workflow.md` - Complete rebase workflow
- **Hooks Documentation**: `61-git-hooks.md` - All hooks explained
- **Hook Implementation**: `.husky/SAFETY-HOOKS.md` - Technical details
- **Safe Aliases**: `.git-safe-aliases.sh` - Alias implementations

---

## Summary

- **Rebase workflow** is now mandatory - enforced by hooks
- **Linear history** is guaranteed - impossible to create merge commits
- **Safe force pushes** only - `--force-with-lease` required
- **Continuous productivity** - don't block on CI
- **Independent PRs** - no dependencies between PRs
- **Maximum enforcement** - 🔒🔒🔒🔒🔒 (5/5)

**It is IMPOSSIBLE to not follow the rebase strategy.**

---

**Last Updated**: January 12, 2026  
**Status**: Active  
**Enforcement Level**: 🔒🔒🔒🔒🔒 Maximum Security Mode
