"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useNavigationStore } from "@/stores/navigationStore";

type Props = ComponentProps<typeof Link>;

const AppLink = ({ children, style, href, onClick, onMouseEnter, ...props }: Props) => {
  const router = useRouter();
  const setNavigatingGlobal = useNavigationStore((state) => state.setNavigating);
  const hrefText = typeof href === "string" ? href : "";
  const isInternalHref = hrefText.startsWith("/");
  const prefetchRoute = () => {
    if (!isInternalHref) return;
    router.prefetch(hrefText);
  };

  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (!isInternalHref) return;
        if (event.button !== 0) return;
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.currentTarget.target === "_blank"
        ) {
          return;
        }
        setNavigatingGlobal(true);
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        prefetchRoute();
      }}
      onPointerDown={prefetchRoute}
      onTouchStart={prefetchRoute}
      onFocus={prefetchRoute}
      style={{
        fontWeight: 500,
        textDecoration: "underline",
        textDecorationColor: "rgb(69, 69, 69)",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </Link>
  );
};

export default AppLink;
