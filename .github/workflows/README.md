# GitHub Actions CI/CD

## Overview

This repository uses GitHub Actions for Continuous Integration (CI) and automated safety mechanisms. The workflows ensure code quality, run tests, perform security checks, and automatically protect the main branch from broken code.

## Workflows

### 1. CI Pipeline (`.github/workflows/ci.yml`)

The main CI workflow runs on:

- Push to `main`, `master`, or `develop` branches
- Pull requests targeting `main`, `master`, or `develop` branches

#### Jobs

1. **Code Quality** (`quality`)
   - Runs linting checks
   - Validates code formatting
   - Performs TypeScript type checking
   - Timeout: 10 minutes

2. **Tests** (`test`)
   - Runs unit tests with coverage
   - Uploads coverage reports to Codecov
   - Archives test results as artifacts
   - Timeout: 15 minutes
   - Depends on: `quality`

3. **Build** (`build`)
   - Builds the project
   - Archives build artifacts
   - Timeout: 10 minutes
   - Depends on: `quality`

4. **Security Audit** (`security`)
   - Runs npm audit for vulnerabilities
   - Checks for known security issues
   - Timeout: 10 minutes
   - Non-blocking (continues on error)

5. **CI Success** (`ci-success`)
   - Summary job that verifies all required checks passed
   - Required for branch protection
   - Depends on: `quality`, `test`, `build`, `security`

### 2. CodeQL Security Analysis (`.github/workflows/codeql.yml`)

Automated security vulnerability scanning:

- Runs on push to `main`/`master`
- Runs on pull requests
- Scheduled weekly (Monday 00:00 UTC)
- Uses `security-extended` query suite
- Excludes: `node_modules`, `dist`, `coverage`, test files, `apps/firecrawl`
- Results appear in GitHub Security tab

### 3. Revert on CI Failure (`.github/workflows/revert-on-ci-failure.yml`) ⚠️ CRITICAL

**Purpose**: Automatically reverts commits that break CI after merging to main.

**Why this is critical for rebase strategy**:

- Rebase strategy requires clean main at all times
- If CI fails after merge, main is broken and blocks everyone
- Auto-revert prevents team from being blocked
- Creates audit trail with PR and issue

**What it does**:

1. Detects CI failure after push to main/master
2. Creates revert branch automatically
3. Opens revert PR with detailed information
4. Comments on original PR (if exists)
5. Assigns to original author
6. Creates issue if auto-revert fails

**Triggers**: After CI workflow completes with failure on main/master

### 4. Validate PR Source Branch (`.github/workflows/validate-pr-source.yml`)

**Purpose**: Enforces branch naming conventions for PRs.

**Allowed branch patterns**:

- `feat/*` or `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `test/*` - Test additions/changes
- `docs/*` - Documentation changes
- `chore/*` - Maintenance tasks
- `hotfix/*` - Urgent fixes
- `release/*` - Release branches

**Blocks**: PRs from branches that don't follow naming convention

### 5. Dependabot Auto-Merge (`.github/workflows/dependabot-auto-merge.yml`)

**Purpose**: Automatically merges safe dependency updates.

**Auto-merges**:

- Patch updates (e.g., 1.2.3 → 1.2.4)
- Minor updates (e.g., 1.2.0 → 1.3.0)

**Requires**:

- All CI checks must pass
- Waits up to 20 minutes for checks

**Manual review required**:

- Major updates (e.g., 1.0.0 → 2.0.0)
- Adds comment requesting manual review

## Features

### Concurrency Control

- Cancels in-progress runs for the same workflow and branch
- Saves CI minutes and provides faster feedback

### Caching

- Node.js dependencies are cached automatically
- Speeds up subsequent runs

### Artifacts

- Test results and coverage reports (7 days retention)
- Build artifacts (7 days retention)

### Timeouts

- Each job has a timeout to prevent hanging builds
- Ensures fast feedback on issues

## Local Development

Before pushing, ensure your code passes all checks:

```bash
# Install dependencies
npm ci

# Run linting
npm run lint:check

# Check formatting
npm run format:check

# Type check
npm run typecheck

# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Build project
npm run build
```

## Branch Protection (Recommended)

Configure branch protection rules for `main`/`master`:

1. Go to **Settings** → **Branches** → **Add rule**
2. Branch name pattern: `main` (or `master`)
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Required checks: `CI Success`, `Validate Source Branch`, `CodeQL`
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
   - ✅ Require linear history (CRITICAL for rebase strategy)
   - ✅ Do not allow bypassing the above settings

**Note**: The "Revert on CI Failure" workflow provides an additional safety net even if CI passes initially but fails after merge.

## Codecov Integration (Optional)

To enable coverage reporting:

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Add `CODECOV_TOKEN` to repository secrets:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Add new secret: `CODECOV_TOKEN`

## Troubleshooting

### CI Failing on Lint

```bash
npm run lint
```

### CI Failing on Format

```bash
npm run format
```

### CI Failing on Type Check

```bash
npm run typecheck
```

### CI Failing on Tests

```bash
npm test
```

### Security Audit Issues

```bash
npm audit
npm audit fix
```

## CI Performance

- **Average run time**: ~5-8 minutes
- **Parallel jobs**: Quality, Build, and Security run in parallel after Quality passes
- **Caching**: Dependencies cached between runs
- **Artifacts**: Stored for 7 days

## Future Enhancements

Potential improvements for the CI pipeline:

- [ ] Add E2E tests job
- [ ] Add integration tests job
- [ ] Matrix testing (multiple Node.js versions)
- [ ] Performance benchmarking
- [ ] Docker image building
- [ ] Deployment workflows (CD)
- [ ] Automated dependency updates (Dependabot)
- [ ] Code quality metrics (SonarCloud)
