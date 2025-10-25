# File Path: apps/api-py/Dockerfile

# --- Stage 1: Build the application and its dependencies ---
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
RUN pip install --no-cache-dir --upgrade pip uv

# Install system-level dependencies.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the generated lock file to install dependencies.
COPY requirements.lock .

# Install dependencies from the lock file.
RUN uv pip sync --no-cache-dir --system requirements.lock

# Copy the rest of the application source code.
COPY . .

# --- Stage 2: Create the final, lean runtime image ---
FROM python:3.12-slim AS runtime

# Install only the RUNTIME system dependencies.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security.
RUN useradd --create-home --shell /bin/bash nargis

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/home/nargis/.local/bin:${PATH}"

# Copy installed Python packages from the builder stage.
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages

# Copy the executables (like uvicorn) from the builder stage as well.
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy the application code from the builder stage.
WORKDIR /app
COPY --from=builder --chown=nargis:nargis /app /app

USER nargis

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import http.client,sys; conn=http.client.HTTPConnection('localhost',8000,timeout=2); conn.request('GET','/ready'); r=conn.getresponse(); sys.exit(0 if r.status==200 else 1)"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]