import "./globals.css";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
      </body>
    </html>
  );
}
