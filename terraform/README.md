# Terraform GitHub Configuration

This directory contains Terraform configuration for managing GitHub repository settings, including branch protection rules.

## Prerequisites

1. **Terraform installed**: [Download Terraform](https://www.terraform.io/downloads)
2. **GitHub Personal Access Token** with `repo` scope:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo` (full control of private repositories)
   - Copy the token

## Setup

1. **Copy the example variables file**:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`** and add your GitHub token:

   ```hcl
   github_token = "ghp_your_actual_token_here"
   github_owner = "cryptoganster"
   repository_name = "my-social-agents"
   ```

3. **Initialize Terraform**:
   ```bash
   terraform init
   ```

## Usage

### Plan Changes

Preview what Terraform will do:

```bash
terraform plan
```

### Apply Changes

Apply the branch protection rules:

```bash
terraform apply
```

Type `yes` when prompted to confirm.

### Destroy Configuration

Remove the branch protection rules:

```bash
terraform destroy
```

## What This Configures

The Terraform configuration sets up branch protection for the `master` branch with:

### ✅ Required Status Checks

- Code Quality
- Security Audit
- Tests
- Build
- CI Success

All these checks must pass before merging.

### ✅ Pull Request Reviews

- Requires 0 approving reviews (solo dev/maintainer)
- Dismisses stale reviews when new commits are pushed
- Pull request required before merging

### ✅ Branch Update Requirement

- Branches must be up to date with master before merging

### ✅ Conversation Resolution

- All conversations must be resolved before merging

### 🚫 Disabled Features

- Force pushes: Not allowed
- Branch deletion: Not allowed
- Admin enforcement: Admins can bypass rules (set `enforce_admins = true` to change)

## Customization

Edit `github-branch-protection.tf` to customize:

- **Add more protected branches**: Duplicate the `github_branch_protection` resource
- **Change required checks**: Modify the `contexts` list in `required_status_checks`
- **Adjust review requirements**: Change `required_approving_review_count`
- **Enforce for admins**: Set `enforce_admins = true`

## Security Notes

⚠️ **Never commit `terraform.tfvars`** - it contains your GitHub token!

The `.gitignore` should include:

```
terraform.tfvars
*.tfstate
*.tfstate.backup
.terraform/
```

## Alternative: Use Environment Variables

Instead of `terraform.tfvars`, you can use environment variables:

```bash
export TF_VAR_github_token="ghp_your_token_here"
export TF_VAR_github_owner="cryptoganster"
export TF_VAR_repository_name="my-social-agents"

terraform plan
terraform apply
```

## Troubleshooting

### Error: "Resource not accessible by personal access token"

Your token needs the `repo` scope. Create a new token with full repo access.

### Error: "Branch protection rule already exists"

If you created rules manually in GitHub, import them first:

```bash
terraform import github_branch_protection.master_protection "my-social-agents:master"
```

### Error: "Repository not found"

Check that:

- The repository name is correct
- Your token has access to the repository
- The repository is not private (or your token has private repo access)

## References

- [Terraform GitHub Provider Documentation](https://registry.terraform.io/providers/integrations/github/latest/docs)
- [GitHub Branch Protection API](https://docs.github.com/en/rest/branches/branch-protection)
