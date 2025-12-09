# @nargis/web

The Next.js 15 frontend for Nargis.

## Features
- **Real-time Updates**: Uses WebSocket via the Gateway service.
- **AI Integration**: Voice-to-text and intelligent task management.
- **Modern Stack**: Next.js 15, Tailwind CSS, Biome, Vitest.

## Getting Started

### Prerequisites
- Node.js 20+ or Bun 1.2+
- Backend services running (API + Gateway)

### Installation

```bash
cd apps/web
bun install
```

### Configuration
Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Ensure `NEXT_PUBLIC_API_PY_URL` points to your Gateway or API (e.g., `http://localhost:8000` or `http://localhost:8080`).

### Development

```bash
bun dev
```

## Testing

```bash
bun test:unit        # Run unit tests
bun test:e2e         # Run Playwright tests
```

## Linting & Formatting

We use [Biome](https://biomejs.dev/) for fast linting and formatting.

```bash
bun lint
bun format
```
