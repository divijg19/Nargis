### Multi-stage Python build (builder + slim runtime)
FROM python:3.13-slim AS builder

# Install build-time deps needed for some wheel builds and audio tooling
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential git ffmpeg libsndfile1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create isolated venv in builder for later copy into runtime
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1

# Copy dependency manifest and upgrade packaging tools
COPY pyproject.toml /app/
COPY requirements.txt /app/
COPY requirements.lock /app/
RUN pip install --upgrade pip setuptools wheel

# Install dependencies strictly inside the venv.
# Try uv only if present; if uv fails, fall back deterministically to hashed lock with pip.
RUN set -eux; \
    # Install uv inside the venv (lightweight fast resolver) then try pyproject install.
    pip install --no-cache-dir uv || true; \
    if command -v uv >/dev/null 2>&1; then \
    echo 'Using uv to resolve + install (no dev)'; \
    if ! uv install --no-dev --no-cache; then \
    echo 'uv install failed; falling back to hashed lock with pip'; \
    . /opt/venv/bin/activate; \
    pip install --no-cache-dir --require-hashes -r requirements.lock; \
    fi; \
    else \
    echo 'uv not available; falling back to hashed lock with pip'; \
    . /opt/venv/bin/activate; \
    pip install --no-cache-dir --require-hashes -r requirements.lock; \
    fi; \
    # Ensure uvicorn exists for runtime
    test -x /opt/venv/bin/uvicorn || (echo 'uvicorn missing after dependency install' && exit 1)

# Copy application source into builder (still as root; ownership fixed in runtime stage copies)
COPY . /app

### Runtime image
FROM python:3.13-slim AS runtime

# Runtime system deps (only minimal required libs). Keep packages to a minimum
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 ca-certificates && rm -rf /var/lib/apt/lists/*

# Create a non-root user to reduce attack surface
RUN useradd --create-home --shell /bin/false nargis && mkdir -p /app

# Copy venv and application from builder
COPY --chown=nargis:nargis --from=builder /opt/venv /opt/venv
COPY --chown=nargis:nargis --from=builder /app /app

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1 \
    PRELOAD_STT=false \
    LOG_LEVEL=INFO \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

USER nargis

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
