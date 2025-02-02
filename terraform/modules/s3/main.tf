resource "aws_s3_bucket" "app_bucket" {
  bucket = var.bucket_name

  tags = {
    Environment = var.environment
    Project     = "talk-tuah-ghost"
  }
}

resource "aws_s3_bucket_cors_configuration" "app_bucket" {
  bucket = aws_s3_bucket.app_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "POST", "PUT"]
    allowed_origins = ["*"]  # Restrict this in production
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
} 