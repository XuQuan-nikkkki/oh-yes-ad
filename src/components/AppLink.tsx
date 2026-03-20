"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link>;

const AppLink = ({ children, style, ...props }: Props) => {
  return (
    <Link
      {...props}
      style={{
        fontWeight: 500,
        textDecoration: "underline",
        textDecorationColor: "rgb(69, 69, 69)",
        ...style,
      }}
    >
      {children}
    </Link>
  );
};

export default AppLink;
