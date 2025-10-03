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

# Copy dependency manifest and upgrade packaging tools
COPY pyproject.toml /app/
COPY requirements.txt /app/
COPY requirements.lock /app/
RUN pip install --upgrade pip setuptools wheel

# Prefer installing with the fast 'uv' installer; fall back to pip if unavailable
RUN pip install --no-cache-dir uv || true
RUN if command -v uv >/dev/null 2>&1; then \
    echo "Using uv to install dependencies from pyproject.toml" && \
    uv install --no-dev --no-cache || true; \
    else \
    echo "uv not available; installing pinned runtime deps with hashes" && \
    pip install --upgrade pip && \
    pip install --no-cache-dir --require-hashes -r requirements.lock; \
    fi

# Copy application source into builder
COPY . /app

### Runtime image
FROM python:3.13-slim AS runtime

# Runtime system deps (only minimal required libs). Keep packages to a minimum
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 ca-certificates && rm -rf /var/lib/apt/lists/*

# Create a non-root user to reduce attack surface
RUN useradd --create-home --shell /bin/false nargis && mkdir -p /app && chown nargis:nargis /app

# Copy venv and application from builder
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app /app

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1 \
    PRELOAD_STT=false \
    LOG_LEVEL=INFO
WORKDIR /app

# Ensure permissions are correct for non-root user
RUN chown -R nargis:nargis /opt/venv /app

USER nargis

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
