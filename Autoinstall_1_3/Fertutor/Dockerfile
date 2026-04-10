# Build SPA then run Express (single port: API + static + SPA fallback)
FROM node:20-bookworm-slim AS client-build
WORKDIR /app/client
COPY app/client/package*.json ./
RUN npm ci
COPY app/client/ ./
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app/server
COPY app/server/package*.json ./
RUN npm ci --omit=dev
COPY app/server/ ./
COPY --from=client-build /app/client/dist /app/client/dist
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
EXPOSE 8080
CMD ["node", "server.js"]
