resource "aws_ecs_cluster" "main" {
  name = "talk-tuah-cluster"
}

resource "aws_ecs_task_definition" "app" {
  family                   = "talk-tuah-app"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = 256
  memory                  = 512

  container_definitions = jsonencode([
    {
      name  = "talk-tuah-app"
      image = "${var.ecr_repository_url}:latest"
      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "MONGODB_URI"
          value = var.mongodb_uri
        }
      ]
    }
  ])
}

resource "aws_ecs_service" "app" {
  name            = "talk-tuah-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }
} 