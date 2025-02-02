output "connection_string" {
  value     = mongodbatlas_cluster.cluster.connection_strings[0].standard
  sensitive = true
}

output "database_user" {
  value     = mongodbatlas_database_user.user.username
  sensitive = true
}

output "database_password" {
  value     = mongodbatlas_database_user.user.password
  sensitive = true
} 