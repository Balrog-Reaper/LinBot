// ═══════════════════════════════════════════════════════════
// taiwanProvider.js — 台灣天氣資料提供者
// 資料來源：中央氣象署氣象資料開放平臺
// ═══════════════════════════════════════════════════════════


// ───────────────────────────────────────────
// 輔助函式
// ───────────────────────────────────────────

/**
 * 從 F-C0032-001（總覽）的 weatherElement 中取出指定欄位的第一筆數值
 * 
 * 資料結構路徑：
 *   loc.weatherElement[].elementName → time[0].parameter.parameterName
 * 
 * @param {Object} loc - 單一縣市的 location 物件
 * @param {string} elementName - 欄位名稱（如 "Wx", "MaxT", "MinT", "PoP", "CI"）
 * @returns {string} 該欄位的值，找不到則回傳 "—"
 */
function getOverviewValue(loc, elementName) {
    const element = loc.weatherElement.find(e => e.elementName === elementName);
    if (!element || !element.time || !element.time[0]) return "—";
    return element.time[0].parameter.parameterName || "—";
}


/**
 * 從 F-D0047-091（詳細）的 WeatherElement 中取出指定欄位的第一筆數值
 * 
 * ⚠️ 注意：這個 API 的 ElementName 使用「中文名稱」，不是英文代碼！
 * 
 * 資料結構路徑：
 *   WeatherElement[].ElementName（中文）→ Time[0].ElementValue[0][valueKey]
 * 
 * 常用對照表：
 *   "平均溫度"       → valueKey: "Temperature"
 *   "最高溫度"       → valueKey: "MaxTemperature"
 *   "最低溫度"       → valueKey: "MinTemperature"
 *   "平均相對濕度"    → valueKey: "RelativeHumidity"
 *   "最高體感溫度"    → valueKey: "MaxApparentTemperature"
 *   "最低體感溫度"    → valueKey: "MinApparentTemperature"
 *   "最大舒適度指數"  → valueKey: "MaxComfortIndexDescription"
 *   "風速"           → valueKey: "WindSpeed" 或 "BeaufortScale"
 *   "風向"           → valueKey: "WindDirection"
 *   "12小時降雨機率"  → valueKey: "ProbabilityOfPrecipitation"
 *   "天氣現象"       → valueKey: "Weather"
 *   "天氣預報綜合描述" → valueKey: "WeatherDescription"
 * 
 * @param {Array} elements - WeatherElement 陣列
 * @param {string} chineseName - 中文欄位名稱
 * @param {string} valueKey - ElementValue 物件中的 key
 * @returns {string} 該欄位的值，找不到則回傳 "—"
 */
function getDetailValue(elements, chineseName, valueKey) {
    const element = elements.find(e => e.ElementName === chineseName);
    if (!element || !element.Time || !element.Time[0]) return "—";
    const val = element.Time[0].ElementValue[0];
    return val[valueKey] || "—";
}


// ───────────────────────────────────────────
// 總覽模式 — F-C0032-001（36小時天氣預報）
// ───────────────────────────────────────────

/**
 * 取得台灣全部縣市天氣總覽
 * @returns {Object} { weatherList: Array, isDetailed: false }
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

    // 將每個縣市的資料轉換成統一格式
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


// ───────────────────────────────────────────
// 詳細模式 — F-D0047-091（各縣市未來1週逐12小時天氣預報）
// ───────────────────────────────────────────

/**
 * 取得指定縣市的詳細天氣
 * @param {string} cityName - 縣市名稱（正式全名，如「高雄市」）
 * @returns {Object} 詳細天氣資料，isDetailed: true
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

    // 結構：records.Locations[0].Location[]（注意大寫 L）
    const allLocations = json.records.Locations[0].Location;
    const loc = allLocations.find(l => l.LocationName === cityName);

    if (!loc) {
        throw new Error(`找不到「${cityName}」的天氣資料。`);
    }

    const elements = loc.WeatherElement;

    // 組合各項天氣數值
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