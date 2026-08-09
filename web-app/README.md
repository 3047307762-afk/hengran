# 小衡网站版

这是小衡体重管理助手的 Next.js 网站版，适合部署到 Vercel。

## 功能

- 账号名 + 密码注册登录
- 注册时填写昵称、生日、性别、省市、身高、当前体重、目标体重和计划周期
- 体重记录、详情修改、斤/公斤切换
- 饮食记录和月历查看
- 趋势图、阶段筛选和当天记录列表
- 个人信息编辑
- 小衡 AI 问答，后端调用 DeepSeek
- Supabase 云端保存数据

## 本地运行

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

## 环境变量

复制 `.env.example` 为 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon public key
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_MODEL=deepseek-v4-flash
```

## Supabase

在 Supabase SQL Editor 运行 `supabase-schema.sql`。

如果是旧表，至少补充：

```sql
alter table public.profiles add column if not exists birthday text;
alter table public.profiles add column if not exists gender text default '保密';
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists initial_weight_jin numeric;
```

## 2026-08-09 更新

- 新增网站版完整页面和 Supabase 云端数据结构
- 注册资料采集和个人信息详情页
- 对齐微信小程序的体重详情、饮食日历、趋势和小衡 AI 页面体验
- 支持 Vercel 部署
