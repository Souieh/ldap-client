FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .

# 1. Install ALL dependencies (including devDeps so we can build)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# 2. Build the application
RUN pnpm run build

FROM base AS prod
WORKDIR /app
ENV NODE_ENV=production 

# 3. Next.js standalone mode moves the server to .next/standalone
# We copy these into the WORKDIR (/app)
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000

# server.js is created automatically by Next.js in standalone mode
CMD ["node", "server.js", "-H", "0.0.0.0", "-p", "3000"]