// ═══════════════════════════════════════════════════════════════
// 🦊 Level 4 練習：物件導向與模組化 (Class & Module)
// ═══════════════════════════════════════════════════════════════
//
// 📋 目標：
//   前三關我們把程式碼散落在檔案各處，這在開發大型系統 (像是 Discord Bot) 時
//   會變得非常混亂。
//   在 Level 4，我們要學習使用「類別 (Class)」，把前面學到的 
//   檔案讀寫、輪詢、新增任務 全部「封裝」在一個乾淨的盒子裡。
//
// 🏃 執行方式：
//   node scratch/learn-04-class.js
//
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';

// 我們建立一個名叫 ReminderManager 的「類別 (Class)」
// 你可以把它想像成是一張「藍圖」，用來製造提醒管家機器人
class ReminderManager {
    
    // constructor 是建構子，當這個類別被實例化 (new) 的時候，會最先執行這裡
    constructor(filePath) {
        this.dataFile = filePath; // 記住要存檔的路徑
        this.reminders = this.loadReminders(); // 一啟動就先把檔案裡的資料讀出來
    }

    // 讀取檔案的方法
    loadReminders() {
        if (!fs.existsSync(this.dataFile)) return [];
        return JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
    }

    // 儲存檔案的方法
    saveReminders() {
        fs.writeFileSync(this.dataFile, JSON.stringify(this.reminders, null, 2));
    }

    // 新增任務的方法
    addReminder(task, delaySec) {
        this.reminders.push({
            task: task,
            executeAt: Date.now() + (delaySec * 1000)
        });
        this.saveReminders(); // 新增完立刻存檔
        console.log(`[管家] 好的，我幫你記下：${task}`);
    }

    // ═══════════════════════════════════════════
    // TODO: 請你幫忙把之前 Level 3 的輪詢檢查邏輯，搬到這個方法裡面！
    // 提示：因為變數都變成這個類別的屬性了，所以原本的 reminders 要改成 this.reminders
    // 原本的 saveReminders() 要改成 this.saveReminders()
    // ═══════════════════════════════════════════
    checkReminders() {
        const now = Date.now();
        const pendingReminders = [];

        // 在這裡寫你的程式碼 ↓↓↓
        
        // 1. 用 for...of 檢查 this.reminders 裡面的每一筆資料
        // 2. 如果時間到了 -> console.log 提醒
        // 3. 如果時間未到 -> 存進 pendingReminders
        // 4. 最後如果陣列長度有變，就把 this.reminders 替換成 pendingReminders 並呼叫 this.saveReminders()


        // 在這裡寫你的程式碼 ↑↑↑
    }

    // 啟動輪詢的方法
    startPolling(intervalMs = 1000) {
        console.log(`========== 🦊 管家開始巡邏 (每 ${intervalMs} 毫秒) ==========`);
        
        // 使用 setInterval 定期執行 checkReminders
        // 注意：在 Class 裡面使用 setInterval 呼叫自己的方法時，需要用箭頭函式 () => this.checkReminders() 
        // 這樣才不會抓錯 this 的對象！
        setInterval(() => this.checkReminders(), intervalMs);
    }
}


// ═══════════════════════════════════════════
// 🧪 測試區：這就是我們未來在 Discord Bot 裡面使用它的方式！
// 超級乾淨，對吧？
// ═══════════════════════════════════════════

// 1. 產生一個新的管家實體 (Object)，並告訴他檔案存在哪裡
const myManager = new ReminderManager('./scratch/reminders.json');

// 2. 清空測試一下
myManager.reminders = [];
myManager.saveReminders();

// 3. 叫管家新增任務
myManager.addReminder("喝水", 2);
myManager.addReminder("伸展運動", 5);

// 4. 叫管家開始巡邏
myManager.startPolling(1000);
