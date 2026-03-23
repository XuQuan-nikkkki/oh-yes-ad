"use client";

import { Result } from "antd";

type Props = {
  type: "forbidden" | "developing";
};

const CONFIG = {
  forbidden: {
    status: "403" as const,
    title: "无查看权限",
    subTitle: "你当前没有权限查看该页面或模块。",
  },
  developing: {
    status: "info" as const,
    title: "功能开发中",
    subTitle: "该模块正在开发中。",
  },
};

export default function PageAccessResult({ type }: Props) {
  const config = CONFIG[type];
  return (
    <Result
      status={config.status}
      title={config.title}
      subTitle={config.subTitle}
    />
  );
}
