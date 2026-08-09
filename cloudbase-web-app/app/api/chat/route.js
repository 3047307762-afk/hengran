export async function POST(request) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return Response.json({ error: "DEEPSEEK_API_KEY 未配置" }, { status: 500 });
  }

  const body = await request.json();
  const message = String(body.message || "").trim();
  const weights = body.weights || [];
  const foods = body.foods || [];
  const profile = body.profile || {};

  const prompt = [
    "你是“小衡”，一个体重管理网站里的中文 AI 助手。",
    "请根据用户体重、饮食、目标和当前问题给出自然、具体、可执行的生活方式建议。",
    "不要做医疗诊断，不要承诺治疗效果，不要极端减重。回答控制在 120-260 字。",
    `用户问题：${message}`,
    `个人档案：${JSON.stringify(profile).slice(0, 1500)}`,
    `体重记录：${JSON.stringify(weights).slice(0, 4000)}`,
    `饮食记录：${JSON.stringify(foods).slice(0, 3000)}`
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
          { role: "system", content: "你是小衡，回答要像认真看过记录的人，不要模板化。" },
          { role: "user", content: prompt }
        ],
        thinking: { type: "disabled" },
        temperature: 0.9,
        top_p: 0.9,
        max_tokens: 900,
        stream: false
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return Response.json({ error: data?.error?.message || `AI 接口错误：${res.status}` }, { status: 502 });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    return Response.json({ reply: reply || "小衡暂时没有生成回复，请稍后再试。" });
  } catch (error) {
    return Response.json({ error: error.message || "AI 请求失败" }, { status: 500 });
  }
}
