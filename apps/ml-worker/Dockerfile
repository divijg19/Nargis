ARG PYTHON_VERSION=3.12
FROM python:${PYTHON_VERSION}-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH="/opt/venv/bin:$PATH"

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential git ffmpeg libsndfile1 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN python -m venv /opt/venv
COPY apps/api-py/requirements.light.txt ./
COPY apps/api-py/requirements.ml.txt ./
RUN pip install --upgrade pip setuptools wheel && pip install -r requirements.light.txt && pip install -r requirements.ml.txt || true

COPY apps/ml-worker /app
EXPOSE 8001
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8001"]
