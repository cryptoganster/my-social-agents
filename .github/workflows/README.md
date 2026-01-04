# GitHub Actions CI/CD

## Overview

This repository uses GitHub Actions for Continuous Integration (CI). The CI pipeline ensures code quality, runs tests, and performs security checks on every push and pull request.

## Workflows

### CI Pipeline (`.github/workflows/ci.yml`)

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
     - Required checks: `CI Success`
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

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
