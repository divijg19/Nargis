# Use a specific slim Python version that is known to be compatible with ML libraries.
FROM python:3.12-slim

# Set environment variables for Python and add uv to the PATH.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies required for audio processing and building some Python packages.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container.
WORKDIR /app

# Install uv, the fast Python package manager used by the project.
RUN pip install --no-cache-dir --upgrade pip uv

# Copy only the dependency definition file first to leverage Docker layer caching.
# The slow dependency installation step will only re-run if this file changes.
COPY pyproject.toml .

# Install all project dependencies, including the optional "[ml]" group.
# Using --system installs packages into the main site-packages, which is a
# clean pattern for containers where the container is the isolation.
RUN uv pip install --no-cache-dir --system '.[ml]'

# Copy the rest of the application source code into the container.
COPY . .

# Expose the port the application will run on.
EXPOSE 8001

# The command to start the Uvicorn server for the FastAPI application.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]