# 使用官方 Node.js 20 輕量 Alpine 映像檔
FROM node:20-alpine AS base

# 設定環境變數為開發模式
ENV NODE_ENV=development

# 建立工作目錄
WORKDIR /usr/src/app

# 先複製 package*.json 用於快取依賴安裝
COPY package*.json ./

# 安裝所有依賴套件（包含開發用的套件）
RUN npm install

# 複製其餘的專案檔案
COPY . .

# 將工作目錄的所有權賦予非 Root 使用者 "node"
RUN chown -R node:node /usr/src/app

# 切換為安全非 Root 使用者
USER node

# 啟動應用程式
CMD ["node", "index.js"]
