# CloudBase 部署说明

这个文件夹是小衡网站的 CloudBase 部署版。当前阶段只迁移网站运行环境，数据库仍然使用 Supabase，后续再迁 CloudBase PostgreSQL。

## 在 CloudBase 控制台选择

1. 进入 CloudBase 环境：xiaoheng-d0g4g5to336d20a3f。
2. 选择「云托管 / CloudBase Run」或「Web 应用托管」里支持 Dockerfile / Node.js 服务的部署方式。
3. 代码目录选择本文件夹：cloudbase-web-app。
4. 运行端口填：3000。
5. 构建方式选择 Dockerfile，或让 CloudBase 自动识别 Dockerfile。

## 首屏速度优化

CloudBase 个人/体验套餐可能会出现冷启动：服务一段时间没人访问后，第一次打开会慢一些。可以在服务配置里找「实例规格设置」「扩缩容」「最小实例数」「保持实例」等选项，把最小实例数设置为 1。这样服务会一直保留一个运行实例，首次打开会更快，但会消耗更多资源点。

当前代码也做了首屏优化：页面会先显示登录页并在后台连接 Supabase，不再整页停在“加载中...”。

数据库暂时仍在 Supabase。后续如果把登录和 PostgreSQL 迁到腾讯云，国内访问速度会更稳定，但迁移前需要先确认 CloudBase PostgreSQL 的连接方式、认证方案和数据备份。

## 必填环境变量

把 Vercel 里已经填过的变量照搬到 CloudBase。注意：`NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 最好同时作为构建变量和运行变量填写，否则前端页面可能拿不到 Supabase 配置：

```env
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon public key
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_MODEL=deepseek-v4-flash
```

## 反馈邮箱环境变量

如果要继续让「反馈建议」发到 QQ 邮箱，也要填：

```env
QQ_EMAIL_USER=发件 QQ 邮箱
QQ_EMAIL_PASS=QQ 邮箱 SMTP 授权码
FEEDBACK_EMAIL_TO=接收反馈的邮箱
```

## 本地验证

```bash
npm install
npm run build
npm run start
```

打开 http://localhost:3000 检查页面、登录、体重、饮食、小衡 AI、反馈是否正常。

