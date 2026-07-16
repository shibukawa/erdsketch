# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS frontend
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html postcss.config.js tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build:server

FROM golang:1.26-alpine AS backend
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY server ./server
COPY --from=frontend /src/server/webassets/dist ./server/webassets/dist
RUN CGO_ENABLED=0 go build -tags production -trimpath -ldflags="-s -w" -o /out/erdsketch ./server/cmd/erdsketch

FROM alpine:3.23
RUN addgroup -S erdsketch && adduser -S -G erdsketch erdsketch && mkdir -p /app/model/seeds /data/projects && chown -R erdsketch:erdsketch /app /data
WORKDIR /app
COPY --from=backend /out/erdsketch /usr/local/bin/erdsketch
COPY model/seeds ./model/seeds
USER erdsketch
ENV ERDSKETCH_ADDR=0.0.0.0:8080 \
    ERDSKETCH_MODEL_ROOT=/app/model/seeds \
    ERDSKETCH_PROJECT_ROOT=/data/projects
VOLUME ["/data/projects"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null || exit 1
ENTRYPOINT ["/usr/local/bin/erdsketch"]
