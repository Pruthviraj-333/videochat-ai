# =============================================================================
# variables.tf — Terraform Input Variables
# =============================================================================
# Parameterizes our infrastructure so it can be deployed cleanly across
# regions and environments without hardcoding values or secrets.
# =============================================================================

variable "aws_region" {
  description = "The AWS Region where resources will be provisioned."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name (e.g., dev, staging, production)."
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for the dedicated application VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet hosting the EC2 instance."
  type        = string
  default     = "10.0.1.0/24"
}

variable "availability_zone" {
  description = "Availability zone for the public subnet."
  type        = string
  default     = "us-east-1a"
}

variable "instance_type" {
  description = "EC2 instance size. t3.micro is AWS Free Tier eligible (2 vCPU, 1 GB RAM)."
  type        = string
  default     = "t3.micro"
}

variable "my_ip" {
  description = "Your IP address in CIDR notation (e.g., '198.51.100.4/32') to restrict SSH port 22 access. Defaults to 0.0.0.0/0 for initial setup."
  type        = string
  default     = "0.0.0.0/0"
}

variable "key_name" {
  description = "Name of the existing AWS EC2 Key Pair used for SSH authentication."
  type        = string
  default     = "videochat-key"
}

variable "ami_id" {
  description = "Specific AMI ID to deploy. Defaults to Ubuntu 22.04 LTS (us-east-1). Leave empty to query latest Ubuntu 24.04 LTS via AWS API."
  type        = string
  default     = "ami-0c7217cdde317cfec"
}

variable "root_volume_size" {
  description = "Root EBS storage volume size in GB. AWS Free Tier provides up to 30 GB gp3 storage."
  type        = number
  default     = 30
}
