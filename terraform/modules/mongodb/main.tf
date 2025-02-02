terraform {
  required_providers {
    mongodbatlas = {
      source = "mongodb/mongodbatlas"
    }
  }
}

resource "mongodbatlas_cluster" "cluster" {
  project_id = var.project_id
  name       = var.cluster_name

  provider_name               = "TENANT"
  backing_provider_name       = "AWS"
  provider_region_name       = "US_EAST_1"
  provider_instance_size_name = "M0"  # Free tier

  auto_scaling_disk_gb_enabled = false
}

resource "mongodbatlas_database_user" "user" {
  username           = "app-user"
  password           = random_password.db_password.result
  project_id         = var.project_id
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "talktuah"
  }
}

resource "random_password" "db_password" {
  length  = 16
  special = true
} 