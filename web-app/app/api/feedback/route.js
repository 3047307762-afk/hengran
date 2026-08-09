import nodemailer from "nodemailer";

export async function POST(request) {
  const user = process.env.QQ_EMAIL_USER;
  const pass = process.env.QQ_EMAIL_PASS;
  const to = process.env.FEEDBACK_EMAIL_TO || user;

  if (!user || !pass || !to) {
    return Response.json({ error: "反馈邮箱环境变量未配置" }, { status: 500 });
  }

  const body = await request.json();
  const content = String(body.content || "").trim();
  if (!content) {
    return Response.json({ error: "请填写反馈内容" }, { status: 400 });
  }

  const profile = body.profile || {};
  const account = body.account || {};
  const submittedAt = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });

  const transporter = nodemailer.createTransport({
    host: "smtp.qq.com",
    port: 465,
    secure: true,
    auth: { user, pass }
  });

  await transporter.sendMail({
    from: `小衡反馈 <${user}>`,
    to,
    subject: "小衡网站版收到新的反馈建议",
    text: [
      "小衡网站版收到新的反馈建议。",
      "",
      `反馈内容：${content}`,
      `联系方式：${body.contact || "未填写"}`,
      `当前页面：${body.page || "未填写"}`,
      `用户昵称：${profile.nickname || "未填写"}`,
      `用户 ID：${account.id || "未填写"}`,
      `登录账号：${account.email || "未填写"}`,
      `提交时间：${submittedAt}`
    ].join("\n")
  });

  return Response.json({ ok: true });
}
