# --- Stage 1: Prune the workspace (Optional but recommended for monorepos) ---
# Since we don't have turbo in the base image easily, we'll skip the prune step 
# and just copy everything. Ideally, you'd use turbo prune.

# --- Stage 2: Build the application ---
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy the root configuration files
COPY package.json bun.lock turbo.json biome.json ./

# Copy workspace configuration and dependencies
# We copy the packages directory to ensure any local workspace packages are available
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the Next.js application
# We use the filter to only build the web app
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build --filter=@nargis/web

# --- Stage 3: Production Runtime ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone build
# The standalone build is located at apps/web/.next/standalone
# It includes the necessary node_modules and server.js

# Copy public folder
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy the standalone output
# Note: The standalone output preserves the folder structure (apps/web/...)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The standalone server is at apps/web/server.js inside the container root
CMD ["node", "apps/web/server.js"]
