variable "project_id" {
  type        = string
  description = "MongoDB Atlas Project ID"
}

variable "cluster_name" {
  type        = string
  description = "Name of the MongoDB cluster"
}

variable "environment" {
  type        = string
  description = "Environment (dev, staging, prod)"
} 