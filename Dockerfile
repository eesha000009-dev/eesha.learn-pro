# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps
RUN npm install -g bun
WORKDIR /app
COPY package.json bun.lock* ./
# Install production deps only in final stage, install all here for build
RUN bun install --frozen-lockfile

# ---- Stage 2: Build Next.js ----
FROM node:20-alpine AS builder
RUN npm install -g bun
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects anonymous telemetry — disable it
ENV NEXT_TELEMETRY_DISABLED=1

# Build with Node.js (standalone output)
RUN bun run build

# ---- Stage 3: Production runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Ensure public dir exists (empty if missing)
RUN mkdir -p /app/public

USER nextjs

EXPOSE 10000

CMD ["node", "server.js"]
