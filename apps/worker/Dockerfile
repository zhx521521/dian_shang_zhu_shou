FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm ci
COPY apps/worker apps/worker
COPY packages packages
RUN npm run db:generate && npm run build -w @eoa/contracts && npm run build -w @eoa/database && npm run build -w @eoa/worker

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/packages ./packages
CMD ["node", "apps/worker/dist/index.js"]
