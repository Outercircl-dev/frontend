# syntax=docker/dockerfile:1

########## Build stage ##########
FROM oven/bun:1-alpine AS build
WORKDIR /app

# Install dependencies with Bun (uses bun.lock for reproducibility)
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

# Copy source and build the Next.js app
COPY . .
RUN bun run build

########## Runtime stage ##########
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Install only production dependencies
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile --production

# Copy the built artifacts
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["bun", "run", "start", "--hostname", "0.0.0.0", "--port", "3000"]

