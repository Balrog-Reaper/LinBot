# Discord 機器人專案 - Docker 容器化安全引進計畫

本文件說明如何安全地為本專案引進 `Dockerfile` 與相關配置，以便於後續容器化部署。同時確保符合安全性最佳實踐（如：不使用 Root 權限運行、防止敏感環境變數打包進 Image、縮減 Image 體積、使用 `.dockerignore` 避免外洩機密）。

## 🛡️ 安全性設計原則

1. **Non-Root 運作 (安全最小特權原則)**：
   - 官方的 Node.js 映像檔內部預設了 `node` 使用者（UID 1000）。我們在執行時期切換為 `USER node`，以避免容器被攻破時，攻擊者取得 Host 端的 Root 權限。
2. **敏感檔案隔離**：
   - 透過 `.dockerignore` 排除 `.env` 等敏感檔案，防止開發環境的私鑰或 Token 被打包到 Image 中。
   - 所有機密資訊（例如 `BOTTOKEN`、`MONGODB_URI`、AI API Key 等）將改由容器啟動時的環境變數傳入。
3. **安全基礎映像檔與版本鎖定**：
   - 使用官方的 `node:20-alpine`，Alpine 版本體積小、漏洞少，且有固定的主版本號，能避免因映像檔自動升級而導致專案異常。
4. **安裝階段優化**：
   - 使用 `npm ci --only=production` 只安裝生產環境依賴，避免引入開發工具 (devDependencies)，從而減少攻擊面。

---

## 📂 檔案配置設計

### 1. Dockerfile
建立生產環境的 Docker 映像檔定義檔。

```dockerfile
# 使用官方 Node.js 20 輕量 Alpine 映像檔
FROM node:20-alpine AS base

# 設定環境變數
ENV NODE_ENV=production

# 建立工作目錄
WORKDIR /usr/src/app

# 先複製 package*.json 用於快取依賴安裝
COPY package*.json ./

# 安裝生產環境依賴 (排除 devDependencies)
# 使用 ci 指令確保依賴版本與 package-lock.json 完全一致
RUN npm ci --only=production

# 複製其餘的專案檔案
COPY . .

# 將工作目錄的所有權賦予非 Root 使用者 "node"
RUN chown -R node:node /usr/src/app

# 切換為安全非 Root 使用者
USER node

# 啟動應用程式
CMD ["node", "index.js"]
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
為了讓本地測試更方便，可建立 `docker-compose.yml`，同時配置機器人與 MongoDB 的安全網路連線。

```yaml
version: '3.8'

services:
  bot:
    build: .
    container_name: lin-bot
    restart: always
    environment:
      - BOTTOKEN=${BOTTOKEN}
      - MONGODB_URI=mongodb://db:27017/lin-bot
      # 如果有其他環境變數，可以在此傳遞
    depends_on:
      - db

  db:
    image: mongo:6-jammy
    container_name: lin-bot-db
    restart: always
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017" # 方便本地除錯，但可以不對外公開

volumes:
  mongo_data:
```

---

## 🚀 驗證與執行步驟

### A. 本地映像檔建置
```bash
docker build -t lin-bot .
```

### B. 本地 Compose 聯動測試
1. 確保同目錄下有 `.env` 檔案並填入 `BOTTOKEN`：
   ```env
   BOTTOKEN=your_discord_bot_token_here
   ```
2. 啟動容器群組：
   ```bash
   docker compose up -d
   ```
3. 檢查機器人運作日誌：
   ```bash
   docker compose logs bot
   ```
