# Discord 機器人專案 - Docker 容器化安全引進計畫

本文件說明如何安全地為本專案引進 `Dockerfile` 與相關配置，以便於後續容器化部署。同時確保符合安全性最佳實踐（如：不使用 Root 權限運行、防止敏感環境變數打包進 Image、縮減 Image 體積、使用 `.dockerignore` 避免外洩機密）。

## 🛡️ 安全性設計原則

1. **Non-Root 運作 (安全最小特權原則)**：
   - 官方的 Node.js 映像檔內部預設了 `node` 使用者（UID 1000）。我們在執行時期切換為 `USER node`，以避免容器被攻破時，攻擊者取得 Host 端的 Root 權限。
2. **敏感檔案隔離**：
   - 透過 `.dockerignore` 排除 `.env` 等敏感檔案，防止開發環境的私鑰或 Token 被打包到 Image 中。
   - 所有機密資訊（例如 `BOTTOKEN`、`MONGODB_URI`、AI API Key 等）將改由容器啟動時的環境變數傳入。
3. **安全基礎映像檔與版本鎖定**：
   - 使用官方的 `node:22-alpine`，Alpine 版本體積小、漏洞少，且有固定的主版本號，能避免因映像檔自動升級而導致專案異常。
4. **多階段建置 (Multi-stage Build) 與安裝優化**：
   - 第一階段安裝所有依賴並使用 `tsc` 編譯 TypeScript 原始碼。
   - 最終階段使用 `npm install --omit=dev` 只安裝生產環境依賴，避免引入開發工具，並將編譯好的 JS 產物複製過來，從而大幅減少攻擊面與映像檔體積。

---

## 📂 檔案配置設計

### 1. Dockerfile
建立本地開發與生產環境的 Docker 映像檔定義檔。支援多階段建置 (Multi-stage Build)。

```dockerfile
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
```

### 2. .dockerignore
排除了本地的 `node_modules`、`.env`、`scratch/`、`.git/` 等不需要、或包含敏感資訊的檔案與資料夾。

```
# 排除本地依賴
node_modules/
npm-debug.log

# 排除環境變數與機密資訊
.env
.env.*
*.pem
*.key

# 排除 Git 歷史
.git/
.gitignore
.gitattributes

# 排除開發測試草稿
scratch/
documents/

# 排除 Dockerfile 本身與相關說明
Dockerfile
docker-compose.yml
README.md
```

### 3. docker-compose.yml (選用本地測試用)
為了讓本地測試更方便，可建立 `docker-compose.yml`，配置機器人與 MongoDB 的連線。透過指定 `target: development` 與 `tsx watch` 實作熱重載開發。

```yaml
services:
  bot:
    build:
      context: .
      target: development
    container_name: lin-bot
    env_file: .env
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://db:27017/lin-bot
    command: npx tsx watch src/index.ts
    volumes:
      - .:/usr/src/app
      - lin_bot_node_modules:/usr/src/app/node_modules
    depends_on:
      - db

  db:
    image: mongo:8.0
    container_name: lin-bot-db
    restart: always
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017" # 方便本地除錯，但可以不對外公開

volumes:
  mongo_data:
  lin_bot_node_modules:
```

---

## 🚀 驗證與執行步驟

### A. 本地映像檔建置
```bash
docker build -t lin-bot .
```

### B. 本地 Compose 聯動測試
1. 確保同目錄下有 `.env` 檔案並填入所有必要的環境變數。
2. 啟動容器群組：
   ```bash
   docker compose up -d --build
   ```
3. 檢查機器人運作日誌：
   ```bash
   docker compose logs -f bot
   ```

### C. 重建映像檔（程式碼更新後）
當修改了程式碼並需要重新部署時：
```bash
# 1. 停止並移除現有容器
docker compose down

# 2. 重新建置映像檔並啟動
docker compose up -d --build

# 3. 追蹤日誌確認啟動成功
docker compose logs -f bot
```

