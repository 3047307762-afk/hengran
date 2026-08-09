import "./globals.css";

export const metadata = {
  title: "小衡体重管理助手",
  description: "记录体重、饮食和趋势，让小衡给你生活方式建议。"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
