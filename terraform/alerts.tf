resource "aws_sns_topic" "backup_notifications" {
  name = "backup-failure-notifications"

  tags = {
    Environment = var.environment
  }
}

# Integration with Backend Webhook
resource "aws_sns_topic_subscription" "backend_webhook" {
  topic_arn = aws_sns_topic.backup_notifications.arn
  protocol  = "https"
  endpoint  = "https://api.stellarkraal.com/api/v1/alerts/webhook" # Replace with actual production URL
}

resource "aws_cloudwatch_event_rule" "backup_failure_rule" {
  name        = "backup-job-failed-rule"
  description = "Triggers when an AWS Backup job fails"

  event_pattern = jsonencode({
    source      = ["aws.backup"]
    detail-type = ["Backup Job State Change"]
    detail = {
      state = ["FAILED"]
    }
  })
}

resource "aws_cloudwatch_event_target" "sns_target" {
  rule      = aws_cloudwatch_event_rule.backup_failure_rule.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.backup_notifications.arn
}

resource "aws_sns_topic_policy" "default" {
  arn    = aws_sns_topic.backup_notifications.arn
  policy = data.aws_iam_policy_document.sns_topic_policy.json
}

data "aws_iam_policy_document" "sns_topic_policy" {
  statement {
    effect  = "Allow"
    actions = ["SNS:Publish"]

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    resources = [aws_sns_topic.backup_notifications.arn]
  }
}
