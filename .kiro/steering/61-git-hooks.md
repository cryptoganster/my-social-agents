---
inclusion: always
---

# Git Hooks - Enforcement Mechanisms

This project uses Git hooks to **automatically enforce** the rebase strategy and prevent common errors. Hooks make it **impossible** to not follow the workflow.

## Enforcement Level

**my-social-agents:** 🔒🔒🔒🔒🔒 (5/5) - Maximum Security Mode

All dangerous commands are blocked automatically. You cannot bypass the rebase strategy.

## Installed Hooks

| Hook | File | Blocks | Status |
|------|------|--------|--------|
| **pre-commit-branch-check** | `.husky/pre-commit-branch-check` | Commits on master/main/production/prod | ✅ Active |
| **pre-commit** | `.husky/pre-commit` | Lint/format/type errors | ✅ Active |
| **pre-push-safety** | `.husky/pre-push-safety` | Push without rebase, `--force` | ✅ Active |
| **pre-push** | `.husky/pre-push` | Code quality failures | ✅ Active |
| **pre-checkout** | `.husky/pre-checkout` | Checkout with uncommitted changes | ✅ Active |
| **post-checkout** | `.husky/post-checkout` | Master out of sync (warning) | ✅ Active |
| **pre-rebase** | `.husky/pre-rebase` | Rebase with uncommitted changes | ✅ Active |
| **commit-msg** | `.husky/commit-msg` | Invalid commit message format | ✅ Active |

## Blocked Commands

### 1. `git commit` on master

**Hook:** `pre-commit-branch-check`

**Why blocked:**
- All changes must go through Pull Requests
- Maintains clean history with atomic feature branches
- Prevents accidental commits on master
- Forces collaboration and code review

**Error message:**
```
❌ ERROR: Direct commits to 'master' are not allowed!

✅ CORRECT WORKFLOW:
   1. Create a feature branch:
      git checkout -b feature/your-feature-name
```

**Alternative:**
```bash
# Create feature branch
git checkout -b feature/mi-feature

# Make changes and commit
git add .
git commit -m "feat: mi cambio"

# Push and create PR
git push -u origin feature/mi-feature
```

---

### 2. `git push --force`

**Hook:** `pre-push-safety`

**Why blocked:**
- Can overwrite others' work
- Doesn't check for remote changes
- Destructive and irreversible

**Error message:**
```
❌ ERROR: Force push detected!

✅ SAFE ALTERNATIVE:
   git push --force-with-lease origin feature/your-branch
```

**Alternative:**
```bash
# Use --force-with-lease (safe)
git push --force-with-lease origin feature/mi-rama
```

**Difference:**
- `--force`: Overwrites without checking
- `--force-with-lease`: Only overwrites if no new remote changes

---

### 3. `git push` without rebase

**Hook:** `pre-push-safety`

**Why blocked:**
- Maintains linear history (rebase strategy)
- Prevents unnecessary merge commits
- Ensures branch is up-to-date with master

**Error message:**
```
❌ ERROR: Branch is not rebased on latest origin/master!

✅ REQUIRED STEPS:
   1. git fetch origin
   2. git rebase origin/master
   3. git push --force-with-lease origin feature/your-branch

Current state:
  Your branch base: abc1234
  Latest master:    def5678
  Commits behind:   3
```

**Alternative:**
```bash
# Rebase before push
git fetch origin
git rebase origin/master

# Resolve conflicts if any
git add <resolved-files>
git rebase --continue

# Push with force-with-lease
git push --force-with-lease origin feature/mi-rama
```

---

### 4. `git checkout` with uncommitted changes

**Hook:** `pre-checkout`

**Why blocked:**
- Prevents loss of work
- Forces clean, atomic commits
- Avoids mixing changes from different features

**Error message:**
```
❌ ERROR: Uncommitted changes detected!

✅ OPTIONS:
   1. Commit your changes:
      git add .
      git commit -m 'feat: your changes'
   
   2. Stash your changes temporarily:
      git stash

Current changes:
 M src/file1.ts
 M src/file2.ts
```

**Alternative:**
```bash
# Option 1: Commit changes
git add .
git commit -m "feat: mis cambios"
git checkout otra-rama

# Option 2: Stash temporarily
git stash
git checkout otra-rama
# ... work ...
git checkout mi-rama
git stash pop
```

---

### 5. `git rebase` with uncommitted changes

**Hook:** `pre-rebase`

**Why blocked:**
- Prevents data loss during rebase
- Forces clean state before rebase
- Ensures changes are saved

**Error message:**
```
❌ ERROR: You have uncommitted changes!

✅ Options:
   1. Commit changes: git add -A && git commit -m 'WIP: save before rebase'
   2. Stash changes: git stash -u

💡 Remember: After rebase, push with --force-with-lease
```

**Alternative:**
```bash
# Commit or stash first
git add -A
git commit -m "WIP: save before rebase"
git rebase origin/master
```

---

### 6. `git commit --no-verify`

**Hook:** `pre-commit` + documentation

**Why blocked:**
- Skips ESLint, Prettier, TypeScript checks
- Skips unit and integration tests
- Introduces broken code that fails in CI

**No alternative:** You must fix the errors

**Validations skipped:**
1. Branch check (commits on master)
2. ESLint (code errors and bad practices)
3. Prettier (inconsistent formatting)
4. TypeScript (type errors)
5. Lint-staged (incremental validations)

**What to do if hook fails:**
```bash
# 1. Read the error
git commit -m "feat: new feature"
# Hook shows specific error

# 2. Fix the problem
npm run lint --fix
npm run format
npm run typecheck

# 3. Try again
git add .
git commit -m "feat: new feature"
```

---

## Warnings (Non-Blocking)

### Master out of sync

**Hook:** `post-checkout`

**When triggered:** After `git checkout master`

**What it does:**
- Fetches origin/master automatically
- Compares local vs remote
- Warns if out of sync (doesn't block)

**Warning message:**
```
⚠️  WARNING: Your local master is out of sync with origin/master!

✅ RECOMMENDED ACTION:
   git fetch origin
   git reset --hard origin/master

Current state:
  Local master:  abc1234
  Remote master: def5678
  Status: Local is 3 commit(s) BEHIND remote

Press Enter to continue or Ctrl+C to abort and fix...
```

**Benefit:** Prevents creating feature branches from outdated master

---

## How Hooks Work

### Pre-commit-branch-check

```bash
# Detects current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Blocks if master/main/production/prod
if [ "$current_branch" = "master" ]; then
  echo "❌ ERROR: Direct commits to 'master' are not allowed!"
  exit 1
fi
```

### Pre-push-safety

```bash
# Check 1: Verify rebase
merge_base=$(git merge-base HEAD origin/master)
origin_master_sha=$(git rev-parse origin/master)

if [ "$merge_base" != "$origin_master_sha" ]; then
  echo "❌ ERROR: Branch is not rebased on latest origin/master!"
  exit 1
fi

# Check 2: Detect force push
if ! git merge-base --is-ancestor "$remote_sha" "$local_sha"; then
  echo "❌ ERROR: Force push detected!"
  exit 1
fi
```

### Pre-checkout

```bash
# Detects uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "❌ ERROR: Uncommitted changes detected!"
  git status --short
  exit 1
fi
```

### Post-checkout

```bash
# Compares local master vs remote
local_sha=$(git rev-parse master)
remote_sha=$(git rev-parse origin/master)

if [ "$local_sha" != "$remote_sha" ]; then
  echo "⚠️  WARNING: Your local master is out of sync!"
  echo "Press Enter to continue or Ctrl+C to abort..."
  read -r
fi
```

### Pre-rebase

```bash
# Detects uncommitted changes before rebase
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ ERROR: You have uncommitted changes!"
  exit 1
fi
```

---

## Testing Hooks

### Test 1: Block commit on master

```bash
git checkout master
echo "test" > test.txt
git add test.txt
git commit -m "test: should fail"

# Expected:
# ❌ ERROR: Direct commits to 'master' are not allowed!
```

### Test 2: Block push without rebase

```bash
git checkout -b test/no-rebase
git reset --hard HEAD~3
echo "test" > test.txt
git add test.txt
git commit -m "test"
git push -u origin test/no-rebase

# Expected:
# ❌ ERROR: Branch is not rebased on latest origin/master!
```

### Test 3: Block force push

```bash
git checkout -b test/force
echo "test" > test.txt
git add test.txt
git commit -m "test"
git push -u origin test/force
git commit --amend --no-edit
git push --force origin test/force

# Expected:
# ❌ ERROR: Force push detected!
```

### Test 4: Block checkout with changes

```bash
echo "test" > test.txt
git checkout master

# Expected:
# ❌ ERROR: Uncommitted changes detected!
```

### Test 5: Warn master out of sync

```bash
git checkout master
git reset --hard HEAD~2
git checkout -b test/branch
git checkout master

# Expected:
# ⚠️  WARNING: Your local master is out of sync with origin/master!
```

---

## Emergency Procedures

### "I need to push urgently and hook fails"

**❌ DON'T:**
```bash
git push --no-verify  # BLOCKED
```

**✅ DO:**
1. Identify which validation fails
2. Fix the specific problem
3. Push normally

**If hook is broken (very rare):**
1. Report to team immediately
2. Create hotfix for the hook
3. Never use `--no-verify` as workaround

### "Hook is broken and blocks everything"

**Steps:**
1. Verify problem is the hook, not your code
2. Review `.husky/` to identify problematic hook
3. Create GitHub issue with details
4. Temporarily comment problematic line in hook
5. Create PR to fix the hook

**Example:**
```bash
# In .husky/pre-commit, temporarily comment:
# npm run lint:check  # TEMPORARILY DISABLED - Issue #123
```

---

## Benefits

1. **Prevents costly errors**: Blocks destructive commands before damage
2. **Maintains clean history**: Avoids unnecessary merge commits
3. **Protects team's work**: Prevents accidental overwrites
4. **Forces best practices**: Requires safe commands
5. **Continuous education**: Error messages teach correct commands
6. **Automatic enforcement**: Makes it IMPOSSIBLE to not follow rebase strategy

---

## Summary

- **8 active hooks** enforce rebase strategy
- **5 commands blocked**: commits on master, force push, push without rebase, checkout with changes, rebase with changes
- **1 warning**: master out of sync
- **Maximum enforcement**: 🔒🔒🔒🔒🔒 (5/5)
- **Educational messages**: Every error shows the correct alternative
- **No bypassing**: `--no-verify` is not an option

## Related Files

- #[[file:60-git-workflow.md]] - Main rebase workflow
- #[[file:62-git-troubleshooting.md]] - Troubleshooting guide
- #[[file:90-preventing-data-loss.md]] - Data loss prevention
- `.husky/SAFETY-HOOKS.md` - Complete hook documentation
