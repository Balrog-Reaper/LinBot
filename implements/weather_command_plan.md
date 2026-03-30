# 🌤️ LinBot × 天氣查詢指令 實作計畫書

> 作成日期：2026-03-30  
> 目標：為 LinBot 新增天氣查詢指令 `>weather`，可查看台灣各地及未來國際城市的天氣狀況。

---

## 📋 專案背景

LinBot 目前已具備 GIF 搜尋、AI 對話、使用者資訊查詢等功能。本次新增「天氣查詢」指令，讓使用者能在 Discord 中快速查看天氣概況。

### 需求整理

| # | 需求描述 | 優先度 |
|---|----------|--------|
| 1 | 查看台灣各縣市基本天氣（氣溫、天氣狀況、降雨機率、降雨量） | 🔴 高 |
| 2 | 指定區域（如：高雄）可獲得更詳細的天氣說明與影響分析 | 🔴 高 |
| 3 | 未來擴充至國際城市（日本、北美、南美等），架構須具備擴充性 | 🟡 中 |

---

## 🏗️ 架構設計

### 設計理念：Weather Provider 策略模式

為了滿足「未來可擴充至不同國家」的需求，我們採用 **策略模式（Strategy Pattern）** 設計天氣查詢服務。
每個國家/區域都是一個獨立的 **Weather Provider**，共用統一的資料介面。

```
指令格式：@Lin >weather [國家] [城市(選填)]

範例 1：@Lin >weather 台灣          → 台灣全部縣市概覽
範例 2：@Lin >weather 台灣 高雄      → 高雄市詳細天氣報告
範例 3：@Lin >weather 日本           → 日本主要城市概覽（未來）
範例 4：@Lin >weather 日本 東京      → 東京詳細天氣報告（未來）

使用者輸入 @Lin >weather 台灣 高雄
        │
        ▼
  commands/weather.js（解析指令參數）
        │ 拆分：country = "台灣", city = "高雄"
        │
        ▼
  services/weather/weatherRouter.js（路由中樞）
        │ 第一層：根據「國家」分派至對應 provider
        │ 第二層：將「城市」傳入 provider（有城市 → 詳細；無城市 → 總覽）
        │
        ├── country === "台灣"
        │       → providers/taiwanProvider.js
        │       → 呼叫中央氣象署 Open Data API
        │       → city ? 詳細模式 : 總覽模式
        │
        └── country === "日本" / "美國" / ...（未來擴充）
                → providers/internationalProvider.js
                → 呼叫 OpenWeatherMap API
```

### 統一資料介面（WeatherData）

無論哪個 provider，最終都回傳相同格式的 `WeatherData` 物件：

```js
/**
 * @typedef {Object} WeatherData
 * @property {string}  locationName  - 地點名稱（例如：「高雄市」）
 * @property {string}  description   - 天氣概況（例如：「多雲時晴」）
 * @property {string}  temperature   - 氣溫（例如：「24°C ~ 30°C」）
 * @property {string}  rainProb      - 降雨機率（例如：「30%」）
 * @property {string}  rainfall      - 降雨量相關資訊
 * @property {string}  comfort       - 舒適度（例如：「舒適」）
 * @property {string}  windInfo      - 風力資訊
 * @property {string}  detail        - 詳細說明（指定區域時才有內容）
 * @property {string}  timeRange     - 預報時間範圍
 * @property {boolean} isDetailed    - 是否為詳細模式
 */
```

---

## 🌐 資料來源

### 台灣天氣 → 中央氣象署 Open Data API

| 項目 | 說明 |
|------|------|
| 平台 | [中央氣象署 氣象資料開放平臺](https://opendata.cwa.gov.tw) |
| 註冊 | 需註冊會員取得 **API 授權碼（Authorization Key）** |
| 總覽 | 資料集 `F-C0032-001`：全台各縣市 36 小時天氣預報 |
| 詳細 | 資料集 `F-D0047-091`：全台灣各縣市未來 2 天天氣預報（3小時級距） |
| 格式 | JSON |
| 頻率限制 | 合理使用，無明確數值限制 |

#### API 呼叫範例

**總覽（36小時預報）：**
```
GET https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001
  ?Authorization={CWA_API_KEY}
  &format=JSON
```

**指定縣市（更詳細資料）：**
```
GET https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091
  ?Authorization={CWA_API_KEY}
  &format=JSON
  &locationName={縣市名稱}
```

#### 資料集 F-C0032-001 回傳欄位

| 欄位名稱 | 說明 |
|----------|------|
| `Wx` | 天氣現象（如「多雲時晴」） |
| `MaxT` | 最高溫度 |
| `MinT` | 最低溫度 |
| `CI` | 舒適度（如「舒適」「悶熱」） |
| `PoP` | 降雨機率（%） |

> ⚠️ **注意**：此資料集 **不提供** 平均溫度與體感溫度。
> - **平均溫度**：由程式自行計算 → `(MaxT + MinT) / 2`
> - **體感溫度**：此資料集無此欄位，僅在詳細模式（F-D0047-091）中透過 `AT` 欄位取得

#### 資料集 F-D0047-091 回傳欄位（更豐富）

| 欄位名稱 | 說明 |
|----------|------|
| `Wx` | 天氣現象 |
| `MaxT` | 最高溫度 |
| `MinT` | 最低溫度 |
| `T` | 平均溫度 |
| `AT` | 體感溫度 |
| `RH` | 相對濕度 |
| `CI` | 舒適度指數 |
| `WeatherDescription` | **天氣描述**（含影響預測，正是需求 2 所需的詳細說明） |
| `PoP6h` | 6 小時降雨機率 |
| `WS` | 風速 |
| `WD` | 風向 |

---

### 國際天氣 → OpenWeatherMap API（未來擴充）

| 項目 | 說明 |
|------|------|
| 平台 | [OpenWeatherMap](https://openweathermap.org) |
| 免費額度 | 1,000 次/日、60 次/分鐘 |
| API 格式 | `GET https://api.openweathermap.org/data/2.5/weather?q={city}&appid={key}&units=metric&lang=zh_tw` |
| 多語言 | 支援 `lang=zh_tw` 中文回覆 |

> ⚠️ 國際天氣功能為 **Phase 2**，本次先預留介面，不實作。

---

## 📁 檔案變更清單

### 🆕 新增檔案

| 檔案路徑 | 說明 |
|----------|------|
| `commands/weather.js` | `>weather` 指令主體，解析參數並組合 Embed 回覆 |
| `services/weather/weatherRouter.js` | 天氣查詢路由器，判斷區域並分派至對應 provider |
| `services/weather/providers/taiwanProvider.js` | 台灣 CWA API 封裝，負責資料擷取與格式轉換 |
| `services/weather/weatherFormatter.js` | Discord Embed 格式化工具，將 WeatherData 轉為美觀的嵌入訊息 |

### 🔧 修改檔案

| 檔案 | 變更內容 |
|------|----------|
| `commands.js` | 新增 `weather` 的 import 與指令註冊 |
| `.env` | 新增 `CWA_API_KEY`（中央氣象署授權碼） |
| `commands/help.js` | 將 `>weather` 加入公開指令區（Page 2） |

---

## 🧩 核心模組說明

### 1. `commands/weather.js`

指令入口，負責解析使用者輸入並調度天氣查詢。

**參數規則：**
- `args[0]` → **國家**（必填）
- `args[1]` → **城市**（選填，有填則進入詳細模式）

```js
import { queryWeather } from "../services/weather/weatherRouter.js";
import { formatWeatherOverviewEmbed, formatWeatherDetailEmbed } from "../services/weather/weatherFormatter.js";

export async function weather(msg, args) {
    await msg.channel.sendTyping();

    // 國家為必填參數
    if (args.length === 0) {
        await msg.reply("請輸入國家名稱喔！用法：`>weather [國家] [城市(選填)]`\n例如：`>weather 台灣` 或 `>weather 台灣 高雄`");
        return;
    }

    // 解析參數：第一個 = 國家，第二個(含之後) = 城市
    const country = args[0];
    const city = args.length > 1 ? args.slice(1).join(" ") : null;

    try {
        // 查詢天氣（路由器會根據國家分派 provider）
        const weatherData = await queryWeather(country, city);

        // 根據是否有指定城市，選擇不同的 Embed 格式
        if (weatherData.isDetailed) {
            const embed = formatWeatherDetailEmbed(weatherData);
            await msg.reply({ embeds: [embed] });
        } else {
            // 總覽模式可能超過 Discord 的 25 欄位限制，需要分頁
            const embeds = formatWeatherOverviewEmbed(weatherData.weatherList);
            await msg.reply({ embeds });
        }
    } catch (error) {
        console.error("❌ 天氣查詢錯誤：", error.message);
        await msg.reply(`Lin 查不到天氣資料呢… 🌧️\n${error.message}`);
    }
}
```

**指令用法：**

| 輸入 | 行為 |
|------|------|
| `@Lin >weather` | ❌ 提示需要填寫國家 |
| `@Lin >weather 台灣` | 顯示台灣全部 22 縣市天氣總覽（精簡版） |
| `@Lin >weather 台灣 高雄` | 顯示高雄市的詳細天氣報告（含影響說明） |
| `@Lin >weather 台灣 高雄市` | 同上（全名也可正確匹配） |
| `@Lin >weather 日本` | 🔮 未來：顯示日本主要城市天氣概覽 |
| `@Lin >weather 日本 東京` | 🔮 未來：顯示東京詳細天氣報告 |

---

### 2. `services/weather/weatherRouter.js`

路由中樞，根據「國家」分派至對應 provider，再將「城市」傳入。

```js
import { fetchTaiwanWeather, fetchTaiwanDetailWeather } from "./providers/taiwanProvider.js";
// 未來擴充：
// import { fetchInternationalWeather, fetchInternationalDetailWeather } from "./providers/internationalProvider.js";


// ═══════════════════════════════════════════
// 國家別名對照表（第一層路由）
// ═══════════════════════════════════════════
const COUNTRY_ALIASES = {
    "台灣": "taiwan",
    "臺灣": "taiwan",
    "Taiwan": "taiwan",
    "tw": "taiwan",
    // 未來擴充：
    // "日本": "japan", "Japan": "japan", "jp": "japan",
    // "美國": "usa", "USA": "usa", "us": "usa",
};


// ═══════════════════════════════════════════
// 台灣縣市對照表（第二層 - 城市匹配）
// ═══════════════════════════════════════════
const TAIWAN_CITIES = [
    "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市",
    "基隆市", "新竹市", "新竹縣", "苗栗縣", "彰化縣", "南投縣",
    "雲林縣", "嘉義市", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
    "臺東縣", "澎湖縣", "金門縣", "連江縣"
];

const TAIWAN_CITY_ALIASES = {
    "台北": "臺北市", "臺北": "臺北市",
    "新北": "新北市",
    "桃園": "桃園市",
    "台中": "臺中市", "臺中": "臺中市",
    "台南": "臺南市", "臺南": "臺南市",
    "高雄": "高雄市",
    "基隆": "基隆市",
    "新竹": "新竹市",  // 預設對應新竹市，新竹縣需明確指定
    "苗栗": "苗栗縣",
    "彰化": "彰化縣",
    "南投": "南投縣",
    "雲林": "雲林縣",
    "嘉義": "嘉義市",  // 預設對應嘉義市
    "屏東": "屏東縣",
    "宜蘭": "宜蘭縣",
    "花蓮": "花蓮縣",
    "台東": "臺東縣", "臺東": "臺東縣",
    "澎湖": "澎湖縣",
    "金門": "金門縣",
    "馬祖": "連江縣", "連江": "連江縣",
};


// ═══════════════════════════════════════════
// 各國 provider 對照表（策略模式）
// ═══════════════════════════════════════════
const providers = {
    taiwan: {
        overview: fetchTaiwanWeather,           // 無城市 → 全台總覽
        detail: fetchTaiwanDetailWeather,       // 有城市 → 詳細模式
        resolveCity: (input) => {               // 城市名稱解析器
            return TAIWAN_CITY_ALIASES[input]
                || TAIWAN_CITIES.find(c => c.includes(input))
                || null;
        },
        displayName: "台灣",
    },
    // 未來擴充範例：
    // japan: {
    //     overview: fetchJapanWeather,
    //     detail: fetchJapanDetailWeather,
    //     resolveCity: (input) => JAPAN_CITY_ALIASES[input] || null,
    //     displayName: "日本",
    // },
};


/**
 * 天氣查詢主入口
 * @param {string} country - 國家名稱（必填）
 * @param {string|null} city - 城市名稱（選填）
 */
export async function queryWeather(country, city) {

    // 第一層：解析國家 → 找到對應的 provider
    const countryKey = COUNTRY_ALIASES[country];
    if (!countryKey || !providers[countryKey]) {
        const supported = Object.values(providers).map(p => p.displayName).join("、");
        throw new Error(`不支援的國家「${country}」。目前支援：${supported}`);
    }

    const provider = providers[countryKey];

    // 第二層：判斷是否有指定城市
    if (!city) {
        // 無城市 → 呼叫該國的總覽函式
        return await provider.overview();
    }

    // 有城市 → 解析城市名稱，再呼叫詳細函式
    const resolvedCity = provider.resolveCity(city);
    if (!resolvedCity) {
        throw new Error(`在${provider.displayName}中找不到「${city}」，請確認城市名稱是否正確。`);
    }

    return await provider.detail(resolvedCity);
}
```

---

（taiwanProvider.js 的程式碼請見上方 Section 3）

---

### 4. `services/weather/weatherFormatter.js`

將 WeatherData 轉為 Discord Embed。

> ⚠️ **注意**：Discord 單個 Embed 最多只能有 **25 個欄位**。
> 台灣有 22 縣市 × 每個佔 1 欄位 = 剛好不超過限制，但為保險仍需處理。

```js
import { EmbedBuilder } from "discord.js";

/**
 * 根據天氣描述給予對應 emoji
 */
function getWeatherEmoji(description) {
    if (!description) return "🌤️";
    if (description.includes("雷")) return "⛈️";
    if (description.includes("雨")) return "🌧️";
    if (description.includes("陰")) return "☁️";
    if (description.includes("雲")) return "⛅";
    if (description.includes("晴")) return "☀️";
    if (description.includes("霧")) return "🌫️";
    return "🌤️";
}


/**
 * 總覽模式：台灣全部縣市天氣概覽
 * 回傳 Embed 陣列（若超過 25 欄位會自動拆分成多個 Embed）
 * @param {Array} weatherList - 各縣市天氣資料陣列
 * @returns {EmbedBuilder[]} Embed 陣列
 */
export function formatWeatherOverviewEmbed(weatherList) {
    const MAX_FIELDS = 24; // 留 1 格給分隔線，保險起見用 24
    const embeds = [];

    // 將縣市列表拆分成多頁
    for (let i = 0; i < weatherList.length; i += MAX_FIELDS) {
        const chunk = weatherList.slice(i, i + MAX_FIELDS);
        const pageNum = Math.floor(i / MAX_FIELDS) + 1;
        const totalPages = Math.ceil(weatherList.length / MAX_FIELDS);

        const title = totalPages > 1
            ? `🌤️ 台灣今日天氣概覽（${pageNum}/${totalPages}）`
            : "🌤️ 台灣今日天氣概覽";

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription("以下為各縣市 36 小時天氣預報\n--------------------------------------")
            .setColor(0x3498DB)
            .setTimestamp()
            .setFooter({ text: "Lin 為主人查了天氣 🦊☀️ | 資料來源：中央氣象署" });

        for (const data of chunk) {
            const emoji = getWeatherEmoji(data.description);
            embed.addFields({
                name: `${emoji} ${data.locationName}`,
                value: `${data.description}\n🌡️ 平均 ${data.avgTemp}（${data.temperature}）\n🌧️ 降雨 ${data.rainProb}`,
                inline: true,
            });
        }

        embeds.push(embed);
    }

    return embeds;
}


/**
 * 詳細模式：指定縣市的完整天氣報告
 * 包含詳細說明與影響分析
 * @param {Object} weatherData - 單一縣市的詳細天氣資料
 * @returns {EmbedBuilder} 單一 Embed
 */
export function formatWeatherDetailEmbed(weatherData) {
    const emoji = getWeatherEmoji(weatherData.description);

    const embed = new EmbedBuilder()
        .setTitle(`${emoji} ${weatherData.locationName} 詳細天氣報告`)
        .setDescription(`--------------------------------------`)
        .setColor(0x2ECC71)
        .addFields(
            { name: "🌤️ 天氣狀況", value: weatherData.description, inline: true },
            { name: "🌡️ 平均氣溫", value: weatherData.temperature, inline: true },
            { name: "🤒 體感溫度", value: weatherData.feelTemp, inline: true },
            { name: "🔺 最高溫", value: weatherData.maxTemp, inline: true },
            { name: "🔻 最低溫", value: weatherData.minTemp, inline: true },
            { name: "🌧️ 降雨機率", value: weatherData.rainProb, inline: true },
            { name: "💧 相對濕度", value: weatherData.humidity, inline: true },
            { name: "😌 舒適度", value: weatherData.comfort, inline: true },
            { name: "💨 風速", value: weatherData.windSpeed, inline: true },
            { name: "🧭 風向", value: weatherData.windDir, inline: true },
        )
        .addFields({ name: "\u200B", value: "--------------------------------------" })
        .addFields({
            name: "📝 天氣詳細說明 & 影響分析",
            value: weatherData.detail || "暫無詳細說明",
        })
        .setTimestamp()
        .setFooter({ text: "Lin 為主人查了天氣 🦊☀️ | 資料來源：中央氣象署" });

    return embed;
}
```

封裝中央氣象署 API，負責資料擷取與格式轉換。

> ⚠️ **重要**：兩個資料集的 JSON 結構完全不同！
> - F-C0032-001（總覽）：值在 `time[0].parameter.parameterName`
> - F-D0047-091（詳細）：`ElementName` 使用中文名稱，值在 `ElementValue[0]` 的不同 key 中

```js
// ═══════════════════════════════════════════
// 輔助函式
// ═══════════════════════════════════════════

/**
 * 從 F-C0032-001 的 weatherElement 中取出指定欄位的第一筆數值
 * 結構：weatherElement[].elementName → time[0].parameter.parameterName
 */
function getOverviewValue(loc, elementName) {
    const element = loc.weatherElement.find(e => e.elementName === elementName);
    if (!element || !element.time || !element.time[0]) return "—";
    return element.time[0].parameter.parameterName || "—";
}


/**
 * 從 F-D0047-091 的 WeatherElement 中取出指定欄位的第一筆數值
 * 結構：WeatherElement[].ElementName（中文）→ Time[0].ElementValue[0][key]
 *
 * elementName 與 valueKey 對照表：
 *   "平均溫度"       → "Temperature"
 *   "最高溫度"       → "MaxTemperature"
 *   "最低溫度"       → "MinTemperature"
 *   "平均相對濕度"    → "RelativeHumidity"
 *   "最高體感溫度"    → "MaxApparentTemperature"
 *   "最低體感溫度"    → "MinApparentTemperature"
 *   "最大舒適度指數"  → "MaxComfortIndexDescription"
 *   "風速"           → "BeaufortScale"（蒲福風級）+ "WindSpeed"（m/s）
 *   "風向"           → "WindDirection"
 *   "12小時降雨機率"  → "ProbabilityOfPrecipitation"
 *   "天氣現象"       → "Weather"
 *   "天氣預報綜合描述" → "WeatherDescription"
 */
function getDetailValue(elements, chineseName, valueKey) {
    const element = elements.find(e => e.ElementName === chineseName);
    if (!element || !element.Time || !element.Time[0]) return "—";
    const val = element.Time[0].ElementValue[0];
    return val[valueKey] || "—";
}


// ═══════════════════════════════════════════
// 總覽模式 - F-C0032-001
// ═══════════════════════════════════════════

/**
 * 取得台灣全部縣市天氣總覽
 * 使用資料集 F-C0032-001（36小時預報）
 * @returns {Object} { weatherList: WeatherData[], isDetailed: false }
 */
export async function fetchTaiwanWeather() {
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001`
        + `?Authorization=${process.env.CWA_API_KEY}`
        + `&format=JSON`;

    const response = await fetch(url);
    const json = await response.json();

    // 檢查 API 回應是否成功
    if (json.success !== "true") {
        throw new Error("中央氣象署 API 回應失敗，請稍後再試。");
    }

    const locations = json.records.location;

    const weatherList = locations.map(loc => {
        const maxT = getOverviewValue(loc, "MaxT");
        const minT = getOverviewValue(loc, "MinT");
        const avgT = Math.round((Number(maxT) + Number(minT)) / 2);
        return {
            locationName: loc.locationName,
            description: getOverviewValue(loc, "Wx"),
            maxTemp: `${maxT}°C`,
            minTemp: `${minT}°C`,
            avgTemp: `${avgT}°C`,
            temperature: `${minT}°C ~ ${maxT}°C`,
            rainProb: `${getOverviewValue(loc, "PoP")}%`,
            comfort: getOverviewValue(loc, "CI"),
        };
    });

    return { weatherList, isDetailed: false };
}


// ═══════════════════════════════════════════
// 詳細模式 - F-D0047-091
// ═══════════════════════════════════════════

/**
 * 取得指定縣市的詳細天氣
 * 使用資料集 F-D0047-091（各縣市未來1週逐12小時天氣預報）
 * @param {string} cityName - 縣市名稱（正式全名，如「高雄市」）
 * @returns {Object} 單一縣市的詳細天氣資料，isDetailed: true
 */
export async function fetchTaiwanDetailWeather(cityName) {
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091`
        + `?Authorization=${process.env.CWA_API_KEY}`
        + `&format=JSON`
        + `&locationName=${encodeURIComponent(cityName)}`;

    const response = await fetch(url);
    const json = await response.json();

    if (json.success !== "true") {
        throw new Error("中央氣象署 API 回應失敗，請稍後再試。");
    }

    // 注意：此 API 會回傳所有匹配的縣市，需要找到目標
    // 結構：records.Locations[0].Location[] （注意大寫 L）
    const allLocations = json.records.Locations[0].Location;
    const loc = allLocations.find(l => l.LocationName === cityName);

    if (!loc) {
        throw new Error(`找不到「${cityName}」的天氣資料。`);
    }

    const elements = loc.WeatherElement;

    // 取出最近一筆的各項天氣數值
    const maxAT = getDetailValue(elements, "最高體感溫度", "MaxApparentTemperature");
    const minAT = getDetailValue(elements, "最低體感溫度", "MinApparentTemperature");
    const windSpeed = getDetailValue(elements, "風速", "WindSpeed");
    const beaufort = getDetailValue(elements, "風速", "BeaufortScale");
    const rainProb = getDetailValue(elements, "12小時降雨機率", "ProbabilityOfPrecipitation");

    return {
        locationName: loc.LocationName,
        description: getDetailValue(elements, "天氣現象", "Weather"),
        maxTemp: `${getDetailValue(elements, "最高溫度", "MaxTemperature")}°C`,
        minTemp: `${getDetailValue(elements, "最低溫度", "MinTemperature")}°C`,
        temperature: `${getDetailValue(elements, "平均溫度", "Temperature")}°C`,
        feelTemp: `${minAT}°C ~ ${maxAT}°C`,
        rainProb: rainProb === "-" ? "尚無資料" : `${rainProb}%`,
        humidity: `${getDetailValue(elements, "平均相對濕度", "RelativeHumidity")}%`,
        comfort: getDetailValue(elements, "最大舒適度指數", "MaxComfortIndexDescription"),
        windSpeed: `${windSpeed} m/s（${beaufort} 級）`,
        windDir: getDetailValue(elements, "風向", "WindDirection"),
        detail: getDetailValue(elements, "天氣預報綜合描述", "WeatherDescription"),
        isDetailed: true,
    };
}
```




## 🔧 `.env` 新增設定

```env
# 中央氣象署 Open Data API 授權碼（✅ 已設定）
CWA_API_KEY=CWA-2E355ADC-0478-4AE3-B0BF-A2C03B1F3EF9
```

### 如何取得 CWA API Key

1. 前往 [中央氣象署 氣象資料開放平臺](https://opendata.cwa.gov.tw)
2. 點擊右上角「**登入/註冊**」
3. 完成會員註冊後，進入「**會員專區**」
4. 找到「**API 授權碼**」，複製填入 `.env` 的 `CWA_API_KEY` 欄位

---

## 📦 新增依賴

本次 **不需要新增任何套件**。

| 項目 | 說明 |
|------|------|
| HTTP 請求 | 使用 Node.js 內建的 `fetch`（Node 18+ 已原生支援） |
| Embed 建構 | 使用已有的 `discord.js` 的 `EmbedBuilder` |

---

## ✅ 實作進度追蹤

- [x] **Step 1**：取得中央氣象署 API 授權碼，設定 `.env` ✅
- [ ] **Step 2**：建立 `services/weather/providers/taiwanProvider.js`（CWA API 封裝）
- [ ] **Step 3**：建立 `services/weather/weatherRouter.js`（天氣路由器）
- [ ] **Step 4**：建立 `services/weather/weatherFormatter.js`（Embed 格式化）
- [ ] **Step 5**：建立 `commands/weather.js`（指令主體）
- [ ] **Step 6**：修改 `commands.js`（註冊 weather 指令）
- [ ] **Step 7**：修改 `commands/help.js`（新增 weather 指令說明到公開區）
- [ ] **Step 8**：實機測試

---

## 🧪 驗證計畫

### 前置條件
1. `.env` 已設定 `CWA_API_KEY`
2. 機器人已啟動並連線

### 測試步驟

| # | 測試情境 | 預期結果 |
|---|----------|----------|
| 1 | `@Lin >weather` | ❌ 提示「請輸入國家名稱」 |
| 2 | `@Lin >weather 台灣` | 顯示台灣 22 縣市天氣總覽 Embed |
| 3 | `@Lin >weather 台灣 高雄` | 顯示高雄市詳細天氣報告 + 影響說明 |
| 4 | `@Lin >weather 台灣 高雄市` | 同上（全名也可正確匹配） |
| 5 | `@Lin >weather 台灣 台北` | 顯示臺北市詳細天氣（台→臺 自動轉換） |
| 6 | `@Lin >weather 台灣 馬祖` | 顯示連江縣天氣（別名匹配） |
| 7 | `@Lin >weather 台灣 不存在的地方` | 回覆錯誤訊息「找不到城市」 |
| 8 | `@Lin >weather 日本` | 回覆「不支援的國家」（尚未實作） |
| 9 | API Key 未設定時 | 回覆友善的錯誤提示訊息 |

---

## 🔮 未來擴充規劃（Phase 2+）

### Phase 2：國際天氣

擴充方式非常簡單，只需：
1. 新增一個國家的 Provider 檔案
2. 在 `weatherRouter.js` 的 `COUNTRY_ALIASES` 加入國家別名
3. 在 `providers` 對照表註冊新的 provider

```
新增檔案：
  services/weather/providers/japanProvider.js    ← 日本天氣
  services/weather/providers/usaProvider.js      ← 美國天氣

修改檔案：
  .env → 新增 OPENWEATHER_API_KEY
  weatherRouter.js → 新增國家別名 + 註冊 provider

用法：
  @Lin >weather 日本          → 日本主要城市天氣概覽
  @Lin >weather 日本 東京      → 東京詳細天氣報告
  @Lin >weather 美國          → 美國主要城市天氣概覽
  @Lin >weather 美國 紐約      → 紐約詳細天氣報告
```

**擴充範例（在 weatherRouter.js 中新增日本）：**

```js
// 1. COUNTRY_ALIASES 新增
"日本": "japan", "Japan": "japan", "jp": "japan",

// 2. 城市對照表
const JAPAN_CITY_ALIASES = {
    "東京": "Tokyo",
    "大阪": "Osaka",
    "京都": "Kyoto",
    "名古屋": "Nagoya",
    "札幌": "Sapporo",
    "福岡": "Fukuoka",
};

// 3. providers 對照表新增
japan: {
    overview: fetchJapanWeather,
    detail: fetchJapanDetailWeather,
    resolveCity: (input) => JAPAN_CITY_ALIASES[input] || input,
    displayName: "日本",
},
```

### Phase 3：進階功能

- 🔔 天氣預警通知（豪雨特報、颱風警報自動推播）
- 📊 每日定時天氣播報（使用 `cron` 排程）
- 🗺️ 多日預報（3 天/7 天）
- 📈 天氣趨勢圖表（使用 Canvas 或 Chart API）

---

## 📐 目錄結構預覽（變更後）

```
LinBot/
├── commands/
│   ├── weather.js          ← 🆕 天氣查詢指令
│   ├── chat.js
│   ├── gif.js
│   ├── help.js             ← 🔧 新增 weather 說明
│   ├── ...
│
├── services/
│   ├── weather/            ← 🆕 天氣服務模組
│   │   ├── weatherRouter.js       ← 路由中樞
│   │   ├── weatherFormatter.js    ← Embed 格式化
│   │   └── providers/
│   │       ├── taiwanProvider.js   ← 台灣 CWA API
│   │       └── (internationalProvider.js)  ← 未來擴充
│   │
│   ├── llmRouter.js
│   ├── ollama.js
│   ├── gemini.js
│   └── systemPrompt.js
│
├── implements/
│   ├── weather_command_plan.md  ← 📄 本文件
│   └── ...
│
├── commands.js             ← 🔧 註冊 weather 指令
├── .env                    ← 🔧 新增 CWA_API_KEY
└── ...
```
