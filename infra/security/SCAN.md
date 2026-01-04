# Scanning container images (Trivy)

This file shows how to scan the built Docker images for common vulnerabilities using Trivy and quick remediation tips.

Install Trivy: https://aquasecurity.github.io/trivy/v0.44.0/installation/

Scan local images:

```bash
# Build images locally first
docker build -t nargis-api-py:local ./apps/api-py
docker build -t nargis-api-go:local ./apps/api-go

# Scan
trivy image nargis-api-py:local
trivy image nargis-api-go:local
```

Remediation tips
- Use slim or distroless runtime images (we already use distroless for Go).
- Minimize installed packages in runtime stage; only include required system libs.
- Pin dependency versions and use lockfiles to avoid pulling vulnerable transitive deps.
- Run `pip-audit` or `safety` for Python dependency checks.
