# Production Deployment Guide

This guide covers deploying Nargis to production with PostgreSQL database and secure configuration.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Backend Deployment (Fly.io)](#backend-deployment-flyio)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

- GitHub account with your Nargis repository
- Fly.io account (backend + database)
- Vercel account (frontend)
- Domain name (optional but recommended)

## Backend Deployment (Fly.io)

### 1. Install Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Verify installation
fly version
```

### 2. Login to Fly.io

```bash
fly auth login
```

### 3. Create PostgreSQL Database

```bash
# Create database (choose region close to your users)
fly postgres create --name nargis-db --region sjc

# Note the connection details - you'll need these
# DATABASE_URL will be automatically set when you attach it
```

### 4. Create Dockerfile for Backend

Create `apps/api-py/Dockerfile`:

```dockerfile
FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
  postgresql-client \
  gcc \
  python3-dev \
  && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv sync
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Run database migrations and start server
CMD ["uv", "run", "sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8080"]
```

### 5. Create fly.toml Configuration

Create `apps/api-py/fly.toml`:

```toml
app = "nargis-api"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[env]
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[deploy]
  release_command = "alembic upgrade head"
```

### 6. Deploy Backend to Fly.io

```bash
# Navigate to backend directory
cd apps/api-py

# Launch app (this creates the app)
fly launch --name nargis-api --region sjc --no-deploy

# Attach PostgreSQL database (sets DATABASE_URL automatically)
fly postgres attach nargis-db

# Set environment variables (REQUIRED)
fly secrets set JWT_SECRET_KEY="$(openssl rand -hex 32)"
fly secrets set ALLOWED_ORIGINS="https://your-domain.com,https://nargis.vercel.app"

# Set API keys (if you have them)
fly secrets set DEEPGRAM_API_KEY="your-deepgram-key"
fly secrets set GROQ_API_KEY="your-groq-key"

# Deploy!
fly deploy

# Check status
fly status

# View logs
fly logs

# Open in browser
fly open
```

### 7. Get Backend URL

```bash
fly apps list
# Your backend URL will be: https://nargis-api.fly.dev
```

## Frontend Deployment (Vercel)

### 1. Install Vercel CLI (optional)

```bash
npm install -g vercel
```

### 2. Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: **apps/web**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   
5. Set Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://nargis-api.fly.dev
   ```

6. Click "Deploy"

### 3. Alternative: Deploy via CLI

```bash
cd apps/web

# Login
vercel login

# Deploy
vercel --prod

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://nargis-api.fly.dev
```

## Database Setup

### Run Migrations

Your migrations will run automatically on deployment via the `release_command` in fly.toml.

To manually run migrations:

```bash
# SSH into Fly.io machine
fly ssh console

# Run migrations
alembic upgrade head

# Exit
exit
```

### Verify Database

```bash
# Connect to database
fly postgres connect -a nargis-db

# Check tables
\dt

# Check users table
SELECT * FROM users;

# Exit
\q
```

## Environment Variables

### Backend (Fly.io)

```bash
# Required
fly secrets set JWT_SECRET_KEY="your-secret-key-min-32-chars"
fly secrets set ALLOWED_ORIGINS="https://your-domain.com"

# Optional (for AI features)
fly secrets set DEEPGRAM_API_KEY="your-deepgram-api-key"
fly secrets set GROQ_API_KEY="your-groq-api-key"

# Database URL is auto-set by `fly postgres attach`
```

### Frontend (Vercel)

```bash
# Required
NEXT_PUBLIC_API_URL=https://nargis-api.fly.dev

# Or set via Vercel dashboard:
# Settings > Environment Variables > Add
```

## Post-Deployment

### 1. Test Backend API

```bash
# Health check
curl https://nargis-api.fly.dev/

# Register user
curl -X POST https://nargis-api.fly.dev/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST https://nargis-api.fly.dev/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Test Frontend

1. Visit your Vercel URL
2. Click "Sign Up" in navbar
3. Create account
4. Verify you can create tasks/habits/goals
5. Test voice features (if API keys configured)

### 3. Configure CORS

Update backend ALLOWED_ORIGINS:

```bash
fly secrets set ALLOWED_ORIGINS="https://nargis.vercel.app,https://your-custom-domain.com"
```

### 4. Custom Domain (Optional)

**For Frontend (Vercel):**
1. Go to Project Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed

**For Backend (Fly.io):**
```bash
fly certs add api.your-domain.com
# Update DNS: CNAME api -> nargis-api.fly.dev
```

## Monitoring & Maintenance

### View Logs

```bash
# Backend logs
fly logs -a nargis-api

# Follow logs in real-time
fly logs -a nargis-api -f

# Database logs
fly logs -a nargis-db
```

### Scale Application

```bash
# Scale backend (increase instances)
fly scale count 2 -a nargis-api

# Scale machine resources
fly scale vm shared-cpu-1x -a nargis-api
fly scale memory 512 -a nargis-api
```

### Database Backups

```bash
# Fly.io automatically backs up Postgres daily
# To create manual snapshot:
fly postgres backup create -a nargis-db

# List backups
fly postgres backup list -a nargis-db
```

### Update Deployment

```bash
# Backend updates
cd apps/api-py
fly deploy

# Frontend updates (auto-deploys on git push if connected to GitHub)
# Or manually:
cd apps/web
vercel --prod
```

### Database Migrations

When you add new models or change existing ones:

```bash
# Locally
cd apps/api-py
alembic revision --autogenerate -m "Add new feature"
alembic upgrade head

# Commit and push migration file
git add migrations/versions/*.py
git commit -m "Add database migration"
git push

# Deploy (migration runs automatically via release_command)
fly deploy
```

## Security Checklist

- [ ] JWT_SECRET_KEY is strong (32+ characters)
- [ ] ALLOWED_ORIGINS includes only your domains
- [ ] Database has strong password
- [ ] API keys are stored as secrets (not in code)
- [ ] HTTPS is enforced (force_https = true)
- [ ] Environment variables are set correctly
- [ ] Database backups are enabled
- [ ] Rate limiting configured (if needed)

## Cost Estimates

### Fly.io (Backend + Database)
- **Postgres (1GB RAM):** ~$2/month
- **App (shared-cpu-1x, 256MB):** ~$2/month
- **Total:** ~$4/month (scales with usage)

### Vercel (Frontend)
- **Hobby Plan:** Free
- **Pro Plan:** $20/month (if you need more)

### API Costs (Optional)
- **Deepgram STT:** Pay-as-you-go (~$0.0043/min)
- **Groq LLM:** Free tier available

## Troubleshooting

### Backend won't start

```bash
# Check logs
fly logs -a nargis-api

# Check secrets
fly secrets list -a nargis-api

# Restart app
fly apps restart nargis-api
```

### Database connection fails

```bash
# Check database status
fly status -a nargis-db

# Verify attachment
fly postgres attach nargis-db -a nargis-api

# Check DATABASE_URL
fly ssh console -a nargis-api
echo $DATABASE_URL
```

### CORS errors

```bash
# Update ALLOWED_ORIGINS
fly secrets set ALLOWED_ORIGINS="https://your-domain.com,https://nargis.vercel.app"
```

### Migration fails

```bash
# SSH into machine
fly ssh console -a nargis-api

# Check current migration
alembic current

# Try migration manually
alembic upgrade head

# Check for errors
cat /app/migrations/versions/*.py
```

## Support

- **Fly.io Docs:** https://fly.io/docs
- **Vercel Docs:** https://vercel.com/docs
- **FastAPI Docs:** https://fastapi.tiangolo.com
- **Next.js Docs:** https://nextjs.org/docs

## Next Steps

After successful deployment:

1. Set up monitoring (Fly.io metrics dashboard)
2. Configure alerts for downtime
3. Set up staging environment
4. Implement CI/CD pipeline
5. Add rate limiting for API
6. Set up error tracking (Sentry)
7. Monitor database performance
8. Optimize query performance

---

**Congratulations! 🎉 Your Nargis app is now live in production!**
