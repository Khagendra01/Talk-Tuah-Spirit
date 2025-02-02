output "s3_bucket_name" {
  value = module.s3.bucket_name
}

output "mongodb_connection_string" {
  value     = module.mongodb.connection_string
  sensitive = true
}

output "aws_access_key_id" {
  value     = module.iam.access_key_id
  sensitive = true
}

output "aws_secret_access_key" {
  value     = module.iam.secret_access_key
  sensitive = true
} 