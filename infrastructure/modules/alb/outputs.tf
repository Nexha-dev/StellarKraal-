###############################################################################
# modules/alb/outputs.tf
###############################################################################

output "alb_arn" {
  description = "ARN of the Application Load Balancer."
  value       = aws_lb.this.arn
}

output "alb_dns_name" {
  description = "DNS name of the ALB (point your CNAME record here)."
  value       = aws_lb.this.dns_name
}

output "alb_zone_id" {
  description = "Route 53 hosted zone ID of the ALB (used for alias records)."
  value       = aws_lb.this.zone_id
}

output "target_group_arn" {
  description = "ARN of the ALB target group (consumed by the compute ASG)."
  value       = aws_lb_target_group.app.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener."
  value       = aws_lb_listener.https.arn
}

output "access_logs_bucket" {
  description = "Name of the S3 bucket receiving ALB access logs."
  value       = aws_s3_bucket.alb_logs.bucket
}
