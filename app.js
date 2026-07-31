const splash = document.getElementById("splash");
const home = document.getElementById("home");
const timeline = document.getElementById("timeline");
const currentWeight = document.getElementById("currentWeight");
const lossValue = document.querySelector(".loss-number strong");
const openEntry = document.getElementById("openEntry");
const closeEntry = document.getElementById("closeEntry");
const sheet = document.getElementById("entrySheet");
const backdrop = document.getElementById("sheetBackdrop");
const form = document.getElementById("entryForm");
const dateInput = document.getElementById("entryDate");
const weightInput = document.getElementById("entryWeight");
const unitButtons = [...document.querySelectorAll(".unit-button")];
const tabButtons = [...document.querySelectorAll(".tab-item[data-tab]")];

const foodEntrySheet = document.getElementById("foodEntrySheet");
const closeFoodEntry = document.getElementById("closeFoodEntry");
const foodEntryForm = document.getElementById("foodEntryForm");
const foodEntryDate = document.getElementById("foodEntryDate");
const foodNameInput = document.getElementById("foodNameInput");
const foodGramsInput = document.getElementById("foodGramsInput");
const foodKcalInput = document.getElementById("foodKcalInput");

const foodMonthText = document.getElementById("foodMonthText");
const foodMonthMeta = document.getElementById("foodMonthMeta");
const monthPicker = document.getElementById("monthPicker");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");
const todayFoodMonth = document.getElementById("todayFoodMonth");
const monthGrid = document.getElementById("monthGrid");
const dateDropdown = document.getElementById("dateDropdown");
const foodList = document.getElementById("foodList");
const statCheckDays = document.getElementById("statCheckDays");
const statLossDays = document.getElementById("statLossDays");
const statGainDays = document.getElementById("statGainDays");
const statMonthChange = document.getElementById("statMonthChange");

const authBackdrop = document.getElementById("authBackdrop");
const authModal = document.getElementById("authModal");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const authSubmit = document.getElementById("authSubmit");
const authSwitch = document.getElementById("authSwitch");
const closeAuth = document.getElementById("closeAuth");
const profileLoginTrigger = document.getElementById("profileLoginTrigger");
const profileName = document.getElementById("profileName");
const profileLoginText = document.getElementById("profileLoginText");
const profileActionButtons = [...document.querySelectorAll("[data-profile-action]")];
const appNotice = document.getElementById("appNotice");
const featureBackdrop = document.getElementById("featureBackdrop");
const featurePanel = document.getElementById("featurePanel");
const featureTitle = document.getElementById("featureTitle");
const featureBody = document.getElementById("featureBody");
const closeFeaturePanel = document.getElementById("closeFeaturePanel");

const backToTimeline = document.getElementById("backToTimeline");
const detailDateTitle = document.getElementById("detailDateTitle");
const detailTimeTitle = document.getElementById("detailTimeTitle");
const detailWeightInput = document.getElementById("detailWeightInput");
const detailDeltaText = document.getElementById("detailDeltaText");
const detailFoodText = document.getElementById("detailFoodText");
const detailKcalText = document.getElementById("detailKcalText");
const detailUnitButtons = [...document.querySelectorAll(".detail-unit")];
const detailLockToggle = document.getElementById("detailLockToggle");
const saveRecordDetail = document.getElementById("saveRecordDetail");
const trendUnitToggle = document.getElementById("trendUnitToggle");
const trendChartWrap = document.getElementById("trendChartWrap");
const trendRangeButtons = [...document.querySelectorAll("[data-trend-range]")];
const trendCheckDays = document.getElementById("trendCheckDays");
const trendLossDays = document.getElementById("trendLossDays");
const trendGainDays = document.getElementById("trendGainDays");
const trendChange = document.getElementById("trendChange");
const trendHint = document.getElementById("trendHint");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatThread = document.getElementById("chatThread");
const chatTopicButtons = [...document.querySelectorAll(".chat-topic")];
const aiGreeting = document.getElementById("aiGreeting");
const aiSummary = document.getElementById("aiSummary");
const aiReportTitle = document.getElementById("aiReportTitle");
const aiReportSubtitle = document.getElementById("aiReportSubtitle");
const reportCardButton = document.getElementById("reportCardButton");

const API_BASE = window.location.port === "5174" ? "" : "http://localhost:5174";
const defaultRecords = [
  { date: "2026-05-01", time: "10:55", weightJin: 144.7, delta: -1.8, mood: "sun" },
  { date: "2026-04-30", time: "19:30", weightJin: 146.5, delta: 0, mood: "moon" }
];
const defaultFoods = [
  { date: "2026-05-01", time: "18:15", name: "鸡胸肉", grams: 100, kcal: 120, estimated: false },
  { date: "2026-05-01", time: "12:15", name: "面条", grams: 300, kcal: 880, estimated: false }
];

let selectedUnit = localStorage.getItem("hengran_weight_unit") || "jin";
let records = [...defaultRecords];
let foods = [...defaultFoods];
let authMode = "login";
let authToken = localStorage.getItem("hengran_token") || "";
let currentUser = null;
let selectedDetailRecord = null;
let detailUnit = "jin";
let detailUnitLocked = true;
let currentTab = "weight";
let foodMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedFoodDate = dateKey(new Date());
let isDateDropdownOpen = false;
let swipeStartX = 0;
let trendUnit = "jin";
let trendRange = "default";
let chatMessages = [];
let chatBriefingLoaded = false;
let chatBriefingLoading = false;
let onboardingRequired = false;

setTimeout(() => {
  splash.classList.remove("is-active");
  home.classList.add("is-active");
}, 2300);

function pad(number) {
  return String(number).padStart(2, "0");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function formatDate(dateString) {
  const date = parseDate(dateString);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function weekdayText(date) {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
}

function sameMonth(dateString, monthDate) {
  const date = parseDate(dateString);
  return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();
}

function formatSignedWeight(value, unit = "斤") {
  const number = Number(value || 0);
  return `${number > 0 ? "+" : ""}${number.toFixed(1)}${unit}`;
}

function weightForUnit(weightJin, unit = trendUnit) {
  return unit === "kg" ? Number(weightJin) / 2 : Number(weightJin);
}

function unitLabel(unit = trendUnit) {
  return unit === "kg" ? "公斤" : "斤";
}

function formatDelta(delta) {
  if (delta < 0) return { text: Math.abs(delta).toFixed(1), className: "down", mark: "▼" };
  if (delta > 0) return { text: delta.toFixed(1), className: "up", mark: "▲" };
  return { text: "0", className: "same", mark: "–" };
}

function recordTimeValue(record) {
  return new Date(`${record.date}T${record.time || "00:00"}`).getTime();
}

function sortedRecords(items = records) {
  return [...items].sort((a, b) => recordTimeValue(a) - recordTimeValue(b));
}

function groupRecords(items) {
  return items.reduce((groups, item) => {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
    return groups;
  }, {});
}

function foodsForDate(date) {
  return foods.filter((item) => item.date === date).sort((a, b) => (b.time || "").localeCompare(a.time || ""));
}

function totalFoodKcal(date) {
  return foodsForDate(date).reduce((sum, item) => sum + Number(item.kcal || 0), 0);
}

function latestWeightForDate(date) {
  return records.filter((item) => item.date === date).sort((a, b) => recordTimeValue(b) - recordTimeValue(a))[0];
}

function moodIcon(mood) {
  return mood === "sun"
    ? `<svg class="sun-icon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="11" fill="none" stroke="#ffc400" stroke-width="5"/><path d="M24 4v5M24 39v5M4 24h5M39 24h5M9.9 9.9l3.6 3.6M34.5 34.5l3.6 3.6M38.1 9.9l-3.6 3.6M13.5 34.5l-3.6 3.6" stroke="#ffc400" stroke-width="5" stroke-linecap="round"/></svg>`
    : `<svg class="moon-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M34.5 39.2C25.3 42.8 14.6 38.3 10.8 29.1C7 19.9 11.2 9.3 20.3 5.2C18.3 12.2 20.3 19.9 25.9 25.1C31.4 30.3 39.2 31.8 46 29.3C44.1 33.8 40.1 37.1 34.5 39.2Z" fill="none" stroke="#3479f6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderTimeline() {
  const groups = groupRecords(records);
  timeline.innerHTML = Object.entries(groups).map(([date, items]) => `
    <div class="date-chip">${formatDate(date)}</div>
    ${items.map((item) => {
      const delta = formatDelta(item.delta);
      return `
        <article class="record-card" data-record-id="${item.id || ""}" data-record-date="${item.date}" tabindex="0">
          <div class="time-tile">
            ${moodIcon(item.mood)}
            <span>${item.time}</span>
          </div>
          <div>
            <span class="record-label">体重</span>
            <span class="record-value">${Number(item.weightJin).toFixed(1)}<small>斤</small></span>
          </div>
          <div>
            <span class="change-label">体重变化</span>
            <span class="change-value"><i class="delta-dot ${delta.className}">${delta.mark}</i>${delta.text}<small>斤</small></span>
          </div>
          <span class="chevron">›</span>
        </article>
      `;
    }).join("")}
  `).join("");
  updateWeightSummary();
  renderFoodPage();
  renderTrendPage();
}

function updateWeightSummary() {
  if (!records.length) {
    currentWeight.textContent = "--";
    lossValue.textContent = "0.0";
    return;
  }
  const sorted = sortedRecords();
  const initial = Number(sorted[0].weightJin);
  const current = Number(sorted[sorted.length - 1].weightJin);
  currentWeight.textContent = current.toFixed(1);
  lossValue.textContent = (initial - current).toFixed(1);
}

function renderFoodPage() {
  renderFoodHeader();
  renderFoodCalendar();
  renderDateDropdown();
  renderFoodStats();
  renderFoodList();
}

function renderFoodHeader() {
  const selected = parseDate(selectedFoodDate);
  foodMonthText.textContent = `${foodMonth.getMonth() + 1}月`;
  foodMonthMeta.innerHTML = `${weekdayText(selected)}<br />${foodMonth.getFullYear()}年`;
}

function renderFoodCalendar() {
  const year = foodMonth.getFullYear();
  const month = foodMonth.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  const cells = [];
  for (let index = 0; index < 35; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = dateKey(day);
    const weight = latestWeightForDate(key);
    const kcal = totalFoodKcal(key);
    const outside = day.getMonth() !== month;
    cells.push(`
      <button class="calendar-day ${key === selectedFoodDate ? "is-selected" : ""} ${outside ? "is-outside" : ""}" type="button" data-date="${key}">
        <strong>${day.getDate()}</strong>
        ${weight ? `<span>${formatSignedWeight(weight.delta)}</span>` : ""}
        ${kcal ? `<span>+${Math.round(kcal)}卡</span>` : ""}
      </button>
    `);
  }
  monthGrid.innerHTML = cells.join("");
}
function renderDateDropdown() {
  if (!isDateDropdownOpen) {
    dateDropdown.classList.remove("is-open");
    monthPicker.classList.remove("is-open");
    dateDropdown.innerHTML = "";
    return;
  }
  const year = foodMonth.getFullYear();
  const month = foodMonth.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  const weekLabels = ["一", "二", "三", "四", "五", "六", "日"].map((item) => `<span>${item}</span>`).join("");
  const days = [];
  for (let index = 0; index < 35; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = dateKey(day);
    days.push(`<button class="${key === selectedFoodDate ? "is-selected" : ""} ${day.getMonth() !== month ? "is-outside" : ""}" type="button" data-picker-date="${key}">${day.getDate()}</button>`);
  }
  dateDropdown.innerHTML = `<div class="dropdown-calendar">${weekLabels}${days.join("")}</div>`;
  dateDropdown.classList.add("is-open");
  monthPicker.classList.add("is-open");
}

function renderFoodStats() {
  const monthWeights = sortedRecords(records.filter((item) => sameMonth(item.date, foodMonth)));
  const checkDays = new Set(monthWeights.map((item) => item.date)).size;
  const latestByDate = [...new Set(monthWeights.map((item) => item.date))]
    .map((date) => latestWeightForDate(date))
    .filter(Boolean);
  statCheckDays.textContent = checkDays;
  statLossDays.textContent = latestByDate.filter((item) => Number(item.delta) < 0).length;
  statGainDays.textContent = latestByDate.filter((item) => Number(item.delta) > 0).length;
  if (monthWeights.length >= 2) {
    const change = Number(monthWeights[monthWeights.length - 1].weightJin) - Number(monthWeights[0].weightJin);
    statMonthChange.textContent = formatSignedWeight(change);
  } else {
    statMonthChange.textContent = "0.0斤";
  }
}

function renderFoodList() {
  const dayFoods = foodsForDate(selectedFoodDate);
  if (!dayFoods.length) {
    foodList.innerHTML = `<div class="date-chip food-date">${formatDate(selectedFoodDate)}</div><div class="food-empty">这一天还没有食物记录</div>`;
    return;
  }
  foodList.innerHTML = `
    <div class="date-chip food-date">${formatDate(selectedFoodDate)}</div>
    ${dayFoods.map((item) => `
      <article class="food-card">
        <div class="time-tile food-time">
          ${moodIcon((Number((item.time || "00:00").slice(0, 2)) >= 18) ? "moon" : "sun")}
          <span>${item.time}</span>
        </div>
        <div><span>食物</span><strong>${item.name}</strong></div>
        <div><span>克数</span><strong>${Number(item.grams).toFixed(0)}g</strong></div>
        <div><span>预估热量</span><strong>${Math.round(item.kcal)}kcal${item.estimated ? "*" : ""}</strong></div>
      </article>
    `).join("")}
  `;
}


function trendRecordsForRange() {
  const sorted = sortedRecords();
  if (!sorted.length) return [];
  if (trendRange === "all") return sorted;
  const latest = parseDate(sorted[sorted.length - 1].date);
  const start = new Date(latest);
  if (trendRange === "week") start.setDate(latest.getDate() - 6);
  else if (trendRange === "quarter") start.setMonth(latest.getMonth() - 3);
  else start.setMonth(latest.getMonth() - 1);
  return sorted.filter((item) => parseDate(item.date) >= start && parseDate(item.date) <= latest);
}

function setTrendChange(value) {
  const number = Number(value || 0);
  trendChange.innerHTML = `${number > 0 ? "+" : ""}${number.toFixed(1)}<small>${unitLabel()}</small>`;
}
function renderTrendPage() {
  if (!trendChartWrap) return;
  const data = trendRecordsForRange();
  trendHint.textContent = "点击圆点显示当天数据哦~";
  trendRangeButtons.forEach((button) => button.classList.toggle("active", button.dataset.trendRange === trendRange));
  trendUnitToggle.textContent = `${unitLabel()}⌄`;
  if (!data.length) {
    trendChartWrap.innerHTML = `<div class="trend-point-label">暂无体重记录</div>`;
    trendCheckDays.textContent = "0";
    trendLossDays.textContent = "0";
    trendGainDays.textContent = "0";
    setTrendChange(0);
    return;
  }
  const weights = data.map((item) => weightForUnit(item.weightJin));
  const min = Math.floor(Math.min(...weights)) - 1;
  const max = Math.ceil(Math.max(...weights)) + 1;
  const plot = { left: 42, top: 32, width: 350, height: 316 };
  const xStep = data.length > 1 ? plot.width / (data.length - 1) : 0;
  const yFor = (value) => plot.top + ((max - value) / Math.max(max - min, 1)) * plot.height;
  const xFor = (index) => plot.left + (data.length > 1 ? index * xStep : plot.width / 2);
  const points = data.map((item, index) => `${xFor(index).toFixed(1)},${yFor(weightForUnit(item.weightJin)).toFixed(1)}`).join(" ");
  const yLabels = [max, (max + min) / 2, min];
  const xLabels = data.map((item, index) => ({ item, index })).filter(({ index }) => data.length <= 4 || index === 0 || index === data.length - 1 || index === Math.floor((data.length - 1) / 2));
  const pointValueLabels = data.length <= 10
    ? data.map((item, index) => `<text x="${xFor(index)}" y="${yFor(weightForUnit(item.weightJin)) - 10}" text-anchor="middle">${weightForUnit(item.weightJin).toFixed(1)}</text>`).join("")
    : "";
  trendChartWrap.innerHTML = `
    <svg class="trend-chart" viewBox="0 0 430 390" aria-hidden="true">
      <g class="chart-grid">
        ${yLabels.map((value) => `<line x1="${plot.left}" y1="${yFor(value)}" x2="405" y2="${yFor(value)}" />`).join("")}
        <line x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${plot.top + plot.height}" />
        <line x1="${plot.left + plot.width / 2}" y1="${plot.top}" x2="${plot.left + plot.width / 2}" y2="${plot.top + plot.height}" />
        <line x1="${plot.left + plot.width}" y1="${plot.top}" x2="${plot.left + plot.width}" y2="${plot.top + plot.height}" />
      </g>
      <g class="chart-labels">
        ${yLabels.map((value) => `<text x="10" y="${yFor(value) + 4}">${value.toFixed(1)}</text>`).join("")}
        ${xLabels.map(({ item, index }) => `<text x="${xFor(index)}" y="374" text-anchor="middle">${formatDate(item.date)}</text>`).join("")}
      </g>
      <polyline class="trend-line" points="${points}" />
      ${data.map((item, index) => `<circle class="trend-point" data-trend-index="${index}" cx="${xFor(index)}" cy="${yFor(weightForUnit(item.weightJin))}" r="3.5" />`).join("")}
      <g class="chart-point-values">${pointValueLabels}</g>
    </svg>
  `;
  const uniqueDays = new Set(data.map((item) => item.date));
  trendCheckDays.textContent = uniqueDays.size;
  trendLossDays.textContent = data.filter((item) => Number(item.delta) < 0).length;
  trendGainDays.textContent = data.filter((item) => Number(item.delta) > 0).length;
  const change = weightForUnit(data[data.length - 1].weightJin) - weightForUnit(data[0].weightJin);
  setTrendChange(change);
}
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function localChatBriefing() {
  const now = new Date();
  const month = `${now.getMonth() + 1}月`;
  const hour = now.getHours();
  const greeting = hour < 12 ? "早上好！又是新的一天☀~" : hour < 18 ? "下午好！今天也继续稳住~" : "晚上好！今天辛苦啦🌙~";
  const monthRecords = records.filter((item) => sameMonth(item.date, new Date(now.getFullYear(), now.getMonth(), 1)));
  const checkDays = new Set(monthRecords.map((item) => item.date)).size;
  const sorted = sortedRecords(monthRecords);
  const change = sorted.length >= 2 ? Number(sorted[sorted.length - 1].weightJin) - Number(sorted[0].weightJin) : 0;
  const changeText = change < 0 ? `已减${Math.abs(change).toFixed(1)}斤` : change > 0 ? `增加${change.toFixed(1)}斤` : "体重保持稳定";
  return {
    greeting,
    summary: `💦${month}里有${checkDays}天打卡，${changeText}，继续把节奏握在手里！`,
    reportTitle: `${month}体重月报`,
    reportSubtitle: "减重小结｜看见每一次记录里的坚持。",
    topics: ["晚餐怎么吃更适合减脂？", "体重突然上涨一定是胖了吗？", "平台期应该怎么调整？"]
  };
}

function applyChatBriefing(data) {
  const briefing = data || localChatBriefing();
  aiGreeting.textContent = briefing.greeting;
  aiSummary.textContent = briefing.summary;
  aiReportTitle.textContent = briefing.reportTitle;
  aiReportSubtitle.textContent = briefing.reportSubtitle;
  (briefing.topics || []).slice(0, 3).forEach((topic, index) => {
    if (chatTopicButtons[index]) chatTopicButtons[index].textContent = topic;
  });
}

async function loadChatBriefing(force = false) {
  if (chatBriefingLoading || (chatBriefingLoaded && !force)) return;
  applyChatBriefing(localChatBriefing());
  if (!currentUser) return;
  chatBriefingLoading = true;
  try {
    const data = await api("/api/chat/briefing", { method: "POST", body: JSON.stringify({}) });
    applyChatBriefing(data);
    chatBriefingLoaded = true;
  } catch (error) {
    applyChatBriefing(localChatBriefing());
  } finally {
    chatBriefingLoading = false;
  }
}
function sendReportPrompt() {
  const title = aiReportTitle.textContent.trim() || "体重月报";
  sendChatMessage(`帮我生成${title}，结合我的体重记录和饮食记录，输出月报总结、做得好的地方和下个月建议。`);
}
function appendChatMessage(role, text, extraClass = "") {
  const bubble = document.createElement("article");
  bubble.className = `chat-bubble ${role} ${extraClass}`.trim();
  bubble.textContent = text;
  chatThread.appendChild(bubble);
  chatThread.scrollIntoView({ block: "end", behavior: "smooth" });
  return bubble;
}

async function sendChatMessage(message) {
  const text = String(message || "").trim();
  if (!text) return;
  if (!currentUser) {
    setAuthMode("login");
    openAuth("登录后才能和小衡 AI 聊天。");
    return;
  }
  appendChatMessage("user", text);
  chatMessages.push({ role: "user", text });
  chatInput.value = "";
  chatInput.disabled = true;
  chatSend.disabled = true;
  const loading = appendChatMessage("bot", "小衡正在想...", "loading");
  try {
    const data = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: text, history: chatMessages.slice(-8) })
    });
    loading.classList.remove("loading");
    loading.textContent = data.reply || "小衡暂时没想好，换个问法试试。";
    chatMessages.push({ role: "assistant", text: loading.textContent });
  } catch (error) {
    loading.classList.remove("loading");
    loading.textContent = error.message || "小衡连接失败，稍后再试。";
  } finally {
    chatInput.disabled = false;
    chatSend.disabled = false;
    chatInput.focus();
  }
}
function setAuthMode(mode) {
  authMode = mode;
  authTitle.textContent = mode === "login" ? "登录账号" : "注册账号";
  authSubmit.textContent = mode === "login" ? "登录" : "注册并登录";
  authSwitch.textContent = mode === "login" ? "没有账号？立即注册" : "已有账号？去登录";
  authMessage.textContent = "";
}

function openAuth(message = "") {
  authMessage.textContent = message;
  authBackdrop.hidden = false;
  requestAnimationFrame(() => {
    authBackdrop.classList.add("is-open");
    authModal.classList.add("is-open");
    authModal.setAttribute("aria-hidden", "false");
  });
}

function closeAuthModal() {
  authBackdrop.classList.remove("is-open");
  authModal.classList.remove("is-open");
  authModal.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    authBackdrop.hidden = true;
  }, 240);
}

function showAppNotice(message) {
  appNotice.textContent = message;
  appNotice.hidden = false;
  appNotice.classList.add("is-open");
  clearTimeout(showAppNotice.timer);
  showAppNotice.timer = setTimeout(() => {
    appNotice.classList.remove("is-open");
    setTimeout(() => { appNotice.hidden = true; }, 180);
  }, 1800);
}

function closeProfileFeature() {
  if (onboardingRequired) {
    showAppNotice("先完成首次建档，就能开始记录啦。");
    return;
  }
  featureBackdrop.classList.remove("is-open");
  featurePanel.classList.remove("is-open");
  featurePanel.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    featureBackdrop.hidden = true;
  }, 180);
}

function forceCloseProfileFeature() {
  featureBackdrop.classList.remove("is-open");
  featurePanel.classList.remove("is-open");
  featurePanel.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    featureBackdrop.hidden = true;
  }, 180);
}

function openProfileFeature(title, bodyHtml) {
  featureTitle.textContent = title;
  featureBody.innerHTML = bodyHtml;
  featureBackdrop.hidden = false;
  requestAnimationFrame(() => {
    featureBackdrop.classList.add("is-open");
    featurePanel.classList.add("is-open");
    featurePanel.setAttribute("aria-hidden", "false");
  });
}

function profileDraft() {
  return JSON.parse(localStorage.getItem("hengran_profile_draft") || "{}");
}

function goalDraft() {
  return JSON.parse(localStorage.getItem("hengran_goal_draft") || "{}");
}

function profileFeatureHtml(action) {
  const profile = profileDraft();
  const goal = goalDraft();
  const templates = {
    "首次建档": `<div class="feature-summary"><strong>欢迎来到衡燃</strong><span>先填写基础信息，小衡会用它生成你的第一条体重记录和目标计划。</span></div><div class="feature-grid onboarding-grid"><label>身高/cm<input data-onboard-field="height" type="number" min="80" max="230" value="${profile.height || 168}"></label><label>当前体重<input data-onboard-field="weight" type="number" min="1" step="0.1" value="${profile.weight || 144}"></label><label>体重单位<select data-onboard-field="unit"><option value="jin" ${selectedUnit === "jin" ? "selected" : ""}>斤</option><option value="kg" ${selectedUnit === "kg" ? "selected" : ""}>公斤</option></select></label><label>目标体重<input data-onboard-field="target" type="number" min="1" step="0.1" value="${goal.target || 130}"></label><label class="wide">计划周期/天<input data-onboard-field="days" type="number" min="1" value="${goal.days || 90}"></label></div><button class="feature-primary" data-feature-submit="首次建档">保存并开始使用</button>`,
    "设置": `<div class="feature-summary"><strong>账号设置</strong><span>当前用于作品演示，登录账号后数据会保存到本地后端。</span></div><button class="feature-primary" data-feature-submit="设置">知道了</button>`,
    "身体档案": `<div class="feature-grid"><label>身高/cm<input data-profile-field="height" type="number" value="${profile.height || 168}"></label><label>年龄<input data-profile-field="age" type="number" value="${profile.age || 22}"></label><label>性别<select data-profile-field="gender"><option ${profile.gender === "女" ? "selected" : ""}>女</option><option ${profile.gender === "男" ? "selected" : ""}>男</option><option ${profile.gender === "保密" ? "selected" : ""}>保密</option></select></label><label>运动频率<select data-profile-field="activity"><option ${profile.activity === "轻度" ? "selected" : ""}>轻度</option><option ${profile.activity === "中等" ? "selected" : ""}>中等</option><option ${profile.activity === "高频" ? "selected" : ""}>高频</option></select></label></div><button class="feature-primary" data-feature-submit="身体档案">保存档案</button>`,
    "目标管理": `<div class="feature-grid"><label>目标体重/斤<input data-goal-field="target" type="number" value="${goal.target || 130}"></label><label>计划周期/天<input data-goal-field="days" type="number" value="${goal.days || 90}"></label></div><div class="feature-summary"><strong>目标预览</strong><span>小衡会根据你的体重记录，在首页、日历和趋势里一起同步阶段变化。</span></div><button class="feature-primary" data-feature-submit="目标管理">保存目标</button>`,
    "反馈建议": `<textarea class="feature-textarea" id="feedbackText" placeholder="写下你觉得哪里不好用，或者想加什么功能"></textarea><button class="feature-primary" data-feature-submit="反馈建议">提交反馈</button>`,
    "体重单位": `<div class="unit-choice"><button class="${selectedUnit === "jin" ? "active" : ""}" data-unit-choice="jin">斤</button><button class="${selectedUnit === "kg" ? "active" : ""}" data-unit-choice="kg">公斤</button></div><div class="feature-summary"><strong>当前默认单位：${selectedUnit === "jin" ? "斤" : "公斤"}</strong><span>新增体重记录时会默认使用这个单位。</span></div>`,
    "给我们评分": `<div class="rating-row" aria-label="评分"><button data-rating="1">★</button><button data-rating="2">★</button><button data-rating="3">★</button><button data-rating="4">★</button><button data-rating="5">★</button></div><p class="feature-note">点亮星星后，小衡会记录你的评分态度。</p>`,
    "推荐给朋友": `<div class="feature-summary"><strong>推荐文案</strong><span>我在用「衡燃」记录体重、饮食和趋势，还能让 AI 小衡帮我分析减重计划。</span></div><button class="feature-primary" data-feature-submit="推荐给朋友">复制推荐语</button>`,
    "关于我们": `<div class="feature-summary"><strong>衡燃 v1.0</strong><span>一个面向减重记录、饮食打卡和 AI 分析的产品经理作品原型。</span></div><p class="feature-note">当前已包含账号、后端保存、体重记录、饮食记录、趋势图和 AI 聊天。</p>`
  };
  return templates[action] || `<div class="feature-summary"><strong>${action}</strong><span>这个功能正在整理中。</span></div>`;
}

function openOnboarding() {
  onboardingRequired = true;
  openProfileFeature("首次建档", profileFeatureHtml("首次建档"));
}

function handleProfileAction(action) {
  const waitingActions = new Set(["立即开通", "主题颜色"]);
  if (waitingActions.has(action)) {
    showAppNotice(`${action}功能还没有开发，请您耐心等待。`);
    return;
  }
  openProfileFeature(action, profileFeatureHtml(action));
}

function weightToJin(value, unit) {
  return unit === "kg" ? value * 2 : value;
}

async function saveOnboarding() {
  const values = {};
  featureBody.querySelectorAll("[data-onboard-field]").forEach((input) => { values[input.dataset.onboardField] = input.value; });
  const height = Number(values.height);
  const weight = Number(values.weight);
  const target = Number(values.target);
  const days = Number(values.days);
  const unit = values.unit || "jin";
  if (!height || !weight || !target || !days) {
    showAppNotice("请把身高、体重、目标体重和计划周期填完整。");
    return;
  }
  const initialWeightJin = weightToJin(weight, unit);
  const targetWeightJin = weightToJin(target, unit);
  localStorage.setItem("hengran_profile_draft", JSON.stringify({ height, weight, unit }));
  localStorage.setItem("hengran_goal_draft", JSON.stringify({ target, days }));
  localStorage.setItem("hengran_weight_unit", unit);
  selectedUnit = unit;
  await api("/api/profile", {
    method: "POST",
    body: JSON.stringify({ heightCm: height, initialWeightJin, targetWeightJin, planDays: days, unit })
  });
  const data = await api("/api/weights", {
    method: "POST",
    body: JSON.stringify({ date: dateKey(new Date()), weightJin: initialWeightJin })
  });
  records = [data.record];
  onboardingRequired = false;
  renderTimeline();
  forceCloseProfileFeature();
  showAppNotice("建档成功，已经生成第一条体重记录。");
}

async function handleFeaturePanelClick(event) {
  const unitChoice = event.target.closest("[data-unit-choice]");
  if (unitChoice) {
    setUnit(unitChoice.dataset.unitChoice);
    localStorage.setItem("hengran_weight_unit", selectedUnit);
    openProfileFeature("体重单位", profileFeatureHtml("体重单位"));
    showAppNotice("默认体重单位已更新。");
    return;
  }
  const rating = event.target.closest("[data-rating]");
  if (rating) {
    featureBody.querySelectorAll("[data-rating]").forEach((button) => button.classList.toggle("active", Number(button.dataset.rating) <= Number(rating.dataset.rating)));
    localStorage.setItem("hengran_rating", rating.dataset.rating);
    showAppNotice(`已记录 ${rating.dataset.rating} 星评分，谢谢你。`);
    return;
  }
  const submit = event.target.closest("[data-feature-submit]");
  if (!submit) return;
  const action = submit.dataset.featureSubmit;
  try {
    if (action === "首次建档") {
      await saveOnboarding();
      return;
    }
    if (action === "身体档案") {
      const data = {};
      featureBody.querySelectorAll("[data-profile-field]").forEach((input) => { data[input.dataset.profileField] = input.value; });
      localStorage.setItem("hengran_profile_draft", JSON.stringify(data));
      showAppNotice("身体档案已保存。");
      return;
    }
    if (action === "目标管理") {
      const data = {};
      featureBody.querySelectorAll("[data-goal-field]").forEach((input) => { data[input.dataset.goalField] = input.value; });
      localStorage.setItem("hengran_goal_draft", JSON.stringify(data));
      showAppNotice("目标计划已保存。");
      return;
    }
    if (action === "反馈建议") {
      const text = document.getElementById("feedbackText").value.trim();
      showAppNotice(text ? "反馈已收到，谢谢你的建议。" : "先写一点反馈内容吧。");
      return;
    }
    if (action === "推荐给朋友") {
      const text = "我在用衡燃记录体重、饮食和趋势，还能让 AI 小衡帮我分析减重计划。";
      navigator.clipboard?.writeText(text);
      showAppNotice("推荐语已复制。");
      return;
    }
    closeProfileFeature();
  } catch (error) {
    showAppNotice(error.message || "保存失败，请稍后再试。");
  }
}
function updateAuthUi() {
  if (currentUser) {
    profileName.textContent = currentUser.username;
    profileLoginText.textContent = "已登录，点击切换账号";
  } else {
    profileName.textContent = "衡燃";
    profileLoginText.textContent = "点击此处注册/登录";
  }
}

async function loadWeightsFromServer() {
  const data = await api("/api/weights");
  records = currentUser ? data.records : (data.records.length ? data.records : [...defaultRecords]);
  renderTimeline();
  return currentUser && data.records.length === 0;
}

async function loadFoodsFromServer() {
  const data = await api("/api/foods");
  foods = currentUser ? data.foods : (data.foods.length ? data.foods : [...defaultFoods]);
  renderFoodPage();
  renderTrendPage();
}

async function bootstrapAuth() {
  if (!authToken) {
    updateAuthUi();
    renderTimeline();
    renderFoodPage();
    renderTrendPage();
    return;
  }
  try {
    const data = await api("/api/me");
    currentUser = data.user;
    updateAuthUi();
    const needsOnboarding = await loadWeightsFromServer();
    await loadFoodsFromServer();
    if (needsOnboarding) openOnboarding();
  } catch (error) {
    authToken = "";
    currentUser = null;
    localStorage.removeItem("hengran_token");
    updateAuthUi();
    renderTimeline();
    renderFoodPage();
    renderTrendPage();
  }
}

function openWeightSheet() {
  if (!currentUser) {
    setAuthMode("login");
    openAuth("登录后才能把记录保存到后端数据库。");
    return;
  }
  const today = new Date();
  dateInput.value = dateKey(today);
  weightInput.value = "";
  backdrop.hidden = false;
  requestAnimationFrame(() => {
    backdrop.classList.add("is-open");
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
  });
}

function openFoodSheet() {
  if (!currentUser) {
    setAuthMode("login");
    openAuth("登录后才能保存食物记录。");
    return;
  }
  foodEntryDate.value = selectedFoodDate;
  foodNameInput.value = "";
  foodGramsInput.value = "";
  foodKcalInput.value = "";
  backdrop.hidden = false;
  requestAnimationFrame(() => {
    backdrop.classList.add("is-open");
    foodEntrySheet.classList.add("is-open");
    foodEntrySheet.setAttribute("aria-hidden", "false");
  });
}

function closeSheets() {
  backdrop.classList.remove("is-open");
  sheet.classList.remove("is-open");
  foodEntrySheet.classList.remove("is-open");
  sheet.setAttribute("aria-hidden", "true");
  foodEntrySheet.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    backdrop.hidden = true;
  }, 240);
}

function setUnit(unit) {
  const currentValue = Number(weightInput.value);
  if (currentValue) {
    weightInput.value = unit === "kg" && selectedUnit === "jin"
      ? (currentValue / 2).toFixed(1)
      : unit === "jin" && selectedUnit === "kg"
        ? (currentValue * 2).toFixed(1)
        : currentValue.toFixed(1);
  }
  selectedUnit = unit;
  unitButtons.forEach((button) => button.classList.toggle("active", button.dataset.unit === unit));
}

function setActiveTab(tabName) {
  currentTab = tabName;
  if (tabName === "food") {
    const today = new Date();
    selectedFoodDate = dateKey(today);
    foodMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  }
  if (tabName === "chat") loadChatBriefing();
  isDateDropdownOpen = false;
  home.classList.remove("detail-mode");
  selectedDetailRecord = null;
  home.classList.toggle("food-mode", tabName === "food");
  home.classList.toggle("trend-mode", tabName === "trend");
  home.classList.toggle("chat-mode", tabName === "chat");
  home.classList.toggle("profile-mode", tabName === "profile");
  tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tabName));
  renderFoodPage();
  renderTrendPage();
}

function detailDisplayWeight(record) {
  const weight = Number(record.weightJin);
  return detailUnit === "kg" ? (weight / 2).toFixed(1) : weight.toFixed(1);
}

function detailDisplayDelta(record) {
  const delta = Number(record.delta || 0);
  const value = detailUnit === "kg" ? delta / 2 : delta;
  const unitText = detailUnit === "kg" ? "公斤" : "斤";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}${unitText}`;
}

function updateDetailLockUi() {
  detailLockToggle.classList.toggle("locked", detailUnitLocked);
  detailLockToggle.classList.toggle("unlocked", !detailUnitLocked);
  detailLockToggle.setAttribute("aria-pressed", String(detailUnitLocked));
  detailLockToggle.setAttribute("aria-label", detailUnitLocked ? "单位切换不换算" : "单位切换自动换算");
}

function renderRecordDetail() {
  if (!selectedDetailRecord) return;
  const dayFoods = foodsForDate(selectedDetailRecord.date);
  detailDateTitle.textContent = formatDate(selectedDetailRecord.date);
  detailTimeTitle.textContent = selectedDetailRecord.time;
  detailWeightInput.value = detailDisplayWeight(selectedDetailRecord);
  detailDeltaText.textContent = detailDisplayDelta(selectedDetailRecord);
  detailFoodText.textContent = dayFoods.length ? dayFoods.map((item) => item.name).join("、") : "暂无食物记录";
  detailKcalText.textContent = `${Math.round(dayFoods.reduce((sum, item) => sum + Number(item.kcal || 0), 0))}kcal`;
  detailUnitButtons.forEach((button) => button.classList.toggle("active", button.dataset.detailUnit === detailUnit));
  updateDetailLockUi();
}

function openRecordDetail(record) {
  selectedDetailRecord = record;
  detailUnit = "jin";
  detailUnitLocked = true;
  renderRecordDetail();
  home.classList.add("detail-mode");
  home.classList.remove("food-mode", "trend-mode", "chat-mode", "profile-mode");
  tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === "weight"));
}

function closeRecordDetail() {
  home.classList.remove("detail-mode");
  selectedDetailRecord = null;
}

function setDetailUnit(unit) {
  if (!selectedDetailRecord || unit === detailUnit) return;
  const currentValue = Number(detailWeightInput.value);
  const shouldConvert = !detailUnitLocked;
  detailUnit = unit;
  if (currentValue && shouldConvert) {
    detailWeightInput.value = unit === "kg" ? (currentValue / 2).toFixed(1) : (currentValue * 2).toFixed(1);
  }
  detailDeltaText.textContent = detailDisplayDelta(selectedDetailRecord);
  detailUnitButtons.forEach((button) => button.classList.toggle("active", button.dataset.detailUnit === detailUnit));
}

async function saveDetailRecord() {
  if (!selectedDetailRecord) return;
  if (!currentUser || !selectedDetailRecord.id) {
    setAuthMode("login");
    openAuth("登录后才能保存记录修改。");
    return;
  }
  const rawWeight = Number(detailWeightInput.value);
  if (!rawWeight) return;
  const weightJin = detailUnit === "kg" ? rawWeight * 2 : rawWeight;
  saveRecordDetail.disabled = true;
  try {
    const data = await api("/api/weights/update", {
      method: "POST",
      body: JSON.stringify({ id: selectedDetailRecord.id, weightJin })
    });
    records = records.map((record) => record.id === data.record.id ? data.record : record);
    selectedDetailRecord = data.record;
    renderTimeline();
    renderRecordDetail();
    saveRecordDetail.textContent = "已保存";
    setTimeout(() => { saveRecordDetail.textContent = "保存修改"; }, 1200);
  } catch (error) {
    setAuthMode("login");
    openAuth(error.message || "保存失败，请重新登录。");
  } finally {
    saveRecordDetail.disabled = false;
  }
}

function changeFoodMonth(delta) {
  foodMonth = new Date(foodMonth.getFullYear(), foodMonth.getMonth() + delta, 1);
  const sameMonthSelected = sameMonth(selectedFoodDate, foodMonth);
  if (!sameMonthSelected) selectedFoodDate = dateKey(new Date(foodMonth.getFullYear(), foodMonth.getMonth(), 1));
  renderFoodPage();
}

tabButtons.forEach((button) => button.addEventListener("click", () => setActiveTab(button.dataset.tab)));
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendChatMessage(chatInput.value);
});
chatTopicButtons.forEach((button) => button.addEventListener("click", () => sendChatMessage(button.textContent)));
reportCardButton.addEventListener("click", sendReportPrompt);
reportCardButton.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  sendReportPrompt();
});
trendUnitToggle.addEventListener("click", () => {
  trendUnit = trendUnit === "jin" ? "kg" : "jin";
  renderTrendPage();
});
trendRangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    trendRange = button.dataset.trendRange;
    renderTrendPage();
  });
});
trendChartWrap.addEventListener("click", (event) => {
  const point = event.target.closest(".trend-point");
  if (!point) return;
  const item = trendRecordsForRange()[Number(point.dataset.trendIndex)];
  if (!item) return;
  trendHint.textContent = `${formatDate(item.date)} ${weightForUnit(item.weightJin).toFixed(1)}${unitLabel()}`;
});
openEntry.addEventListener("click", () => currentTab === "food" ? openFoodSheet() : openWeightSheet());
closeEntry.addEventListener("click", closeSheets);
closeFoodEntry.addEventListener("click", closeSheets);
backdrop.addEventListener("click", closeSheets);
closeAuth.addEventListener("click", closeAuthModal);
authBackdrop.addEventListener("click", closeAuthModal);
profileLoginTrigger.addEventListener("click", () => { setAuthMode("login"); openAuth(currentUser ? "输入另一个账号即可切换登录。" : ""); });
profileActionButtons.forEach((button) => button.addEventListener("click", () => handleProfileAction(button.dataset.profileAction)));
closeFeaturePanel.addEventListener("click", closeProfileFeature);
featureBackdrop.addEventListener("click", closeProfileFeature);
featureBody.addEventListener("click", handleFeaturePanelClick);
authSwitch.addEventListener("click", () => setAuthMode(authMode === "login" ? "register" : "login"));
unitButtons.forEach((button) => button.addEventListener("click", () => setUnit(button.dataset.unit)));
backToTimeline.addEventListener("click", closeRecordDetail);
detailUnitButtons.forEach((button) => button.addEventListener("click", () => setDetailUnit(button.dataset.detailUnit)));
detailLockToggle.addEventListener("click", () => { detailUnitLocked = !detailUnitLocked; updateDetailLockUi(); });
saveRecordDetail.addEventListener("click", saveDetailRecord);
prevMonth.addEventListener("click", () => changeFoodMonth(-1));
nextMonth.addEventListener("click", () => changeFoodMonth(1));
todayFoodMonth.addEventListener("click", () => { const today = new Date(); foodMonth = new Date(today.getFullYear(), today.getMonth(), 1); selectedFoodDate = dateKey(today); renderFoodPage(); });
monthPicker.addEventListener("click", () => {
  isDateDropdownOpen = !isDateDropdownOpen;
  renderFoodPage();
});

dateDropdown.addEventListener("click", (event) => {
  const day = event.target.closest("[data-picker-date]");
  if (!day) return;
  selectedFoodDate = day.dataset.pickerDate;
  const parsed = parseDate(selectedFoodDate);
  foodMonth = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  isDateDropdownOpen = false;
  renderFoodPage();
});
monthGrid.addEventListener("click", (event) => {
  const day = event.target.closest(".calendar-day");
  if (!day) return;
  selectedFoodDate = day.dataset.date;
  foodMonth = new Date(parseDate(selectedFoodDate).getFullYear(), parseDate(selectedFoodDate).getMonth(), 1);
  renderFoodPage();
});
monthGrid.addEventListener("touchstart", (event) => { swipeStartX = event.touches[0].clientX; }, { passive: true });
monthGrid.addEventListener("touchend", (event) => {
  const distance = event.changedTouches[0].clientX - swipeStartX;
  if (Math.abs(distance) > 45) changeFoodMonth(distance < 0 ? 1 : -1);
}, { passive: true });

timeline.addEventListener("click", (event) => {
  const card = event.target.closest(".record-card");
  if (!card) return;
  const record = records.find((item) => String(item.id || "") === card.dataset.recordId) || records.find((item) => item.date === card.dataset.recordDate);
  if (record) openRecordDetail(record);
});
timeline.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const card = event.target.closest(".record-card");
  if (!card) return;
  const record = records.find((item) => String(item.id || "") === card.dataset.recordId) || records.find((item) => item.date === card.dataset.recordDate);
  if (record) openRecordDetail(record);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage.textContent = "";
  authSubmit.disabled = true;
  try {
    const data = await api(authMode === "login" ? "/api/login" : "/api/register", {
      method: "POST",
      body: JSON.stringify({ username: authUsername.value.trim(), password: authPassword.value })
    });
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem("hengran_token", authToken);
    updateAuthUi();
    const needsOnboarding = await loadWeightsFromServer();
    await loadFoodsFromServer();
    chatBriefingLoaded = false;
    loadChatBriefing(true);
    closeAuthModal();
    authForm.reset();
    if (needsOnboarding) setTimeout(openOnboarding, 260);
  } catch (error) {
    authMessage.textContent = error.message;
  } finally {
    authSubmit.disabled = false;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const rawWeight = Number(weightInput.value);
  if (!rawWeight) return;
  const weightJin = selectedUnit === "kg" ? rawWeight * 2 : rawWeight;
  try {
    const data = await api("/api/weights", { method: "POST", body: JSON.stringify({ date: dateInput.value, weightJin }) });
    records = [data.record, ...records];
    selectedFoodDate = data.record.date;
    foodMonth = new Date(parseDate(data.record.date).getFullYear(), parseDate(data.record.date).getMonth(), 1);
    renderTimeline();
    closeSheets();
  } catch (error) {
    closeSheets();
    setAuthMode("login");
    openAuth(error.message || "保存失败，请重新登录。");
  }
});

foodEntryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = {
      date: foodEntryDate.value,
      name: foodNameInput.value.trim(),
      grams: Number(foodGramsInput.value),
      kcal: foodKcalInput.value ? Number(foodKcalInput.value) : ""
    };
    const data = await api("/api/foods", { method: "POST", body: JSON.stringify(payload) });
    foods = [data.food, ...foods];
    selectedFoodDate = data.food.date;
    foodMonth = new Date(parseDate(data.food.date).getFullYear(), parseDate(data.food.date).getMonth(), 1);
    renderFoodPage();
    closeSheets();
  } catch (error) {
    closeSheets();
    setAuthMode("login");
    openAuth(error.message || "保存食物失败，请重新登录。");
  }
});

applyChatBriefing(localChatBriefing());
bootstrapAuth();


















