# File Path: apps/api-py/Dockerfile

# --- Stage 1: Build the application and its dependencies ---
FROM python:3.12-slim-bookworm AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

# Install system-level dependencies for building
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libsndfile1 \
    libpq-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies (without the project itself first, for caching)
RUN uv sync --frozen --no-install-project --no-dev

# Copy the rest of the application source code
COPY . .

# Install the project itself
RUN uv sync --frozen --no-dev

# --- Stage 2: Create the final, lean runtime image ---
FROM python:3.12-slim-bookworm AS runtime

# Install only the RUNTIME system dependencies
# libpq5 is sufficient for runtime (smaller than libpq-dev)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd --create-home --shell /bin/bash nargis

WORKDIR /app

# Copy the virtual environment from the builder stage
COPY --from=builder /app/.venv /app/.venv

# Copy the application code
COPY --from=builder --chown=nargis:nargis /app /app

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Create entrypoint script
RUN echo '#!/bin/sh\n\
    set -e\n\
    \n\
    # Run migrations if alembic is available\n\
    if command -v alembic >/dev/null 2>&1; then\n\
    alembic upgrade head\n\
    fi\n\
    \n\
    # Exec the command passed as arguments\n\
    exec "$@"' > /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

USER nargis

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import http.client,sys; conn=http.client.HTTPConnection('localhost',8080,timeout=2); conn.request('GET','/health'); r=conn.getresponse(); sys.exit(0 if r.status==200 else 1)"

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8080"]
