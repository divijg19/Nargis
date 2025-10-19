ARG BUILD_ML=0
FROM python:3.13.8-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VENV_PATH=/opt/venv

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential git ffmpeg libsndfile1 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN python -m venv "$VENV_PATH"
ENV PATH="$VENV_PATH/bin:$PATH"

## Use a lightweight set of requirements by default to avoid pulling heavy ML wheels.
COPY requirements.light.txt ./
COPY requirements.ml.txt ./
# Note: do NOT copy `requirements.txt` or `pyproject.toml` into the builder stage —
# those files were kept for developer reference but may include heavy pinned ML deps.
RUN --mount=type=cache,target=/root/.cache/pip set -eux; \
    pip install --upgrade pip setuptools wheel; \
    pip install --no-cache-dir -r requirements.light.txt; \
    if [ "$BUILD_ML" = "1" ]; then pip install --no-cache-dir -r requirements.ml.txt; fi; \
    test -x "$VENV_PATH/bin/uvicorn"

# Now copy the rest of the source
COPY . /app

FROM python:${PYTHON_VERSION}-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH="/opt/venv/bin:$PATH" \
    PRELOAD_STT=false LOG_LEVEL=INFO

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 ca-certificates && rm -rf /var/lib/apt/lists/* && \
    useradd --create-home --shell /usr/sbin/nologin nargis

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder --chown=nargis:nargis /app /app

# Healthcheck (simple) hitting readiness
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import http.client,sys; import os; h=os.environ.get('HOST','localhost'); conn=http.client.HTTPConnection('localhost',8000,timeout=2); conn.request('GET','/ready'); r=conn.getresponse(); sys.exit(0 if r.status==200 else 1)" || exit 1

USER nargis
EXPOSE 8000
ENTRYPOINT ["uvicorn"]
CMD ["main:app","--host","0.0.0.0","--port","8000","--proxy-headers","--log-level","info"]
