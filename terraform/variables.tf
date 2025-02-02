variable "aws_region" {
  type        = string
  description = "AWS Region"
  default     = "us-east-1"
}

variable "aws_access_key_id" {
  type        = string
  description = "AWS Access Key ID"
  sensitive   = true
}

variable "aws_secret_key" {
  type        = string
  description = "AWS Secret Access Key"
  sensitive   = true
}

variable "environment" {
  type        = string
  description = "Environment (dev, staging, prod)"
  default     = "dev"
}

variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket"
}

variable "mongodb_project_id" {
  type        = string
  description = "MongoDB Atlas Project ID"
}

variable "mongodb_cluster_name" {
  type        = string
  description = "Name of the MongoDB cluster"
}

variable "mongodb_public_key" {
  type        = string
  description = "MongoDB Atlas Public Key"
  sensitive   = true
}

variable "mongodb_private_key" {
  type        = string
  description = "MongoDB Atlas Private Key"
  sensitive   = true
} 