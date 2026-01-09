#!/bin/bash

# Terraform GitHub Branch Protection Setup Script
# This script helps you set up branch protection rules using Terraform

set -e

echo "🔧 GitHub Branch Protection Setup"
echo "=================================="
echo ""

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed"
    echo "Please install Terraform: https://www.terraform.io/downloads"
    exit 1
fi

echo "✅ Terraform is installed"
echo ""

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo "⚠️  terraform.tfvars not found"
    echo ""
    echo "Creating terraform.tfvars from example..."
    cp terraform.tfvars.example terraform.tfvars
    echo ""
    echo "📝 Please edit terraform.tfvars and add your GitHub token:"
    echo "   1. Go to https://github.com/settings/tokens"
    echo "   2. Generate a new token with 'repo' scope"
    echo "   3. Copy the token"
    echo "   4. Edit terraform.tfvars and paste your token"
    echo ""
    echo "Then run this script again."
    exit 0
fi

echo "✅ terraform.tfvars found"
echo ""

# Check if GitHub token is set
if grep -q "ghp_your_token_here" terraform.tfvars; then
    echo "❌ GitHub token not configured in terraform.tfvars"
    echo ""
    echo "Please edit terraform.tfvars and add your GitHub token:"
    echo "   1. Go to https://github.com/settings/tokens"
    echo "   2. Generate a new token with 'repo' scope"
    echo "   3. Copy the token"
    echo "   4. Edit terraform.tfvars and replace 'ghp_your_token_here' with your token"
    exit 1
fi

echo "✅ GitHub token configured"
echo ""

# Initialize Terraform
echo "🔄 Initializing Terraform..."
terraform init
echo ""

# Validate configuration
echo "🔍 Validating Terraform configuration..."
terraform validate
echo ""

# Show plan
echo "📋 Terraform Plan:"
echo "=================="
terraform plan
echo ""

# Ask for confirmation
read -p "Do you want to apply these changes? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
    echo ""
    echo "🚀 Applying Terraform configuration..."
    terraform apply -auto-approve
    echo ""
    echo "✅ Branch protection rules configured successfully!"
    echo ""
    echo "Your master branch is now protected with:"
    echo "  - Required status checks (Code Quality, Security Audit, Tests, Build, CI Success)"
    echo "  - Required pull request reviews (0 approvals - solo dev)"
    echo "  - Branch must be up to date before merging"
    echo "  - Conversation resolution required"
else
    echo ""
    echo "❌ Aborted. No changes were made."
fi
