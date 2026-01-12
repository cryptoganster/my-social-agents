# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation.

## Workflows Overview

### CI Pipeline (`ci.yml`)

Comprehensive continuous integration pipeline with 11 jobs:

**Setup & Quality Checks**:

1. **Setup & Cache** - Dependency caching for faster builds
2. **Lint** - ESLint code quality checks
3. **Format** - Prettier formatting with git diff validation
4. **Type Check** - TypeScript type checking
5. **License Check** - Validates dependency licenses (MIT, Apache-2.0, BSD, ISC, etc.)
6. **Secret Scan** - TruffleHog secret detection

**Testing**: 7. **Tests** - Unit and integration tests with PostgreSQL 8. **Coverage Check** - Enforces 70% coverage threshold

**Build & Security**: 9. **Build** - TypeScript compilation 10. **Security Audit** - npm audit with jq parsing (fails on critical/high) 11. **CI Success** - Summary job (all checks must pass)

**Triggers**:

- Push to `main`, `master`, `develop`
- Pull requests to `main`, `master`, `develop`

**Concurrency**: Cancels in-progress runs for same workflow/branch

---

### Security Analysis (`codeql.yml`)

Automated security vulnerability detection using GitHub CodeQL.

**Features**:

- Runs on push to main/master
- Runs on pull requests
- Weekly scheduled scan (Monday 00:00 UTC)
- Uses `security-extended` query suite
- Excludes: node_modules, dist, coverage, tests, apps/firecrawl

**Results**: Appear in GitHub Security tab

---

### Revert on CI Failure (`revert-on-ci-failure.yml`) ⚠️ CRITICAL

Automatically reverts commits that break CI after merging to main.

**Why Critical**: Essential for rebase strategy - keeps main clean at all times.

**Features**:

- Triggers when CI workflow fails on main/master
- Auto-creates revert branch and PR
- Comments on original PR (if exists)
- Assigns to original author
- Creates issue if auto-revert fails
- Lists failed jobs in PR description

**Prevents**: Broken main from blocking entire team

---

### Validate PR Source (`validate-pr-source.yml`)

Enforces branch naming conventions for pull requests.

**Allowed Patterns**:

- `feat/*`, `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `test/*` - Test additions/changes
- `docs/*` - Documentation changes
- `chore/*` - Maintenance tasks
- `hotfix/*` - Urgent fixes
- `release/*` - Release branches

**Blocks**: PRs from branches that don't follow convention

**Error Message**: Clear instructions with examples

---

### Dependabot Auto-Merge (`dependabot-auto-merge.yml`)

Automatically merges safe dependency updates.

**Auto-Merges**:

- Patch updates (1.0.0 → 1.0.1)
- Minor updates (1.0.0 → 1.1.0)

**Manual Review**:

- Major updates (1.0.0 → 2.0.0) - Comments on PR

**Safety**:

- Waits up to 20 minutes for CI checks
- Only merges if all checks pass
- Uses squash merge

---

### Dependabot Auto-Fix (`dependabot-auto-fix.yml`)

Automatically fixes package-lock.json sync issues in Dependabot PRs.

**Features**:

- Detects lockfile out of sync with package.json
- Regenerates package-lock.json automatically
- Commits and pushes fix to PR
- Comments on PR with fix details

**Triggers**:

- Pull requests that modify package.json or package-lock.json
- Only runs for Dependabot PRs

**Benefits**:

- Reduces manual intervention for lockfile issues
- Keeps Dependabot PRs passing CI
- Automatic fix and commit

---

### Auto-Merge PRs (`auto-merge.yml`)

Automatically merges PRs from authorized users after CI passes.

**Features**:

- Auto-merges PRs from authorized authors
- Waits up to 10 minutes for CI checks
- Uses rebase merge method (aligns with rebase strategy)
- Auto-deletes merged branch
- Skips draft PRs

**Configuration**:

- Edit `AUTHORIZED_AUTHORS` env var in workflow file
- Add trusted team members (comma-separated)

**Safety**:

- Verifies all CI checks pass
- Checks for merge conflicts
- Only authorized users

**Benefits**:

- Faster workflow for trusted contributors
- Enforces rebase merge method
- Reduces manual merge clicks

---

## Enforcement Level

**Current**: 🔒🔒🔒🔒🔒 (5/5) - Maximum automation

**Phase 1**: ✅ Complete

- CodeQL Security Analysis
- Revert on CI Failure (CRITICAL)
- Validate PR Source Branch
- Dependabot Auto-Merge

**Phase 2**: ✅ Complete

- Enhanced CI with 11 jobs
- License checking
- Secret scanning (TruffleHog)
- Coverage threshold enforcement (70%)
- Format check with git diff
- Security audit with jq parsing

**Phase 3**: ✅ Complete

- Dependabot Auto-Fix (lockfile sync for npm)
- Auto-Merge for authorized users (rebase method)

---

## Required Secrets

### CodeQL

- No secrets required (uses GitHub token automatically)

### Revert on CI Failure

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### Dependabot Auto-Merge

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### CI Pipeline (Optional)

- `CODECOV_TOKEN` - For coverage reporting (optional, fails gracefully)

---

## Branch Protection Rules (Recommended)

Configure in GitHub Settings → Branches → Add rule:

**Branch name pattern**: `main`, `master`

**Settings**:

- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Status checks: `CI Success`, `CodeQL`, `Validate PR Source`
- ✅ Require conversation resolution before merging
- ✅ Require linear history (CRITICAL for rebase strategy)
- ✅ Do not allow bypassing the above settings
- ✅ Restrict who can push to matching branches

---

## Testing Workflows

### Test Phase 1 Workflows

See `test-phase1-workflows.md` for detailed test scenarios.

### Test CI Pipeline

```bash
# Trigger CI on push
git push origin feature/test-ci

# Or create PR
gh pr create --base main --title "test: CI pipeline"
```

### Test CodeQL

CodeQL runs automatically on:

- Push to main/master
- Pull requests
- Weekly schedule (Monday 00:00 UTC)

View results in: GitHub Security tab

### Test Revert on CI Failure

1. Create PR with intentional failure (e.g., failing test)
2. Merge PR to main
3. CI fails on main
4. Revert workflow triggers automatically
5. Check for revert PR and issue

### Test Validate PR Source

```bash
# Should PASS
git checkout -b feat/test-validation
gh pr create --base main

# Should FAIL
git checkout -b invalid-branch-name
gh pr create --base main
```

### Test Dependabot Auto-Merge

1. Wait for Dependabot PR (patch/minor update)
2. CI runs automatically
3. After CI passes, PR auto-merges
4. Check PR comments for merge confirmation

### Test Dependabot Auto-Fix

1. Wait for Dependabot PR with lockfile sync issue
2. Workflow detects issue automatically
3. Regenerates package-lock.json
4. Commits fix to PR
5. Check PR comments for fix confirmation

### Test Auto-Merge

1. Add your GitHub username to `AUTHORIZED_AUTHORS` in `auto-merge.yml`
2. Create PR from authorized account
3. Wait for CI to pass
4. PR auto-merges with rebase method
5. Branch auto-deletes

---

## Troubleshooting

### CI Fails with "Coverage threshold not met"

**Solution**: Add more tests to increase coverage above 70%

```bash
npm run test:cov
# Check coverage report in apps/backend/coverage/
```

### Secret Scan Fails

**Solution**: Remove secrets from code, use environment variables

```bash
# Check TruffleHog output for detected secrets
# Move secrets to .env files (already in .gitignore)
```

### License Check Fails

**Solution**: Review dependency licenses, remove incompatible packages

```bash
npx license-checker --production --summary
# Check for non-allowed licenses
```

### Revert Workflow Doesn't Trigger

**Possible causes**:

- CI didn't actually fail on main
- Workflow file has syntax errors
- GitHub Actions disabled

**Check**: Actions tab → Revert on CI Failure workflow

---

## Related Files

- `.github/workflows/ci.yml` - CI pipeline
- `.github/workflows/codeql.yml` - Security analysis
- `.github/workflows/revert-on-ci-failure.yml` - Auto-revert
- `.github/workflows/validate-pr-source.yml` - Branch validation
- `.github/workflows/dependabot-auto-merge.yml` - Auto-merge dependencies
- `.github/workflows/dependabot-auto-fix.yml` - Auto-fix lockfile
- `.github/workflows/auto-merge.yml` - Auto-merge for authorized users
- `.kiro/steering/63-github-workflows-comparison.md` - Comparison and adoption plan

---

**Last Updated**: 2025-01-12  
**Status**: Phase 3 Complete ✅  
**Enforcement Level**: 🔒🔒🔒🔒🔒 (5/5) - Maximum automation
