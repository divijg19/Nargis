This infra folder contains helper configs for local development and deployment.

Local development (Docker required):

# From repo root
cd infra
docker-compose up --build

This will build and run:
- api-py (FastAPI) on port 8000
- api-go (WebSocket) on port 8080
- postgres on 5432
- redis on 6379
- optional web dev server on 3000

For Fly.io deployment:
- Install flyctl and login
- Copy `infra/fly/.env.example` to `.env` and set your secrets
- Run `infra/fly/deploy.ps1` (PowerShell) or use `flyctl` manually

Notes:
- By default api-py is built without heavy ML deps. To build with ML support, set build arg BUILD_ML=1 when building the image.
- Use managed inference providers (OpenAI, Deepgram, ElevenLabs) for a low-cost, always-on demo.
