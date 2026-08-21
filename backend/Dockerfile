# Multi-Stage Production Dockerfile for Cadence API
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
COPY tsconfig.json ./
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

USER nodejs

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
CMD ["dumb-init", "--", "node", "dist/server.js"]
