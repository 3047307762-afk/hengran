export async function POST(request) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return Response.json({ error: "DEEPSEEK_API_KEY 未配置" }, { status: 500 });
  }

  const body = await request.json();
  const name = String(body.name || "").trim();
  const grams = Number(body.grams || 0);
  if (!name) return Response.json({ error: "请填写食物名称" }, { status: 400 });
  if (!grams || grams <= 0) return Response.json({ error: "请填写有效克数" }, { status: 400 });

  const prompt = [
    "你是营养热量估算助手。",
    `请估算 ${grams} 克「${name}」大约有多少千卡。`,
    "只返回 JSON，不要解释，格式必须是：{\"kcal\":数字}",
    "如果食物名称里包含数量或做法，请结合常见中国饮食场景估算。"
  ].join("\n");

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        messages: [
          { role: "system", content: "你只做食物热量估算，必须输出严格 JSON。" },
          { role: "user", content: prompt }
        ],
        thinking: { type: "disabled" },
        temperature: 0.2,
        max_tokens: 80,
        stream: false
      })
    });
    const data = await res.json();
    if (!res.ok) {
      return Response.json({ error: data?.error?.message || `DeepSeek 接口错误：${res.status}` }, { status: 502 });
    }
    const raw = data?.choices?.[0]?.message?.content?.trim() || "";
    const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
    const parsed = JSON.parse(jsonText);
    const kcal = Math.round(Number(parsed.kcal || 0));
    if (!kcal || kcal <= 0) throw new Error("热量估算结果无效");
    return Response.json({ kcal });
  } catch (error) {
    return Response.json({ error: error.message || "热量估算失败" }, { status: 500 });
  }
}
