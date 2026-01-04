# apps/api-py/Dockerfile
FROM python:3.12-slim-bookworm AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

# System build deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential ffmpeg libsndfile1 libpq-dev gcc python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY . .
RUN uv sync --frozen --no-dev

# --- Runtime Stage ---
FROM python:3.12-slim-bookworm AS runtime

# Runtime deps (ffmpeg is crucial for your voice app)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 libpq5 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash nargis
WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder --chown=nargis:nargis /app /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Create entrypoint
RUN echo '#!/bin/sh\n\
    set -e\n\
    if command -v alembic >/dev/null 2>&1; then\n\
    alembic upgrade head\n\
    fi\n\
    exec "$@"' > /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

USER nargis

# --- HUGGING FACE CONFIGURATION ---
# Must expose 7860
EXPOSE 7860

# Updated Healthcheck to look at 7860
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import http.client,sys; conn=http.client.HTTPConnection('localhost',7860,timeout=2); conn.request('GET','/health'); r=conn.getresponse(); sys.exit(0 if r.status==200 else 1)"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Force host 0.0.0.0 and port 7860
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","7860"]