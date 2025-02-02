provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key_id
  secret_key = var.aws_secret_key
}

provider "mongodbatlas" {
  public_key  = var.mongodb_public_key
  private_key = var.mongodb_private_key
} 