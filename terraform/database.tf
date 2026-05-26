resource "aws_db_instance" "main" {
  allocated_storage      = 20
  storage_type           = "gp2"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t3.micro"
  identifier             = "stellarkraal-db-${var.environment}"
  db_name                = "stellarkraal"
  username               = "admin"
  password               = "REPLACE_ME_WITH_SECRET" # Should use Secrets Manager in real scenario
  parameter_group_name   = "default.postgres15"
  skip_final_snapshot    = true
  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  tags = {
    Name        = "stellarkraal-db-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "stellarkraal-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.public[*].id

  tags = {
    Name        = "stellarkraal-db-subnet-group-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_security_group" "db" {
  name        = "stellarkraal-db-sg-${var.environment}"
  description = "Allow access to Database"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "stellarkraal-db-sg-${var.environment}"
    Environment = var.environment
  }
}
