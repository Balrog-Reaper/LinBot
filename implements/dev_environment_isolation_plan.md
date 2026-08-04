# LinBot 開發環境隔離計劃

## 現況分析

在討論「如何建立隔離環境」之前，先釐清您目前的環境狀態：

| 項目 | 目前狀態 | 問題 |
|------|---------|------|
| Node.js | v22.20.0，安裝於 `C:\Js-node\` | ⚠️ 全域安裝，無版本管理工具 |
| npm | v10.9.3 | ✅ 正常 |
| 版本管理器 | 未安裝 nvm / fnm | ❌ 無法為不同專案切換 Node 版本 |
| 套件隔離 | `node_modules/` 已是專案本地 | ✅ npm 預設已是專案級隔離 |
| `.npmrc` | 不存在 | ⚠️ 無專案級 npm 設定 |
| Docker | 已有 `Dockerfile` + `docker-compose.yml` | ⚠️ 開發/生產未分離 |

---

## Node.js 的「隔離」vs Python 的 `venv`

> [!NOTE]
> **核心觀念差異：Node.js 與 Python 的套件管理邏輯完全不同。**

| 面向 | Python | Node.js |
|------|--------|---------|
| **套件安裝位置** | 預設全域（需 `venv` 隔離） | **預設就是專案本地**（`node_modules/`） |
| **虛擬環境** | `venv` / `conda` / `virtualenv` | ❌ **不需要**（npm 天生就是專案級） |
| **真正需要隔離的** | Python 直譯器版本 + 套件 | **只有 Node.js 引擎版本** |

換句話說：**您的 `npm install` 早就把套件裝在專案資料夾裡了，不會汙染其他專案。**

但目前缺少的是：
1. **Node.js 引擎版本**沒有鎖定 → 換台電腦或協作時可能跑不同版本
2. **開發依賴（devDependencies）**與生產依賴未分離 → 生產環境可能裝了不需要的套件
3. **Docker 映像**未區分開發與生產模式

---

## 計劃：三層隔離架構

```
┌─────────────────────────────────────────────────┐
│  第一層：Node.js 引擎版本鎖定（fnm + .node-version）  │
│  → 確保所有環境使用同一版本的 Node.js              │
├─────────────────────────────────────────────────┤
│  第二層：套件依賴隔離（npm + .npmrc）               │
│  → 開發 vs 生產依賴分離，鎖定精確版本              │
├─────────────────────────────────────────────────┤
│  第三層：執行環境隔離（Docker multi-stage）         │
│  → 開發容器 vs 生產容器完全獨立                   │
└─────────────────────────────────────────────────┘
```

---

## 第一層：Node.js 版本管理（fnm）

### 為什麼選 fnm？

| 工具 | 平台 | 速度 | Windows 支援 |
|------|------|------|-------------|
| nvm-windows | Windows only | 普通 | ✅ 原生 |
| **fnm** | 跨平台 | ⚡ 極快（Rust 編寫） | ✅ 原生 |
| volta | 跨平台 | 快 | ✅ |

**推薦 `fnm`**：跨平台、極快、Windows 原生支援，且能自動偵測 `.node-version` 檔案。

### 步驟

#### 1. 安裝 fnm

```powershell
# 透過 winget 安裝（Windows 內建套件管理器）
winget install Schniz.fnm
```

安裝完成後**重新開啟終端機**，然後設定自動啟用：

```powershell
# 將 fnm 環境設定加入 PowerShell 設定檔（一次性操作）
# 這樣每次開啟終端機都會自動載入 fnm
notepad $PROFILE
```

在開啟的 `$PROFILE` 檔案末尾加入：

```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
```

> [!TIP]
> `--use-on-cd` 選項會在您 `cd` 進入專案目錄時，自動切換到該專案指定的 Node 版本。

#### 2. 安裝並鎖定 Node.js 版本

```powershell
# 安裝 Node.js 22（與目前相同的大版本）
fnm install 22

# 設定為此專案的預設版本
fnm use 22
```

#### 3. 建立版本鎖定檔

在專案根目錄建立 `.node-version` 檔案：

```
22
```

> [!IMPORTANT]
> 這個檔案的作用：當任何協作者（或您自己換電腦）`cd` 進入此專案目錄時，fnm 會**自動切換到 Node.js 22**。
> 
> Docker 容器內不需要 fnm，因為 Dockerfile 已經透過 `FROM node:22-alpine` 鎖定版本。

---

## 第二層：套件依賴隔離

### 2.1 分離 `dependencies` vs `devDependencies`

目前 [package.json](file:///c:/NKNU/Project/Barlog%20Family%20Discord%20Server/DiscordBot/LinBot/package.json) 的所有套件都放在 `dependencies`，沒有 `devDependencies`。這代表生產環境也會安裝開發工具。

#### 修改後的 `package.json`：

```diff
 {
   "name": "discordbot",
   "version": "1.0.0",
   "main": "index.js",
+  "engines": {
+    "node": ">=22.0.0"
+  },
   "scripts": {
-    "test": "echo \"Error: no test specified\" && exit 1"
+    "dev": "npx nodemon -L index.js",
+    "start": "node index.js",
+    "test": "vitest run",
+    "test:watch": "vitest",
+    "test:coverage": "vitest run --coverage"
   },
   "type": "module",
   "dependencies": {
     "@agendajs/mongo-backend": "^4.0.1",
     "@google/genai": "^1.47.0",
     "agenda": "^6.2.4",
     "discord.js": "^14.25.1",
     "dotenv": "^17.3.1",
     "mongodb": "^7.1.1",
     "node-fetch": "^3.3.2",
     "ollama": "^0.6.3"
-  }
+  },
+  "devDependencies": {
+    "nodemon": "^3.1.0",
+    "vitest": "^3.2.0",
+    "mongodb-memory-server": "^10.0.0"
+  }
 }
```

> [!NOTE]
> **`dependencies`**：機器人運行必須的套件（Discord.js、MongoDB、LLM SDK 等）
> 
> **`devDependencies`**：只有開發/測試時才需要的套件（Vitest、nodemon、mongodb-memory-server）
> 
> 在生產環境中執行 `npm install --omit=dev` 就會**跳過所有 devDependencies**。

### 2.2 建立 `.npmrc`（專案級 npm 設定）

在專案根目錄建立 `.npmrc`：

```ini
# ═══════════════════════════════════════════
# LinBot 專案級 npm 設定
# ═══════════════════════════════════════════

# 鎖定精確版本（安裝時不加 ^ 或 ~）
# 避免不同開發者因為版本範圍差異導致「我的電腦可以跑」的問題
save-exact=true

# 指定 Node.js 引擎版本限制（配合 package.json 的 engines 欄位）
engine-strict=true
```

> [!TIP]
> **`save-exact=true`** 的效果：
> - 之前：`npm install vitest` → `"vitest": "^3.2.0"`（允許安裝 3.2.x ~ 3.x.x）
> - 之後：`npm install vitest` → `"vitest": "3.2.0"`（精確鎖定 3.2.0）
> 
> 這能確保團隊所有人使用完全一致的版本。

### 2.3 更新 `.gitignore`

確認 `.gitignore` 包含以下項目：

```gitignore
# 依賴目錄（每個人自己 npm install，不進版控）
node_modules/

# 環境變數（含 API Key，絕不上傳）
.env

# 測試覆蓋率報告
coverage/
```

---

## 第三層：Docker 開發/生產分離

### 3.1 多階段 Dockerfile（Multi-Stage Build）

將現有的 [Dockerfile](file:///c:/NKNU/Project/Barlog%20Family%20Discord%20Server/DiscordBot/LinBot/Dockerfile) 改為多階段建構：

```dockerfile
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
```

### 3.2 更新 `docker-compose.yml`

```yaml
services:
  # ─────────────────────────────────
  # 開發環境容器
  # ─────────────────────────────────
  bot:
    build:
      context: .
      target: development          # ← 指定使用開發階段
    container_name: lin-bot
    restart: always
    env_file: .env
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://db:27017/lin-bot
    command: npx nodemon -L index.js
    volumes:
      - .:/usr/src/app
      - lin_bot_node_modules:/usr/src/app/node_modules
    depends_on:
      - db

  # ─────────────────────────────────
  # MongoDB
  # ─────────────────────────────────
  db:
    image: mongo:8.0
    container_name: lin-bot-db
    restart: always
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongo_data:
  lin_bot_node_modules:
```

> [!NOTE]
> 未來正式部署時，只需將 `target: development` 改為 `target: production`，Docker 就會自動建構不含開發工具的精簡映像。

---

## 變更檔案總覽

| 動作 | 檔案 | 說明 |
|------|------|------|
| **[NEW]** | `.node-version` | 鎖定 Node.js 22 |
| **[NEW]** | `.npmrc` | 專案級 npm 設定（精確版本、引擎限制） |
| **[MODIFY]** | `package.json` | 分離 devDependencies、新增 engines 與 scripts |
| **[MODIFY]** | `.gitignore` | 確認排除 `coverage/` |
| **[MODIFY]** | `Dockerfile` | 多階段建構（開發 / 生產分離） |
| **[MODIFY]** | `docker-compose.yml` | 指定 `target: development` |

---

## 執行順序

```
步驟 1：安裝 fnm（Node.js 版本管理器）
   ↓
步驟 2：建立 .node-version 檔案
   ↓
步驟 3：修改 package.json（分離 devDependencies）
   ↓
步驟 4：建立 .npmrc
   ↓
步驟 5：重新 npm install
   ↓
步驟 6：更新 Dockerfile（多階段建構）
   ↓
步驟 7：更新 docker-compose.yml
   ↓
步驟 8：驗證（docker-compose up --build）
```

---

## 驗證方法

```powershell
# 1. 確認 fnm 自動切換版本
cd LinBot
node --version    # 應顯示 v22.x.x

# 2. 確認 devDependencies 分離正確
npm ls --prod     # 只列出生產依賴
npm ls --dev      # 只列出開發依賴

# 3. 確認 Docker 開發環境正常
docker-compose up --build

# 4. 確認 Docker 生產映像不含開發工具
docker build --target production -t lin-bot:prod .
docker run --rm lin-bot:prod npx vitest --version   # 應該找不到 vitest
```
