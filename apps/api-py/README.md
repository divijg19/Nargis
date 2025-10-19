(# api-py — Nargis Python API)

This service provides STT/LLM/TTS endpoints for Nargis. Important notes for local development and deployment:

- The default container image is lightweight and does NOT include heavy ML libraries (torch/transformers).
- To build the default (recommended) image locally:

```pwsh
docker build -t nargis-api-py:local --build-arg BUILD_ML=0 ./apps/api-py
```

- To build an ML-enabled image (requires large disk space and is slow; prefer remote builders or a dedicated GPU host):

```pwsh
docker build -t nargis-api-py:ml --build-arg BUILD_ML=1 ./apps/api-py
```

- If your local Docker daemon is limited or unavailable, use Fly remote build or CI to build images:

```pwsh
flyctl deploy --remote-only -a <app-name>
```

- For self-hosted ML, consider running `apps/ml-worker` which isolates heavy model dependencies from the lightweight API.

