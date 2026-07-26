# 🛠️ 實作計畫：`>help` 指令與多功能查詢系統

> **目標**：實作一個 `>help` 指令。
> 1. 無參數時：開啟多分頁的「動態多頁面互動式表單」查詢可用指令。
> 2. 原定參數子系統（例如 `>help userData`）已在後續重構中，獨立為單獨的指令 `>userInfo @某人` 以方便維護。

---

## 📅 開發步驟分解

### Step 1: 匯出所有散落的 `description` (前置作業)
為了讓 `help` 能夠一次抓到所有指令的說明，我們需要把原本宣告的常數 `export` 出來。
- [ ] 編輯 `commands/Lin.js`，將宣告改為 `export const description_Lin = ...`
- [ ] 編輯 `commands/restart.js`，將宣告改為 `export const description_restart = ...`
- [ ] 編輯 `commands/gif.js`，將宣告改為 `export const description_gif = ...`

---

### Step 2: 處理訊息分派邏輯 (`commands.js`)
讓主程式知道有 `help` 這個新指令可以使用。
- [ ] 引入 `help` 指令：加上 `import { help } from "./commands/help.js";`
- [ ] 在 `switch (command)` 中加上 `case "help":` 分支（或在 `if` 判斷裡加上 `if (command === "help")`）。
- [ ] 將 `msg` 和切割好的參數陣列 `args` 傳遞進去：`await help(msg, args);`

---

### Step 3: 建立核心指令檔案 (`commands/help.js`)
這個檔案負責判斷「使用者到底想查什麼」。
- [ ] 建立 `commands/help.js` 新檔案。
- [ ] `import` 前面步驟匯出的所有 `description_xxx` 變數。
- [ ] 實作基本的 `args` 長度判斷：
  - 如果 `args.length === 0`，代表使用者單純輸入 `@Lin !help`，這時要把所有的 `description_xxx` 組合起來並用 `msg.reply()` 傳送。
  - **進階技巧**：如果想讓回覆漂亮一點，可以使用 **`EmbedBuilder`** (Discord 的漂亮排版卡片)。

---

### Step 4: 實作子系統查詢 - `userData`
這是 `!help` 有附帶參數 `args` 的進階功能。
- [ ] 在 `help.js` 中判斷 `if (args[0] === "userData")`。
- [ ] 驗證是否有 `args[1]` (被標記的人)：
  - 可以透過 `msg.mentions.users.first()` 直接獲取被標記的使用者物件 `user`。
  - 也可透過 `msg.guild.members.cache.get(user.id)` 獲取更能反映伺服器狀態的 `member` 物件。
- [ ] 收集要顯示的資料：
  - 帳號名稱：`user.username` 或 `user.tag`
  - 伺服器暱稱：`member.nickname`
  - 加入伺服器時間：`member.joinedAt`
  - 帳號建立時間：`user.createdAt`
  - 大頭貼網址：`user.displayAvatarURL()`
- [ ] 把這些資料組合起來，回應給使用者。

---

## 📝 輔助程式碼參考

### 判斷邏輯範本 (`commands/help.js`)
```javascript
export async function help(msg, args) {
    if (args.length === 0) {
        // ... 處理空參數的總表查詢
        msg.reply("這是一份指令清單..."); 
        return;
    }

    const subCommand = args[0];

    if (subCommand === "userData") {
        // ... 處理 userData 查詢
        const targetUser = msg.mentions.users.first();
        if (!targetUser) {
            msg.reply("主人，請標註想要查詢的使用者喔 🦊");
            return;
        }
        // 列印出成員資訊...
        return;
    }

    msg.reply("主人... Lin 不懂這是什麼意思呢 🦊\\n請直接輸入 \`!help\` 查看可用清單。");
}
```

### 組合字串範本
```javascript
import { description_Lin } from "./Lin.js";
import { description_restart } from "./restart.js";
import { description_gif } from "./gif.js";

const allDescriptions = [
    "主人，這是目前 Lin 能為您做的事情：",
    description_Lin,
    description_restart,
    description_gif
].join("\\n");
```
