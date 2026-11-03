# =============================================================================
# versions.tf — Terraform Version & Provider Requirements
# =============================================================================
# Locks Terraform and AWS provider versions to ensure reproducible,
# deterministic infrastructure builds across local development and CI/CD.
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region                      = var.aws_region
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true

  # Default tags automatically applied to every resource created in AWS.
  # Critical for cost tracking, auditing, and interview demonstrations.
  default_tags {
    tags = {
      Project     = "videochat-ai"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
