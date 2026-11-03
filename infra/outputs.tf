# =============================================================================
# outputs.tf — Terraform Output Values
# =============================================================================
# Exposes operational values required for verification, deployment scripts,
# and Jenkins pipeline stages without manually digging into AWS console.
# =============================================================================

output "instance_id" {
  description = "The unique AWS ID of the provisioned EC2 instance."
  value       = aws_instance.app_server.id
}

output "instance_public_ip" {
  description = "Public IPv4 address of the EC2 instance (used by Jenkins for SSH deployment)."
  value       = aws_instance.app_server.public_ip
}

output "instance_public_dns" {
  description = "Public DNS name assigned to the EC2 instance."
  value       = aws_instance.app_server.public_dns
}

output "app_url" {
  description = "Public URL to access the VideoChat AI web interface."
  value       = "http://${aws_instance.app_server.public_ip}"
}

output "vpc_id" {
  description = "The ID of the custom VPC."
  value       = aws_vpc.main.id
}

output "security_group_id" {
  description = "The ID of the application security group."
  value       = aws_security_group.app_sg.id
}

output "ssh_command" {
  description = "Example command to SSH into the EC2 instance."
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ubuntu@${aws_instance.app_server.public_ip}"
}

