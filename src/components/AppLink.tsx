"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link>;

const AppLink = ({ children, style, ...props }: Props) => {
  return (
    <Link
      {...props}
      style={{
        color: "#1677ff",
        ...style,
      }}
    >
      {children}
    </Link>
  );
};

export default AppLink;
