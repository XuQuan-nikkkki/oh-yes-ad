"use client";

import { Menu } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getRoleCodesFromUser, type CurrentUser } from "@/stores/authStore";
import { useNavigationStore } from "@/stores/navigationStore";
import {
  NAVIGATION_ITEMS,
  NAVIGATION_PATH_PREFIXES,
  type NavigationItem,
  filterNavigationItemsByRoles,
} from "@/lib/navigation-items";

interface MenuContentProps {
  pathname: string;
  currentUser: CurrentUser | null;
}

const filterVisibleMenuItems = (
  items: NavigationItem[],
  roleCodes: string[],
  isAdmin: boolean,
): ItemType[] =>
  filterNavigationItemsByRoles(items, roleCodes, isAdmin) as ItemType[];

export default function MenuContent({
  pathname,
  currentUser,
}: MenuContentProps) {
  const router = useRouter();
  const setNavigating = useNavigationStore((state) => state.setNavigating);
  const selectedMenuKey = useMemo(() => {
    return (
      NAVIGATION_PATH_PREFIXES.find(
        (key) => pathname === key || pathname.startsWith(`${key}/`),
      ) ?? pathname
    );
  }, [pathname]);
  const [activeSelectedKey, setActiveSelectedKey] = useState(selectedMenuKey);

  useEffect(() => {
    setActiveSelectedKey(selectedMenuKey);
  }, [selectedMenuKey]);

  const roleCodes = getRoleCodesFromUser(currentUser);
  const isAdmin = roleCodes.includes("ADMIN");

  const visibleItems = useMemo(
    () => filterVisibleMenuItems(NAVIGATION_ITEMS, roleCodes, isAdmin),
    [roleCodes, isAdmin],
  );

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[activeSelectedKey]}
      onClick={({ key }) => {
        if (!key.startsWith("/")) return;
        if (key === pathname) return;
        setActiveSelectedKey(key);
        setNavigating(true);
        router.push(key);
      }}
      items={visibleItems}
    />
  );
}
