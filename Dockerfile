# Use Bun official image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Build stage (copy source)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["sh", "-c", "bun run scripts/migrate.ts && bun run server.ts"]
