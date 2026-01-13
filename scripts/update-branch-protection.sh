#!/bin/bash

# Update branch protection rules to match current CI jobs
# This fixes the auto-merge issue where "Code Quality" check was blocking merges

set -e

REPO="cryptoganster/my-social-agents"
BRANCH="master"

echo "🔧 Updating branch protection rules for $REPO/$BRANCH..."

# Required status checks that match our current CI workflow
REQUIRED_CHECKS='[
  "CI Success"
]'

# Update branch protection
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO/branches/$BRANCH/protection" \
  -f required_status_checks[strict]=true \
  -f "required_status_checks[checks][][context]=CI Success" \
  -f "required_status_checks[checks][][app_id]=15368" \
  -f required_pull_request_reviews[dismiss_stale_reviews]=true \
  -f required_pull_request_reviews[require_code_owner_reviews]=false \
  -f required_pull_request_reviews[require_last_push_approval]=false \
  -f required_pull_request_reviews[required_approving_review_count]=0 \
  -f required_signatures[enabled]=true \
  -f enforce_admins[enabled]=true \
  -f required_linear_history[enabled]=true \
  -f allow_force_pushes[enabled]=false \
  -f allow_deletions[enabled]=false \
  -f block_creations[enabled]=false \
  -f required_conversation_resolution[enabled]=true \
  -f lock_branch[enabled]=false \
  -f allow_fork_syncing[enabled]=false

echo "✅ Branch protection rules updated!"
echo ""
echo "📋 Summary:"
echo "  - Required status checks: CI Success (aggregates all CI jobs)"
echo "  - Require branches to be up to date: Yes"
echo "  - Require signed commits: Yes"
echo "  - Require linear history: Yes"
echo "  - Require conversation resolution: Yes"
echo "  - Enforce for administrators: Yes"
echo ""
echo "🎯 This allows auto-merge to work once all CI checks pass!"
