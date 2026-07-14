// ═══════════════════════════════════════════════════════════════
// 🦊 Level 2 練習：資料持久化 (Persistence)
// ═══════════════════════════════════════════════════════════════
//
// 📋 目標：
//   在 Level 1 中，只要程式一關閉，記憶體裡的陣列就會消失。
//   這次我們要學習怎麼把資料存進硬碟裡的 JSON 檔案！
//
// 🏃 執行方式：
//   node scratch/learn-02-persistence.js
//
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
const DATA_FILE = './scratch/reminders.json';

// ═══════════════════════════════════════════
// 函式 1：讀取檔案 (已幫你完成)
// ═══════════════════════════════════════════
function loadReminders() {
    // 檢查檔案是否存在
    if (!fs.existsSync(DATA_FILE)) {
        return []; // 如果檔案不存在，回傳空陣列
    }

    // 讀取檔案內容 (純文字字串)
    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');

    // 將字串轉換回 JavaScript 物件陣列
    return JSON.parse(fileContent);
}

// ═══════════════════════════════════════════
// 函式 2：儲存檔案
//
// TODO：請你自己完成這個函式！
//
// 需求：
//   1. 接收一個陣列參數 `reminders`
//   2. 用 JSON.stringify() 把陣列變成字串 (提示：第二三個參數可用 null, 2 來排版)
//   3. 用 fs.writeFileSync() 把字串寫進 DATA_FILE 裡
// ═══════════════════════════════════════════
function saveReminders(reminders) {
    // 在這裡寫你的程式碼 ↓↓↓
    const jsonString = JSON.stringify(reminders, null, 2);
    fs.writeFileSync(DATA_FILE, jsonString);


    // 在這裡寫你的程式碼 ↑↑↑
}

// ═══════════════════════════════════════════
// 函式 3：新增提醒
//
// TODO：請你自己完成這個函式！
//
// 需求：
//   1. 先用 loadReminders() 把現在檔案裡的陣列讀出來
//   2. 用陣列的 .push() 把新的任務塞進去
//   3. 用 saveReminders() 把陣列存回檔案裡！
//
// 注意：我們這次不再用 setTimeout 了，只單純存資料！
// ═══════════════════════════════════════════
function addReminder(task, delaySec) {
    // 在這裡寫你的程式碼 ↓↓↓

    const reminders = loadReminders();
    reminders.push({
        id: reminders.length + 1,
        task: task,
        status: "pending",
        createdAt: new Date(),
        delaySec: delaySec
    });
    saveReminders(reminders);


    // 在這裡寫你的程式碼 ↑↑↑
}


// ═══════════════════════════════════════════
// 🧪 測試區：執行以下程式碼來測試你的函式
// ═══════════════════════════════════════════

console.log("========== 🦊 檔案儲存系統 ==========\n");

// 如果你寫對了，執行這兩行會把資料存進 scratch/reminders.json 裡
addReminder("去買晚餐", 60);
addReminder("晚上要開會", 3600);

console.log("✅ 任務已儲存！請打開 scratch/reminders.json 看看有沒有東西！");

// 思考題：
// 既然我們沒有用 setTimeout，那時間到了誰來通知我們？
// （提示：這就是我們為什麼需要「輪詢 (Polling)」機制的原因）
