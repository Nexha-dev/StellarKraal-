###############################################################################
# modules/compute/outputs.tf
###############################################################################

output "asg_name" {
  description = "Name of the Auto Scaling Group."
  value       = aws_autoscaling_group.app.name
}

output "asg_arn" {
  description = "ARN of the Auto Scaling Group."
  value       = aws_autoscaling_group.app.arn
}

output "launch_template_id" {
  description = "ID of the EC2 Launch Template."
  value       = aws_launch_template.app.id
}

output "launch_template_latest_version" {
  description = "Latest version of the EC2 Launch Template."
  value       = aws_launch_template.app.latest_version
}

output "iam_role_arn" {
  description = "ARN of the IAM Role assigned to EC2 instances."
  value       = aws_iam_role.app.arn
}

output "instance_profile_name" {
  description = "Name of the IAM Instance Profile attached to EC2 instances."
  value       = aws_iam_instance_profile.app.name
}
