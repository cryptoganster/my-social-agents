# GitHub Workflows Monitoring Guide

This guide helps you monitor and maintain the GitHub Actions workflows implemented in this project.

## Quick Status Check

### View All Workflow Runs

1. Go to: `https://github.com/<your-org>/my-social-agents/actions`
2. Filter by workflow name or status
3. Check for failures or warnings

### Key Workflows to Monitor

| Workflow                  | Frequency      | What to Watch                                   |
| ------------------------- | -------------- | ----------------------------------------------- |
| **CI**                    | Every push/PR  | Build failures, test failures, coverage drops   |
| **CodeQL**                | Weekly + PR    | Security vulnerabilities, new alerts            |
| **Revert on CI Failure**  | On CI failure  | Auto-revert success, manual intervention needed |
| **Validate PR Source**    | Every PR       | Branch naming violations                        |
| **Dependabot Auto-Merge** | Dependabot PRs | Auto-merge success, major updates               |
| **Dependabot Auto-Fix**   | Dependabot PRs | Lockfile fixes, commit success                  |
| **Auto-Merge**            | Authorized PRs | Merge success, CI wait timeouts                 |

## Daily Monitoring Tasks

### Morning Check (5 minutes)

```bash
# Check recent workflow runs
gh run list --limit 10

# Check for failures
gh run list --status failure --limit 5

# Check CodeQL alerts
gh api repos/:owner/:repo/code-scanning/alerts
```

### What to Look For

- ✅ **Green builds** - All CI jobs passing
- ⚠️ **Yellow builds** - Warnings or skipped jobs
- ❌ **Red builds** - Failures requiring attention
- 🔒 **Security alerts** - CodeQL findings

## Weekly Monitoring Tasks

### Security Review (15 minutes)

1. **Check CodeQL Results**
   - Go to: `Security` tab → `Code scanning`
   - Review new alerts
   - Dismiss false positives
   - Create issues for real vulnerabilities

2. **Review Dependabot PRs**
   - Check auto-merged updates
   - Review major updates waiting for approval
   - Verify no breaking changes

3. **Check Workflow Performance**
   - Average CI duration
   - Flaky tests
   - Cache hit rates

### Commands

```bash
# View CodeQL alerts
gh api repos/:owner/:repo/code-scanning/alerts \
  --jq '.[] | {number, rule: .rule.id, severity: .rule.severity, state}'

# View Dependabot PRs
gh pr list --author app/dependabot

# View workflow run times
gh run list --workflow=ci.yml --limit 20 \
  --json conclusion,createdAt,updatedAt,durationMs
```

## Monthly Monitoring Tasks

### Workflow Health Check (30 minutes)

1. **Review Workflow Metrics**
   - Success rate per workflow
   - Average duration trends
   - Resource usage

2. **Update Authorized Users**
   - Review `auto-merge.yml` authorized authors
   - Add/remove users as needed
   - Document changes

3. **Review Security Findings**
   - CodeQL trends
   - Secret scan findings
   - License compliance issues

4. **Optimize Workflows**
   - Identify slow jobs
   - Improve caching
   - Update dependencies

## Alerts and Notifications

### GitHub Notifications

Enable notifications for:

- ✅ Workflow failures on `main` branch
- ✅ Security alerts (CodeQL)
- ✅ Dependabot alerts
- ⚠️ PR reviews (optional)

### Slack/Email Integration (Optional)

Configure GitHub Actions to send notifications:

```yaml
# Add to workflow (example)
- name: Notify on Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Troubleshooting Common Issues

### CI Workflow Failures

**Symptom**: CI fails on `main` after merge

**Action**:

1. Check if `revert-on-ci-failure.yml` triggered
2. Review revert PR created automatically
3. Fix issues in new PR
4. Merge fix

**Prevention**: Ensure all PRs pass CI before merging

### CodeQL False Positives

**Symptom**: CodeQL reports non-issues

**Action**:

1. Review alert details
2. Verify it's a false positive
3. Dismiss with reason: "False positive - [explanation]"
4. Document in security review

### Dependabot Auto-Merge Stuck

**Symptom**: Dependabot PR not auto-merging

**Action**:

1. Check CI status (must pass)
2. Verify it's patch/minor update
3. Check workflow logs
4. Manually merge if needed

### Auto-Merge Not Triggering

**Symptom**: Authorized user's PR not auto-merging

**Action**:

1. Verify user in `AUTHORIZED_AUTHORS` list
2. Check CI status (must pass)
3. Verify PR is not draft
4. Check workflow logs for errors

## Workflow Configuration Updates

### Update Authorized Users

Edit `.github/workflows/auto-merge.yml`:

```yaml
env:
  AUTHORIZED_AUTHORS: |
    bryanstevens
    another-user
    third-user
```

**After updating**:

1. Commit changes
2. Push to `main`
3. Test with new user's PR

### Adjust CI Thresholds

Edit `.github/workflows/ci.yml`:

```yaml
# Coverage threshold
- name: Check Coverage
  run: |
    npm run test:cov
    # Adjust threshold here
    npx nyc check-coverage --lines 70 --functions 70 --branches 70
```

### Update CodeQL Schedule

Edit `.github/workflows/codeql.yml`:

```yaml
schedule:
  # Change schedule here (cron format)
  - cron: '0 0 * * 1' # Weekly on Monday at 00:00 UTC
```

## Performance Optimization

### Cache Optimization

Monitor cache hit rates:

```bash
# View cache usage
gh api repos/:owner/:repo/actions/cache/usage
```

**If cache hit rate < 80%**:

1. Review cache keys in workflows
2. Ensure dependencies are stable
3. Consider cache size limits

### Job Parallelization

Current setup:

- Setup & Cache → All quality jobs (parallel)
- Quality jobs → Test & Build (parallel)
- All → CI Success

**Optimization opportunities**:

- Split tests by type (unit, integration)
- Run builds in parallel for different targets
- Use matrix strategy for multi-version testing

## Security Best Practices

### Secrets Management

**Current secrets needed**:

- `GITHUB_TOKEN` (automatic)
- `SLACK_WEBHOOK` (optional, for notifications)

**Best practices**:

- ✅ Use GitHub Secrets, never hardcode
- ✅ Rotate secrets regularly
- ✅ Limit secret access to necessary workflows
- ❌ Never log secrets

### Workflow Permissions

**Current permissions** (minimal):

- `contents: write` - For revert workflow
- `pull-requests: write` - For comments and auto-merge
- `issues: write` - For issue creation

**Review quarterly**:

- Ensure permissions are still needed
- Remove unused permissions
- Document permission requirements

## Metrics to Track

### Success Metrics

| Metric                     | Target     | Current | Trend |
| -------------------------- | ---------- | ------- | ----- |
| CI Success Rate            | > 95%      | -       | -     |
| Average CI Duration        | < 5 min    | -       | -     |
| CodeQL Alerts              | 0 critical | -       | -     |
| Dependabot Auto-Merge Rate | > 80%      | -       | -     |
| Revert Frequency           | < 1/month  | -       | -     |

### How to Measure

```bash
# CI success rate (last 30 days)
gh run list --workflow=ci.yml --created ">=$(date -d '30 days ago' +%Y-%m-%d)" \
  --json conclusion --jq '[.[] | .conclusion] | group_by(.) | map({key: .[0], count: length})'

# Average CI duration
gh run list --workflow=ci.yml --limit 50 \
  --json durationMs --jq '[.[].durationMs] | add / length / 1000 / 60'

# CodeQL alerts
gh api repos/:owner/:repo/code-scanning/alerts \
  --jq '[.[] | select(.state == "open")] | length'
```

## Incident Response

### CI Failure on Main

**Severity**: 🔴 Critical

**Response**:

1. Check if auto-revert triggered (< 5 min)
2. Review revert PR
3. Approve and merge revert
4. Create fix PR
5. Document incident

### Security Alert

**Severity**: 🟠 High (depends on severity)

**Response**:

1. Review CodeQL alert details
2. Assess impact and exploitability
3. Create private security advisory if needed
4. Fix vulnerability
5. Update dependencies
6. Document and communicate

### Workflow Outage

**Severity**: 🟡 Medium

**Response**:

1. Check GitHub Status page
2. Review workflow logs
3. Retry failed runs
4. Contact GitHub Support if needed
5. Document workaround

## Useful Commands

### GitHub CLI

```bash
# List recent runs
gh run list --limit 10

# View run details
gh run view <run-id>

# Re-run failed jobs
gh run rerun <run-id> --failed

# View workflow logs
gh run view <run-id> --log

# List PRs
gh pr list

# View PR checks
gh pr checks <pr-number>

# List security alerts
gh api repos/:owner/:repo/code-scanning/alerts
```

### Git Aliases

```bash
# Add to ~/.gitconfig
[alias]
  ci-status = !gh run list --workflow=ci.yml --limit 5
  ci-watch = !gh run watch
  pr-checks = !gh pr checks
```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [GitHub CLI Documentation](https://cli.github.com/manual/)

## Support

### Internal

- Review workflow logs in GitHub Actions tab
- Check `.github/workflows/README.md` for workflow details
- Consult `.github/workflows/test-phase1-workflows.md` for test scenarios

### External

- GitHub Community Forum: https://github.community/
- GitHub Support: https://support.github.com/
- Stack Overflow: Tag `github-actions`

---

**Last Updated**: 2025-01-12  
**Maintained By**: DevOps Team  
**Review Frequency**: Monthly
