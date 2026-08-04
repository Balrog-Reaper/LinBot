# ════════════════════════════════════════════
# 階段 1：共用基礎層
# ════════════════════════════════════════════
FROM node:22-alpine AS base

WORKDIR /usr/src/app

# 複製 package*.json 用於快取依賴安裝
COPY package*.json ./


# ════════════════════════════════════════════
# 階段 2：開發環境（含 devDependencies）
# ════════════════════════════════════════════
FROM base AS development

ENV NODE_ENV=development

# 安裝所有依賴（含 devDependencies：Vitest、nodemon 等）
RUN npm install

COPY . .

RUN chown -R node:node /usr/src/app
USER node

# 開發模式：使用 nodemon 自動重啟
CMD ["npx", "nodemon", "-L", "index.js"]


# ════════════════════════════════════════════
# 階段 3：生產環境（僅 dependencies）
# ════════════════════════════════════════════
FROM base AS production

ENV NODE_ENV=production

# 僅安裝生產依賴（跳過 Vitest、nodemon 等）
RUN npm install --omit=dev

COPY . .

RUN chown -R node:node /usr/src/app
USER node

# 生產模式：直接用 node 啟動
CMD ["node", "index.js"]

