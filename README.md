# 小衡体重管理助手

小衡体重管理助手是一款面向个人体重记录、饮食打卡、趋势分析和 AI 问答的健康管理原型。仓库里包含早期本地原型、微信小程序版本，以及当前重点维护的网站版。

## 当前版本

- 网站版目录：`web-app/`
- 技术栈：Next.js、Supabase、DeepSeek API
- 本地预览：`http://localhost:3000`
- 数据存储：Supabase 云数据库
- AI 问答：通过 Next.js 后端接口调用 DeepSeek，API Key 不暴露到浏览器

## 2026-08-09 更新内容

本次相对之前 GitHub 上传版本，主要新增和重做了网站版：

- 新增 `web-app/` Next.js 网站版，可部署到 Vercel 生成公网链接。
- 接入 Supabase 登录和云端数据库，体重、饮食、个人资料不再只保存在本地。
- 登录方式改为账号名 + 密码，避免邮箱验证码频率限制。
- 注册流程新增基础资料填写：昵称、生日、性别、省市、身高、当前体重、目标体重、计划周期。
- 个人信息页改成接近微信小程序的独立页面，可查看并保存头像、昵称、生日、性别、省市、身体档案和目标信息。
- 体重详情页对齐小程序样式，支持锁定/解锁编辑、斤/公斤切换、体重变化展示、当天饮食和热量摘要。
- 饮食日历改为显示体重变化，支持左右滑切换月份、日期选择和回到今天。
- 趋势页新增默认、近一周、近三月、全部筛选，支持斤/公斤切换，点击趋势点后显示当天体重和饮食记录。
- 小衡 AI 问答改为网站后端接口调用 DeepSeek，并结合体重、饮食和个人资料生成更自然的回复。
- 补充 Supabase 建表脚本 `web-app/supabase-schema.sql` 和 Vercel 环境变量说明。

## 本地运行网站版

```bash
cd web-app
npm install
npm run dev
```

浏览器打开：

```text
http://localhost:3000
```

## 环境变量

复制 `web-app/.env.example` 为 `web-app/.env.local`，填写：

```env
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon public key
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_MODEL=deepseek-v4-flash
QQ_EMAIL_USER=你的 QQ 邮箱账号
QQ_EMAIL_PASS=你的 QQ 邮箱 SMTP 授权码
FEEDBACK_EMAIL_TO=接收反馈的邮箱
```

不要把 `.env.local` 上传到 GitHub。

## Supabase 初始化

打开 Supabase 控制台：

1. 进入项目
2. 点击 `SQL Editor`
3. 新建 Query
4. 粘贴并运行 `web-app/supabase-schema.sql`

如果之前已经建过表，也可以单独运行：

```sql
alter table public.profiles add column if not exists birthday text;
alter table public.profiles add column if not exists gender text default '保密';
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists initial_weight_jin numeric;
```

## 部署到 Vercel

把 `web-app/` 作为 Vercel 项目根目录，环境变量填写与本地一致。部署成功后，Vercel 会生成公网访问链接。
