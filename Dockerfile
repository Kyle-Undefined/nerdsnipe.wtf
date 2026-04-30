FROM oven/bun:1 AS builder

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-slim

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/public ./public
COPY --from=builder /app/index.html .

# episode cache and SQLite live in a volume so they survive container updates
VOLUME ["/app/data"]

EXPOSE 42069

ENV NODE_ENV=production

CMD ["bun", "src/server/index.ts"]
