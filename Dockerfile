# Loja Breck Imports no servidor próprio (VPS). Build em duas etapas; a imagem final só tem
# o site pronto (dist/) e o servidor empacotado, sem código-fonte nem mapas de fonte.
FROM node:22-bookworm-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm run build:server && find dist -name "*.map" -delete

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8080 DIST_DIR=/app/dist
WORKDIR /app
COPY --from=build --chown=node:node /src/dist ./dist
COPY --from=build --chown=node:node /src/dist-server/server.mjs ./server.mjs
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.mjs"]
