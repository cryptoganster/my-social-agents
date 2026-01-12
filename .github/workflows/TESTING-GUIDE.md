# GitHub Workflows Testing Guide

This guide provides step-by-step instructions for testing all GitHub Actions workflows in this project.

## Prerequisites

- GitHub CLI installed: `brew install gh` (macOS) or see [installation guide](https://cli.github.com/manual/installation)
- Authenticated with GitHub: `gh auth login`
- Write access to the repository
- Local development environment set up

## Quick Test Commands

```bash
# Check workflow status
gh workflow list

# View recent runs
gh run list --limit 10

# Watch a workflow run in real-time
gh run watch

# View workflow logs
gh run view <run-id> --log

# Re-run failed workflow
gh run rerun <run-id> --failed
```

## Testing Each Workflow

### 1. CI Workflow (ci.yml)

**Purpose**: Validates code quality, runs tests, checks coverage

**Trigger**: Every push and PR

**Test Steps**:

```bash
# 1. Create test branch
git checkout -b test/ci-workflow

# 2. Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "test: trigger CI workflow"

# 3. Push and watch
git push -u origin test/ci-workflow
gh run watch

# 4. Verify all 11 jobs pass
gh run list --workflow=ci.yml --limit 1

# 5. Check specific job logs
gh run view --log --job=<job-id>

# 6. Clean up
git checkout main
git branch -D test/ci-workflow
git push origin --delete test/ci-workflow
```

**Expected Results**:

- ✅ All 11 jobs complete successfully
- ✅ Setup & Cache job runs first
- ✅ Quality jobs (lint, format, typecheck) run in parallel
- ✅ Test and Build run after quality jobs
- ✅ Coverage meets 70% threshold
- ✅ No license violations
- ✅ No secrets detected
- ✅ CI Success job passes

**Common Issues**:

- ❌ Lint failures → Run `npm run lint --fix` locally
- ❌ Format failures → Run `npm run format` locally
- ❌ Type errors → Run `npm run typecheck` locally
- ❌ Test failures → Run `npm test` locally
- ❌ Coverage below threshold → Add more tests

### 2. CodeQL Security Analysis (codeql.yml)

**Purpose**: Scans code for security vulnerabilities

**Trigger**: Push to main, PRs, weekly schedule (Monday 00:00 UTC)

**Test Steps**:

```bash
# 1. Trigger manually
gh workflow run codeql.yml

# 2. Wait for completion (takes 5-10 minutes)
gh run watch

# 3. Check results
gh run list --workflow=codeql.yml --limit 1

# 4. View security alerts (if any)
gh api repos/:owner/:repo/code-scanning/alerts

# 5. Check GitHub Security tab
# Go to: https://github.com/<owner>/<repo>/security/code-scanning
```

**Expected Results**:

- ✅ Analysis completes without errors
- ✅ No critical or high severity alerts
- ✅ Results appear in Security tab
- ✅ Excludes: node_modules, dist, coverage, tests, apps/firecrawl

**Common Issues**:

- ⚠️ False positives → Dismiss with reason in Security tab
- ❌ Real vulnerabilities → Create issue and fix
- ❌ Analysis timeout → Check excluded paths

### 3. Revert on CI Failure (revert-on-ci-failure.yml)

**Purpose**: Auto-reverts commits that break CI after merging to main

**Trigger**: CI workflow failure on main branch

**Test Steps** (⚠️ Use with caution):

```bash
# 1. Create intentionally broken commit on test branch
git checkout -b test/break-ci
echo "const broken = " > test-file.ts  # Syntax error
git add test-file.ts
git commit -m "test: intentionally break CI"
git push -u origin test/break-ci

# 2. Create PR
gh pr create --title "Test: Break CI" --body "Testing revert workflow"

# 3. Wait for CI to fail
gh pr checks

# 4. Merge PR (this will trigger revert)
gh pr merge --rebase

# 5. Watch for auto-revert
gh run watch

# 6. Verify revert PR created
gh pr list --label revert

# 7. Check revert PR details
gh pr view <revert-pr-number>

# 8. Merge revert PR
gh pr merge <revert-pr-number> --rebase

# 9. Clean up
rm test-file.ts
```

**Expected Results**:

- ✅ CI fails on main after merge
- ✅ Revert workflow triggers automatically
- ✅ Revert branch created: `revert-<short-sha>`
- ✅ Revert PR created with detailed info
- ✅ Original PR commented with revert details
- ✅ Revert PR assigned to original author
- ✅ Issue created if auto-revert fails

**Common Issues**:

- ❌ Revert workflow doesn't trigger → Check workflow permissions
- ❌ Revert PR not created → Check GitHub token permissions
- ❌ Conflicts in revert → Manual intervention needed

**⚠️ Warning**: This test will temporarily break main. Only test in non-production environments.

### 4. Validate PR Source Branch (validate-pr-source.yml)

**Purpose**: Enforces branch naming conventions

**Trigger**: Every PR

**Test Steps**:

```bash
# Test 1: Valid branch name
git checkout -b feat/test-validation
echo "# Test" >> README.md
git add README.md
git commit -m "test: valid branch name"
git push -u origin feat/test-validation
gh pr create --title "Test: Valid Branch" --body "Testing validation"
# Expected: ✅ Validation passes

# Test 2: Invalid branch name
git checkout -b invalid-branch-name
echo "# Test" >> README.md
git add README.md
git commit -m "test: invalid branch name"
git push -u origin invalid-branch-name
gh pr create --title "Test: Invalid Branch" --body "Testing validation"
# Expected: ❌ Validation fails with clear error message

# Clean up
gh pr close --delete-branch
git checkout main
```

**Expected Results**:

- ✅ Valid patterns pass: feat/_, fix/_, refactor/_, test/_, docs/_, chore/_, hotfix/_, release/_
- ❌ Invalid patterns fail with helpful error message
- ✅ Error message shows allowed patterns with examples

**Common Issues**:

- ❌ Validation doesn't run → Check workflow triggers
- ❌ Wrong error message → Update workflow error text

### 5. Dependabot Auto-Merge (dependabot-auto-merge.yml)

**Purpose**: Auto-merges safe dependency updates

**Trigger**: Dependabot PRs

**Test Steps**:

```bash
# 1. Wait for Dependabot PR (or trigger manually)
# Dependabot runs automatically based on dependabot.yml config

# 2. Check Dependabot PRs
gh pr list --author app/dependabot

# 3. Watch auto-merge workflow
gh run watch

# 4. Verify patch/minor updates auto-merge
gh pr list --state merged --author app/dependabot --limit 5

# 5. Verify major updates get comment (not auto-merged)
gh pr view <major-update-pr-number>
```

**Expected Results**:

- ✅ Patch updates auto-merge after CI passes
- ✅ Minor updates auto-merge after CI passes
- ⚠️ Major updates get comment, require manual review
- ✅ Waits up to 20 minutes for CI
- ✅ Uses squash merge method

**Common Issues**:

- ❌ Not auto-merging → Check CI status
- ❌ Major update auto-merged → Check workflow condition
- ❌ Timeout → Increase wait time in workflow

### 6. Dependabot Auto-Fix (dependabot-auto-fix.yml)

**Purpose**: Fixes package-lock.json sync issues

**Trigger**: Dependabot PRs with lockfile issues

**Test Steps**:

```bash
# 1. Wait for Dependabot PR with lockfile issue
# (This happens when package.json and package-lock.json are out of sync)

# 2. Check for auto-fix commit
gh pr view <dependabot-pr-number> --json commits

# 3. Verify lockfile regenerated
gh pr diff <dependabot-pr-number> | grep package-lock.json

# 4. Check workflow logs
gh run list --workflow=dependabot-auto-fix.yml --limit 1
gh run view <run-id> --log
```

**Expected Results**:

- ✅ Detects lockfile sync issues
- ✅ Regenerates package-lock.json
- ✅ Commits fix to PR
- ✅ Comments on PR with fix details

**Common Issues**:

- ❌ Not triggering → Check if lockfile is actually out of sync
- ❌ Commit fails → Check GitHub token permissions
- ❌ Wrong package manager → Verify npm (not pnpm/yarn)

### 7. Auto-Merge PRs (auto-merge.yml)

**Purpose**: Auto-merges PRs from authorized users

**Trigger**: PRs from authorized users after CI passes

**Test Steps**:

```bash
# 1. Verify you're in authorized users list
# Check .github/workflows/auto-merge.yml → AUTHORIZED_AUTHORS

# 2. Create test PR
git checkout -b feat/test-auto-merge
echo "# Test" >> README.md
git add README.md
git commit -m "feat: test auto-merge"
git push -u origin feat/test-auto-merge
gh pr create --title "Test: Auto-Merge" --body "Testing auto-merge workflow"

# 3. Wait for CI to pass
gh pr checks

# 4. Watch auto-merge workflow
gh run watch

# 5. Verify PR merged with rebase
gh pr view <pr-number>

# 6. Verify branch deleted
git fetch --prune
git branch -r | grep test-auto-merge
# Expected: No output (branch deleted)
```

**Expected Results**:

- ✅ Waits for CI to complete (up to 10 minutes)
- ✅ Merges with rebase method
- ✅ Deletes branch after merge
- ⏭️ Skips PRs from non-authorized users

**Common Issues**:

- ❌ Not auto-merging → Check if user in AUTHORIZED_AUTHORS
- ❌ Wrong merge method → Verify rebase method in workflow
- ❌ Branch not deleted → Check workflow logs

## Integration Testing

### Test Complete Workflow Chain

Test the full workflow from PR creation to merge:

```bash
# 1. Create feature branch
git checkout -b feat/integration-test

# 2. Make changes
echo "# Integration Test" >> README.md
git add README.md
git commit -m "feat: integration test"

# 3. Push and create PR
git push -u origin feat/integration-test
gh pr create --title "Integration Test" --body "Testing complete workflow"

# 4. Watch all workflows
gh run watch

# 5. Verify workflow sequence:
#    - Validate PR Source ✅
#    - CI (11 jobs) ✅
#    - CodeQL (if on main) ✅
#    - Auto-Merge (if authorized) ✅

# 6. Check final state
gh pr view <pr-number>

# 7. Clean up
gh pr close --delete-branch
git checkout main
```

## Performance Testing

### Measure Workflow Duration

```bash
# Get average CI duration (last 20 runs)
gh run list --workflow=ci.yml --limit 20 --json durationMs \
  --jq '[.[].durationMs] | add / length / 1000 / 60'

# Get slowest jobs
gh run view <run-id> --json jobs \
  --jq '.jobs | sort_by(.completedAt - .startedAt | tonumber) | reverse | .[0:5] | .[] | {name, duration: (.completedAt - .startedAt)}'

# Check cache hit rate
gh api repos/:owner/:repo/actions/cache/usage
```

**Target Metrics**:

- CI duration: < 5 minutes
- CodeQL duration: < 10 minutes
- Cache hit rate: > 80%

## Troubleshooting

### Workflow Not Triggering

```bash
# Check workflow syntax
gh workflow view <workflow-name>

# Check recent runs
gh run list --workflow=<workflow-name> --limit 5

# Check workflow file
cat .github/workflows/<workflow-name>.yml
```

### Workflow Failing

```bash
# View failure details
gh run view <run-id> --log

# Re-run failed jobs
gh run rerun <run-id> --failed

# Check specific job
gh run view <run-id> --job=<job-id> --log
```

### Permission Issues

```bash
# Check workflow permissions
gh api repos/:owner/:repo/actions/permissions

# Check token permissions
gh api user

# Verify GITHUB_TOKEN has required permissions
# Edit workflow permissions in .github/workflows/<workflow>.yml
```

## Best Practices

### Before Testing

- ✅ Read workflow documentation
- ✅ Understand expected behavior
- ✅ Check current workflow status
- ✅ Create test branch (don't test on main)
- ✅ Have rollback plan ready

### During Testing

- ✅ Monitor workflow logs in real-time
- ✅ Document unexpected behavior
- ✅ Take screenshots of errors
- ✅ Note timing and performance
- ✅ Test edge cases

### After Testing

- ✅ Clean up test branches
- ✅ Close test PRs
- ✅ Document findings
- ✅ Update workflow if needed
- ✅ Share results with team

## Automated Testing

### GitHub Actions Test Matrix

Create a test workflow:

```yaml
# .github/workflows/test-workflows.yml
name: Test Workflows

on:
  workflow_dispatch:

jobs:
  test-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trigger CI
        run: gh workflow run ci.yml
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  test-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test valid branch
        run: |
          git checkout -b feat/test
          gh pr create --title "Test" --body "Test"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Local Testing with act

```bash
# Install act
brew install act  # macOS

# Test workflow locally
act push

# Test specific job
act -j lint

# Test with secrets
act -s GITHUB_TOKEN=<token>

# Dry run
act -n
```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [act - Local Testing](https://github.com/nektos/act)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

---

**Last Updated**: 2025-01-12  
**Review Frequency**: After workflow changes
