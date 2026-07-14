// ═══════════════════════════════════════════════════════════════
// 🦊 Level 3 練習：輪詢機制 (Polling)
// ═══════════════════════════════════════════════════════════════
//
// 📋 目標：
//   既然我們把任務存在 JSON 檔案裡，我們就需要一個「守衛」，
//   每隔一小段時間就去檢查一次檔案，看看有沒有任務「時間到了」。
//   這個定期檢查的動作，我們稱為「輪詢 (Polling)」。
//
// 🏃 執行方式：
//   node scratch/learn-03-polling.js
//
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
const DATA_FILE = './scratch/reminders.json';

// 這是我們在 Level 2 寫過的讀取與儲存函式
function loadReminders() {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveReminders(reminders) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(reminders, null, 2));
}

// ═══════════════════════════════════════════
// 函式 1：檢查並執行任務
//
// TODO：請你自己完成這個函式！
// ═══════════════════════════════════════════
function checkReminders() {
    // 1. 讀取目前所有的提醒任務
    const reminders = loadReminders();

    // 如果沒有任務，就提早結束 (節省資源)
    if (reminders.length === 0) return;

    // 取得現在的「時間戳記」(毫秒)
    const now = Date.now();

    // 準備一個陣列來裝「還沒到期」的任務
    const pendingReminders = [];

    // 2. 檢查每一個任務
    for (const item of reminders) {

        // 在這裡寫你的程式碼 ↓↓↓

        // 判斷方式：如果 now 大於或等於任務的 executeAt，代表時間到了！
        // 如果時間到了：
        //   -> 印出提醒訊息，例如 console.log("🔔 提醒時間到：" + item.task);
        // 如果時間還沒到：
        //   -> 把這個任務 push 進 pendingReminders 陣列中保留下來

        if (now >= item.executeAt) {
            console.log("🔔提醒時間到： " + item.task);
        } else {
            pendingReminders.push(item);
        }

        // 在這裡寫你的程式碼 ↑↑↑
    }

    // 3. 只有當陣列長度有改變 (代表有任務被執行清掉了)，我們才需要重新存檔
    if (pendingReminders.length !== reminders.length) {
        saveReminders(pendingReminders);
    }
}


// ═══════════════════════════════════════════
// 函式 2：新增測試任務
// ═══════════════════════════════════════════
function addReminder(task, delaySec) {
    const reminders = loadReminders();
    reminders.push({
        task: task,
        executeAt: Date.now() + (delaySec * 1000) // 計算出未來具體的觸發時間
    });
    saveReminders(reminders);
    console.log(`[系統] 已新增任務：${task} (預計 ${delaySec} 秒後觸發)`);
}

// ═══════════════════════════════════════════
// 🧪 測試區
// ═══════════════════════════════════════════

console.log("========== 🦊 輪詢守衛已啟動 ==========\n");

// 先清空舊資料，重新塞入測試任務
saveReminders([]);
addReminder("去泡杯咖啡", 3);
addReminder("收衣服", 8);

// 關鍵語法：setInterval 
// 這裡設定每 1000 毫秒 (1秒) 執行一次 checkReminders 函式
setInterval(checkReminders, 1000);
