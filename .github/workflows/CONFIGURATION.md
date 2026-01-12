# GitHub Workflows Configuration Guide

This guide explains how to configure and customize the GitHub Actions workflows in this project.

## Auto-Merge Configuration

### Update Authorized Users

The `auto-merge.yml` workflow automatically merges PRs from trusted users after CI passes.

**Current authorized users**:

- `cryptoganster`

**To add/remove users**:

1. Edit `.github/workflows/auto-merge.yml`
2. Update the `AUTHORIZED_AUTHORS` environment variable:

```yaml
env:
  # Add users separated by commas
  AUTHORIZED_AUTHORS: 'cryptoganster,another-user,third-user'
```

3. Commit and push changes:

```bash
git add .github/workflows/auto-merge.yml
git commit -m "chore(ci): update auto-merge authorized users"
git push origin main
```

**Best practices**:

- ✅ Only add trusted team members
- ✅ Review list quarterly
- ✅ Remove users who leave the team
- ❌ Don't add external contributors
- ❌ Don't add bot accounts (except Dependabot)

### Test Auto-Merge

After adding a user, test the workflow:

1. User creates a PR from a feature branch
2. Wait for CI to pass
3. Verify auto-merge triggers
4. Check that branch is deleted after merge

**Troubleshooting**:

- Ensure username matches GitHub username exactly (case-insensitive)
- Check workflow logs for authorization check
- Verify CI passes before auto-merge attempts

## CodeQL Configuration

### Adjust Scan Schedule

Edit `.github/workflows/codeql.yml`:

```yaml
schedule:
  # Runs weekly on Monday at 00:00 UTC
  - cron: '0 0 * * 1'
```

**Common schedules**:

- Daily: `'0 0 * * *'`
- Weekly (Monday): `'0 0 * * 1'`
- Bi-weekly: `'0 0 1,15 * *'`
- Monthly: `'0 0 1 * *'`

### Exclude Additional Paths

Add paths to exclude from scanning:

```yaml
paths-ignore:
  - '**/*.md'
  - '**/*.txt'
  - 'docs/**'
  - 'examples/**'
  - 'apps/firecrawl/**' # Already excluded
  - 'your-path/**' # Add here
```

### Change Query Suite

Adjust security query level:

```yaml
queries: security-extended # Current (recommended)
# queries: security-and-quality  # More comprehensive
# queries: security-only  # Faster, less coverage
```

## CI Workflow Configuration

### Adjust Coverage Thresholds

Edit `.github/workflows/ci.yml`:

```yaml
- name: Check Coverage
  run: |
    npm run test:cov
    # Adjust thresholds here (currently 70%)
    npx nyc check-coverage \
      --lines 70 \
      --functions 70 \
      --branches 70 \
      --statements 70
```

**Recommended thresholds**:

- New projects: 60-70%
- Mature projects: 80-90%
- Critical code: 95%+

### Modify License Whitelist

Edit allowed licenses:

```yaml
- name: Check Licenses
  run: |
    npx license-checker --summary --onlyAllow \
      'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;0BSD;CC0-1.0;Unlicense;Python-2.0'
```

**Common licenses**:

- `MIT` - Most permissive
- `Apache-2.0` - Patent protection
- `BSD-*` - Permissive with attribution
- `ISC` - Similar to MIT
- `CC0-1.0` - Public domain

**Restrictive licenses to avoid**:

- `GPL-*` - Copyleft (requires open source)
- `AGPL-*` - Network copyleft
- `SSPL` - Server-side copyleft

### Adjust Secret Scan Depth

Edit TruffleHog configuration:

```yaml
- name: Secret Scan
  run: |
    docker run --rm -v "$PWD:/pwd" \
      trufflesecurity/trufflehog:latest \
      git file:///pwd \
      --since-commit HEAD~10 \  # Scan last 10 commits
      --fail \
      --no-update
```

**Options**:

- `HEAD~10` - Last 10 commits (faster)
- `HEAD~50` - Last 50 commits
- Remove `--since-commit` - Full history (slower)

### Enable/Disable Jobs

Comment out jobs you don't need:

```yaml
jobs:
  setup:
    # ...

  lint:
    # ...

  # Disable format check temporarily
  # format:
  #   needs: setup
  #   runs-on: ubuntu-latest
  #   steps:
  #     - ...
```

## Dependabot Configuration

### Auto-Merge Settings

Edit `.github/workflows/dependabot-auto-merge.yml`:

```yaml
# Auto-merge patch and minor updates
if: |
  (steps.metadata.outputs.update-type == 'version-update:semver-patch' ||
   steps.metadata.outputs.update-type == 'version-update:semver-minor')
```

**Options**:

- Patch only: Remove `semver-minor` condition
- All updates: Remove condition entirely (not recommended)
- Major updates: Add `semver-major` (risky)

### Auto-Fix Settings

Edit `.github/workflows/dependabot-auto-fix.yml`:

```yaml
# Regenerate lockfile
- name: Regenerate package-lock.json
  run: |
    rm -f package-lock.json
    npm install --package-lock-only
```

**For other package managers**:

- Yarn: `yarn install --mode update-lockfile`
- pnpm: `pnpm install --lockfile-only`

## Revert on CI Failure Configuration

### Adjust Revert Behavior

Edit `.github/workflows/revert-on-ci-failure.yml`:

```yaml
# Create revert PR
- name: Create Revert PR
  run: |
    gh pr create \
      --title "🔄 Revert: $COMMIT_TITLE" \
      --body "$PR_BODY" \
      --base main \
      --head revert-$SHORT_SHA \
      --assignee $COMMIT_AUTHOR  # Assign to original author
```

**Options**:

- Assign to team: `--assignee team-lead`
- Add labels: `--label "revert,urgent"`
- Request reviews: `--reviewer team-lead`

### Disable Auto-Revert (Not Recommended)

To disable auto-revert (not recommended for rebase strategy):

```yaml
# Comment out the entire workflow
# name: Revert on CI Failure
# ...
```

**Warning**: Disabling auto-revert means broken commits stay on main, blocking the team.

## Validate PR Source Configuration

### Adjust Branch Patterns

Edit `.github/workflows/validate-pr-source.yml`:

```yaml
# Allowed branch patterns
ALLOWED_PATTERNS="^(feat|feature|fix|refactor|test|docs|chore|hotfix|release)/"
```

**Add custom patterns**:

```bash
ALLOWED_PATTERNS="^(feat|feature|fix|refactor|test|docs|chore|hotfix|release|experiment|spike)/"
```

**Strict pattern** (only feat/fix):

```bash
ALLOWED_PATTERNS="^(feat|fix)/"
```

### Customize Error Message

Edit the error message shown to users:

```yaml
- name: Validate Branch Name
  run: |
    echo "❌ Invalid branch name: $BRANCH_NAME"
    echo ""
    echo "✅ Allowed patterns:"
    echo "  - feat/* or feature/*  (new features)"
    echo "  - fix/*                (bug fixes)"
    echo "  - your-pattern/*       (your description)"
```

## Environment Variables

### Global Environment Variables

Add to all workflows:

```yaml
# At workflow level
env:
  NODE_VERSION: '20'
  CACHE_VERSION: 'v1'
  CUSTOM_VAR: 'value'

jobs:
  job-name:
    runs-on: ubuntu-latest
    steps:
      - name: Use env var
        run: echo $CUSTOM_VAR
```

### Job-Specific Variables

```yaml
jobs:
  job-name:
    runs-on: ubuntu-latest
    env:
      JOB_SPECIFIC_VAR: 'value'
    steps:
      - name: Use job var
        run: echo $JOB_SPECIFIC_VAR
```

### Secrets

Add secrets in GitHub Settings:

1. Go to: `Settings` → `Secrets and variables` → `Actions`
2. Click `New repository secret`
3. Add name and value
4. Use in workflows:

```yaml
steps:
  - name: Use secret
    env:
      MY_SECRET: ${{ secrets.MY_SECRET }}
    run: echo "Secret is set"
```

**Common secrets**:

- `SLACK_WEBHOOK` - Slack notifications
- `NPM_TOKEN` - npm registry authentication
- `CODECOV_TOKEN` - Code coverage reporting

## Workflow Triggers

### Customize Triggers

Edit workflow triggers:

```yaml
on:
  push:
    branches: [main, develop] # Add branches
    paths-ignore:
      - '**.md' # Ignore markdown changes
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]
  schedule:
    - cron: '0 0 * * 1' # Weekly
  workflow_dispatch: # Manual trigger
```

### Manual Workflow Trigger

Add manual trigger button:

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
```

## Performance Optimization

### Improve Cache Hit Rate

```yaml
- name: Cache Dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

**Tips**:

- Use specific cache keys
- Include version in key for cache busting
- Use `restore-keys` for fallback

### Reduce Job Duration

```yaml
# Run jobs in parallel
jobs:
  lint:
    needs: setup
  format:
    needs: setup
  typecheck:
    needs: setup
  # All run in parallel after setup
```

### Use Matrix Strategy

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

## Notifications

### Slack Notifications

Add Slack webhook secret, then:

```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'CI failed on main branch!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Email Notifications

GitHub sends email by default. Configure in:

- `Settings` → `Notifications` → `Actions`

### Custom Notifications

```yaml
- name: Custom Notification
  if: failure()
  run: |
    curl -X POST https://your-webhook.com/notify \
      -H 'Content-Type: application/json' \
      -d '{"status": "failed", "workflow": "${{ github.workflow }}"}'
```

## Testing Configuration Changes

### Test Workflow Locally

Use [act](https://github.com/nektos/act) to test workflows locally:

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow
act push

# Run specific job
act -j lint

# Use specific event
act pull_request
```

### Test in Feature Branch

1. Create feature branch
2. Modify workflow
3. Push and create PR
4. Verify workflow runs correctly
5. Merge if successful

### Dry Run

Add dry-run mode to workflows:

```yaml
- name: Dry Run
  if: github.event_name == 'pull_request'
  run: |
    echo "DRY RUN: Would merge PR"
    echo "Skipping actual merge"
```

## Rollback Procedures

### Revert Workflow Changes

```bash
# Find commit that changed workflow
git log --oneline .github/workflows/

# Revert specific commit
git revert <commit-hash>

# Or restore from previous version
git checkout <commit-hash> -- .github/workflows/workflow-name.yml
git commit -m "chore(ci): rollback workflow changes"
```

### Disable Workflow Temporarily

Add to workflow:

```yaml
on:
  push:
    branches: [main]
  # Disable workflow
  workflow_dispatch:
    inputs:
      enabled:
        description: 'Enable workflow'
        required: true
        default: 'false'

jobs:
  job-name:
    if: github.event.inputs.enabled == 'true'
    # ...
```

## Best Practices

### Security

- ✅ Use `secrets` for sensitive data
- ✅ Limit workflow permissions
- ✅ Pin action versions (`@v4`, not `@main`)
- ✅ Review third-party actions
- ❌ Never log secrets
- ❌ Don't use `pull_request_target` without review

### Performance

- ✅ Cache dependencies
- ✅ Run jobs in parallel
- ✅ Use `paths-ignore` to skip unnecessary runs
- ✅ Fail fast on errors
- ❌ Don't run expensive jobs on every commit

### Maintenance

- ✅ Document configuration changes
- ✅ Test changes in feature branches
- ✅ Review workflows quarterly
- ✅ Update action versions regularly
- ❌ Don't leave commented-out code

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Action Marketplace](https://github.com/marketplace?type=actions)
- [act - Local Testing](https://github.com/nektos/act)

---

**Last Updated**: 2025-01-12  
**Review Frequency**: Quarterly
