# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps
RUN npm install -g bun
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ---- Stage 2: Build Next.js ----
FROM node:20-alpine AS builder
RUN npm install -g bun
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ---- Stage 3: Production runtime ----
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"

# Install arduino-cli dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates bash \
    && rm -rf /var/lib/apt/lists/*

# Install arduino-cli
RUN curl -fsSL https://downloads.arduino.cc/arduino-cli/arduino-cli_1.4.1_Linux_64bit.tar.gz \
    -o /tmp/arduino-cli.tar.gz \
    && tar -xzf /tmp/arduino-cli.tar.gz -C /usr/local/bin \
    && chmod +x /usr/local/bin/arduino-cli \
    && rm /tmp/arduino-cli.tar.gz

# Configure Arduino CLI and install AVR core (as root, then chown)
ENV ARDUINO_DIRECTORIES_DATA=/app/.arduino15
ENV ARDUINO_BUILD_CACHE_PATH=/app/.arduino15/build_cache

RUN mkdir -p /app/.arduino15 /app/.arduino15/build_cache /app/.cache

RUN arduino-cli config init \
    && arduino-cli core update-index \
    && arduino-cli core install arduino:avr \
    && rm -rf /app/.arduino15/staging

# Create non-root user with home at /app
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs --home /app nextjs \
    && chown -R nextjs:nodejs /app/.arduino15 /app/.cache

# Install bun for compile-service
RUN npm install -g bun

# Copy standalone Next.js output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy compile-service (mini-service)
RUN mkdir -p /app/mini-services/compile-service
COPY --from=builder --chown=nextjs:nodejs mini-services/compile-service/ /app/mini-services/compile-service/

# Install compile-service dependencies
RUN cd /app/mini-services/compile-service && bun install --frozen-lockfile || bun install

# Ensure public dir exists
RUN mkdir -p /app/public && chown nextjs:nodejs /app/public

USER nextjs

EXPOSE 10000

# Start both compile-service and Next.js server
CMD ["sh", "-c", "cd /app/mini-services/compile-service && bun run index.ts & cd /app && node server.js"]
