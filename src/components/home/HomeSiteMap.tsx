"use client";

import { Card, Col, Row } from "antd";
import type { ReactNode } from "react";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import {
  NAVIGATION_ITEMS,
  filterNavigationItemsByRoles,
} from "@/lib/navigation-items";

export type HomeSiteMapItem = {
  label: string;
  icon?: ReactNode;
  path: string;
};

export type HomeSiteMapModule = {
  title: string;
  items: HomeSiteMapItem[];
};

type Props = {
  onNavigate: (path: string) => void;
};

const HomeSiteMap = ({ onNavigate }: Props) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roleCodes = getRoleCodesFromUser(currentUser);
  const isAdmin = roleCodes.includes("ADMIN");
  const modules: HomeSiteMapModule[] = filterNavigationItemsByRoles(
    NAVIGATION_ITEMS,
    roleCodes,
    isAdmin,
  )
    .filter((item) => Array.isArray(item.children) && item.children.length > 0)
    .map((module) => ({
      title: module.label,
      items: (module.children ?? [])
        .filter((item) => item.key.startsWith("/"))
        .map((item) => ({
          label: item.label,
          icon: item.icon,
          path: item.key,
        })),
    }))
    .filter((module) => module.items.length > 0);

  return (
    <div>
      {modules.map((module) => {
        return (
        <div key={module.title} style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 16 }}>{module.title}</h3>
          <Row gutter={[16, 16]}>
            {module.items.map((item) => (
              <Col key={item.path} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  style={{ textAlign: "center", cursor: "pointer" }}
                  onClick={() => onNavigate(item.path)}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>
                    {item.icon}
                  </div>
                  <div>{item.label}</div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
        );
      })}
    </div>
  );
};

export default HomeSiteMap;
