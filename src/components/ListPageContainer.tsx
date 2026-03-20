"use client";

import { Card } from "antd";

const ListPageContainer = ({ children }: { children: React.ReactNode }) => {
  return <Card styles={{ body: { padding: 12 } }}>{children}</Card>;
};

export default ListPageContainer;
