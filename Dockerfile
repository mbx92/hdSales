# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM dependencies AS builder
ARG BUILD_NODE_OPTIONS=--max-old-space-size=512
ENV NODE_OPTIONS=${BUILD_NODE_OPTIONS}
COPY . .
RUN npx prisma generate
RUN npm run build

# Prisma CLI is a runtime dependency because migrations run when the
# application container starts. Remove every other development dependency.
FROM builder AS production-dependencies
RUN npm prune --omit=dev

FROM base AS app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.output ./.output
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --chown=node:node package.json package-lock.json ./

USER node
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && exec node .output/server/index.mjs"]
