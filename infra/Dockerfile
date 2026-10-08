FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global pnpm@11.19.0

WORKDIR /app
COPY . .
ARG NEXT_PUBLIC_API_ORIGIN
RUN test -n "$NEXT_PUBLIC_API_ORIGIN"
ENV NEXT_PUBLIC_API_ORIGIN=$NEXT_PUBLIC_API_ORIGIN
RUN pnpm install --frozen-lockfile \
  && pnpm db:generate \
  && pnpm build

ENV NODE_ENV=production
USER node
EXPOSE 3000 4000
