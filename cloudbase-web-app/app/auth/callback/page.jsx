"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "../../../lib/supabase";

export default function AuthCallback() {
  const [message, setMessage] = useState("正在验证登录...");

  useEffect(() => {
    async function finishLogin() {
      const supabase = createBrowserSupabase();
      if (!supabase) {
        setMessage("Supabase 环境变量还没有配置。");
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message || "登录验证失败，请重新发送登录链接。");
          return;
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setMessage("没有找到登录凭证，请重新发送登录链接。");
          return;
        }
      }

      window.location.replace("/");
    }

    finishLogin();
  }, []);

  return (
    <main className="phone shell">
      <h1>小衡体重管理助手</h1>
      <p>{message}</p>
    </main>
  );
}
