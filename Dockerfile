FROM node:20-alpine AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time defaults only. Always override with real env in runtime.
ENV NODE_ENV=production \
    NEXT_PUBLIC_APP_NAME=AI3 \
    NEXT_PUBLIC_APP_URL=http://localhost:3000 \
    DATABASE_URL=postgresql://ai3:ai3_dev_password@db:5432/ai3_db \
    AUTH_SECRET=build-auth-secret-change-in-runtime \
    CREDENTIALS_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup -S nodejs -g 1001 \
    && adduser -S nextjs -u 1001 -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

CMD ["node", "server.js"]

