---
inclusion: always
---

# Git Workflow - Rebase Strategy

This document outlines the rebase-based continuous workflow for maintaining a clean, linear git history while enabling fast, independent development.

## Core Philosophy

**Continuous Integration, Independent PRs**: Work continuously without blocking on CI or other PRs. Each PR should be independent and rebased on latest master before pushing.

## Critical Rules

### ✅ ALWAYS Use These Commands

```bash
# Update local master (NEVER use git pull)
git fetch origin && git reset --hard origin/master

# Rebase before every push
git rebase origin/master

# Safe force push (ALWAYS use --force-with-lease)
git push --force-with-lease origin feat/feature-name
```

### ❌ NEVER Use These Commands

```bash
# ❌ FORBIDDEN - Creates merge commits
git pull origin master

# ❌ FORBIDDEN - Unsafe force push
git push --force origin feat/feature-name

# ❌ FORBIDDEN - Bypasses quality checks
git commit --no-verify
git push --no-verify
```

**Why these are forbidden**:
- `git pull origin master` creates merge commits that pollute history
- `git push --force` can overwrite others' work if branch was updated
- `--no-verify` bypasses pre-commit/pre-push hooks that ensure code quality

## Rebase Workflow

### 1. Start New Feature

```bash
# Update master to latest
git checkout master
git fetch origin && git reset --hard origin/master

# Create feature branch
git checkout -b feat/feature-name
```

**Branch Naming Convention**:
- `feat/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation changes
- `test/` - Test additions/changes
- `chore/` - Maintenance tasks

### 2. Make Changes and Commit

```bash
# Make changes
# ... edit files ...

# Stage and commit
git add .
git commit -m "feat(scope): description"

# Pre-commit hooks run automatically
# If they fail, fix issues and commit again
```

**Commit Message Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 3. Rebase on Latest Master (Before Every Push)

**CRITICAL**: Always rebase on latest master before pushing:

```bash
# Fetch latest master
git fetch origin

# Rebase your branch on master
git rebase origin/master

# If conflicts occur, resolve them:
# 1. Fix conflicts in files
# 2. git add <resolved-files>
# 3. git rebase --continue
# 4. Repeat until rebase completes
```

**Why rebase before every push?**
- Ensures your changes apply cleanly on latest master
- Catches integration issues early
- Maintains linear history
- Makes PRs easier to review

### 4. Push Changes

```bash
# First push (creates remote branch)
git push -u origin feat/feature-name

# Subsequent pushes after rebase (ALWAYS use --force-with-lease)
git push --force-with-lease origin feat/feature-name
```

**Why `--force-with-lease`?**
- Safer than `--force` - fails if remote has changes you don't have locally
- Prevents accidentally overwriting others' work
- Still allows you to rewrite your own history after rebase

### 5. Continue Working (Don't Block on CI)

**Key principle**: Don't wait for CI to pass before continuing work.

```bash
# Push your PR
git push --force-with-lease origin feat/feature-name

# Immediately continue working on next feature
git checkout master
git fetch origin && git reset --hard origin/master
git checkout -b feat/next-feature

# Work on next feature while CI runs on previous PR
```

**Benefits**:
- No idle time waiting for CI
- Continuous productivity
- Independent PRs don't block each other

### 6. Create Pull Request

- Go to GitHub repository
- Create PR from your feature branch to `master`
- Fill in PR template
- **Don't wait for CI** - continue working on next feature

**CI Pipeline** (runs asynchronously):
1. Code Quality (ESLint)
2. Security Audit (npm audit)
3. Tests (Jest)
4. Build (TypeScript compilation)

### 7. Handle CI Failures

If CI fails on your PR:

```bash
# Switch back to the PR branch
git checkout feat/feature-name

# Fix the issues
# ... edit files ...

# Commit fixes
git add .
git commit -m "fix: resolve CI failures"

# Rebase on latest master
git fetch origin
git rebase origin/master

# Push with force-with-lease
git push --force-with-lease origin feat/feature-name

# Switch back to current work
git checkout feat/current-feature
```

### 8. Merge Pull Request

Once CI passes and reviews are approved:

1. **Rebase and merge** (preferred) - maintains linear history
2. **Squash and merge** (alternative) - condenses commits
3. Delete feature branch after merge

**Post-Merge**:
```bash
# Update local master
git checkout master
git fetch origin && git reset --hard origin/master

# Delete merged feature branch
git branch -D feat/feature-name
```

## Independent PRs Strategy

### Why Independent PRs?

**Problem with dependent PRs**:
- PR #2 depends on PR #1
- PR #1 fails CI
- PR #2 is blocked until PR #1 is fixed
- Developer is idle

**Solution with independent PRs**:
- Each PR is self-contained
- PRs can be reviewed and merged in any order
- No blocking dependencies
- Continuous productivity

### How to Keep PRs Independent

1. **Start each feature from latest master**:
   ```bash
   git checkout master
   git fetch origin && git reset --hard origin/master
   git checkout -b feat/new-feature
   ```

2. **Don't branch from feature branches**:
   ```bash
   # ❌ WRONG - Creates dependency
   git checkout feat/feature-1
   git checkout -b feat/feature-2
   
   # ✅ CORRECT - Independent
   git checkout master
   git checkout -b feat/feature-2
   ```

3. **If you need code from another PR**:
   - Wait for that PR to merge
   - Then start your feature from updated master
   - Or duplicate the needed code temporarily

## Handling Conflicts

### During Rebase

```bash
# Start rebase
git rebase origin/master

# If conflicts occur:
# 1. Git pauses and shows conflicting files
# 2. Open files and resolve conflicts (look for <<<<<<< markers)
# 3. Stage resolved files
git add <resolved-files>

# 4. Continue rebase
git rebase --continue

# 5. Repeat until rebase completes

# If you want to abort:
git rebase --abort
```

### Conflict Resolution Tips

1. **Understand both changes**: Read your changes and master's changes
2. **Keep both if needed**: Sometimes both changes are valid
3. **Test after resolving**: Ensure code still works
4. **Run checks**: `npm run lint && npm run type-check`

## Safe Git Aliases

Load safe aliases in your shell:

```bash
# Add to ~/.zshrc or ~/.bashrc
source ~/my-social-agents/.git-safe-aliases.sh
```

**Available aliases**:

```bash
# Safe update master (replaces git pull)
git-update-master

# Safe rebase with checks
git-rebase-safe

# Safe force push (uses --force-with-lease)
git-push-safe

# Auto-save before rebase
git-save-before-rebase

# Complete workflow: fetch, rebase, push
git-sync-branch
```

## Branch Protection Rules

### Master Branch Protection

The `master` branch is protected by GitHub branch protection rules:

**Protection Settings**:
- ✅ **Direct pushes blocked** - Must use Pull Requests
- ✅ **Force pushes disabled** - Cannot rewrite history
- ✅ **Branch deletion disabled** - Cannot delete master
- ✅ **Signed commits required** - All commits must be GPG signed
- ✅ **CI checks required** - All status checks must pass before merge
- ✅ **Enforced for admins** - Even repository admins must follow rules
- ✅ **Require linear history** - Only rebase/squash merges allowed

**Required Status Checks**:
- Code Quality (ESLint)
- Security Audit (npm audit)
- Tests (Jest)
- Build (TypeScript compilation)
- CI Success (overall pipeline)

**What this means**:
- ❌ `git push origin master` will be **REJECTED**
- ❌ Merge commits are **REJECTED**
- ✅ Must create feature branch and PR
- ✅ CI must pass before merge
- ✅ Branch must be rebased on master

## Workflow Examples

### Example 1: Simple Feature

```bash
# 1. Start feature
git checkout master
git fetch origin && git reset --hard origin/master
git checkout -b feat/add-logging

# 2. Make changes and commit
# ... edit files ...
git add .
git commit -m "feat(logging): add structured logging"

# 3. Rebase and push
git fetch origin
git rebase origin/master
git push -u origin feat/add-logging

# 4. Create PR on GitHub
# 5. Continue working on next feature (don't wait for CI)
```

### Example 2: Multiple Commits

```bash
# 1. Start feature
git checkout master
git fetch origin && git reset --hard origin/master
git checkout -b feat/user-auth

# 2. Make multiple commits
git add .
git commit -m "feat(auth): add user model"

git add .
git commit -m "feat(auth): add login endpoint"

git add .
git commit -m "feat(auth): add JWT validation"

# 3. Rebase and push
git fetch origin
git rebase origin/master
git push -u origin feat/user-auth

# 4. Create PR
```

### Example 3: Fixing CI Failures

```bash
# 1. CI fails on feat/user-auth
# 2. Switch back to that branch
git checkout feat/user-auth

# 3. Fix issues
# ... edit files ...
git add .
git commit -m "fix: resolve type errors"

# 4. Rebase and push
git fetch origin
git rebase origin/master
git push --force-with-lease origin feat/user-auth

# 5. Switch back to current work
git checkout feat/current-feature
```

### Example 4: Handling Conflicts

```bash
# 1. Rebase on master
git fetch origin
git rebase origin/master

# 2. Conflict occurs
# CONFLICT (content): Merge conflict in src/user.ts
# Resolve all conflicts manually, mark them as resolved with "git add/rm"

# 3. Open file and resolve
# ... edit src/user.ts ...

# 4. Stage resolved file
git add src/user.ts

# 5. Continue rebase
git rebase --continue

# 6. Push with force-with-lease
git push --force-with-lease origin feat/user-auth
```

## Best Practices

### DO

✅ Always rebase on latest master before pushing
✅ Use `--force-with-lease` for force pushes
✅ Keep PRs independent and self-contained
✅ Continue working while CI runs
✅ Commit frequently with meaningful messages
✅ Test after resolving conflicts
✅ Update master with `git fetch && git reset --hard`

### DON'T

❌ Use `git pull origin master` (creates merge commits)
❌ Use `git push --force` (unsafe)
❌ Use `--no-verify` (bypasses quality checks)
❌ Create dependent PRs
❌ Wait for CI before continuing work
❌ Force push without rebasing first
❌ Rebase public/shared branches

## Summary

- **Update master**: `git fetch origin && git reset --hard origin/master`
- **Rebase before push**: `git rebase origin/master`
- **Safe force push**: `git push --force-with-lease`
- **Independent PRs**: Start each feature from latest master
- **Don't block**: Continue working while CI runs
- **Linear history**: Rebase, never merge
- **Quality checks**: Pre-commit and pre-push hooks enforce standards

This workflow enables fast, continuous development while maintaining a clean, linear git history and ensuring code quality.

## Related Files

- #[[file:61-git-hooks.md]] - Git hooks and enforcement mechanisms
- #[[file:62-git-troubleshooting.md]] - Troubleshooting guide
- #[[file:90-preventing-data-loss.md]] - Data loss prevention
