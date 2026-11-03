# =============================================================================
# main.tf — Core Infrastructure Resources for VideoChat AI
# =============================================================================
# Provisions:
# 1. Custom VPC, Internet Gateway, Public Subnet, Route Table
# 2. Hardened Security Group (Port 80 public, Port 22 restricted to your IP)
# 3. IAM Role & Instance Profile (SSM Session Manager & CloudWatch monitoring)
# 4. Free Tier EC2 instance (Ubuntu 24.04 LTS, 2GB swap via user-data, Docker)
# 5. CloudWatch Alarms for CPU utilization and EC2 status health checks
# =============================================================================

# -----------------------------------------------------------------------------
# Data Source: Latest Ubuntu 24.04 LTS AMI (Canonical)
# Only queried when var.ami_id is explicitly set to empty string.
# -----------------------------------------------------------------------------
data "aws_ami" "ubuntu" {
  count       = var.ami_id == "" ? 1 : 0
  most_recent = true
  owners      = ["099720109477"] # Canonical official account ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# -----------------------------------------------------------------------------
# 1. Networking (VPC, Subnet, Internet Gateway, Route Table)
# -----------------------------------------------------------------------------
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.environment}-videochat-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-videochat-igw"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true # Instances receive a public IPv4 address

  tags = {
    Name = "${var.environment}-videochat-public-subnet"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.environment}-videochat-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# -----------------------------------------------------------------------------
# 2. Security Group (Firewall Rules)
# -----------------------------------------------------------------------------
resource "aws_security_group" "app_sg" {
  name        = "${var.environment}-videochat-sg"
  description = "Security group for VideoChat AI application server"
  vpc_id      = aws_vpc.main.id

  # HTTP — Public access to the frontend/Nginx reverse proxy
  ingress {
    description = "Allow inbound HTTP traffic from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH — Restricted access to developer IP
  ingress {
    description = "Allow inbound SSH traffic restricted to trusted IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  # Outbound traffic — Allow all egress for package updates, Docker Hub, Groq API
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-videochat-sg"
  }
}

# -----------------------------------------------------------------------------
# 3. IAM Role & Instance Profile (SSM + CloudWatch Agent)
# -----------------------------------------------------------------------------
# Why use IAM instance profile instead of long-lived access keys?
# - EC2 retrieves temporary AWS credentials automatically via metadata service.
# - Allows AWS SSM Session Manager connection (SSH without open port 22!).
# -----------------------------------------------------------------------------
resource "aws_iam_role" "ec2_role" {
  name = "${var.environment}-videochat-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.environment}-videochat-ec2-role"
  }
}

# Attach SSM Managed Instance Core policy (AWS Systems Manager access)
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Attach CloudWatch Agent Server policy (Metric and log streaming)
resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.environment}-videochat-instance-profile"
  role = aws_iam_role.ec2_role.name
}

# -----------------------------------------------------------------------------
# 4. EC2 Compute Instance (Free Tier Eligible)
# -----------------------------------------------------------------------------
resource "aws_instance" "app_server" {
  ami                  = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu[0].id
  instance_type        = var.instance_type
  subnet_id            = aws_subnet.public.id
  key_name             = var.key_name != "" ? var.key_name : null
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  vpc_security_group_ids = [aws_security_group.app_sg.id]

  # Cloud-Init script: installs Docker, Docker Compose, allocates 2GB swap
  user_data = file("${path.module}/user-data.sh")

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "${var.environment}-videochat-root-disk"
    }
  }

  tags = {
    Name = "${var.environment}-videochat-server"
  }
}

# -----------------------------------------------------------------------------
# 5. CloudWatch Alarms (Observability & Alerting)
# -----------------------------------------------------------------------------
# CPU Utilization Alarm (> 80% over two 5-minute periods)
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.environment}-videochat-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alarm triggered when EC2 CPU utilization exceeds 80% for 10 minutes."

  dimensions = {
    InstanceId = aws_instance.app_server.id
  }

  tags = {
    Name = "${var.environment}-videochat-cpu-alarm"
  }
}

# EC2 Status Check Failed Alarm (Catches hardware or network failures)
resource "aws_cloudwatch_metric_alarm" "status_check_failed" {
  alarm_name          = "${var.environment}-videochat-status-check-failed"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  alarm_description   = "Alarm triggered when EC2 instance or system status checks fail."

  dimensions = {
    InstanceId = aws_instance.app_server.id
  }

  tags = {
    Name = "${var.environment}-videochat-status-alarm"
  }
}
