"use client";

import { Card, Row, Col, Button, Space } from "antd";
import { UserOutlined, TeamOutlined, ClockCircleOutlined, CalendarOutlined, CalendarFilled, ShoppingOutlined, BuildOutlined, ShopOutlined, SwapOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const modules = [
    {
      title: "数据管理",
      items: [
        { label: "客户管理", icon: <UserOutlined />, path: "/clients" },
        { label: "客户人员", icon: <TeamOutlined />, path: "/client-contacts" },
        { label: "客户项目", icon: <ShoppingOutlined />, path: "/client-projects" },
        { label: "内部项目", icon: <BuildOutlined />, path: "/internal-projects" },
        { label: "团队成员", icon: <TeamOutlined />, path: "/employees" },
        { label: "供应商管理", icon: <ShopOutlined />, path: "/vendors" },
        { label: "请假日历", icon: <CalendarFilled />, path: "/leave-calendar" },
        { label: "工作日变动", icon: <SwapOutlined />, path: "/workday-adjustments" },
      ],
    },
    {
      title: "个人工作",
      items: [
        { label: "记录工时", icon: <ClockCircleOutlined />, path: "/work-logs" },
      ],
    },
    {
      title: "团队协作",
      items: [
        { label: "项目排期", icon: <CalendarOutlined />, path: "/schedule" },
      ],
    },
  ];

  return (
    <div>
      <h1>首页</h1>
      {modules.map((module) => (
        <div key={module.title} style={{ marginBottom: 32 }}>
          <h2 style={{ marginBottom: 16 }}>{module.title}</h2>
          <Row gutter={[16, 16]}>
            {module.items.map((item) => (
              <Col key={item.path} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  style={{ textAlign: "center", cursor: "pointer" }}
                  onClick={() => router.push(item.path)}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                  <div>{item.label}</div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </div>
  );
}
