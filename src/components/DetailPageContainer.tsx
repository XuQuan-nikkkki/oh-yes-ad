"use client";

import { Space } from "antd";

const DetailPageContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
      {children}
    </Space>
  );
};

export default DetailPageContainer;
