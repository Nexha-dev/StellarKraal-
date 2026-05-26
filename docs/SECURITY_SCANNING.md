# Docker Security Scanning

This document describes the security scanning process for Docker images in the StellarKraal project.

## Overview

We use [Trivy](https://github.com/aquasecurity/trivy) to scan Docker images for known vulnerabilities (CVEs). Scans run automatically in CI/CD and on a weekly schedule.

## When Scans Run

1. **Pull Requests**: When Dockerfiles or application code changes
2. **Main Branch**: On every push to main
3. **Weekly Schedule**: Every Sunday at midnight UTC
4. **Manual**: Via GitHub Actions workflow dispatch

## Scan Configuration

- **Severity Levels**: CRITICAL and HIGH vulnerabilities fail the build
- **Unfixed CVEs**: Ignored by default (no patch available)
- **Results**: Uploaded to GitHub Security tab (Code Scanning Alerts)

## Viewing Scan Results

1. Navigate to the **Security** tab in GitHub
2. Click **Code scanning alerts**
3. Filter by category: `backend-image` or `frontend-image`

## Remediating Vulnerabilities

### Common Remediation Steps

1. **Update Base Image**
   ```dockerfile
   # Before
   FROM node:20-alpine
   
   # After (use specific version with patches)
   FROM node:20.12.0-alpine3.19
   ```

2. **Update Dependencies**
   ```bash
   # Update package-lock.json
   npm update
   npm audit fix
   ```

3. **Multi-stage Builds**
   - Use minimal runtime images
   - Don't include build tools in final image
   - Copy only necessary artifacts

4. **Remove Unnecessary Packages**
   ```dockerfile
   RUN apk del build-dependencies
   ```

### Workflow for Fixing CVEs

1. Review the CVE details in GitHub Security tab
2. Check if a patch is available
3. Update the affected package or base image
4. Rebuild and test locally
5. Push changes and verify scan passes

## Suppressing False Positives

If a CVE is a false positive or has been risk-accepted:

1. Add the CVE ID to `.trivyignore` with justification:
   ```
   # CVE-2024-12345: False positive - not applicable to our use case
   # Risk accepted by: [Name] on [Date]
   CVE-2024-12345
   ```

2. Document the decision in security review notes
3. Review suppressions quarterly

## Best Practices

1. **Pin Base Image Versions**: Use specific tags, not `latest`
2. **Regular Updates**: Keep base images and dependencies current
3. **Minimal Images**: Use Alpine or distroless when possible
4. **Layer Optimization**: Combine RUN commands to reduce attack surface
5. **No Secrets**: Never include secrets in images

## Troubleshooting

### Scan Fails on Unfixed CVE

If a CVE has no fix available:
- Check if it affects your usage
- Consider alternative base images
- Add to `.trivyignore` if risk is acceptable

### Build Timeout

For large images:
- Optimize Dockerfile layers
- Use Docker layer caching
- Consider splitting into smaller services

### False Positives

Common false positives:
- CVEs in unused dependencies
- CVEs in build-time only tools
- CVEs that don't apply to containerized environments

## Additional Resources

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [NIST Container Security Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-190.pdf)
