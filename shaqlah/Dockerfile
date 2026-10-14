# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL is only read at runtime; pages are rendered on demand.
RUN npm run build

# One-off tooling image (migrations, seeding): docker compose run --rm tools
FROM builder AS tools
ENV NODE_ENV=production
CMD ["npm", "run", "db:setup"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/data/uploads
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data/uploads && chown -R app:app /data
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
USER app
EXPOSE 3000
VOLUME ["/data/uploads"]
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/manifest.webmanifest >/dev/null || exit 1
CMD ["node", "server.js"]
