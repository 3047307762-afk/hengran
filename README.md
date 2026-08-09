# 小衡体重管理助手

小衡体重管理助手是一款面向个人的体重、饮食、趋势分析和 AI 问答工具。本仓库同时保留了早期本地原型、微信小程序版本、Vercel 网站版本、腾讯云 CloudBase 国内部署版本，以及产品文档资料。

## 线上地址

- 国内 CloudBase 网站版：[https://hengran-294316-10-1465727195.sh.run.tcloudbase.com/](https://hengran-294316-10-1465727195.sh.run.tcloudbase.com/)
- Vercel 网站版：[https://hengran.vercel.app/](https://hengran.vercel.app/)
- 微信小程序：微信中搜索「小衡体重管理助手」

当前建议优先使用 CloudBase 网站版，因为它在中国大陆访问更稳定。Vercel 版本作为海外/备用部署保留。

## 目录说明

### `cloudbase-web-app/`

腾讯云 CloudBase 部署版网站。

- 用途：部署到腾讯云 CloudBase / 云托管 / CloudBase Run。
- 当前线上地址：`https://hengran-294316-10-1465727195.sh.run.tcloudbase.com/`
- 技术栈：Next.js、React、Supabase、DeepSeek API、QQ 邮箱 SMTP。
- 数据库：暂时仍使用 Supabase，后续计划迁移到腾讯云 PostgreSQL。
- 部署设置：
  - Git 仓库：`3047307762-afk/hengran`
  - 分支：`main`
  - 目标目录：`cloudbase-web-app`
  - Dockerfile：`cloudbase-web-app/Dockerfile`
  - 服务端口：`3000`
- 说明文件：`cloudbase-web-app/README_CLOUDBASE.md`

### `web-app/`

Vercel 部署版网站，也是网站功能的主要开发目录。

- 用途：本地开发和 Vercel 部署。
- 当前线上地址：`https://hengran.vercel.app/`
- 技术栈：Next.js、React、Supabase、DeepSeek API、QQ 邮箱 SMTP。
- 主要功能：账号密码注册登录、体重记录、饮食记录、趋势图、小衡 AI 问答、AI 热量估算、反馈邮件发送。
- Supabase 建表脚本：`web-app/supabase-schema.sql`

本地运行：

```bash
cd web-app
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

### `wechat-miniprogram/`

微信小程序版本。

- 用途：使用微信开发者工具打开、预览、上传和发布小程序。
- 小程序入口：`wechat-miniprogram/app.js`
- 页面目录：`wechat-miniprogram/pages/`
- 工具函数：`wechat-miniprogram/utils/`
- 小程序资源：`wechat-miniprogram/assets/`
- 云函数：`wechat-miniprogram/cloudfunctions/`

注意：微信个人主体账号对 AI 问答类能力有限制，所以网站版目前是更适合继续上线和迭代的方向。

### `assets/`

通用素材目录。

- `hengran-miniprogram-avatar.png`：小衡默认头像素材，用于小程序和网站中的头像展示。

### `文档/`

产品文档和展示素材。

- `【产品文档】AI助手.docx`：小衡/AI 助手相关产品设计文档。
- `【产品调研】AI助手.docx`：AI 助手方向的产品调研资料。
- `1-1.png`、`1-2.png`、`1-3.png`、`1-4.png`：产品文档中的第一组界面/流程截图素材。
- `2-1.png`、`2-2.png`：产品文档中的第二组界面/流程截图素材。
- `3.png`、`4.png`、`5.png`：产品文档中的补充截图或展示图。

这些图片主要用于产品说明、课程/作业提交、功能展示或文档排版，不是网站和小程序运行所必需的代码文件。

### 根目录早期原型文件

这些是早期本地 Flask/HTML 原型相关文件，保留作历史版本和参考：

- `index.html`：早期本地网页原型页面。
- `styles.css`：早期本地网页原型样式。
- `app.js`：早期本地网页原型交互逻辑。
- `server.py`：早期 Python 后端服务。
- `hengran.sqlite3`：早期本地 SQLite 数据库。
- `server-err.log`、`server-out.log`：早期本地服务日志。
- `启动AI聊天.bat`：早期本地启动脚本。
- `AI接入说明.txt`：早期 AI 接入说明。

正式上线请优先看 `cloudbase-web-app/` 和 `web-app/`。

## 环境变量

网站版需要以下环境变量：

```env
NEXT_PUBLIC_SUPABASE_URL=Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabase anon public key
DEEPSEEK_API_KEY=DeepSeek API Key
DEEPSEEK_MODEL=deepseek-v4-flash
QQ_EMAIL_USER=发件 QQ 邮箱
QQ_EMAIL_PASS=QQ 邮箱 SMTP 授权码
FEEDBACK_EMAIL_TO=反馈接收邮箱
```

说明：

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目地址。
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase 前端公开 anon key。
- `DEEPSEEK_API_KEY`：DeepSeek API 密钥，用于小衡 AI 和热量估算。
- `DEEPSEEK_MODEL`：DeepSeek 模型名称。
- `QQ_EMAIL_USER`：发送反馈邮件的 QQ 邮箱账号。
- `QQ_EMAIL_PASS`：QQ 邮箱 SMTP 授权码，不是 QQ 登录密码。
- `FEEDBACK_EMAIL_TO`：接收用户反馈的邮箱。

不要把 `.env.local` 或任何真实私钥提交到 GitHub。

## 数据库

当前网站版数据库仍使用 Supabase。

初始化 Supabase：

1. 进入 Supabase 项目。
2. 打开 `SQL Editor`。
3. 复制并运行 `web-app/supabase-schema.sql`。
4. 关闭邮箱强制确认后，可使用账号名和密码注册登录。

后续计划：将 Supabase 登录和 PostgreSQL 数据库迁移到腾讯云 CloudBase / PostgreSQL，让网站前端、后端、数据库都在国内环境。

## 部署说明

### 部署到 CloudBase

推荐用于国内访问。

1. 进入腾讯云 CloudBase 环境。
2. 选择「云函数 / 托管」中的云托管服务。
3. 代码来源选择 GitHub。
4. 仓库选择 `3047307762-afk/hengran`，分支选择 `main`。
5. 目标目录填写 `cloudbase-web-app`。
6. Dockerfile 名称填写 `Dockerfile`。
7. 服务端口填写 `3000`。
8. 填写环境变量后部署。

### 部署到 Vercel

作为海外/备用部署。

1. 从 GitHub 导入 `3047307762-afk/hengran`。
2. Root Directory 选择 `web-app`。
3. 填写环境变量。
4. Deploy。

## 更新记录

### 2026-08-09

- 新增 Next.js 网站版 `web-app/`。
- 新增腾讯云 CloudBase 部署版 `cloudbase-web-app/`。
- 接入 Supabase 账号密码登录和云端数据存储。
- 接入 DeepSeek，用于小衡 AI 问答和食物热量估算。
- 接入 QQ 邮箱 SMTP，用于反馈建议发送到邮箱。
- 网站界面尽量对齐微信小程序版本，包括体重、饮食、趋势、小衡和我的页面。
- CloudBase 版本已可在中国大陆访问，数据库暂时继续使用 Supabase。
