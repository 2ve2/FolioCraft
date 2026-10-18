FROM oven/bun:1.4.2 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/portfolio/package.json packages/portfolio/package.json
RUN bun install --frozen-lockfile --production --filter @ichnara/api
FROM oven/bun:1.4.2
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=dependencies /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api
USER bun
WORKDIR /app/apps/api
ENV NODE_ENV=production HOST=0.0.0.0
EXPOSE 4000
CMD ["bun", "src/server.ts"]
