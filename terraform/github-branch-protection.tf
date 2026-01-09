# GitHub Branch Protection Rules
# This configuration protects the master branch and requires CI checks to pass

terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

# Configure the GitHub Provider
provider "github" {
  token = var.github_token
  owner = var.github_owner
}

# Variables
variable "github_token" {
  description = "GitHub Personal Access Token with repo permissions"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub organization or user name"
  type        = string
  default     = "cryptoganster"
}

variable "repository_name" {
  description = "Repository name"
  type        = string
  default     = "my-social-agents"
}

# Branch Protection Rule for master
resource "github_branch_protection" "master_protection" {
  repository_id = data.github_repository.repo.node_id
  pattern       = "master"

  # Require pull request reviews before merging
  required_pull_request_reviews {
    dismiss_stale_reviews           = true  # Dismiss stale approvals when new commits are pushed
    require_code_owner_reviews      = false
    required_approving_review_count = 0     # 0 approvals required (solo dev/maintainer)
    require_last_push_approval      = false
  }

  # Require status checks to pass before merging
  required_status_checks {
    strict   = true # Require branches to be up to date before merging
    contexts = [
      "Code Quality",
      "Security Audit",
      "Tests",
      "Build",
      "CI Success"
    ]
  }

  # Enforce restrictions for administrators
  enforce_admins = true # Set to true if you want admins to also follow these rules

  # Require signed commits (optional)
  require_signed_commits = true

  # Require linear history (optional)
  require_linear_history = false

  # Allow force pushes (not recommended for protected branches)
  allows_force_pushes = false

  # Allow deletions (not recommended for protected branches)
  allows_deletions = false

  # Require conversation resolution before merging
  require_conversation_resolution = true

  # Lock branch (prevents all pushes to the branch)
  lock_branch = false
}

# Data source to get repository information
data "github_repository" "repo" {
  full_name = "${var.github_owner}/${var.repository_name}"
}

# Outputs
output "branch_protection_id" {
  description = "The ID of the branch protection rule"
  value       = github_branch_protection.master_protection.id
}

output "protected_branch" {
  description = "The protected branch pattern"
  value       = github_branch_protection.master_protection.pattern
}
