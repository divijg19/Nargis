# Fly.io deployment guide for Nargis

This folder contains guidance and example configuration to deploy the `api-py` and `api-go` services to Fly.io.

Prerequisites
- Install `flyctl` (https://fly.io/docs/getting-started/installing/)
- Docker (for local builds) or let Fly build from source
- A Fly account (free tier available)

Quick deploy (per service)

1. Login

```bash
flyctl auth login
```

2. Create or choose an app name and deploy from the service directory

```bash
cd apps/api-py
flyctl launch --name nargis-api-py --region iad --no-deploy
flyctl secrets set OPENAI_API_KEY="${OPENAI_API_KEY}" ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY}"
flyctl deploy

cd ../api-go
flyctl launch --name nargis-api-go --region iad --no-deploy
flyctl deploy
```

Notes
- Use `flyctl secrets set KEY=VALUE` to avoid putting secrets in `fly.toml`.
- Fly will build Docker images automatically if no `image` is present in `fly.toml`.
- After deploy, set your frontend `NEXT_PUBLIC_API_PY_URL` to `https://<your-app>.fly.dev` and `NEXT_PUBLIC_WS_URL` to `wss://<your-go-app>.fly.dev/ws`.
