# Testing Phase 1 Workflows

Test scenarios for the 4 critical safety workflows implemented in Phase 1.

## Test 1: CodeQL Security Analysis

### Automatic Triggers

**Test 1.1: Push to main**

```bash
# Make a change and push to main
git checkout main
echo "// test" >> apps/backend/src/test.ts
git add apps/backend/src/test.ts
git commit -m "test: trigger CodeQL"
git push origin main
```

**Expected**: CodeQL workflow runs, results appear in Security tab

**Test 1.2: Pull Request**

```bash
# Create PR
git checkout -b test/codeql-pr
echo "// test" >> apps/backend/src/test.ts
git add apps/backend/src/test.ts
git commit -m "test: trigger CodeQL on PR"
git push -u origin test/codeql-pr
gh pr create --base main --title "test: CodeQL on PR"
```

**Expected**: CodeQL runs on PR, results in PR checks

**Test 1.3: Weekly Schedule**

- Wait for Monday 00:00 UTC
- Check Actions tab for scheduled run

**Verification**:

- Go to: Security → Code scanning alerts
- Should see CodeQL analysis results
- No critical vulnerabilities expected

---

## Test 2: Revert on CI Failure (CRITICAL)

### Test 2.1: Intentional Test Failure

**Step 1: Create failing test**

```bash
git checkout -b test/intentional-failure
```

Create file `apps/backend/src/__tests__/intentional-failure.spec.ts`:

```typescript
describe('Intentional Failure Test', () => {
  it('should fail to test revert workflow', () => {
    expect(true).toBe(false); // Intentional failure
  });
});
```

**Step 2: Commit and push**

```bash
git add apps/backend/src/__tests__/intentional-failure.spec.ts
git commit -m "test: add intentional failure for revert workflow"
git push -u origin test/intentional-failure
```

**Step 3: Create and merge PR**

```bash
gh pr create --base main --title "test: intentional failure" --body "Testing revert workflow"
# Wait for CI to pass (it won't run the new test yet)
# Merge PR
gh pr merge --squash
```

**Step 4: Observe revert workflow**

- CI runs on main
- Test fails
- Revert workflow triggers automatically
- Check for:
  - New branch: `revert-<commit-sha>`
  - New PR: "Revert: test: add intentional failure..."
  - Comment on original PR
  - Issue created if revert fails

**Expected Results**:

- ✅ Revert PR created automatically
- ✅ PR description lists failed jobs
- ✅ Original PR has comment
- ✅ PR assigned to original author
- ✅ Main is reverted to working state

**Cleanup**:

```bash
# After revert PR is merged
git checkout main
git pull origin main
git branch -D test/intentional-failure
```

---

## Test 3: Validate PR Source Branch

### Test 3.1: Valid Branch Names (Should PASS)

```bash
# Test feat/ prefix
git checkout -b feat/test-validation
echo "test" > test.txt
git add test.txt
git commit -m "test: valid branch name"
git push -u origin feat/test-validation
gh pr create --base main --title "test: feat/ branch"
```

**Expected**: ✅ Validation passes, PR can be created

```bash
# Test other valid prefixes
git checkout -b fix/test-validation
git checkout -b refactor/test-validation
git checkout -b docs/test-validation
git checkout -b chore/test-validation
```

### Test 3.2: Invalid Branch Names (Should FAIL)

```bash
# Test invalid branch name
git checkout -b invalid-branch-name
echo "test" > test.txt
git add test.txt
git commit -m "test: invalid branch name"
git push -u origin invalid-branch-name
gh pr create --base main --title "test: invalid branch"
```

**Expected**:

- ❌ Validation fails
- Error message shows allowed patterns
- PR cannot be merged until branch is renamed

**Error Message Should Show**:

```
❌ Invalid source branch: invalid-branch-name

Allowed patterns:
  - feat/*, feature/*
  - fix/*
  - refactor/*
  - test/*
  - docs/*
  - chore/*
  - hotfix/*
  - release/*
```

**Cleanup**:

```bash
git checkout main
git branch -D feat/test-validation fix/test-validation invalid-branch-name
git push origin --delete feat/test-validation invalid-branch-name
```

---

## Test 4: Dependabot Auto-Merge

### Test 4.1: Wait for Dependabot PR

Dependabot creates PRs automatically for dependency updates.

**Monitor**:

- Check Pull Requests tab for Dependabot PRs
- Look for patch/minor updates (e.g., `1.0.0 → 1.0.1`)

### Test 4.2: Observe Auto-Merge

When Dependabot creates a patch/minor PR:

**Expected Behavior**:

1. Dependabot creates PR
2. CI runs automatically
3. Workflow waits up to 20 minutes for CI
4. If CI passes:
   - PR auto-merges with squash
   - Comment added: "Auto-merged by Dependabot workflow"
5. If CI fails:
   - PR stays open for manual review

### Test 4.3: Major Update (Manual Review)

When Dependabot creates a major update PR (e.g., `1.0.0 → 2.0.0`):

**Expected Behavior**:

1. Dependabot creates PR
2. Workflow adds comment:

   ```
   ⚠️ Major version update detected

   This PR requires manual review before merging.
   Please review breaking changes and test thoroughly.
   ```

3. PR stays open for manual review
4. No auto-merge

### Test 4.4: Simulate Dependabot PR (Optional)

If you want to test without waiting for real Dependabot:

```bash
# Create branch as dependabot would
git checkout -b dependabot/npm_and_yarn/test-package-1.0.1
# Update package.json (minor version bump)
# Commit and push
git push -u origin dependabot/npm_and_yarn/test-package-1.0.1
# Create PR
gh pr create --base main --title "chore(deps): bump test-package from 1.0.0 to 1.0.1"
```

**Note**: This won't trigger the workflow unless the PR author is `dependabot[bot]`

---

## Verification Checklist

### CodeQL

- [ ] Runs on push to main
- [ ] Runs on pull requests
- [ ] Results appear in Security tab
- [ ] No false positives for legitimate code

### Revert on CI Failure

- [ ] Triggers when CI fails on main
- [ ] Creates revert branch and PR
- [ ] Comments on original PR
- [ ] Assigns to original author
- [ ] Lists failed jobs in description
- [ ] Creates issue if auto-revert fails

### Validate PR Source

- [ ] Allows feat/_, fix/_, refactor/\*, etc.
- [ ] Blocks invalid branch names
- [ ] Shows clear error message
- [ ] Provides examples of valid patterns

### Dependabot Auto-Merge

- [ ] Auto-merges patch updates
- [ ] Auto-merges minor updates
- [ ] Waits for CI checks
- [ ] Comments on major updates
- [ ] Uses squash merge

---

## Troubleshooting

### CodeQL doesn't run

- Check: Actions tab → CodeQL workflow
- Verify: Workflow file syntax is correct
- Check: GitHub Actions are enabled

### Revert workflow doesn't trigger

- Verify: CI actually failed on main (not on PR)
- Check: Workflow file has correct trigger
- Check: GITHUB_TOKEN has write permissions

### Validation doesn't block PR

- Check: Workflow file syntax
- Verify: Branch name pattern matching
- Check: Required status checks in branch protection

### Dependabot doesn't auto-merge

- Verify: PR author is `dependabot[bot]`
- Check: CI checks passed
- Verify: Update is patch/minor (not major)
- Check: Workflow has merge permissions

---

## Success Criteria

All Phase 1 workflows should:

- ✅ Run automatically on correct triggers
- ✅ Complete without errors
- ✅ Provide clear feedback
- ✅ Enforce safety rules
- ✅ Integrate with rebase strategy

**Phase 1 Status**: Ready for production use

---

**Created**: 2025-01-12  
**Purpose**: Test Phase 1 critical safety workflows  
**Next**: After successful testing, proceed to Phase 2
