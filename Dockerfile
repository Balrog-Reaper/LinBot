# ════════════════════════════════════════════
# 階段 1：共用基礎層 (Node.js 22)
# ════════════════════════════════════════════
FROM node:22-alpine AS base
WORKDIR /usr/src/app
COPY package*.json tsconfig.json ./


# ════════════════════════════════════════════
# 階段 2：開發環境 (使用 tsx watch + devDependencies)
# ════════════════════════════════════════════
FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
RUN chown -R node:node /usr/src/app
USER node
CMD ["npx", "tsx", "watch", "src/index.ts"]


# ════════════════════════════════════════════
# 階段 3：編譯層 (tsc 編譯 TypeScript → JavaScript)
# ════════════════════════════════════════════
FROM base AS builder
RUN npm install
COPY src/ ./src/
RUN npx tsc


# ════════════════════════════════════════════
# 階段 4：生產環境 (僅 dependencies + 編譯產物)
# ════════════════════════════════════════════
FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /usr/src/app/dist ./dist
RUN chown -R node:node /usr/src/app
USER node
CMD ["node", "dist/index.js"]
