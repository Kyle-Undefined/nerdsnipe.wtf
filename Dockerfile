FROM oven/bun:1 AS builder

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-slim

WORKDIR /app

COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/public ./public
COPY --from=builder /app/index.html .
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules

# episode cache and SQLite live in a volume so they survive container updates
VOLUME ["/app/data"]

EXPOSE 3000

ENV NODE_ENV=production

CMD ["bun", "src/server/index.ts"]
