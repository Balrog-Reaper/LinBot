// ═══════════════════════════════════════════════════════════
// weatherRouter.js — 天氣查詢路由器（策略模式）
// 根據「國家」分派至對應的天氣 Provider
// ═══════════════════════════════════════════════════════════

import { fetchTaiwanWeather, fetchTaiwanDetailWeather } from "./providers/taiwanProvider.js";
// 未來擴充：
// import { fetchJapanWeather, fetchJapanDetailWeather } from "./providers/japanProvider.js";


// ───────────────────────────────────────────
// 國家別名對照表（第一層路由）
// ───────────────────────────────────────────
const COUNTRY_ALIASES = {
    "台灣": "taiwan",
    "臺灣": "taiwan",
    "Taiwan": "taiwan",
    "tw": "taiwan",
    // 未來擴充：
    // "日本": "japan", "Japan": "japan", "jp": "japan",
    // "美國": "usa", "USA": "usa", "us": "usa",
};


// ───────────────────────────────────────────
// 台灣縣市對照表（第二層路由 - 城市匹配）
// ───────────────────────────────────────────
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


// ───────────────────────────────────────────
// 各國 Provider 對照表（策略模式核心）
// ───────────────────────────────────────────
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
 * @returns {Object} 天氣資料物件
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
