// ═══════════════════════════════════════════════════════════════
// 🦊 Level 1 練習：用 setTimeout 打造一個簡易提醒系統
// ═══════════════════════════════════════════════════════════════
//
// 📋 目標：
//   建立一個可以「新增提醒」「查看提醒」「取消提醒」的迷你系統
//   所有計時都用 setTimeout 實現
//
// 🏃 執行方式：
//   node scratch/learn-01-setTimeout.js
//
// ═══════════════════════════════════════════════════════════════


// ── 全域變數：儲存所有提醒的陣列 ──
const reminders = [];


// ═══════════════════════════════════════════
// 函式 1：addReminder（新增提醒）
// 已幫你完成，作為參考範例
// ═══════════════════════════════════════════
function addReminder(task, delaySec) {

    // setTimeout 會回傳一個 timerId，之後可以用 clearTimeout(timerId) 來取消
    const timerId = setTimeout(() => {
        console.log(`\n⏰ 叮！時間到！提醒你：「${task}」`);

        // 時間到後，把這個提醒的狀態改為 "done"
        const target = reminders.find((r) => r.timerId === timerId);
        if (target) {
            target.status = "done";
        }
    }, delaySec * 1000);  // setTimeout 的第二個參數是「毫秒」，所以要乘以 1000

    // 把提醒資訊存入陣列
    reminders.push({
        id: reminders.length + 1,
        task: task,
        delaySec: delaySec,
        timerId: timerId,         // 保存 timerId 才能在之後取消它
        status: "pending",        // pending = 等待中, done = 已完成, cancelled = 已取消
        createdAt: new Date(),
    });

    console.log(`✅ 新增提醒 #${reminders.length}：「${task}」（${delaySec} 秒後觸發）`);
}


// ═══════════════════════════════════════════
// 函式 2：listReminders（查看所有提醒）
//
// TODO：請你自己完成這個函式！
//
// 需求：
//   1. 遍歷 reminders 陣列
//   2. 對每個提醒印出：編號、任務內容、狀態
//   3. 如果 reminders 是空的，印出「目前沒有任何提醒」
//
// 提示：
//   - 用 for...of 或 forEach 遍歷陣列
//   - 用 r.status 取得狀態（"pending" / "done" / "cancelled"）
//   - 可以用 emoji 讓輸出更好看：⏳ pending, ✅ done, ❌ cancelled
//
// 預期輸出範例：
//   📋 所有提醒：
//   #1 ⏳ 去喝水（等待中）
//   #2 ✅ 記得存檔（已完成）
//   #3 ❌ 買晚餐（已取消）
// ═══════════════════════════════════════════
function listReminders() {
    // 在這裡寫你的程式碼 ↓↓↓
    reminders.forEach((r) => {
        console.log(`編號：${r.id}, 任務：${r.task}, 狀態：${r.status}`)
    })


    // 在這裡寫你的程式碼 ↑↑↑
}


// ═══════════════════════════════════════════
// 函式 3：cancelReminder（取消指定提醒）
//
// TODO：請你自己完成這個函式！
//
// 需求：
//   1. 接收一個參數 id（提醒編號，從 1 開始）
//   2. 在 reminders 陣列中找到對應的提醒
//   3. 如果找不到，印出錯誤訊息
//   4. 如果找到了，用 clearTimeout(timerId) 取消計時器
//   5. 把狀態改為 "cancelled"
//
// 提示：
//   - reminders.find(r => r.id === id) 可以找到指定編號的提醒
//   - 記得檢查：如果狀態已經是 "done" 或 "cancelled"，要告訴使用者不能取消
//   - clearTimeout(timerId) 可以取消一個尚未觸發的 setTimeout
// ═══════════════════════════════════════════
function cancelReminder(id) {
    // 在這裡寫你的程式碼 ↓↓↓
    const target = reminders.find((r) => id === r.id)
    if (!target) {
        console.log(`找不到編號 ${id} 的提醒`)
    } else if (target.status === "done" || target.status === "cancelled") {
        console.log(`提醒「${target.task}」已經完成或取消，無法再次取消`)
    } else {
        target.status = "cancelled"
        clearTimeout(target.timerId)
    }


    // 在這裡寫你的程式碼 ↑↑↑
}

// 挑戰 A：新增一個 getRemainingTime(id) 函式
//   → 計算指定提醒還剩幾秒才會觸發
//   → 提示：用 createdAt + delaySec 算出目標時間，再減去 new Date()

function getRemainingTime(id) {
    const target = reminders.find((r) => id === r.id)

    // 建立時間的毫秒數
    const createdMs = target.createdAt.getTime()

    // 提醒時間的毫秒數
    const remindedMs = createdMs + (target.delaySec * 1000)

    // 現在時間的毫秒數
    const nowMs = new Date().getTime()

    // 距離提醒時間所剩的時間毫秒數
    const remainingMs = remindedMs - nowMs
    const remainingSec = Math.round(remainingMs / 1000)

    console.log(`距離提醒編號${target.id}還剩下${remainingSec}秒`)
    return remainingSec

}




// ═══════════════════════════════════════════
// 🧪 測試區：執行以下程式碼來測試你的函式
// ═══════════════════════════════════════════

console.log("========== 🦊 簡易提醒系統 ==========\n");

// 測試 1：新增三個提醒（這個函式已經幫你寫好了）
addReminder("去喝水", 5);          // 5 秒後
addReminder("站起來動一動", 10);    // 10 秒後
addReminder("記得存檔", 15);       // 15 秒後

console.log("\n");

// 測試 2：查看所有提醒（你需要完成 listReminders）
listReminders();

console.log("\n");

// 測試 3：取消第 2 個提醒（你需要完成 cancelReminder）
cancelReminder(2);

console.log("\n");

// 測試 4：再次查看，確認第 2 個已被取消

listReminders();

console.log("\n⏳ 等待提醒觸發中...（最多等 15 秒）\n");


// ═══════════════════════════════════════════
// 🌟 進階挑戰（完成上面的 TODO 後再來挑戰！）
//
// 挑戰 A：新增一個 getRemainingTime(id) 函式
//   → 計算指定提醒還剩幾秒才會觸發
//   → 提示：用 createdAt + delaySec 算出目標時間，再減去 new Date()
//
// 挑戰 B：思考一下，如果現在按 Ctrl+C 結束程式再重新啟動，
//   所有提醒都會消失。你能想到什麼方法把提醒「記下來」嗎？
//   （這就是 Level 2 要解決的問題！）
// ═══════════════════════════════════════════

getRemainingTime(1)

setTimeout(() => {
    getRemainingTime(1)
}, 2000)

setTimeout(() => {
    getRemainingTime(1)
}, 5000)