"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabase, hasSupabaseConfig } from "../lib/supabase";

const tabs = [
  { id: "weight", label: "体重" },
  { id: "food", label: "饮食" },
  { id: "trend", label: "趋势" },
  { id: "chat", label: "小衡" },
  { id: "profile", label: "我的" }
];

const weeks = ["一", "二", "三", "四", "五", "六", "日"];
const topicSets = [
  ["晚餐怎么吃更适合减脂？", "体重突然上涨该怎么看？", "平台期应该怎么调整？"],
  ["中午吃外卖怎么选？", "运动后体重涨正常吗？", "今天热量超了怎么办？"]
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeText() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDate(date) {
  const [, month, day] = String(date || todayKey()).split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function sortRecords(records) {
  return [...records].sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`));
}

function recalcDeltas(records) {
  const asc = [...records].sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`));
  return asc.map((item, index) => {
    const previous = asc[index - 1];
    return { ...item, delta: previous ? Number((Number(item.weight_jin) - Number(previous.weight_jin)).toFixed(1)) : 0 };
  });
}

function deltaParts(value) {
  const n = Number(value || 0);
  return {
    cls: n > 0 ? "gain" : n < 0 ? "loss" : "flat",
    mark: n > 0 ? "+" : "-",
    num: n === 0 ? "0" : Math.abs(n).toFixed(1)
  };
}

function deltaText(value) {
  const n = Number(value || 0);
  if (n > 0) return `+${n.toFixed(1)}斤`;
  if (n < 0) return `${n.toFixed(1)}斤`;
  return "0斤";
}

function bmi(weightJin, heightCm) {
  if (!weightJin || !heightCm) return "--";
  const h = Number(heightCm) / 100;
  return Math.round((Number(weightJin) / 2) / (h * h));
}

function localId() {
  return `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function buildMonthDays(selectedDate, weights, foods) {
  const current = new Date(`${selectedDate}T00:00:00`);
  const year = current.getFullYear();
  const month = current.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 35 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayWeights = weights.filter((item) => item.date === date);
    const dayFoods = foods.filter((item) => item.date === date);
    const kcal = dayFoods.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
    const dayWeight = dayWeights[0];
    return {
      date,
      day: d.getDate(),
      active: date === selectedDate,
      outside: d.getMonth() !== month,
      weightText: dayWeight ? deltaText(dayWeight.delta) : "",
      weightClass: Number(dayWeight?.delta || 0) > 0 ? "gain" : "loss",
      kcal
    };
  });
}

function weekdayText(date) {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
}

function chartModel(records, unit) {
  const source = sortRecords(records).reverse();
  const values = source.map((item) => unit === "kg" ? Number(item.weight_jin) / 2 : Number(item.weight_jin));
  let min = values.length ? Math.min(...values) : 144;
  let max = values.length ? Math.max(...values) : 147;
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const count = 3;
  const yTicks = Array.from({ length: count }, (_, index) => {
    const value = max - ((max - min) / (count - 1)) * index;
    return { value: value.toFixed(1), top: `${(index / (count - 1)) * 100}%` };
  });
  const points = source.map((item, index) => {
    const value = values[index];
    const left = source.length === 1 ? 50 : 8 + (index / (source.length - 1)) * 84;
    const top = 12 + ((max - value) / (max - min || 1)) * 68;
    const [, month, day] = item.date.split("-");
    return {
      ...item,
      label: value.toFixed(1),
      dateLabel: `${month}/${day}`,
      left,
      top
    };
  });
  const segments = points.slice(0, -1).map((item, index) => {
    const next = points[index + 1];
    const dx = next.left - item.left;
    const dy = next.top - item.top;
    return {
      key: `${item.id}-${next.id}`,
      left: item.left,
      top: item.top,
      width: Math.sqrt(dx * dx + dy * dy),
      angle: Math.atan2(dy, dx) * 180 / Math.PI
    };
  });
  return { yTicks, points, segments };
}

function trendRangeRecords(records, range) {
  const asc = sortRecords(records).reverse();
  if (range === "default") return asc.slice(-2);
  if (range === "all") return asc;
  const latest = asc[asc.length - 1];
  if (!latest) return [];
  const end = new Date(`${latest.date}T00:00:00`);
  const start = new Date(end);
  start.setDate(end.getDate() - (range === "week" ? 6 : 92));
  return asc.filter((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    return date >= start && date <= end;
  });
}

function displayWeight(jin, unit) {
  const value = unit === "kg" ? Number(jin || 0) / 2 : Number(jin || 0);
  return value ? Number(value.toFixed(1)) : "";
}

function toWeightJin(value, unit) {
  const raw = Number(value || 0);
  return unit === "kg" ? Number((raw * 2).toFixed(1)) : raw;
}

function unitWeightToJin(value, selectedUnit) {
  const raw = Number(value || 0);
  return selectedUnit === "kg" ? Number((raw * 2).toFixed(1)) : raw;
}

function defaultProfile(user) {
  const accountName = user?.user_metadata?.account_name || user?.email?.split("@")[0] || "小衡用户";
  return {
    nickname: accountName,
    birthday: "",
    gender: "保密",
    city: "",
    height_cm: "",
    initial_weight_jin: "",
    target_weight_jin: "",
    plan_days: ""
  };
}

export default function Home() {
  const configured = hasSupabaseConfig();
  const [supabase] = useState(() => createBrowserSupabase());
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [registerMode, setRegisterMode] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    nickname: "",
    birthday: "",
    gender: "保密",
    city: "",
    height_cm: "",
    initial_weight: "",
    initial_unit: "jin",
    target_weight: "",
    target_unit: "jin",
    plan_days: ""
  });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("weight");
  const [weights, setWeights] = useState([]);
  const [foods, setFoods] = useState([]);
  const [profile, setProfile] = useState({ nickname: "小衡用户", height_cm: "", target_weight_jin: "", plan_days: "" });
  const [notice, setNotice] = useState("");
  const [unit, setUnit] = useState("jin");
  const [sheet, setSheet] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [weightForm, setWeightForm] = useState({ date: todayKey(), weight: "" });
  const [foodForm, setFoodForm] = useState({ date: todayKey(), name: "", grams: "", kcal: "" });
  const [profileForm, setProfileForm] = useState({});
  const [feedbackForm, setFeedbackForm] = useState({ content: "", contact: "" });
  const [chatInput, setChatInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState([{ role: "bot", text: "我是小衡，可以帮你分析体重、饮食和运动计划。" }]);
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailWeight, setDetailWeight] = useState("");
  const [detailLocked, setDetailLocked] = useState(true);
  const [profileDetail, setProfileDetail] = useState(false);
  const [trendRange, setTrendRange] = useState("default");
  const [selectedTrendDate, setSelectedTrendDate] = useState("");
  const [touchStartX, setTouchStartX] = useState(0);
  const chatBottomRef = useRef(null);
  const datePickerRef = useRef(null);

  const sortedWeights = useMemo(() => sortRecords(recalcDeltas(weights)), [weights]);
  const stats = useMemo(() => {
    const current = sortedWeights[0];
    const asc = [...sortedWeights].reverse();
    const change = asc.length >= 2 ? Number((asc[asc.length - 1].weight_jin - asc[0].weight_jin).toFixed(1)) : 0;
    return {
      currentWeight: current ? Number(current.weight_jin).toFixed(1) : "--",
      checkDays: new Set(weights.map((item) => item.date)).size,
      lossDays: weights.filter((item) => Number(item.delta || 0) < 0).length,
      gainDays: weights.filter((item) => Number(item.delta || 0) > 0).length,
      change,
      loss: change < 0 ? Math.abs(change).toFixed(1) : "0.0",
      bmi: bmi(current?.weight_jin, profile.height_cm || 168)
    };
  }, [weights, sortedWeights, profile.height_cm]);
  const selectedFoods = foods.filter((item) => item.date === selectedDate);
  const monthDays = buildMonthDays(selectedDate, weights, foods);
  const selectedMonth = new Date(`${selectedDate}T00:00:00`);
  const topics = topicSets[stats.checkDays % topicSets.length];
  const trendRecords = useMemo(() => trendRangeRecords(weights, trendRange), [weights, trendRange]);
  const chart = chartModel(trendRecords, unit);
  const chartLine = chart.points.map((point) => `${point.left},${point.top}`).join(" ");
  const activeTrendDate = selectedTrendDate || chart.points[chart.points.length - 1]?.date || sortedWeights[0]?.date || todayKey();
  const trendDayWeights = sortedWeights.filter((item) => item.date === activeTrendDate);
  const trendDayFoods = foods.filter((item) => item.date === activeTrendDate);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (supabase && user) loadCloudData();
  }, [supabase, user]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function loadCloudData() {
    const [{ data: weightRows }, { data: foodRows }, { data: profileRows }] = await Promise.all([
      supabase.from("weights").select("*").order("date", { ascending: false }).order("time", { ascending: false }),
      supabase.from("foods").select("*").order("date", { ascending: false }).order("time", { ascending: false }),
      supabase.from("profiles").select("*").limit(1)
    ]);
    setWeights(weightRows || []);
    setFoods(foodRows || []);
    const nextProfile = profileRows?.[0] || defaultProfile(user);
    setProfile(nextProfile);
    setProfileForm(nextProfile);
    if (!profileRows?.length) {
      await supabase.from("profiles").upsert({ id: user.id, nickname: nextProfile.nickname });
    }
  }

  function accountEmail() {
    const name = account.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(name)) return "";
    return `${name}@xiaoheng.local`;
  }

  async function signIn() {
    const email = accountEmail();
    if (!email) return setNotice("账号名只能用小写字母、数字、下划线，3-20 位");
    if (!password) return setNotice("请输入密码");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setNotice(error ? error.message : "已登录");
  }

  async function signUp() {
    const email = accountEmail();
    if (!email) return setNotice("账号名只能用小写字母、数字、下划线，3-20 位");
    if (password.length < 6) return setNotice("密码至少 6 位");
    if (!registerMode) {
      setRegisterMode(true);
      return;
    }
    if (!registerForm.nickname.trim()) return setNotice("请填写昵称");
    if (!registerForm.gender) return setNotice("请选择性别");
    if (!registerForm.height_cm) return setNotice("请填写身高");
    if (!registerForm.initial_weight) return setNotice("请填写当前体重");
    if (!registerForm.target_weight) return setNotice("请填写目标体重");
    if (!registerForm.plan_days) return setNotice("请填写计划天数");
    const nickname = registerForm.nickname.trim();
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { account_name: account.trim() } } });
    if (error) return setNotice(error.message);
    const login = await supabase.auth.signInWithPassword({ email, password });
    const nextUser = login.data?.user || data.user;
    if (!login.error && nextUser) {
      const profileRow = {
        id: nextUser.id,
        nickname,
        birthday: registerForm.birthday || "",
        gender: registerForm.gender || "保密",
        city: registerForm.city.trim(),
        height_cm: Number(registerForm.height_cm || 0),
        initial_weight_jin: unitWeightToJin(registerForm.initial_weight, registerForm.initial_unit),
        target_weight_jin: unitWeightToJin(registerForm.target_weight, registerForm.target_unit),
        plan_days: Number(registerForm.plan_days || 0)
      };
      const { error: profileError } = await supabase.from("profiles").upsert(profileRow);
      if (profileError) return setNotice(`注册成功，但资料保存失败：${profileError.message}`);
      setProfile(profileRow);
      setProfileForm(profileRow);
      setUnit(registerForm.initial_unit);
    }
    setNotice(login.error ? "注册成功，但还不能登录。请到 Supabase 关闭 Confirm email 后再试。" : "注册成功，已登录。");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setWeights([]);
    setFoods([]);
    setProfile(defaultProfile(null));
    setProfileDetail(false);
  }

  async function addWeight() {
    const value = toWeightJin(weightForm.weight, unit);
    if (!weightForm.date) return setNotice("请选择日期");
    if (!value) return setNotice("请输入体重");
    const row = { date: weightForm.date, time: timeText(), weight_jin: value, mood: new Date().getHours() >= 18 ? "moon" : "sun" };
    setWeights(sortRecords(recalcDeltas([{ id: localId(), ...row }, ...weights])));
    setSheet(null);
    setWeightForm({ date: todayKey(), weight: "" });
    const { error } = await supabase.from("weights").insert(row);
    if (error) setNotice(error.message);
    await loadCloudData();
  }

  function openWeightDetail(item) {
    setDetailRecord(item);
    setDetailWeight(displayWeight(item.weight_jin, unit));
    setDetailLocked(true);
  }

  function switchDetailUnit(nextUnit) {
    if (nextUnit === unit) return;
    if (detailLocked) {
      setUnit(nextUnit);
      return;
    }
    const jin = toWeightJin(detailWeight || detailRecord?.weight_jin, unit);
    setUnit(nextUnit);
    setDetailWeight(displayWeight(jin, nextUnit));
  }

  async function saveWeightDetail() {
    if (!detailRecord) return;
    const value = toWeightJin(detailWeight, unit);
    if (!value) return setNotice("请输入体重");
    const updated = weights.map((item) => item.id === detailRecord.id ? { ...item, weight_jin: value } : item);
    setWeights(sortRecords(recalcDeltas(updated)));
    const { error } = await supabase.from("weights").update({ weight_jin: value, updated_at: new Date().toISOString() }).eq("id", detailRecord.id);
    if (error) setNotice(error.message);
    setDetailRecord(null);
    await loadCloudData();
  }

  async function addFood() {
    if (!foodForm.date) return setNotice("请选择日期");
    if (!foodForm.name.trim()) return setNotice("请输入食物名称");
    if (!foodForm.grams || Number(foodForm.grams) <= 0) return setNotice("请输入有效克数");
    let kcal = Number(foodForm.kcal || 0);
    if (!kcal) {
      setNotice("正在估算热量...");
      const res = await fetch("/api/calorie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: foodForm.name.trim(), grams: Number(foodForm.grams) })
      });
      const data = await res.json();
      if (!res.ok) return setNotice(data.error || "热量估算失败");
      kcal = Number(data.kcal || 0);
      if (!kcal) return setNotice("热量估算失败");
    }
    const row = {
      date: foodForm.date,
      time: timeText(),
      name: foodForm.name.trim(),
      grams: Number(foodForm.grams || 0),
      kcal
    };
    setFoods([{ id: localId(), ...row }, ...foods]);
    setSheet(null);
    setFoodForm({ date: selectedDate, name: "", grams: "", kcal: "" });
    const { error } = await supabase.from("foods").insert(row);
    if (error) setNotice(error.message);
    await loadCloudData();
  }

  function changeMonth(delta) {
    const d = new Date(`${selectedDate}T00:00:00`);
    const next = new Date(d.getFullYear(), d.getMonth() + delta, 1);
    const day = String(Math.min(d.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate())).padStart(2, "0");
    setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${day}`);
  }

  function onCalendarTouchEnd(e) {
    const endX = e.changedTouches?.[0]?.clientX || e.clientX;
    const distance = endX - touchStartX;
    if (Math.abs(distance) < 45) return;
    changeMonth(distance < 0 ? 1 : -1);
  }

  async function saveProfile(kind) {
    const next = { ...profile, ...profileForm };
    if (kind === "body" || kind === "all") {
      next.height_cm = Number(profileForm.height_cm || 0);
      next.initial_weight_jin = toWeightJin(profileForm.initial_weight || profileForm.initial_weight_jin, unit);
    }
    if (kind === "goal" || kind === "all") {
      next.target_weight_jin = toWeightJin(profileForm.target_weight || profileForm.target_weight_jin, unit);
      next.plan_days = Number(profileForm.plan_days || 0);
    }
    const row = {
      id: user.id,
      nickname: next.nickname || "小衡用户",
      birthday: next.birthday || "",
      gender: next.gender || "保密",
      city: next.city || "",
      height_cm: Number(next.height_cm || 0),
      initial_weight_jin: Number(next.initial_weight_jin || 0),
      target_weight_jin: Number(next.target_weight_jin || 0),
      plan_days: Number(next.plan_days || 0)
    };
    const { error } = await supabase.from("profiles").upsert(row);
    setNotice(error ? error.message : "已保存");
    setSheet(null);
    if (!error) setProfileDetail(false);
    await loadCloudData();
  }

  async function submitFeedback() {
    const content = feedbackForm.content.trim();
    if (!content) return setNotice("请填写反馈内容");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...feedbackForm,
          page: tab,
          profile,
          account: { id: user.id, email: user.email }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "反馈发送失败");
      setFeedbackForm({ content: "", contact: "" });
      setSheet(null);
      setNotice("反馈已发送到邮箱");
    } catch (error) {
      setNotice(error.message || "反馈发送失败");
    }
  }

  async function shareApp() {
    const url = typeof window !== "undefined" ? window.location.origin : "https://hengran.vercel.app";
    const text = `打开浏览器，搜索网址：${url}，和我一起健康生活吧！`;
    await navigator.clipboard?.writeText(text);
    setNotice("已复制");
  }

  async function askXiaoheng(text = chatInput) {
    const message = text.trim();
    if (!message || thinking) return;
    const next = [...messages, { role: "user", text: message }];
    setMessages(next);
    setChatInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, weights, foods, profile })
      });
      const data = await res.json();
      setMessages([...next, { role: "bot", text: data.reply || data.error || "小衡暂时没有回复。" }]);
    } catch (error) {
      setMessages([...next, { role: "bot", text: error.message || "AI 请求失败。" }]);
    } finally {
      setThinking(false);
    }
  }

  if (loading) return <main className="phone shell">加载中...</main>;
  if (!configured) {
    return (
      <main className="phone shell">
        <h1>小衡网站版</h1>
        <p className="muted">还没有配置 Supabase。复制 `.env.example` 为 `.env.local`，填入 Supabase URL、Anon Key 和 DeepSeek Key 后重启。</p>
      </main>
    );
  }
  if (!user) {
    return (
      <main className="phone shell login-page">
        <h1>小衡体重管理助手</h1>
        <p>登录后，体重、饮食和目标都会保存到云端，不怕换手机或清缓存。</p>
        <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="账号名：字母/数字/下划线" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入密码，至少 6 位" />
        {registerMode && (
          <div className="register-panel">
            <input value={registerForm.nickname} onChange={(e) => setRegisterForm({ ...registerForm, nickname: e.target.value })} placeholder="昵称，必填" />
            <div className="register-grid">
              <input type="date" value={registerForm.birthday} onChange={(e) => setRegisterForm({ ...registerForm, birthday: e.target.value })} aria-label="生日" />
              <select value={registerForm.gender} onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })}><option value="">性别，必填</option><option>保密</option><option>女</option><option>男</option></select>
            </div>
            <input value={registerForm.city} onChange={(e) => setRegisterForm({ ...registerForm, city: e.target.value })} placeholder="省市，选填" />
            <input type="number" value={registerForm.height_cm} onChange={(e) => setRegisterForm({ ...registerForm, height_cm: e.target.value })} placeholder="身高 cm，必填" />
            <div className="register-weight-row">
              <input type="number" value={registerForm.initial_weight} onChange={(e) => setRegisterForm({ ...registerForm, initial_weight: e.target.value })} placeholder="当前体重，必填" />
              <div className="mini-unit"><button className={registerForm.initial_unit === "jin" ? "active" : ""} onClick={() => setRegisterForm({ ...registerForm, initial_unit: "jin" })}>斤</button><button className={registerForm.initial_unit === "kg" ? "active" : ""} onClick={() => setRegisterForm({ ...registerForm, initial_unit: "kg" })}>公斤</button></div>
            </div>
            <div className="register-weight-row">
              <input type="number" value={registerForm.target_weight} onChange={(e) => setRegisterForm({ ...registerForm, target_weight: e.target.value })} placeholder="目标体重，必填" />
              <div className="mini-unit"><button className={registerForm.target_unit === "jin" ? "active" : ""} onClick={() => setRegisterForm({ ...registerForm, target_unit: "jin" })}>斤</button><button className={registerForm.target_unit === "kg" ? "active" : ""} onClick={() => setRegisterForm({ ...registerForm, target_unit: "kg" })}>公斤</button></div>
            </div>
            <input type="number" value={registerForm.plan_days} onChange={(e) => setRegisterForm({ ...registerForm, plan_days: e.target.value })} placeholder="想用多少天达到目标，必填" />
          </div>
        )}
        <button className="primary-btn" onClick={signIn}>登录</button>
        <button className="ghost-btn" onClick={signUp}>{registerMode ? "提交注册" : "注册新账号"}</button>
        {notice && <p className="notice">{notice}</p>}
      </main>
    );
  }

  if (profileDetail) {
    const unitName = unit === "kg" ? "公斤" : "斤";
    return (
      <main className="phone profile-edit-page">
        <div className="detail-head profile-edit-head">
          <button className="back" onClick={() => setProfileDetail(false)}>‹</button>
          <div className="head-copy"><div className="date">修改个人信息</div><div className="time">头像、昵称和基础信息</div></div>
        </div>
        <div className="profile-edit-card card">
          <label><span>头像</span><b className="mini-avatar"><i></i></b></label>
          <label><span>昵称</span><input value={profileForm.nickname || ""} onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })} placeholder="请输入昵称" /></label>
          <label><span>生日</span><input type="date" value={profileForm.birthday || ""} onChange={(e) => setProfileForm({ ...profileForm, birthday: e.target.value })} /></label>
          <label><span>性别</span><select value={profileForm.gender || "保密"} onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}><option>保密</option><option>女</option><option>男</option></select></label>
          <label><span>省市</span><input value={profileForm.city || ""} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} placeholder="请选择省市" /></label>
        </div>
        <div className="profile-edit-card card">
          <label><span>身高</span><div className="line-input"><input type="number" value={profileForm.height_cm || ""} onChange={(e) => setProfileForm({ ...profileForm, height_cm: e.target.value })} /><em>cm</em></div></label>
          <label><span>当前体重</span><div className="line-input"><input type="number" value={profileForm.initial_weight || displayWeight(profileForm.initial_weight_jin, unit) || ""} onChange={(e) => setProfileForm({ ...profileForm, initial_weight: e.target.value })} /><em>{unitName}</em></div></label>
          <label><span>目标体重</span><div className="line-input"><input type="number" value={profileForm.target_weight || displayWeight(profileForm.target_weight_jin, unit) || ""} onChange={(e) => setProfileForm({ ...profileForm, target_weight: e.target.value })} /><em>{unitName}</em></div></label>
          <label><span>计划周期</span><div className="line-input"><input type="number" value={profileForm.plan_days || ""} onChange={(e) => setProfileForm({ ...profileForm, plan_days: e.target.value })} /><em>天</em></div></label>
        </div>
        <button className="primary-btn profile-save-btn" onClick={() => saveProfile("all")}>保存个人信息</button>
      </main>
    );
  }

  if (detailRecord) {
    const foodsOfDay = foods.filter((item) => item.date === detailRecord.date);
    const kcal = foodsOfDay.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
    return (
      <main className="phone detail-page">
        <div className="detail-head">
          <button className="back" onClick={() => setDetailRecord(null)}>‹</button>
          <div className="head-copy"><div className="date">{formatDate(detailRecord.date)}</div><div className="time">{detailRecord.time}</div></div>
        </div>
        <div className="edit-grid">
          <div className="edit-card weight-card"><div className="card-title">体重</div><div className="input-row"><input className={`weight-input ${detailLocked ? "locked" : ""}`} type="number" value={detailWeight} readOnly={detailLocked} onChange={(e) => setDetailWeight(e.target.value)} /><button className={`lock ${detailLocked ? "locked" : "unlocked"}`} onClick={() => setDetailLocked(!detailLocked)} aria-label={detailLocked ? "解锁体重编辑" : "锁定体重编辑"}><span className="lock-icon"></span></button></div></div>
          <div className="edit-card"><div className="card-title">体重变化</div><div className="delta-big">{deltaText(detailRecord.delta)}</div></div>
        </div>
        <div className="unit-row detail-unit"><button className={unit === "jin" ? "active" : ""} onClick={() => switchDetailUnit("jin")}>斤</button><button className={unit === "kg" ? "active" : ""} onClick={() => switchDetailUnit("kg")}>公斤</button></div>
        <div className="food-summary card"><div><span>当天吃的食物</span><strong>{foodsOfDay.length ? foodsOfDay.map((item) => item.name).join("、") : "暂无食物记录"}</strong></div><div><span>预估热量</span><strong>{kcal}kcal</strong></div></div>
        <button className="primary-btn save-btn" onClick={saveWeightDetail}>保存修改</button>
        <nav className="tabbar fake-tabbar">{tabs.map((item) => <button className={item.id === "weight" ? "active" : ""} key={item.id}><span className={`tab-icon tab-icon-${item.id}`}></span><b>{item.label}</b></button>)}</nav>
      </main>
    );
  }

  return (
    <main className="phone app-shell">
      {tab === "weight" && (
        <section className="page weight-page">
          <div className="summary">
            <div className="slogan">衡控体重，燃动日常！<span>已减重</span></div>
            <div className="loss"><strong>{stats.loss}</strong><span>斤</span></div>
            <div className="metrics">
              <div><span>当前体重/斤</span><b>{stats.currentWeight}</b></div>
              <div><span>BMI</span><b>{stats.bmi}</b></div>
              <div><span>已打卡/天</span><b>{stats.checkDays}</b></div>
            </div>
          </div>
          {sortedWeights.map((item) => {
            const d = deltaParts(item.delta);
            return (
              <div key={item.id}>
                <div className="date-chip">{formatDate(item.date)}</div>
                <article className="record-card card" onClick={() => openWeightDetail(item)}>
                  <div className={`time-tile ${item.mood}`}><span className="weather-icon"></span><em>{item.time}</em></div>
                  <div><span className="label">体重</span><strong className="value">{Number(item.weight_jin).toFixed(1)}<small>斤</small></strong></div>
                  <div><span className="label">体重变化</span><div className="delta-value"><i className={`delta-dot ${d.cls}`}>{d.mark}</i><strong>{d.num}</strong><small>斤</small></div></div>
                  <span className="chevron">›</span>
                </article>
              </div>
            );
          })}
          <button className="fab" onClick={() => { setWeightForm({ date: todayKey(), weight: "" }); setSheet("weight"); }}>+</button>
        </section>
      )}

      {tab === "food" && (
        <section className="page food-page">
          <div className="month-head">
            <button className="month-left" onClick={() => datePickerRef.current?.showPicker ? datePickerRef.current.showPicker() : datePickerRef.current?.click()}>
              <span className="month">{selectedMonth.getMonth() + 1}月</span>
              <div className="meta"><span>{weekdayText(selectedMonth)}</span><span>{selectedMonth.getFullYear()}年</span></div>
              <span className="down-arrow">⌄</span>
              <input ref={datePickerRef} className="header-date-input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} aria-label="选择日期" />
            </button>
            <button className="today-button" onClick={() => setSelectedDate(todayKey())}><span className="today-icon"></span><b>今</b></button>
          </div>
          <div className="week">{weeks.map((item) => <span key={item}>{item}</span>)}</div>
          <div className="calendar" onMouseDown={(e) => setTouchStartX(e.clientX)} onMouseUp={onCalendarTouchEnd} onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)} onTouchEnd={onCalendarTouchEnd}>
            {monthDays.map((item) => (
              <button key={item.date} className={`day ${item.active ? "active" : ""} ${item.outside ? "outside" : ""}`} onClick={() => setSelectedDate(item.date)}>
                <span>{item.day}</span>
                {item.weightText && <em className={`weight-badge ${item.weightClass}`}>{item.weightText}</em>}
                {Boolean(item.kcal) && <em className="kcal-badge">+{item.kcal}卡</em>}
              </button>
            ))}
          </div>
          <div className="stats">
            <div><strong>{stats.checkDays}</strong><span>打卡天数</span></div>
            <div><strong>{stats.lossDays}</strong><span>减重天数</span></div>
            <div><strong>{stats.gainDays}</strong><span>增重天数</span></div>
            <div><strong>{deltaText(stats.change)}</strong><span>本月变化</span></div>
          </div>
          <div className="date-chip">{formatDate(selectedDate)}</div>
          {!selectedFoods.length && <div className="empty">这一天还没有食物记录</div>}
          {selectedFoods.map((item) => (
            <article className="food-card card" key={item.id}>
              <div className="time-tile food"><span className="food-icon"></span><em>{item.time}</em></div>
              <div><span>食物</span><strong>{item.name}</strong></div>
              <div><span>克数</span><strong>{item.grams}g</strong></div>
              <div><span>预估热量</span><strong>{item.kcal}kcal</strong></div>
            </article>
          ))}
          <button className="fab" onClick={() => { setFoodForm({ date: selectedDate, name: "", grams: "", kcal: "" }); setSheet("food"); }}>+</button>
        </section>
      )}

      {tab === "trend" && (
        <section className="trend-page">
          <div className="trend-head">
            <div className="title">趋势 <button className="trend-unit" onClick={() => setUnit(unit === "kg" ? "jin" : "kg")}>{unit === "kg" ? "公斤" : "斤"}⌄</button></div>
            <div className="tabs">{[
              ["default", "默认"],
              ["week", "近一周"],
              ["month3", "近三月"],
              ["all", "全部"]
            ].map(([key, label]) => <button key={key} className={trendRange === key ? "active" : ""} onClick={() => { setTrendRange(key); setSelectedTrendDate(""); }}>{label}</button>)}</div>
            <div className="chart-shell-web">
              <div className="y-axis-web">{chart.yTicks.map((tick) => <span key={tick.value} style={{ top: tick.top }}>{tick.value}</span>)}</div>
              <div className="simple-chart">
              {chart.yTicks.map((tick) => <i className="grid-h" key={`h-${tick.value}`} style={{ top: tick.top }} />)}
              {chart.points.map((point) => <i className="grid-v" key={`v-${point.id}`} style={{ left: `${point.left}%` }} />)}
              {chart.points.length > 1 && <svg className="chart-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={chartLine} /></svg>}
              {chart.points.map((point) => <button key={point.id} className={`chart-point ${activeTrendDate === point.date ? "active" : ""}`} style={{ left: `${point.left}%`, top: `${point.top}%` }} onClick={() => setSelectedTrendDate(point.date)}><span>{point.label}</span></button>)}
              {!sortedWeights.length && <div className="chart-empty">记录体重后生成趋势点</div>}
              </div>
            </div>
            <div className="x-axis-web">{chart.points.map((point) => <span key={point.id} style={{ left: `${point.left}%` }}>{point.dateLabel}</span>)}</div>
            <div className="trend-stats">
              <div><strong>{stats.checkDays}</strong><span>打卡天数</span></div>
              <div><strong>{stats.lossDays}</strong><span>减重天数</span></div>
              <div><strong>{stats.gainDays}</strong><span>增重天数</span></div>
              <div><strong>{deltaText(stats.change)}</strong><span>阶段变化</span></div>
            </div>
          </div>
          <div className="detail-section">
            <div className="date-chip">{formatDate(activeTrendDate)}</div>
            {!trendDayWeights.length && !trendDayFoods.length && <div className="empty">这一天还没有记录</div>}
            {trendDayWeights.map((item) => {
              const d = deltaParts(item.delta);
              return (
                <article className="record-card card" key={item.id} onClick={() => openWeightDetail(item)}>
                  <div className={`time-tile ${item.mood}`}><span className="weather-icon"></span><em>{item.time}</em></div>
                  <div><span className="label">体重</span><strong className="value">{Number(item.weight_jin).toFixed(1)}<small>斤</small></strong></div>
                  <div><span className="label">体重变化</span><div className="delta-value"><i className={`delta-dot ${d.cls}`}>{d.mark}</i><strong>{d.num}</strong><small>斤</small></div></div>
                  <span className="chevron">›</span>
                </article>
              );
            })}
            {trendDayFoods.map((item) => (
              <article className="food-card card" key={item.id}>
                <div className="time-tile food"><span className="food-icon"></span><em>{item.time}</em></div>
                <div><span>食物</span><strong>{item.name}</strong></div>
                <div><span>克数</span><strong>{item.grams}g</strong></div>
                <div><span>预估热量</span><strong>{item.kcal}kcal</strong></div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "chat" && (
        <section className="chat-page">
          <div className="chat-scroll">
            <div className="hero">
              <span className="greeting">晚上好！今天也稳稳推进~</span>
              <span className="chat-summary">记录体重和饮食后，小衡会给你更具体的反馈。</span>
              <button className="report" onClick={() => askXiaoheng("帮我生成体重月报，结合我的体重和饮食记录给总结建议。")}><span>✓</span><div><b>体重月报</b><em>减重小结 | 看见每一次记录里的坚持。</em></div></button>
            </div>
            <div className="section-title">聊聊新话题</div>
            <div className="topics">{topics.map((item) => <button key={item} onClick={() => askXiaoheng(item)}>{item}</button>)}</div>
            <div className="thread">
              {messages.map((item, index) => <div className={`message-row ${item.role === "bot" ? "bot" : "user"}`} key={index}><div className={`bubble ${item.role}`}>{item.text}</div></div>)}
              {thinking && <div className="message-row bot"><div className="bubble bot">小衡正在思考...</div></div>}
              <div ref={chatBottomRef} />
            </div>
          </div>
          <div className="compose"><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="给小衡发消息" /><button onClick={() => askXiaoheng()}>发送</button></div>
        </section>
      )}

      {tab === "profile" && (
        <section className="page profile-page">
          <div className="hero-card">
            <button className="profile-row" onClick={() => { setProfileForm({ ...profile, initial_weight: displayWeight(profile.initial_weight_jin, unit), target_weight: displayWeight(profile.target_weight_jin, unit) }); setProfileDetail(true); }}>
              <div className="avatar"><i></i></div>
              <div className="profile-name"><b>{profile.nickname || "小衡用户"}</b><span>点击修改个人信息</span></div>
              <span className="arrow">›</span>
            </button>
            <div className="hero-stats"><div><span>打卡天数</span><b>{stats.checkDays}</b></div><div><span>体重变化</span><b>{deltaText(stats.change)}</b></div></div>
          </div>
          <div className="premium"><div><b>开通高级账户</b><span>解锁永久特权，28元限时抢购中</span></div><button onClick={() => setNotice("功能还没有开发，请您耐心等待")}>立即开通</button></div>
          <div className="profile-list card">
            <button onClick={() => { setProfileForm({ ...profile, initial_weight: displayWeight(profile.initial_weight_jin, unit) }); setSheet("body"); }}><span className="icon-body"></span><b>身体档案</b><em>›</em></button>
            <button onClick={() => { setProfileForm({ ...profile, target_weight: displayWeight(profile.target_weight_jin, unit) }); setSheet("goal"); }}><span className="icon-goal"></span><b>目标管理</b><em>›</em></button>
            <button onClick={() => setSheet("feedback")}><span className="icon-feedback"></span><b>反馈建议</b><em>›</em></button>
            <button onClick={() => setSheet("unit")}><span className="icon-unit"></span><b>体重单位</b><em>›</em></button>
            <button onClick={() => setNotice("功能还没有开发，请您耐心等待")}><span className="icon-theme"></span><b>主题颜色</b><em>›</em></button>
            <button onClick={() => setNotice("功能还没有开发，请您耐心等待")}><span className="icon-rate"></span><b>给我们评分</b><em>›</em></button>
            <button onClick={shareApp}><span className="icon-share"></span><b>推荐给朋友</b><em>›</em></button>
            <button onClick={() => setSheet("about")}><span className="icon-about"></span><b>关于我们</b><em>›</em></button>
          </div>
          <button className="logout" onClick={signOut}>退出登录</button>
        </section>
      )}

      {sheet && <Sheet sheet={sheet} setSheet={setSheet} unit={unit} setUnit={setUnit} weightForm={weightForm} setWeightForm={setWeightForm} addWeight={addWeight} foodForm={foodForm} setFoodForm={setFoodForm} addFood={addFood} profileForm={profileForm} setProfileForm={setProfileForm} saveProfile={saveProfile} feedbackForm={feedbackForm} setFeedbackForm={setFeedbackForm} submitFeedback={submitFeedback} />}
      {notice && <div className="toast" onClick={() => setNotice("")}>{notice}</div>}
      <nav className="tabbar">{tabs.map((item) => <button className={tab === item.id ? "active" : ""} key={item.id} onClick={() => setTab(item.id)}><span className={`tab-icon tab-icon-${item.id}`}></span><b>{item.label}</b></button>)}</nav>
    </main>
  );
}

function Sheet({ sheet, setSheet, unit, setUnit, weightForm, setWeightForm, addWeight, foodForm, setFoodForm, addFood, profileForm, setProfileForm, saveProfile, feedbackForm, setFeedbackForm, submitFeedback }) {
  const unitName = unit === "kg" ? "公斤" : "斤";
  return (
    <>
      <div className="sheet-mask" onClick={() => setSheet(null)} />
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-head"><h3>{sheet === "weight" ? "新增体重" : sheet === "food" ? "新增食物" : sheet === "body" ? "身体档案" : sheet === "goal" ? "目标管理" : sheet === "unit" ? "体重单位" : sheet === "feedback" ? "反馈建议" : sheet === "profile" ? "个人信息" : "关于我们"}</h3><button onClick={() => setSheet(null)}>×</button></div>
        {sheet === "weight" && <><label>日期</label><input type="date" value={weightForm.date} onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })} /><label>体重</label><input type="number" placeholder="请输入体重" value={weightForm.weight} onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })} /><div className="unit-row"><button className={unit === "jin" ? "active" : ""} onClick={() => setUnit("jin")}>斤</button><button className={unit === "kg" ? "active" : ""} onClick={() => setUnit("kg")}>公斤</button></div><button className="primary-btn" onClick={addWeight}>保存记录</button></>}
        {sheet === "food" && <><label>日期</label><input type="date" value={foodForm.date} onChange={(e) => setFoodForm({ ...foodForm, date: e.target.value })} /><label>食物 <small>必填</small></label><input placeholder="例如 鸡胸肉" value={foodForm.name} onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })} /><label>克数 <small>必填</small></label><input type="number" placeholder="请输入克数" value={foodForm.grams} onChange={(e) => setFoodForm({ ...foodForm, grams: e.target.value })} /><label>热量 <small>选填，不填将由 AI 估算</small></label><input type="number" placeholder="例如 120" value={foodForm.kcal} onChange={(e) => setFoodForm({ ...foodForm, kcal: e.target.value })} /><button className="primary-btn" onClick={addFood}>保存食物</button></>}
        {sheet === "body" && <><div className="input-with-unit"><input type="number" placeholder="身高" value={profileForm.height_cm || ""} onChange={(e) => setProfileForm({ ...profileForm, height_cm: e.target.value })} /><span>cm</span></div><div className="input-with-unit"><input type="number" placeholder="当前体重" value={profileForm.initial_weight || ""} onChange={(e) => setProfileForm({ ...profileForm, initial_weight: e.target.value })} /><span>{unitName}</span></div><button className="primary-btn" onClick={() => saveProfile("body")}>保存</button></>}
        {sheet === "goal" && <><div className="input-with-unit"><input type="number" placeholder="目标体重" value={profileForm.target_weight || ""} onChange={(e) => setProfileForm({ ...profileForm, target_weight: e.target.value })} /><span>{unitName}</span></div><div className="input-with-unit"><input type="number" placeholder="达到目标的天数" value={profileForm.plan_days || ""} onChange={(e) => setProfileForm({ ...profileForm, plan_days: e.target.value })} /><span>天</span></div><button className="primary-btn" onClick={() => saveProfile("goal")}>保存</button></>}
        {sheet === "unit" && <div className="unit-row"><button className={unit === "jin" ? "active" : ""} onClick={() => setUnit("jin")}>斤</button><button className={unit === "kg" ? "active" : ""} onClick={() => setUnit("kg")}>公斤</button></div>}
        {sheet === "feedback" && <><textarea placeholder="写下你的建议" value={feedbackForm.content} onChange={(e) => setFeedbackForm({ ...feedbackForm, content: e.target.value })} /><input placeholder="联系方式，选填" value={feedbackForm.contact} onChange={(e) => setFeedbackForm({ ...feedbackForm, contact: e.target.value })} /><button className="primary-btn" onClick={submitFeedback}>发送到邮箱</button></>}
        {sheet === "profile" && <><input placeholder="昵称" value={profileForm.nickname || ""} onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })} /><button className="primary-btn" onClick={() => saveProfile("profile")}>保存</button></>}
        {sheet === "about" && <><p className="about">小衡 v1.0，一个面向减重记录、饮食打卡和 AI 分析的产品原型。</p><button className="primary-btn" onClick={() => setSheet(null)}>保存</button></>}
      </div>
    </>
  );
}
